'use strict';

const urlParse = require('url');

/**
 * Validates if an string is an valid url.
 * @param {String} url
 * @returns {boolean}
 */
function isUrl(url) {
  const parts = typeof url === 'string' && urlParse.parse(url);

  return !!parts && !!parts.protocol && !!parts.hostname && !!parts.path;
}

module.exports.isUrl = isUrl;
