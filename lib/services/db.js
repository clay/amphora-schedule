'use strict';

const _IsNumber = require('lodash/isNumber');
let db;

/**
 * Sets the db instance to be used.
 * @param {object} dbImpl
 */
function setDb(dbImpl) {
  module.exports.db = db = dbImpl;
}

/**
 * Initializes the plugin.
 * @param {object} storage
 * @return {Promise}
 */
function init(storage) {
  setDb(storage);

  return setUpDb('schedule', 'pages');
}

/**
 * Sets up the database structures.
 * @param {string} schema
 * @param {string} table
 * @return {Promise}
 */
function setUpDb(schema, table) {
  return db.raw('CREATE SCHEMA IF NOT EXISTS ??;', [schema])
    .then(() => db.raw('CREATE TABLE IF NOT EXISTS ?? ( id TEXT PRIMARY KEY NOT NULL, data JSONB );', [`${schema}.${table}`]));
}

/**
 * Deletes an item from the database.
 * @param {string} uri
 * @return {Promise}
 */
function deleteItem(uri) {
  return db.raw('DELETE from schedule.pages WHERE id = ?', [uri]);
}

/**
 * Selects an item from the database.
 * @param {string} uri
 * @return {Promise}
 */
function selectItem(uri) {
  return db.raw('SELECT * from schedule.pages WHERE id = ?', [uri]);
}

/**
 * Inserts an item in the database.
 * @param {string} reference
 * @param {object} data
 * @return {Promise}
 */
function insertItem(reference, data) {
  return db.raw('INSERT INTO schedule.pages (id, data) values (?, ?);', [reference, JSON.stringify(data)]);
}

/**
 * Selects all the items from an specified site.
 * @param {string} prefix
 * @return {Promise}
 */
function selectItemsFromSite(prefix) {
  return db.raw('SELECT * FROM schedule.pages WHERE id LIKE ?', [`${prefix}%`]);
}

/**
 * Selects all the publishable instances.
 * @param {number} currentTime
 * @return {Promise}
 */
function selectPublishableItems(currentTime) {
  if (!_IsNumber(currentTime)) {
    throw new Error(`Must be a number, current value: ${currentTime}`);
  }

  return db.raw('SELECT * FROM schedule.pages WHERE data->\'at\' <= ?', [currentTime]);
}

module.exports = init;
module.exports.deleteItem = deleteItem;
module.exports.insertItem = insertItem;
module.exports.selectItem = selectItem;
module.exports.selectItemsFromSite = selectItemsFromSite;
module.exports.selectPublishableItems = selectPublishableItems;
module.exports.setDb = setDb;
module.exports.setupDb = setUpDb;
