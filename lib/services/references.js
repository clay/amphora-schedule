'use strict';

const _isString = require('lodash/isString'),
  urlParse = require('url');

/**
 * Validates if an string is an valid url.
 * @param {String} url
 * @returns {boolean}
 */
function isUrl(url) {
  const parts = _isString(url) && urlParse.parse(url);

  return !!parts && !!parts.protocol && !!parts.hostname && !!parts.path;
}

/**
 * Removes protocol and port from an url.
 * @param {String} url
 * @returns {String}
 */
function urlToUri(url) {
  let parts;

  if (!isUrl(url)) {
    throw new Error(`Invalid url ${url}`);
  }

  parts = urlParse.parse(url);

  return parts.hostname + parts.path;
}

module.exports.isUrl = isUrl;
module.exports.urlToUri = urlToUri;
