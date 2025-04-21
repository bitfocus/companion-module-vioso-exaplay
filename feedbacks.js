/**
 * Helper: Ensures that the composition ID has the format "compX".
 * Added a fallback for undefined inputs.
 */
function parseCompositionID(input) {
  input = input || ''  // fallback to empty string if undefined
  if (input.toLowerCase().startsWith("comp")) {
    return input
  }
  return "comp" + input
}

export function getFeedbackDefinitions(self) {
  return {
    transportModeFeedback: {
      type: 'boolean',
      name: 'Transport Mode Feedback',
      description: 'Changes the button color based on the transport mode of a composition',
      options: [
        {
          type: 'textinput',
          label: 'Choose composition ID',
          id: 'composition_id',
          default: 'comp1',
          tooltip: 'Enter the composition ID manually. E.g. "1" or "comp1".',
        },
        {
          type: 'dropdown',
          label: 'Transport Mode',
          id: 'mode',
          default: 'playing',
          choices: [
            { id: 'playing', label: 'Playing' },
            { id: 'paused', label: 'Paused' },
            { id: 'stop', label: 'Stop' },
          ],
        },
      ],
      defaultStyle: {
        color: '#FFFFFF',
        bgcolor: '#00FF00',
      },
      callback: (feedback) => {
        const compID = parseCompositionID(feedback.options.composition_id)
        const expectedMode = feedback.options.mode
        const status = self.compositionStatuses[compID]

        if (status && status.playbackStatus === expectedMode) {
          return true
        }
        return false
      },
    },
    volumeDisplayFeedback: {
      type: 'advanced',
      name: 'Volume Display Feedback',
      description: 'Displays the current volume value on the button',
      options: [
        {
          type: 'textinput',
          label: 'Choose composition ID',
          id: 'composition_id',
          default: 'comp1',
          tooltip: 'Enter the composition ID manually. E.g. "1" or "comp1".',
        },
        {
          type: 'colorpicker',
          label: 'Background Color',
          id: 'bgcolor',
          default: '#000000',
        },
        {
          type: 'colorpicker',
          label: 'Text Color',
          id: 'color',
          default: '#FFFFFF',
        },
      ],
      callback: (feedback) => {
        const compID = parseCompositionID(feedback.options.composition_id)
        const status = self.compositionStatuses[compID]
  
        if (status && status.currentVolume !== undefined) {
          return {
            bgcolor: feedback.options.bgcolor,
            color: feedback.options.color,
            text: `Volume ${compID}\n$(vioso-exaplay:current_volume_${compID})`
          }
        }
        return {}
      },
    },
    clipIndexDisplayFeedback: {
      type: 'advanced',
      name: 'Clip Index Display Feedback',
      description: 'Displays the current clip index (referring to the Play Cuelist Clip Action)',
      options: [
        {
          type: 'textinput',
          label: 'Choose composition ID',
          id: 'composition_id',
          default: 'comp1',
          tooltip: 'Enter the composition ID manually. E.g. "1" or "comp1".',
        },
        {
          type: 'colorpicker',
          label: 'Background Color',
          id: 'bgcolor',
          default: '#000000',
        },
        {
          type: 'colorpicker',
          label: 'Text Color',
          id: 'color',
          default: '#FFFFFF',
        },
      ],
      callback: (feedback) => {
        const compID = parseCompositionID(feedback.options.composition_id)
        const status = self.compositionStatuses[compID]
  
        if (status && status.clip_index !== undefined) {
          return {
            bgcolor: feedback.options.bgcolor,
            color: feedback.options.color,
            text: `Clip Index ${compID}\n$(vioso-exaplay:clip_index_${compID})`
          }
        }
        return {}
      },
    },
    cueIndexDisplayFeedback: {
      type: 'advanced',
      name: 'Cue Index Display Feedback',
      description: 'Displays the current cue index (referring to the Go to Cue Action)',
      options: [
        {
          type: 'textinput',
          label: 'Choose composition ID',
          id: 'composition_id',
          default: 'comp1',
          tooltip: 'Enter the composition ID manually. E.g. "1" or "comp1".',
        },
        {
          type: 'colorpicker',
          label: 'Background Color',
          id: 'bgcolor',
          default: '#000000',
        },
        {
          type: 'colorpicker',
          label: 'Text Color',
          id: 'color',
          default: '#FFFFFF',
        },
      ],
      callback: (feedback) => {
        const compID = parseCompositionID(feedback.options.composition_id)
        const status = self.compositionStatuses[compID]
  
        if (status && status.cue_index) {
          return {
            bgcolor: feedback.options.bgcolor,
            color: feedback.options.color,
            text: `Cue Index ${compID}\n$(vioso-exaplay:cue_index_${compID})`
          }
        }
        return {}
      },
    },
    currentTimeFeedback: {
      type: 'advanced',
      name: 'Current Time Feedback',
      description: 'Displays the current time on the button',
      options: [
        {
          type: 'textinput',
          label: 'Choose composition ID',
          id: 'composition_id',
          default: 'comp1',
          tooltip: 'Enter the composition ID manually. E.g. "1" or "comp1".',
        },
        {
          type: 'number',
          label: 'Time in Seconds',
          id: 'time',
          default: 0,
          min: 0,
          step: 0.1,
        },
        {
          type: 'colorpicker',
          label: 'Background Color',
          id: 'bgcolor',
          default: '#000000',
        },
        {
          type: 'colorpicker',
          label: 'Text Color',
          id: 'color',
          default: '#FFFFFF',
        },
      ],
      defaultStyle: {
        bgcolor: '#FF0000',
      },
      callback: (feedback) => {
        const compID = parseCompositionID(feedback.options.composition_id)
        const targetTime = parseFloat(feedback.options.time)
        const status = self.compositionStatuses[compID]
  
        if (status && status.currentTime !== undefined) {
          if (parseFloat(status.currentTime) >= targetTime) {
            return {
              bgcolor: feedback.options.bgcolor,
              color: feedback.options.color,
              text: `Time ${compID}\n$(vioso-exaplay:current_time_${compID})`
            }
          }
        }
        return {}
      },
    },
    frameIndexDisplayFeedback: {
      type: 'advanced',
      name: 'Frame Index Display Feedback',
      description: 'Displays the current frame index on the button',
      options: [
        {
          type: 'textinput',
          label: 'Choose composition ID',
          id: 'composition_id',
          default: 'comp1',
          tooltip: 'Enter the composition ID manually. E.g. "1" or "comp1".',
        },
        {
          type: 'colorpicker',
          label: 'Background Color',
          id: 'bgcolor',
          default: '#000000',
        },
        {
          type: 'colorpicker',
          label: 'Text Color',
          id: 'color',
          default: '#FFFFFF',
        },
      ],
      callback: (feedback) => {
        const compID = parseCompositionID(feedback.options.composition_id)
        const status = self.compositionStatuses[compID]
  
        if (status && status.frameIndex !== undefined) {
          return {
            bgcolor: feedback.options.bgcolor,
            color: feedback.options.color,
            text: `Frame Index ${compID}\n$(vioso-exaplay:frame_index_${compID})`
          }
        }
        return {}
      },
    },
    combinedInfoFeedback: {
      type: 'advanced',
      name: 'Combined Info Feedback',
      description: 'Displays all collected information bundled on one button',
      options: [
        {
          // Changed id to 'composition_id' for consistency
          type: 'textinput',
          label: 'Choose composition ID',
          id: 'composition_id',
          default: 'comp1',
          tooltip: 'Enter the composition ID manually. E.g. "1" or "comp1".',
        },
        {
          type: 'colorpicker',
          label: 'Background Color',
          id: 'bgcolor',
          default: '#333333',
        },
        {
          type: 'colorpicker',
          label: 'Text Color',
          id: 'color',
          default: '#FFFFFF',
        },
      ],
      callback: (feedback) => {
        const compID = parseCompositionID(feedback.options.composition_id)
        let text = `Transport: $(vioso-exaplay:playback_status_${compID})\n` +
                   `Volume: $(vioso-exaplay:current_volume_${compID})\n` +
                   `Clip Index: $(vioso-exaplay:clip_index_${compID})\n` +
                   `Cue Index: $(vioso-exaplay:cue_index_${compID})\n` +
                   `Time: $(vioso-exaplay:current_time_${compID})\n` +
                   `Frame: $(vioso-exaplay:frame_index_${compID})\n` +
                   `Duration: $(vioso-exaplay:composition_duration_${compID})`
        return {
          bgcolor: feedback.options.bgcolor,
          color: feedback.options.color,
          text: text
        }
      },
    },
  }
}
