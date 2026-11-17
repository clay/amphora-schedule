'use strict';

const charEncoding = 'utf8',
  encodeScheme = 'base64';

/**
 * Encodes Base-64 a string.
 * @param {String} string
 * @return {String}
 */
function encode(string) {
  return Buffer.from(string, charEncoding).toString(encodeScheme);
}

module.exports.encode = encode;
