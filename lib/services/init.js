'use strict';

const db = require('./db'),
  routes = require('./routes'),
  schedule = require('./schedule'),
  log = require('./logger').setup({ file: __filename });

/**
 * Initializes plugin.
 * @param {Object} router
 * @param {Object} storage
 * @return {Promise}
 */
function onInit(router, storage) {
  return db(storage)
    .then(() => routes(router))
    .then(() => {
      if (process.env.CLAY_SCHEDULING_ENABLED === 'true') {
        schedule.startListening();
      }
    });
}

module.exports = onInit;
