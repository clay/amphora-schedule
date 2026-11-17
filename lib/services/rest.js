'use strict';

const headers = { 'Content-type': 'application/json', Authorization: `Token ${process.env.CLAY_ACCESS_KEY}` };

/**
 * Why a request failed, in a sentence. Node's fetch rejects with a TypeError that only says
 * "fetch failed" and keeps the reason on `cause` (an Error, or an AggregateError with no message
 * of its own when every address of a host refused the connection).
 * @param {Error} err
 * @returns {string}
 */
function reasonOf(err) {
  const cause = Object(err.cause || err),
    tried = Array.isArray(cause.errors) ? cause.errors.map((e) => e.message).join(', ') : '';

  return cause.message || tried || cause.code || String(cause);
}

/**
 * @param {string} url
 * @param {Error} err what fetch threw
 * @returns {Error} one that names the url and the reason, as node-fetch's did, and keeps `err` as its cause
 */
function requestFailed(url, err) {
  return new Error(`request to ${url} failed, reason: ${reasonOf(err)}`, { cause: err });
}

/**
 * PUT an object (the body is left out when there is no data, as when publishing).
 * Resolves with the response whatever its status; rejects when no response came back.
 * @param {string} url
 * @param {Object} [data]
 * @returns {Promise<Response>}
 */
function putObject(url, data) {
  return fetch(url, { method: 'PUT', body: JSON.stringify(data), headers }).catch((err) => {
    throw requestFailed(url, err);
  });
}

/**
 * Reads the body of a response as JSON. A body that is not JSON rejects with a message that
 * names the url (a bare "Unexpected end of JSON input" does not say which request it was),
 * and a connection that drops while the body is read rejects like a failed request does.
 * @param {Response} res
 * @returns {Promise<*>}
 */
function readJson(res) {
  return res.json().catch((err) => {
    throw err.name === 'SyntaxError'
      ? new Error(`invalid json response body at ${res.url} reason: ${err.message}`, { cause: err })
      : requestFailed(res.url, err);
  });
}

module.exports.putObject = putObject;
module.exports.readJson = readJson;
module.exports.jsonHeaders = headers;
