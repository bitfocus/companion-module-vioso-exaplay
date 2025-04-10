import { Regex } from '@companion-module/base'

// Regular expression to validate IP addresses or hostnames.
const REGEX_IP_OR_HOST = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3})$|^((([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]))$/;

export const ConfigFields = [
  {
    type: 'textinput',
    id: 'host',
    label: 'Target Host name or IP',
    width: 8,
    regex: REGEX_IP_OR_HOST,
  },
  {
    type: 'textinput',
    id: 'port',
    label: 'Target Port',
    width: 4,
    default: 8100,
    regex: Regex.PORT,
  },
  {
    type: 'dropdown',
    id: 'prot',
    label: 'Protocol',
    default: 'tcp',
    choices: [
      { id: 'tcp', label: 'TCP' },
    ],
  },
  {
    type: 'dropdown',
    id: 'pollingInterval',
    label: 'Polling Interval (Hz)',
    default: '1',
    choices: Array.from({ length: 10 }, (_, i) => ({ id: (i + 1).toString(), label: `${i + 1} Hz` })),
  },
  {
    type: 'checkbox',
    id: 'saveresponse',
    label: 'Save TCP Response',
    default: true,
    isVisible: (configValues) => configValues.prot === 'tcp',
  },
  {
    type: 'dropdown',
    id: 'convertresponse',
    label: 'Convert TCP Response Format',
    default: 'string',
    choices: [
      { id: 'none', label: 'No conversion' },
      { id: 'hex', label: 'To Hex' },
      { id: 'string', label: 'To String' },
    ],
    isVisible: (configValues) => configValues.prot === 'tcp' && !!configValues.saveresponse,
  },
];
