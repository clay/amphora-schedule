'use strict';

let interval,
  intervalDelay = 50000 + Math.floor(Math.random() * 10000);

const _ = require('lodash'),
  bluebird = require('bluebird'),
  { getPrefix, replaceVersion, } = require('clayutils'),
  moment = require('moment'),
  db = require('./db'),
  references = require('./references'),
  buf = require('./buffer'),
  rest = require('./rest'),
  publishProperty = 'publish',
  scheduledAtProperty = 'at',
  {setup, logError} = require('./logger');

var log = setup({ file: __filename }),
  errorLogger = logError(log);


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

    return rest.putObject(published)
      .then((res) => {
        if (res && !res.ok) {
          log('error', `failed to publish url from schedule: [${res.status}] ${res.statusText}`, { url, status: res.status });
        }

        return res.json();
      });
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
 * @returns {Promise}
 */
function del(uri) {
  return db.selectItem(uri)
    .then((response) => {
      const data = response.rows.length ? response.rows[0].data : {},
        publish = data[publishProperty];

      if (publish) {
        return db.deleteItem(uri).then(() => data);
      } else {
        return Promise.resolve(data); // TODO: Some meaningful message
      }
    }).catch(errorLogger);
}

/**
 * Delete a schedule item from the db and update the metadata of the item that was scheduled
 *
 * @param {String} uri
 * @param {Object} user={}
 * @returns {Promise}
 */
function unschedule(uri, user) {
  let pageUri;

  return del(uri)
    .then((data) => {
      const publish = data[publishProperty];
      pageUri = publish.replace(/http:\/\/|https:\/\//g, '');

      return db.db.getMeta(pageUri);
    })
    .then((meta) => {
      // update the page's metadata
      meta.scheduled = false;
      meta.scheduledTime = null;
      meta.history.push({
        action: 'unschedule',
        users: [user],
        timestamp: moment().toISOString()
      });

      return db.db.patchMeta(pageUri, meta);
    }).catch(errorLogger);
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
    at = data[scheduledAtProperty],
    publish = data[publishProperty],
    pageUri = publish.replace(/http:\/\/|https:\/\//g, '');

  // first, insert data into schedule table
  return db.insertItem(reference, data)
    .then(() => db.db.getMeta(pageUri)) // then, update the page's metadata
    .then((meta) => {
      meta.scheduled = true;
      meta.scheduledTime = moment(at).toISOString();
      meta.history.push({
        action: 'schedule',
        users: [user],
        timestamp: moment().toISOString()
      });

      return db.db.patchMeta(pageUri, meta);
    })
    .then(() => data)
    .catch(errorLogger);
}

/**
 * Gets a scheduled item.
 * @param {string} uri
 * @return {Promise}
 */
function getScheduleItem(uri) {
  return db.selectItem(uri)
    .then((data) => data.rows.length ? data.rows[0] : {})
    .catch(errorLogger);
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
    .catch(errorLogger);
}

/**
 * Starts waiting for things to publish (but only if we're not already listening)
 */
function startListening() {
  if (!interval) {
    interval = setInterval(handlePublishInstances, intervalDelay);
  }
}

/**
 * Handles the schedule item publishing
 * @return {Promise}
 */
function handlePublishInstances() {
  const now = new Date().getTime();

  return db.selectPublishableItems(now)
    .then((response) => {
      let publishableInstances = response.rows,
        publishers = publishableInstances.map(instance => {
          return publishExternally(instance.data.publish)
            .then(() => del(instance.id));
        });

      return Promise.all(publishers).catch(errorLogger);
    }).catch(errorLogger);
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
module.exports.unschedule = unschedule;
module.exports.getScheduleItem = getScheduleItem;
module.exports.getScheduleList = getScheduleList;
module.exports.startListening = startListening;
module.exports.stopListening = stopListening;
module.exports.setScheduleInterval = setScheduleInterval;

// For testing
module.exports.del = del;
module.exports.createScheduleObjectKey = createScheduleObjectKey;
module.exports.getIntervalDelay = () => intervalDelay;
module.exports.publishExternally = publishExternally;
module.exports.getPrefix = getPrefix;
module.exports.getInterval = () => interval;
module.exports.setCustomInterval = (mock) => interval = mock;
module.exports.handlePublishInstances = handlePublishInstances;
module.exports.setLog = mock => log = mock;
