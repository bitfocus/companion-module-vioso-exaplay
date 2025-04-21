import { InstanceBase, InstanceStatus, runEntrypoint, TCPHelper, UDPHelper } from '@companion-module/base'
import { ConfigFields } from './config.js'
import { getActionDefinitions } from './actions.js'
import { getFeedbackDefinitions } from './feedbacks.js'

const CRLF = '\r\n';

class viosoexaplayInstance extends InstanceBase {
  async init(config) {
    this.config = config;

    // Initialize an object to store composition statuses
    this.compositionStatuses = {};

    // Queues for pending requests
    this.statusRequestQueue = [];
    this.volumeRequestQueue = [];

    // Set action definitions
    this.setActionDefinitions(getActionDefinitions(this));

    // Set feedback definitions (including Combined Info Feedback)
    this.setFeedbackDefinitions(getFeedbackDefinitions(this));

    await this.configUpdated(config);

    const presets = {};
  
    presets['Play/Pause'] = {
      category: "Transport",
      name: "Play/Pause",
      type: "button",
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
          style: { bgcolor: "#000000" },
        }
      ],
      steps: [
        {
          down: [
            {
              actionId: 'transportmode',
              options: { command: 'play', composition_id: 'comp1' },
            },
          ],
          up: []
        },
        {
          down: [
            {
              actionId: 'transportmode',
              options: { command: 'pause', composition_id: 'comp1' },
            },
          ],
          up: []
        }
      ],
    };
  
    presets['Stop'] = {
      category: "Transport",
      name: "Stop",
      type: "button",
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
          style: { bgcolor: "#000000" },
        },
        {
          feedbackId: 'transportModeFeedback',
          options: { mode: 'paused', composition_id: 'comp1' },
          style: { bgcolor: "#000000" },
        }
      ],
      steps: [
        {
          down: [
            {
              actionId: 'transportmode',
              options: { command: 'stop', composition_id: 'comp1' },
            },
          ],
          up: []
        }
      ],
    };
  
    this.setPresetDefinitions(presets);
  }

  async configUpdated(config) {
    if (this.udp) {
      this.udp.destroy();
      delete this.udp;
    }

    if (this.socket) {
      this.socket.destroy();
      delete this.socket;
    }
    
    // Clear any existing intervals
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      delete this.statusInterval;
    }

    this.config = config;

    if (this.config.prot == 'tcp') {
      this.init_tcp();
    }

    if (this.config.prot == 'udp') {
      this.init_udp();
      this.setVariableDefinitions([]);
    }
  }

  async destroy() {
    if (this.socket) {
      this.socket.destroy();
    } else if (this.udp) {
      this.udp.destroy();
    } else {
      this.updateStatus(InstanceStatus.Disconnected);
    }
    
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
    }
  }

  getConfigFields() {
    return ConfigFields;
  }

  init_udp() {
    // ... (unchanged UDP initialization)
  }

  init_tcp() {
    if (this.socket) {
      this.socket.destroy();
      delete this.socket;
    }

    this.updateStatus(InstanceStatus.Connecting);

    if (this.config.host) {
      this.socket = new TCPHelper(this.config.host, this.config.port);

      this.socket.on('status_change', (status, message) => {
        this.updateStatus(status, message);
      });

      this.socket.on('error', (err) => {
        this.updateStatus(InstanceStatus.ConnectionFailure, err.message);
        this.log('error', 'Network error: ' + err.message);
      });

      // Buffer for incomplete data
      this.dataBuffer = '';

      this.socket.on('data', (data) => {
        if (this.config.saveresponse) {
          this.dataBuffer += data.toString();

          // Check for complete lines
          let lines = this.dataBuffer.split('\n');
          this.dataBuffer = lines.pop(); // Keep incomplete line in the buffer

          lines.forEach((line) => {
            this.processDataLine(line.trim());
          });
        }
      });

      // Polling Interval in Hz
      const hz = parseInt(this.config.pollingInterval) || 1;
      const interval = 1000 / hz;
      this.statusInterval = setInterval(() => {
        Object.keys(this.compositionStatuses).forEach(comp => {
          const statusCommand = `get:status,${comp}`;
          const statusBuf = Buffer.from(statusCommand + CRLF, 'latin1');
          this.statusRequestQueue.push(comp);
          if (this.socket && this.socket.isConnected) {
            this.socket.send(statusBuf);
          }
        });
      }, interval);

    } else {
      this.updateStatus(InstanceStatus.BadConfig);
    }
  }

  processDataLine(dataLine) {
    this.log('debug', `Received data line: ${dataLine}`);

    if (dataLine.startsWith('OK') || dataLine.startsWith('ERR')) {
      // Response to a sent command
      this.log('info', `Device response: ${dataLine}`);
    } else if (dataLine.includes(',')) {
      // Processing status data

      // Get the composition ID from the queue
      const compositionID = this.statusRequestQueue.shift();

      if (!compositionID) {
        this.log('warn', 'No pending status request found. Cannot associate response.');
        return;
      }

      // Five fields are expected:
      // playbackStatus, currentTime, frameIndex, clipIndex, compositionDuration
      // The 4th field from the device is normally used as cue_index.
      // However, if a manual clip_index (via Play Cuelist Clip) has been set, cue_index should not be overwritten.
      const [playbackStatus, currentTime, frameIndex, deviceCueIndex, compositionDuration] = dataLine.split(',');

      if (playbackStatus !== undefined && compositionDuration !== undefined) {
        this.log(
          'debug',
          `Parsed data for ${compositionID} - Playback Status: ${playbackStatus}, Current Time: ${currentTime}, Frame Index: ${frameIndex}, Device Cue Index: ${deviceCueIndex}, Composition Duration: ${compositionDuration}`
        );

        // Convert the playback status from number to text
        let playbackStatusText = '';
        switch (playbackStatus) {
          case '0':
            playbackStatusText = 'stop';
            break;
          case '1':
            playbackStatusText = 'playing';
            break;
          case '2':
            playbackStatusText = 'paused';
            break;
          default:
            playbackStatusText = 'unknown';
        }

        const manualClipIndex = this.compositionStatuses[compositionID]?.clip_index;
        const newCueIndex = (manualClipIndex !== undefined) ? '' : deviceCueIndex;

        // Update the status for this composition  
        this.compositionStatuses[compositionID] = {
          playbackStatus: playbackStatusText,
          currentTime: currentTime,
          frameIndex: frameIndex,
          cue_index: newCueIndex, 
          compositionDuration: compositionDuration,
          currentVolume: this.compositionStatuses[compositionID]?.currentVolume,
          clip_index: this.compositionStatuses[compositionID]?.clip_index 
        };

        // Update the variables for this composition
        this.updateCompositionVariables(compositionID);

        this.checkFeedbacks('transportModeFeedback', 'currentTimeFeedback', 'volumeDisplayFeedback', 'clipIndexDisplayFeedback', 'cueIndexDisplayFeedback', 'frameIndexDisplayFeedback', 'combinedInfoFeedback');

        this.log(
          'debug',
          `Variables set for ${compositionID}: playbackStatus=${playbackStatusText}, currentTime=${currentTime}`
        );
      } else {
        this.log('warn', 'Incomplete data received, skipping processing.');
      }
    } else if (!isNaN(dataLine)) {
      // Assume this is the volume

      // Get the composition ID from the volume request queue
      const compositionID = this.volumeRequestQueue.shift();

      if (!compositionID) {
        this.log('warn', 'No pending volume request found. Cannot associate response.');
        return;
      }

      // Update the volume status
      if (!this.compositionStatuses[compositionID]) {
        this.compositionStatuses[compositionID] = {};
      }
      this.compositionStatuses[compositionID].currentVolume = dataLine;

      // Update the corresponding variable
      this.setVariableValues({
        [`current_volume_${compositionID}`]: dataLine,
      });

      // Trigger feedback update (including Combined Info Feedback)
      this.checkFeedbacks('volumeDisplayFeedback', 'combinedInfoFeedback');

      this.log('info', `Current volume for ${compositionID}: ${dataLine}`);
    } else {
      // Other responses
      this.log('info', `Unknown device response: ${dataLine}`);
    }
  }

  updateCompositionVariables(compositionID) {
    const status = this.compositionStatuses[compositionID];

    // Initialize variable definitions (if not already done)
    this.init_tcp_variables();

    this.setVariableValues({
      [`playback_status_${compositionID}`]: status.playbackStatus,
      [`current_time_${compositionID}`]: status.currentTime,
      [`frame_index_${compositionID}`]: status.frameIndex,
      [`cue_index_${compositionID}`]: status.cue_index,
      [`clip_index_${compositionID}`]: status.clip_index || '',
      [`composition_duration_${compositionID}`]: status.compositionDuration,
      [`current_volume_${compositionID}`]: status.currentVolume || '',
    });
  }

  init_tcp_variables() {
    let variableDefinitions = [];

    for (const compositionID in this.compositionStatuses) {
      variableDefinitions.push(
        { name: `Playback Status ${compositionID}`, variableId: `playback_status_${compositionID}` },
        { name: `Current Time ${compositionID}`, variableId: `current_time_${compositionID}` },
        { name: `Frame Index ${compositionID}`, variableId: `frame_index_${compositionID}` },
        { name: `Cue Index ${compositionID}`, variableId: `cue_index_${compositionID}` },
        { name: `Clip Index ${compositionID}`, variableId: `clip_index_${compositionID}` },
        { name: `Composition Duration ${compositionID}`, variableId: `composition_duration_${compositionID}` },
        { name: `Current Volume ${compositionID}`, variableId: `current_volume_${compositionID}` }
      );
    }

    this.setVariableDefinitions(variableDefinitions);
  }
}

runEntrypoint(viosoexaplayInstance, []);
