// Dated measurements; raw evidence and method are served at /paper/data.
import data from '../../public/paper/measurements.json'
export const MEASUREMENTS = data
export const WIDTHS = data.historical.widths.filter(r => r.size === 32 && r.text === 'AVATAR Toward WAVE office affluent')
