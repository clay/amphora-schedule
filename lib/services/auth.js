'use strict';

const responses = require('./responses'),
  _get = require('lodash/get'),
  AUTH_LEVELS_MAP = {
    ADMIN: 'admin',
    WRITE: 'write'
  };

/**
 * Gets the user auth level and check it against the
 * required auth level for a route. Send an error
 * if the user doesn't have permissions.
 * @param {String} requiredLevel
 * @return {Function}
 */
function withAuthLevel(requiredLevel) {
  return (req, res, next) => {
    if (checkAuthLevel(_get(req, 'user.auth', ''), requiredLevel)) {
      // If the user exists and meets the level requirement, let the request proceed
      next();
    } else {
      // None of the above, we need to error
      responses.unauthorized(res);
    }
  };
}

/**
 * Checks the auth level to see if a user
 * has sufficient permissions.
 * @param {String} userLevel
 * @param {String} [requiredLevel]
 * @return {boolean}
 */
function checkAuthLevel(userLevel, requiredLevel) {
  // User has to have an auth level set
  if (!userLevel) {
    throw new Error('User does not have an authentication level set');
  }

  return userLevel === AUTH_LEVELS_MAP.ADMIN ? true : userLevel === requiredLevel;
}

module.exports.withAuthLevel = withAuthLevel;
module.exports.authLevels = AUTH_LEVELS_MAP;

// Exposed for testing
module.exports.checkAuthLevel = checkAuthLevel;
