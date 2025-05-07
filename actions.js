// actions.js
import { Buffer } from 'buffer'
const CRLF = '\r\n'

function sendData(self, sendBuf) {
  if (!self.config.host) {
    self.log('error', 'Host configuration is missing.')
    return
  }
  self.log('debug', `Sending to ${self.config.host}:${self.config.port} -> ${sendBuf.toString()}`)
  if (self.socket?.isConnected) {
    self.socket.send(sendBuf)
  } else {
    self.log('error', 'TCP socket not connected.')
  }
}

function parseCompositionID(input) {
  input = input || ''
  if (input.toLowerCase().startsWith('comp')) {
    return input
  }
  return 'comp' + input
}

async function handleCallback(self, options, commandPrefix) {
  try {
    const compID = parseCompositionID(options.composition_id)
    self.ensureComposition(compID)

    const variableValue = options.variable_value
      ? await self.parseVariablesInString(options.variable_value)
      : ''
    const fullCommand = `${commandPrefix}${compID}${variableValue ? ',' + variableValue : ''}`
    const sendBuf = Buffer.from(fullCommand + CRLF, 'latin1')
    sendData(self, sendBuf)
    getCompositionStatus(self, compID)
  } catch (error) {
    self.log('error', `Error in callback: ${error.message}`)
  }
}

function getCompositionStatus(self, composition) {
  const statusCommand = `get:status,${composition}`
  const statusBuf = Buffer.from(statusCommand + CRLF, 'latin1')
  self.statusRequestQueue.push(composition)
  sendData(self, statusBuf)
}

function getVolumeStatus(self, composition) {
  const volumeCommand = `get:vol,${composition}`
  const volumeBuf = Buffer.from(volumeCommand + CRLF, 'latin1')
  self.volumeRequestQueue.push(composition)
  sendData(self, volumeBuf)
}

export function getActionDefinitions(self) {
  return {
    transportmode: {
      name: 'Transport Mode',
      options: [
        {
          type: 'dropdown',
          id: 'command',
          label: 'Command:',
          default: 'play',
          choices: [
            { id: 'play', label: 'Play' },
            { id: 'pause', label: 'Pause' },
            { id: 'stop', label: 'Stop' },
          ],
        },
        {
          type: 'textinput',
          id: 'composition_id',
          label: 'Composition ID',
          default: '',
          tooltip: 'E.g. "1" or "comp1".',
        },
      ],
      callback: async (action) => {
        const compID = parseCompositionID(action.options.composition_id)
        action.options.composition_id = compID
        self.ensureComposition(compID)
        await handleCallback(self, action.options, action.options.command + ',')
        getCompositionStatus(self, compID)
      },
    },

    set_cue: {
      name: 'Set Cue',
      options: [
        {
          type: 'textinput',
          id: 'composition_id',
          label: 'Composition ID',
          default: '',
          tooltip: 'E.g. "1" or "comp1".',
        },
        {
          type: 'textinput',
          id: 'cue_number',
          label: 'Cue/Clip Number:',
          default: '',
          tooltip: 'Number of the cue or clip (variables allowed).',
          useVariables: true,
        },
      ],
      callback: async (action) => {
        const compID = parseCompositionID(action.options.composition_id)
        action.options.composition_id = compID
        self.ensureComposition(compID)
        action.options.variable_value = action.options.cue_number
        await handleCallback(self, action.options, 'set:cue,')
        self.compositionStatuses[compID] = self.compositionStatuses[compID] || {}
        self.compositionStatuses[compID].cue_index = action.options.variable_value
        self.compositionStatuses[compID].clip_index = action.options.variable_value
        self.updateCompositionVariables(compID)
        getCompositionStatus(self, compID)
      },
    },

    volume: {
      name: 'Set Volume',
      options: [
        {
          type: 'textinput',
          id: 'composition_id',
          label: 'Composition ID',
          default: '',
          tooltip: 'E.g. "1" or "comp1".',
        },
        {
          type: 'number',
          id: 'volume_value',
          label: 'Volume (0-100):',
          default: 50,
          min: 0,
          max: 100,
          step: 1,
        },
      ],
      callback: async (action) => {
        const compID = parseCompositionID(action.options.composition_id)
        action.options.composition_id = compID
        self.ensureComposition(compID)
        action.options.variable_value = action.options.volume_value
        await handleCallback(self, action.options, 'set:vol,')
        getVolumeStatus(self, compID)
      },
    },

    volume_adjust: {
      name: 'Volume Adjust +/-',
      options: [
        {
          type: 'textinput',
          id: 'composition_id',
          label: 'Composition ID',
          default: '',
          tooltip: 'E.g. "1" or "comp1".',
        },
        {
          type: 'dropdown',
          id: 'adjustment',
          label: 'Adjust Volume:',
          default: '+',
          choices: [
            { id: '+', label: 'Increase (+10%)' },
            { id: '-', label: 'Decrease (-10%)' },
          ],
        },
      ],
      callback: async (action) => {
        try {
          const compID = parseCompositionID(action.options.composition_id)
          action.options.composition_id = compID
          self.ensureComposition(compID)

          self.volumeState = self.volumeState || {}
          self.volumeState[compID] = self.volumeState?.[compID] ?? 50
          if (action.options.adjustment === '+') {
            self.volumeState[compID] = Math.min(self.volumeState[compID] + 10, 100)
          } else {
            self.volumeState[compID] = Math.max(self.volumeState[compID] - 10, 0)
          }
          const fullCommand = `set:vol,${compID},${self.volumeState[compID]}`
          const sendBuf = Buffer.from(fullCommand + CRLF, 'latin1')
          sendData(self, sendBuf)
          getVolumeStatus(self, compID)
        } catch (error) {
          self.log('error', `Error in volume_adjust: ${error.message}`)
        }
      },
    },

    jump_to_time: {
      name: 'Jump to Time',
      options: [
        {
          type: 'textinput',
          id: 'composition_id',
          label: 'Composition ID',
          default: '',
          tooltip: 'E.g. "1" or "comp1".',
        },
        {
          type: 'textinput',
          id: 'time_in_seconds',
          label: 'Time in Seconds:',
          default: '',
          useVariables: true,
        },
      ],
      callback: async (action) => {
        const compID = parseCompositionID(action.options.composition_id)
        action.options.composition_id = compID
        self.ensureComposition(compID)
        action.options.variable_value = action.options.time_in_seconds
        await handleCallback(self, action.options, 'set:cuetime,')
        getCompositionStatus(self, compID)
      },
    },
  }
}
