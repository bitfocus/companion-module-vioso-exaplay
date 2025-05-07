import { InstanceBase, InstanceStatus, runEntrypoint, TCPHelper } from '@companion-module/base'
import { ConfigFields } from './config.js'
import { getActionDefinitions } from './actions.js'
import { getFeedbackDefinitions } from './feedbacks.js'

const CRLF = '\r\n'

class viosoexaplayInstance extends InstanceBase {
  constructor(config) {
    super(config)
    this.compositionStatuses = {}
    this.statusRequestQueue = []
    this.volumeRequestQueue = []
  }

  ensureComposition(id) {
    if (!id) return
    if (!this.compositionStatuses[id]) {
      this.compositionStatuses[id] = {
        playbackStatus: 'unknown',
        currentTime: '0',
        frameIndex: '0',
        cue_index: '',
        clip_index: '',
        compositionDuration: '0',
        currentVolume: ''
      }
      this.init_tcp_variables()
      this.updateCompositionVariables(id)
    }
  }

  async init(config) {
    this.config = config

    this.setActionDefinitions(getActionDefinitions(this))
    this.setFeedbackDefinitions(getFeedbackDefinitions(this))

    await this.configUpdated(config)

    // Presets
    const presets = {}

    
    presets['Play/Pause'] = {
      category: 'Transport',
      name: 'Play/Pause',
      type: 'button',
      style: {
        text: `Play/Pause\n $(vioso-exaplay:playback_status_comp)`,
        size: '10',
        color: '#FFFFFF',
        bgcolor: 13056,
      },
      feedbacks: [
        {
          feedbackId: 'transportModeFeedback',
          options: { mode: 'playing', composition_id: '' },
          style: { bgcolor: 13056 },
        },
        {
          feedbackId: 'transportModeFeedback',
          options: { mode: 'paused', composition_id: '' },
          style: { bgcolor: 10046464 },
        },
        {
          feedbackId: 'transportModeFeedback',
          options: { mode: 'stop', composition_id: '' },
          style: { bgcolor: '#000000' },
        },
      ],
      steps: [
        {
          down: [ { actionId: 'transportmode', options: { command: 'play', composition_id: '' } } ],
          up: [],
        },
        {
          down: [ { actionId: 'transportmode', options: { command: 'pause', composition_id: '' } } ],
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
          options: { mode: 'stop', composition_id: '' },
          style: { bgcolor: '#660000' },
        },
        {
          feedbackId: 'transportModeFeedback',
          options: { mode: 'playing', composition_id: '' },
          style: { bgcolor: '#000000' },
        },
        {
          feedbackId: 'transportModeFeedback',
          options: { mode: 'paused', composition_id: '' },
          style: { bgcolor: '#000000' },
        },
      ],
      steps: [
        {
          down: [ { actionId: 'transportmode', options: { command: 'stop', composition_id: '' } } ],
          up: [],
        },
      ],
    }

    
    presets['Set Cue/Clip'] = {
      category: 'Transport',
      name: 'Set Cue/Clip',
      type: 'button',
      style: {
        text: 'Set Cue/Clip',
        size: '14',
        color: 16777215,
        bgcolor: 0x330033,
      },
      feedbacks: [
        {
          feedbackId: 'cueActiveFeedback',
          options: { composition_id: '', cue_number: '' },
          style: { bgcolor: 0x00FF00 },
        },
      ],
      steps: [
        {
          down: [ { actionId: 'set_cue', options: { composition_id: '', cue_number: '' } } ],
          up: [],
        },
      ],
    }

  
    presets['jump to time'] = {
      category: 'Transport', name: 'jump to time', type: 'button',
      style: { text: 'jump to time ', size: '14', color: 16777215, bgcolor: 0x000033 },
      feedbacks: [],
      steps: [ { down: [ { actionId: 'jump_to_time', options: { composition_id: '', time_in_seconds: '' } } ], up: [] } ],
    }
    presets['vol -'] = {
      category: 'Transport', name: 'vol -', type: 'button',
      style: { text: 'vol -', size: '14', color: 16777215, bgcolor: 3355392 },
      feedbacks: [],
      steps: [ { down: [ { actionId: 'volume_adjust', options: { composition_id: '', adjustment: '-' } } ], up: [] } ],
    }
    presets['vol +'] = {
      category: 'Transport', name: 'vol +', type: 'button',
      style: { text: 'vol +', size: '14', color: 16777215, bgcolor: 3355392 },
      feedbacks: [],
      steps: [ { down: [ { actionId: 'volume_adjust', options: { composition_id: '', adjustment: '+' } } ], up: [] } ],
    }

    // Feedback-Presets
    presets['Cue/Clip Index Display'] = {
      category: 'Feedback', name: 'Cue/Clip Index Display', type: 'button',
      style: { text: 'Cue/Clip Index', size: '14', color: 16777215, bgcolor: 0x333333 },
      steps: [ { down: [], up: [] } ],
      feedbacks: [ { feedbackId: 'cueIndexDisplayFeedback', options: { composition_id: '', bgcolor: '#333333', color: '#FFFFFF' }, style: { text: 'Cue/Clip: $(vioso-exaplay:cue_index_comp1)' } } ],
    }
    presets['Current Time Display'] = {
      category: 'Feedback', name: 'Current Time Display', type: 'button',
      style: { text: 'Time:', size: '14', color: 16777215, bgcolor: 0x333333 },
      steps: [ { down: [], up: [] } ],
      feedbacks: [ { feedbackId: 'currentTimeFeedback', options: { composition_id: '', time: 0, bgcolor: '#333333', color: '#FFFFFF' }, style: { text: 'Time: $(vioso-exaplay:currentTime_comp1)' } } ],
    }
    presets['Frame Index Display'] = {
      category: 'Feedback', name: 'Frame Index Display', type: 'button',
      style: { text: 'Frame Index:', size: '12', color: 16777215, bgcolor: 0x333333 },
      steps: [ { down: [], up: [] } ],
      feedbacks: [ { feedbackId: 'frameIndexDisplayFeedback', options: { composition_id: '', bgcolor: '#333333', color: '#FFFFFF' }, style: { text: 'Frame: $(vioso-exaplay:frameIndexDisplay_comp1)' } } ],
    }
    presets['Volume Display'] = {
      category: 'Feedback', name: 'Volume Display', type: 'button',
      style: { text: 'Volume:', size: '14', color: 16777215, bgcolor: 0x333333 },
      steps: [ { down: [], up: [] } ],
      feedbacks: [ { feedbackId: 'volumeDisplayFeedback', options: { composition_id: '', bgcolor: '#333333', color: '#FFFFFF' }, style: { text: 'Volume: $(vioso-exaplay:volumeDisplay_comp1)' } } ],
    }


    presets['Combined Feedback'] = {
      category: 'Combined Feedback', name: 'Combined Feedback', type: 'button',
      style: { text: 'Combined Info\nTransport, Volume,\nCue, Clip, Time, Frame', size: '7', color: 16777215, bgcolor: 0x333333 },
      steps: [ { down: [], up: [] } ],
      feedbacks: [ { feedbackId: 'combinedInfoFeedback', options: { composition_id: '', bgcolor: '#333333', color: '#FFFFFF' } } ],
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
    this.statusInterval = setInterval(() => {
      Object.keys(this.compositionStatuses).forEach((comp) => {
        const buf = Buffer.from(`get:status,${comp}${CRLF}`, 'latin1')
        this.statusRequestQueue.push(comp)
        if (this.socket.isConnected) this.socket.send(buf)
      })
    }, 1000 / hz)
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
        const prevManualCue = this.compositionStatuses[compositionID]?.cue_index
        
        const newCueIndex = prevManualCue || deviceCueIndex
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
          'frameIndexDisplayFeedback'
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
      this.checkFeedbacks('volumeDisplayFeedback')
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
