import { InstanceBase,InstanceStatus,runEntrypoint,TCPHelper } from '@companion-module/base'
import { ConfigFields } from './config.js'
import { getActionDefinitions } from './actions.js'
import { getFeedbackDefinitions } from './feedbacks.js'

const CRLF = '\r\n'

class viosoexaplayInstance extends InstanceBase {
  async init(config) {
    this.config = config

    // 1) Initialisiere compositionStatuses direkt mit comp1, damit Polling läuft
    this.compositionStatuses = { comp1: {} }

    // 2) Queues für Status- und Volume-Anfragen
    this.statusRequestQueue = []
    this.volumeRequestQueue = []

    this.setActionDefinitions(getActionDefinitions(this))
    this.setFeedbackDefinitions(getFeedbackDefinitions(this))

    await this.configUpdated(config)

    // 3) Presets definieren (inkl. Combined Info)
    const presets = {}

    presets['Play/Pause'] = {
      category: 'Transport',
      name: 'Play/Pause',
      type: 'button',
      style: {
        text: `Play/Pause\n$(vioso-exaplay:playback_status_comp1)`,
        size: '10',
        color: '#FFFFFF',
        bgcolor: 13056,
      },
      feedbacks: [
        {
          feedbackId: 'transportModeFeedback',
          options: { mode: 'playing', composition_id: 'comp1' },
          style: { bgcolor: 13056 },
        },
        {
          feedbackId: 'transportModeFeedback',
          options: { mode: 'paused', composition_id: 'comp1' },
          style: { bgcolor: 10046464 },
        },
        {
          feedbackId: 'transportModeFeedback',
          options: { mode: 'stop', composition_id: 'comp1' },
          style: { bgcolor: '#000000' },
        },
      ],
      steps: [
        {
          down: [
            {
              actionId: 'transportmode',
              options: { command: 'play', composition_id: 'comp1' },
            },
          ],
          up: [],
        },
        {
          down: [
            {
              actionId: 'transportmode',
              options: { command: 'pause', composition_id: 'comp1' },
            },
          ],
          up: [],
        },
      ],
    }

    presets['Stop'] = {
      category: 'Transport',
      name: 'Stop',
      type: 'button',
      style: {
        text: `Stop`,
        size: '10',
        color: '#FFFFFF',
        bgcolor: '#660000',
      },
      feedbacks: [
        {
          feedbackId: 'transportModeFeedback',
          options: { mode: 'stop', composition_id: 'comp1' },
          style: { bgcolor: '#660000' },
        },
        {
          feedbackId: 'transportModeFeedback',
          options: { mode: 'playing', composition_id: 'comp1' },
          style: { bgcolor: '#000000' },
        },
        {
          feedbackId: 'transportModeFeedback',
          options: { mode: 'paused', composition_id: 'comp1' },
          style: { bgcolor: '#000000' },
        },
      ],
      steps: [
        {
          down: [
            {
              actionId: 'transportmode',
              options: { command: 'stop', composition_id: 'comp1' },
            },
          ],
          up: [],
        },
      ],
    }

    // ** Neu: Combined Info Preset **
    presets['Combined Info'] = {
      category: 'Status',
      name: 'Combined Info',
      type: 'button',
      style: {
        text: `Combined Info`,
        size: '10',
        color: '#FFFFFF',
        bgcolor: '#333333',
      },
      feedbacks: [
        {
          feedbackId: 'combinedInfoFeedback',
          options: {
            composition_id: 'comp1',
            bgcolor: '#333333',
            color: '#FFFFFF',
          },
        },
      ],
    }

    this.setPresetDefinitions(presets)
  }

  async configUpdated(config) {
    if (this.socket) {
      this.socket.destroy()
      delete this.socket
    }
    if (this.statusInterval) {
      clearInterval(this.statusInterval)
      delete this.statusInterval
    }

    this.config = config
    this.init_tcp()
  }

  async destroy() {
    if (this.socket) {
      this.socket.destroy()
    } else {
      this.updateStatus(InstanceStatus.Disconnected)
    }
    if (this.statusInterval) {
      clearInterval(this.statusInterval)
    }
  }

  getConfigFields() {
    return ConfigFields
  }

  init_tcp() {
    if (this.socket) {
      this.socket.destroy()
      delete this.socket
    }

    this.updateStatus(InstanceStatus.Connecting)

    if (!this.config.host) {
      this.updateStatus(InstanceStatus.BadConfig)
      return
    }

    this.socket = new TCPHelper(this.config.host, this.config.port)

    this.socket.on('status_change', (status, message) => {
      this.updateStatus(status, message)
    })

    this.socket.on('error', (err) => {
      this.updateStatus(InstanceStatus.ConnectionFailure, err.message)
      this.log('error', 'Network error: ' + err.message)
    })

    this.dataBuffer = ''
    this.socket.on('data', (data) => {
      if (this.config.saveresponse) {
        this.dataBuffer += data.toString()
        const lines = this.dataBuffer.split('\n')
        this.dataBuffer = lines.pop()
        lines.forEach((line) => this.processDataLine(line.trim()))
      }
    })

    const hz = parseInt(this.config.pollingInterval) || 1
    const interval = 1000 / hz
    this.statusInterval = setInterval(() => {
      // Polling nur für bereits initialisierte Compositions
      Object.keys(this.compositionStatuses).forEach((comp) => {
        const statusCommand = `get:status,${comp}`
        const statusBuf = Buffer.from(statusCommand + CRLF, 'latin1')
        this.statusRequestQueue.push(comp)
        if (this.socket.isConnected) {
          this.socket.send(statusBuf)
        }
      })
    }, interval)
  }

  processDataLine(dataLine) {
    this.log('debug', `Received data line: ${dataLine}`)

    if (dataLine.startsWith('OK') || dataLine.startsWith('ERR')) {
      this.log('info', `Device response: ${dataLine}`)
    } else if (dataLine.includes(',')) {
      const compositionID = this.statusRequestQueue.shift()
      if (!compositionID) {
        this.log(
          'warn',
          'No pending status request found. Cannot associate response.'
        )
        return
      }
      const [
        playbackStatus,
        currentTime,
        frameIndex,
        deviceCueIndex,
        compositionDuration,
      ] = dataLine.split(',')
      if (playbackStatus !== undefined && compositionDuration !== undefined) {
        let playbackStatusText = ''
        switch (playbackStatus) {
          case '0':
            playbackStatusText = 'stop'
            break
          case '1':
            playbackStatusText = 'playing'
            break
          case '2':
            playbackStatusText = 'paused'
            break
          default:
            playbackStatusText = 'unknown'
        }
        const manualClipIndex =
          this.compositionStatuses[compositionID]?.clip_index
        const newCueIndex =
          manualClipIndex !== undefined ? '' : deviceCueIndex
        this.compositionStatuses[compositionID] = {
          playbackStatus: playbackStatusText,
          currentTime,
          frameIndex,
          cue_index: newCueIndex,
          compositionDuration,
          currentVolume:
            this.compositionStatuses[compositionID]?.currentVolume,
          clip_index: this.compositionStatuses[compositionID]?.clip_index,
        }
        this.updateCompositionVariables(compositionID)
        this.checkFeedbacks(
          'transportModeFeedback',
          'currentTimeFeedback',
          'volumeDisplayFeedback',
          'clipIndexDisplayFeedback',
          'cueIndexDisplayFeedback',
          'frameIndexDisplayFeedback',
          'combinedInfoFeedback'
        )
        this.log(
          'debug',
          `Variables set for ${compositionID}: playbackStatus=${playbackStatusText}, currentTime=${currentTime}`
        )
      } else {
        this.log('warn', 'Incomplete data received, skipping processing.')
      }
    } else if (!isNaN(dataLine)) {
      const compositionID = this.volumeRequestQueue.shift()
      if (!compositionID) {
        this.log(
          'warn',
          'No pending volume request found. Cannot associate response.'
        )
        return
      }
      if (!this.compositionStatuses[compositionID]) {
        this.compositionStatuses[compositionID] = {}
      }
      this.compositionStatuses[compositionID].currentVolume = dataLine
      this.setVariableValues({ [`current_volume_${compositionID}`]: dataLine })
      this.checkFeedbacks('volumeDisplayFeedback', 'combinedInfoFeedback')
      this.log('info', `Current volume for ${compositionID}: ${dataLine}`)
    } else {
      this.log('info', `Unknown device response: ${dataLine}`)
    }
  }

  updateCompositionVariables(compositionID) {
    const status = this.compositionStatuses[compositionID]
    this.init_tcp_variables()
    this.setVariableValues({
      [`playback_status_${compositionID}`]: status.playbackStatus,
      [`current_time_${compositionID}`]: status.currentTime,
      [`frame_index_${compositionID}`]: status.frameIndex,
      [`cue_index_${compositionID}`]: status.cue_index,
      // HIER KORREKTUR: kein composition**ID, sondern compositionID
      [`clip_index_${compositionID}`]: status.clip_index || '',
      [`composition_duration_${compositionID}`]: status.compositionDuration,
      [`current_volume_${compositionID}`]: status.currentVolume || '',
    })
  }

  init_tcp_variables() {
    const variableDefinitions = []
    for (const compositionID in this.compositionStatuses) {
      variableDefinitions.push(
        { name: `Playback Status ${compositionID}`, variableId: `playback_status_${compositionID}` },
        { name: `Current Time ${compositionID}`, variableId: `current_time_${compositionID}` },
        { name: `Frame Index ${compositionID}`, variableId: `frame_index_${compositionID}` },
        { name: `Cue Index ${compositionID}`, variableId: `cue_index_${compositionID}` },
        { name: `Clip Index ${compositionID}`, variableId: `clip_index_${compositionID}` },
        { name: `Composition Duration ${compositionID}`, variableId: `composition_duration_${compositionID}` },
        { name: `Current Volume ${compositionID}`, variableId: `current_volume_${compositionID}` },
      )
    }
    this.setVariableDefinitions(variableDefinitions)
  }
}

runEntrypoint(viosoexaplayInstance, [])
