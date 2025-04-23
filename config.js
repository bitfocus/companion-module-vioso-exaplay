
const CRLF = '\r\n'

// Sends data over TCP. Ensures that a host is configured and that the TCP socket is connected.
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

// Helper: Ensures that the composition ID is in the format "compX".
// Returns "comp1" when "1" is entered.
function parseCompositionID(input) {
  input = input || ''  // fallback to empty string if undefined
  if (input.toLowerCase().startsWith("comp")) {
    return input
  }
  return "comp" + input
}

// Shared callback logic: Sends the command and automatically requests the current composition status.
async function handleCallback(self, options, commandPrefix) {
  try {
    // Ensure transformation of the composition_id:
    const compID = parseCompositionID(options.composition_id)
    const variableValue = options.variable_value ? await self.parseVariablesInString(options.variable_value) : ''
    const fullCommand = `${commandPrefix}${compID}${variableValue ? ',' + variableValue : ''}`
    const sendBuf = Buffer.from(fullCommand + CRLF, 'latin1')
    sendData(self, sendBuf)

    // Automatically request composition status
    getCompositionStatus(self, compID)
  } catch (error) {
    self.log('error', `Error in callback: ${error.message}`)
  }
}

// Requests the status of a composition.
function getCompositionStatus(self, composition) {
  const statusCommand = `get:status,${composition}`
  const statusBuf = Buffer.from(statusCommand + CRLF, 'latin1')

  self.statusRequestQueue.push(composition)

  sendData(self, statusBuf)
}

// Requests the current volume status of a composition.
function getVolumeStatus(self, composition) {
  const volumeCommand = `get:vol,${composition}`
  const volumeBuf = Buffer.from(volumeCommand + CRLF, 'latin1')

  self.volumeRequestQueue.push(composition)

  sendData(self, volumeBuf)
}

// Exports the action definitions for the module.
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
          label: 'Choose composition ID',
          default: 'comp1',
          tooltip: 'Enter the composition ID manually. E.g. "1" or "comp1".',
        },
      ],
      callback: async (action) => {
        // Ensure transformation of the input ID:
        const compID = parseCompositionID(action.options.composition_id)
        action.options.composition_id = compID
        await handleCallback(self, action.options, action.options.command + ',')
        getCompositionStatus(self, compID)
      },
    },
    go_to_cue: {
      name: 'Go to Cue',
      options: [
        {
          type: 'textinput',
          id: 'composition_id',
          label: 'Choose composition ID',
          default: 'comp1',
          tooltip: 'Enter the composition ID manually. E.g. "1" or "comp1".',
        },
        {
          type: 'textinput',
          id: 'cue_number',
          label: 'Cue Number:',
          default: '',
          tooltip: 'Enter the cue number to jump to.',
          useVariables: true,
        },
      ],
      callback: async (action) => {
        const compID = parseCompositionID(action.options.composition_id)
        action.options.composition_id = compID
        action.options.variable_value = action.options.cue_number
        await handleCallback(self, action.options, 'set:cue,')
        
        // Update the cue_index for this composition (go_to_cue action)
        self.compositionStatuses[compID] = self.compositionStatuses[compID] || {}
        self.compositionStatuses[compID].cue_index = action.options.variable_value
        self.updateCompositionVariables(compID)

        getCompositionStatus(self, compID)
      },
    },
    play_cuelist_clip: {
      name: 'Play Cuelist Clip',
      options: [
        {
          type: 'textinput',
          id: 'composition_id',
          label: 'Choose composition ID',
          default: 'comp1',
          tooltip: 'Enter the composition ID manually. E.g. "1" or "comp1".',
        },
        {
          type: 'textinput',
          id: 'clip_number',
          label: 'Clip Number:',
          default: '',
          tooltip: 'Enter the clip number to play.',
          useVariables: true,
        },
      ],
      callback: async (action) => {
        const compID = parseCompositionID(action.options.composition_id)
        action.options.composition_id = compID
        action.options.variable_value = action.options.clip_number
        await handleCallback(self, action.options, 'set:cue,')
        
        // Set the new clip_index variable for this composition (play_cuelist_clip action)
        self.compositionStatuses[compID] = self.compositionStatuses[compID] || {}
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
          label: 'Choose composition ID',
          default: 'comp1',
          tooltip: 'Enter the composition ID manually. E.g. "1" or "comp1".',
        },
        {
          type: 'number',
          id: 'volume_value',
          label: 'Volume (0-100):',
          default: 50,
          min: 0,
          max: 100,
          step: 1,
          tooltip: 'Enter the desired volume level.',
        },
      ],
      callback: async (action) => {
        const compID = parseCompositionID(action.options.composition_id)
        action.options.composition_id = compID
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
          label: 'Choose composition ID',
          default: 'comp1',
          tooltip: 'Enter the composition ID manually. E.g. "1" or "comp1".',
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
          const { adjustment } = action.options
          self.volumeState = self.volumeState || {}
          self.volumeState[compID] = self.volumeState[compID] ?? 50

          if (adjustment === '+') {
            self.volumeState[compID] = Math.min(self.volumeState[compID] + 10, 100)
          } else if (adjustment === '-') {
            self.volumeState[compID] = Math.max(self.volumeState[compID] - 10, 0)
          }

          const fullCommand = `set:vol,${compID},${self.volumeState[compID]}`
          const sendBuf = Buffer.from(fullCommand + CRLF, 'latin1')
          sendData(self, sendBuf)

          getVolumeStatus(self, compID)
        } catch (error) {
          self.log('error', `Error in volume_adjust callback: ${error.message}`)
        }
      },
    },
    jump_to_time: {
      name: 'Jump to Time',
      options: [
        {
          type: 'textinput',
          id: 'composition_id',
          label: 'Choose composition ID',
          default: 'comp1',
          tooltip: 'Enter the composition ID manually. E.g. "1" or "comp1".',
        },
        {
          type: 'textinput',
          id: 'time_in_seconds',
          label: 'Time in Seconds:',
          default: '',
          tooltip: 'Enter the time (in seconds) to jump to.',
          useVariables: true,
        },
      ],
      callback: async (action) => {
        const compID = parseCompositionID(action.options.composition_id)
        action.options.composition_id = compID
        action.options.variable_value = action.options.time_in_seconds
        await handleCallback(self, action.options, 'set:cuetime,')
        getCompositionStatus(self, compID)
      },
    },
  }
}
