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

/**
 * Decodes a Base-64 string to UTF-8
 * @param {String} string
 * @return {String}
 */
function decode(string) {
  return Buffer.from(string, encodeScheme).toString(charEncoding);
}

module.exports.encode = encode;
module.exports.decode = decode;
