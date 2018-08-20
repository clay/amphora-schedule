'use strict';

const bluebird = require('bluebird'),
  _includes = require('lodash/includes'),
  _assign = require('lodash/assign');

/**
 * Handles errors in the standard/generic way
 * @param {Object} res
 * @returns {Function}
 */
function handleError(res) {
  return ({ code, stack }) => {
    if (code) {
      res.status(code).send(stack);
    } else {
      res.send(stack);
    }
  };
}

/**
 * Responds with JSON and capture
 * Captures and hides appropriate errors.
 * These return JSON always, because these endpoints are JSON-only.
 * @param {Function} fn
 * @param {Object} res
 * @returns {Promise}
 */
function expectJSON(fn, res) {
  return bluebird.try(fn).then((result) => res.json(result)).catch(handleError(res));
}

/**
 * Creates a method validation middleware.
 * @param {{allow: [String]}} options
 * @returns {Function}
 */
function methodNotAllowed(options) {
  const allowed = options.allow;

  return (req, res, next) => {
    let message, code,
      method = req.method;

    if (_includes(allowed, method.toLowerCase())) {
      next();
    } else {
      code = 405;
      message = `Method ${method} not allowed`;
      res.set('Allow', allowed.join(', ').toUpperCase());
      sendDefaultResponseForCode(code, message, res, options);
    }
  };
}

/**
 * Sends whatever is default for this type of data with this status code.
 * @param {number} code
 * @param {Object} res
 * @returns {function}
 */
function sendDefaultErrorCode(code, res) {
  return () => {
    res.sendStatus(code);
  };
}

/**
 * Sends some html (should probably be some default, or a render of a 500 page).
 * @param {number} code
 * @param {string} message
 * @param {Object} res
 * @returns {function}
 */
function sendHTMLErrorCode(code, message, res) {
  return () => {
    res.type('html');
    res.send(`${code} ${message}`);
  };
}

/**
 * Sends some json error.
 * @param {number} code
 * @param {string} message
 * @param {Object} res
 * @param {Object} extras
 * @returns {function}
 */
function sendJSONErrorCode(code, message, res, extras) {
  return () => {
    res.json(_assign({ message, code }, extras));
  };
}

/**
 * Sends some text error.
 * @param {number} code
 * @param {string} message
 * @param {Object} res
 * @returns {function}
 */
function sendTextErrorCode(code, message, res) {
  return () => {
    res.type('text');
    res.send(`${code} ${message}`);
  };
}

/**
 * Sends default response for code.
 * @param {number} code
 * @param {string} message
 * @param {Object} res
 * @param {Object} [extras]
 */
function sendDefaultResponseForCode(code, message, res, extras) {
  res.status(code).format({
    json: sendJSONErrorCode(code, message, res, extras),
    html: sendHTMLErrorCode(code, message, res),
    text: sendTextErrorCode(code, message, res),
    default: sendDefaultErrorCode(code, res)
  });
}

/**
 * Creates an accept validation middleware.
 * @param {{accept: [string]}} options
 * @returns {Function}
 */
function notAcceptable(options) {
  const acceptableTypes = options.accept;

  return (req, res, next) => {
    let message, code,
      matchedType = req.accepts(acceptableTypes);

    if (matchedType) {
      next();
    } else {
      code = 406;
      message = `${req.get('Accept')} not acceptable`;
      res.set('Accept', acceptableTypes.join(', ').toLowerCase());
      sendDefaultResponseForCode(code, message, res, options);
    }
  };
}

/**
 * Finds prefixToken and removes it with anything before it.
 * @param {String} str
 * @param {String} prefixToken
 * @returns {String}
 */
function removePrefix(str, prefixToken) {
  const index = str.indexOf(prefixToken);

  if (index > -1) {
    str = str.substr(index + prefixToken.length).trim();
  }

  return str;
}

/**
 * All client errors should look like this.
 * @param {Object} res
 */
function unauthorized(res) {
  const err = new Error('Unauthorized request'),
    message = removePrefix(err.message, ':'),
    code = 401;

  sendDefaultResponseForCode(code, message, res);
}

module.exports.expectJSON = expectJSON;
module.exports.methodNotAllowed = methodNotAllowed;
module.exports.notAcceptable = notAcceptable;
module.exports.unauthorized = unauthorized;

// Exposed for testing
module.exports.handleError = handleError;
module.exports.removePrefix = removePrefix;
module.exports.sendDefaultErrorCode = sendDefaultErrorCode;
module.exports.sendHTMLErrorCode = sendHTMLErrorCode;
module.exports.sendJSONErrorCode = sendJSONErrorCode;
module.exports.sendTextErrorCode = sendTextErrorCode;
module.exports.sendDefaultResponseForCode = sendDefaultResponseForCode;
module.exports.notAcceptable = notAcceptable;
