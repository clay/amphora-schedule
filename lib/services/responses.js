'use strict';

const bluebird = require('bluebird'),
  _ = require('lodash');

/**
 * Handle errors in the standard/generic way
 *
 * @param {object} res
 * @returns {function}
 */
function handleError(res) {
  return function (err) {
    if (err.code) {
      res.status(err.code).send(err.stack);
    } else {
      res.send(err.stack);
    }
  };
}

/**
 * Respond with JSON and capture
 *
 * Captures and hides appropriate errors.
 *
 * These return JSON always, because these endpoints are JSON-only.
 * @param {function} fn
 * @param {object} res
 */
function expectJSON(fn, res) {
  bluebird.try(fn).then(function (result) {
    res.json(result);
  }).catch(handleError(res));
}

/**
 * This method not allowed
 * @param {{allow: [string]}} options
 * @returns {function}
 */
function methodNotAllowed(options) {
  const allowed = options.allow;

  return function (req, res, next) {
    let message, code,
      method = req.method;

    if (_.includes(allowed, method.toLowerCase())) {
      next();
    } else {
      code = 405;
      message = 'Method ' + method + ' not allowed';
      res.set('Allow', allowed.join(', ').toUpperCase());
      sendDefaultResponseForCode(code, message, res, options);
    }
  };
}

/**
 * Send whatever is default for this type of data with this status code.
 * @param {number} code
 * @param {object} res
 * @returns {function}
 */
function sendDefaultErrorCode(code, res) {
  return function () {
    res.sendStatus(code);
  };
}

/**
 * Send some html (should probably be some default, or a render of a 500 page)
 * @param {number} code
 * @param {string} message
 * @param {object} res
 * @returns {function}
 */
function sendHTMLErrorCode(code, message, res) {
  return function () {
    res.type('html');
    res.send(code + ' ' + message);
  };
}

/**
 * @param {number} code
 * @param {string} message
 * @param {object} res
 * @param {object} extras
 * @returns {function}
 */
function sendJSONErrorCode(code, message, res, extras) {
  return function () {
    res.json(_.assign({ message, code }, extras));
  };
}

/**
 * @param {number} code
 * @param {string} message
 * @param {object} res
 * @returns {function}
 */
function sendTextErrorCode(code, message, res) {
  return function () {
    res.type('text');
    res.send(code + ' ' + message);
  };
}

/**
 * @param {number} code
 * @param {string} message
 * @param {object} res
 * @param {object} extras
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
 * This route not allowed
 * @param {{accept: [string]}} options
 * @returns {function}
 */
function notAcceptable(options) {
  const acceptableTypes = options.accept;

  return function (req, res, next) {
    let message, code,
      matchedType = req.accepts(acceptableTypes);

    if (matchedType) {
      next();
    } else {
      code = 406;
      message = req.get('Accept') + ' not acceptable';
      res.set('Accept', acceptableTypes.join(', ').toLowerCase());
      sendDefaultResponseForCode(code, message, res, options);
    }
  };
}

/**
 * Finds prefixToken, and removes it and anything before it.
 *
 * @param {string} str
 * @param {string} prefixToken
 * @returns {string}
 */
function removePrefix(str, prefixToken) {
  const index =  str.indexOf(prefixToken);

  if (index > -1) {
    str = str.substr(index + prefixToken.length).trim();
  }
  return str;
}

/**
 * All client errors should look like this.
 *
 * @param {object} res
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
