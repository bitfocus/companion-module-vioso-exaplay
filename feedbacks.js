// feedbacks.js
function parseCompositionID(input) {
  input = input || ''  
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
          label: 'Composition ID',
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
        return status && status.playbackStatus === expectedMode
      },
    },

    cueActiveFeedback: {
      type: 'boolean',
      name: 'Cue/Clip Active Feedback',
      description: 'Lights up when the selected cue/clip is active',
      options: [
        {
          type: 'textinput',
          label: 'Composition ID',
          id: 'composition_id',
          default: 'comp1',
          tooltip: 'E.g. "1" or "comp1".',
        },
        {
          type: 'textinput',
          label: 'Cue/Clip Number',
          id: 'cue_number',
          default: '1',
          tooltip: 'Number of the cue or clip.',
        },
      ],
      defaultStyle: {
        color: '#FFFFFF',
        bgcolor: '#00FF00',
      },
      callback: (feedback) => {
        const compID = parseCompositionID(feedback.options.composition_id)
        const cueNumber = feedback.options.cue_number
        const status = self.compositionStatuses[compID]
        return status && (status.cue_index == cueNumber)
      },
    },

    cueIndexDisplayFeedback: {
      type: 'advanced',
      name: 'Cue/Clip Index Display Feedback',
      description: 'Displays the current cue/clip index on the button',
      options: [
        {
          type: 'textinput',
          label: 'Composition ID',
          id: 'composition_id',
          default: 'comp1',
          tooltip: 'E.g. "1" or "comp1".',
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
        const status = self.compositionStatuses[compID]
        if (status && status.cue_index !== undefined) {
          return {
            bgcolor: feedback.options.bgcolor,
            color: feedback.options.color,
            text: `Cue/Clip Index ${compID}\n$(vioso-exaplay:cue_index_${compID})`,
          }
        }
        return {}
      },
    },

    volumeDisplayFeedback: {
      type: 'advanced',
      name: 'Volume Display Feedback',
      description: 'Displays the current volume value on the button',
      options: [
        {
          type: 'textinput',
          label: 'Composition ID',
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
            text: `Volume ${compID}\n$(vioso-exaplay:current_volume_${compID})`,
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
          label: 'Composition ID',
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
        if (status && status.currentTime !== undefined && parseFloat(status.currentTime) >= targetTime) {
          return {
            bgcolor: feedback.options.bgcolor,
            color: feedback.options.color,
            text: `Time ${compID}\n$(vioso-exaplay:current_time_${compID})`,
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
          label: 'Composition ID',
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
            text: `Frame Index ${compID}\n$(vioso-exaplay:frame_index_${compID})`,
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
          type: 'textinput',
          label: 'Composition ID',
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
        const text =
          `Transport: $(vioso-exaplay:playback_status_${compID})\n` +
          `Volume: $(vioso-exaplay:current_volume_${compID})\n` +
          `Clip Index: $(vioso-exaplay:clip_index_${compID})\n` +
          `Cue Index: $(vioso-exaplay:cue_index_${compID})\n` +
          `Time: $(vioso-exaplay:current_time_${compID})\n` +
          `Frame: $(vioso-exaplay:frame_index_${compID})\n` +
          `Duration: $(vioso-exaplay:composition_duration_${compID})`
        return {
          bgcolor: feedback.options.bgcolor,
          color: feedback.options.color,
          text: text,
        }
      },
    },
  }
}
