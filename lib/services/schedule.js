'use strict';

let interval,
  intervalDelay = 10000; // just under one minute TODO: update with previous value

const _ = require('lodash'),
  bluebird = require('bluebird'),
  { getPrefix, isPage, replaceVersion, } = require('clayutils'),
  db = require('../db'),
  references = require('./references'),
  buf = require('./buffer'),
  rest = require('./rest'),
  publishProperty = 'publish',
  scheduledAtProperty = 'at';

/**
 * @param {number} value
 */
function setScheduleInterval(value) {
  intervalDelay = value;
}

/**
 * Note: There is nothing to do if this fails except log
 * @param {string} url
 * @returns {Promise}
 */
function publishExternally(url) {
  return bluebird.try(() => {
    const published = replaceVersion(url, 'published');

    return rest.putObject(published);
  });
}

/**
 * Create the id for the new item
 *
 * NOTE: Do not rely on how this ID is created.  This might (and should) be changed to something more
 * random (like a cid).
 *
 * @param {string} uri
 * @param {object} data
 * @returns {string}
 * @throws Error if missing "at" or "publish" properties
 */
function createScheduleObjectKey(uri, data) {
  const prefix = getPrefix(uri),
    at = data[scheduledAtProperty],
    publish = data[publishProperty];

  if (!_.isNumber(at)) {
    throw new Error('Client: Missing "at" property as number.');
  } else if (!references.isUrl(publish)) {
    throw new Error('Client: Missing "publish" property as valid url.');
  }

  return `${prefix}/_schedule/${buf.encode(publish.replace(/https?:\/\//, ''))}`;
}

/**
 * NOTE:  We _cannot_ delete without knowing the thing that was published because we need to delete
 * the @scheduled location as well.
 *
 * @param {string} uri
 * @param {object} user
 * @returns {Promise}
 */
function del(uri, user = {}) {
  return db.selectItem(uri)
    .then((response) => {
      const data = response.rows.length ? response.rows[0].data : {};

      if (data[publishProperty]) {
        return db.deleteItem(uri).then(() => {
          const targetUri = references.urlToUri(data[publishProperty]);

          if (isPage(targetUri)) {
            let obj = { uri: targetUri, data, user: user };
          }

          return data;
        }).catch(console.log);
      } else {
        return Promise.resolve({ data }); // TODO: Some meaningful message
      }
    }).catch(console.log);
}

/**
 * Create a schedule item to publish something in the future
 * @param {string} uri
 * @param {object} data
 * @param {object} user
 * @returns {Promise}
 */
function post(uri, data, user) {
  const reference = createScheduleObjectKey(uri, data),
    targetUri = references.urlToUri(data[publishProperty]);

  return db.insertItem(reference, data)
    .then(() => {
      if (isPage(targetUri)) {
        let obj = { uri: targetUri, data: data, user: user };
      }

      return data;
    }).catch(console.log);
}

/**
 * Gets a scheduled item.
 * @param {string} uri
 * @return {Promise}
 */
function getScheduleItem(uri) {
  const prefix = getPrefix(uri);

  return db.selectItem(prefix)
    .then((data) => data.rows.length ? data.rows[0] : {})
    .catch(console.log);
}

/**
 * Gets the scheduled items of a site.
 * @param {string} uri
 * @return {Promise<T | void>}
 */
function getScheduleList(uri) {
  const prefix = getPrefix(uri);

  return db.selectItemsFromSite(prefix)
    .then((data) => data.rows)
    .catch(console.log);
}

/**
 * Starts waiting for things to publish (but only if we're not already listening)
 */
function startListening() {
  if (!interval) {
    interval = setInterval(() => {
      const now = new Date().getTime();

      db.selectPublishableItems(now)
        .then((response) => {
          const publishableInstances = response.rows || [],
            publishers = publishableInstances.map(instance => {
              return publishExternally(instance.data.publish)
                .then(() => del(instance.id))
            });

          return Promise.all(publishers).catch((console.log));
        }).catch(console.log)
    }, intervalDelay);
  }
}

/**
 * Stops waiting for things to publish
 */
function stopListening() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

module.exports.post = post;
module.exports.del = del;
module.exports.getScheduleItem = getScheduleItem;
module.exports.getScheduleList = getScheduleList;
module.exports.startListening = startListening;
module.exports.stopListening = stopListening;
module.exports.setScheduleInterval = setScheduleInterval;

// For testing
module.exports.createScheduleObjectKey = createScheduleObjectKey;
