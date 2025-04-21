import { Regex } from '@companion-module/base'

// Regular expression to validate IP addresses or hostnames.
const REGEX_IP_OR_HOST = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3})$|^((([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][a-zA-Z0-9-]*[A-Za-z0-9]))$/

export const ConfigFields = [
  {
    type: 'textinput',
    id: 'host',
    label: 'Target Hostname or IP Address',
    width: 8,
    regex: REGEX_IP_OR_HOST,
    tooltip: 'Enter a valid IP (e.g. 192.168.0.1) or hostname (e.g. server.local)',
  },
  {
    type: 'textinput',
    id: 'port',
    label: 'Target Port',
    width: 4,
    default: 8100,
    regex: Regex.PORT,
    tooltip: 'Default: 8100 – change only if your Exaplay server uses a different port.',
  },
  {
    type: 'dropdown',
    id: 'pollingInterval',
    label: 'Polling Interval (Hz)',
    default: '1',
    choices: Array.from({ length: 10 }, (_, i) => ({
      id: (i + 1).toString(),
      label: `${i + 1} Hz`,
    })),
    tooltip: 'How often to request status updates from Exaplay. 1 Hz = once per second.',
  },
  {
    type: 'checkbox',
    id: 'saveresponse',
    label: 'Save TCP Response',
    default: true,
    tooltip: 'Enable to store incoming responses from Exaplay for processing and feedback.',
  },
]

// Note: Protocol is now hardcoded to TCP and all incoming responses
// are always converted to strings in the module logic—no UI fields needed.
