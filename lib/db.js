'use strict';

let db;

function setupDb(db) {
  return db.raw('CREATE SCHEMA IF NOT EXISTS ??;', ['schedule'])
    .then(() => db.raw('CREATE TABLE IF NOT EXISTS ?? ( id TEXT PRIMARY KEY NOT NULL, data JSONB );', ['schedule.pages']));
}

function init(storage) {
  module.exports.db = db = storage;

  return setupDb(storage);
}

function deleteItem(uri) {
  return db.raw('DELETE from schedule.pages WHERE id = ?', [uri]);
}

function selectItem(uri) {
  return db.raw('SELECT * from schedule.pages WHERE id = ?', [uri]);
}

function insertItem(reference, data) {
  return db.raw('INSERT INTO schedule.pages (id, data) values (?, ?);', [reference, JSON.stringify(data)]);
}

function selectItemsFromSite(prefix) {
  return db.raw('SELECT * FROM schedule.pages WHERE id LIKE ?', [`${prefix}%`])
}

function selectPublishableItems(currentTime) {
  return db.raw('SELECT * FROM schedule.pages WHERE data->\'at\' <= ?', [currentTime]);
}

module.exports = init;
module.exports.deleteItem = deleteItem;
module.exports.insertItem = insertItem;
module.exports.selectItem = selectItem;
module.exports.selectItemsFromSite = selectItemsFromSite;
module.exports.selectPublishableItems = selectPublishableItems;
