// Adapter que reexporta la implementación fetch-based en ping.api.js
const pingApi = require('./ping.api.js');

module.exports = {
  ping: () => pingApi.ping(),
};
