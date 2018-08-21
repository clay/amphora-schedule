'use strict';

const nodeFetch = require('node-fetch'),
  headers = { 'Content-type': 'application/json', Authorization: `Token ${process.env.CLAY_ACCESS_KEY}` };

function putObject(url, data) {
  return nodeFetch(url, { method: 'PUT', body: JSON.stringify(data), headers });
}

module.exports.putObject = putObject;
module.exports.jsonHeaders = headers;
