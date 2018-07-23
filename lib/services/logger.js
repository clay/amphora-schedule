'use strict';

const clayLog = require('clay-log'),
  pkg = require('../../package.json');

let amphoraScheduleLogInstance;

function init() {
  if (amphoraScheduleLogInstance) {
    return;
  }

  // Initialize the logger
  clayLog.init({
    name: 'amphora-schedule',
    meta: {
      amphoraVersion: pkg.version
    }
  });

  // Store the log instance
  amphoraScheduleLogInstance = clayLog.getLogger();
}

function setup(meta = {}) {
  return clayLog.meta(meta, amphoraScheduleLogInstance);
}

// Initialize immediately on require of file
init();

module.exports.init = init;
module.exports.setup = setup;
module.exports.setLogger = (logger) => amphoraScheduleLogInstance = logger;

module.exports.amphoraScheduleLogInstance = amphoraScheduleLogInstance;
