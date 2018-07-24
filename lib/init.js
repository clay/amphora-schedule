'use strict';

const db = require('./db'),
  routes = require('./routes'),
  schedule = require('./services/schedule');

/**
 * Initializes plugin.
 *
 * @param {object} router
 * @param {object} storage
 *
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
