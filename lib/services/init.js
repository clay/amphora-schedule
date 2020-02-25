'use strict';

const db = require('./db'),
  routes = require('./routes'),
  bus = require('./bus'),
  schedule = require('./schedule');

/**
 * Initializes plugin.
 * @param {Object} router
 * @param {Object} storage
 * @param {Function} publish to the event bus
 * @return {Promise}
 */
function onInit(router, storage, publish) {
  bus.setPublish(publish);
  return db(storage)
    .then(() => routes(router))
    .then(() => {
      if (process.env.CLAY_SCHEDULING_ENABLED === 'true') {
        schedule.startListening();
      }
    });
}

module.exports = onInit;
