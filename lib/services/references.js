'use strict';

const _ = require('lodash'),
  urlParse = require('url'),
  clayUtils = require('clayutils');

/**
 * @param {string} url
 * @returns {boolean}
 */
function isUrl(url) {
  const parts = _.isString(url) && urlParse.parse(url);

  return !!parts && !!parts.protocol && !!parts.hostname && !!parts.path;
}

/**
 * Remove protocol and port
 * @param {string} url
 * @returns {string}
 */
function urlToUri(url) {
  let parts;

  if (!isUrl(url)) {
    throw new Error('Invalid url ' + url);
  }
  parts = urlParse.parse(url);

  return parts.hostname + parts.path;
}

module.exports.isUrl = isUrl;
module.exports.urlToUri = urlToUri;
