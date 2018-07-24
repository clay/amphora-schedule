'use strict';

const responses = require('./responses'),
  _ = require('lodash'),
  AUTH_LEVELS_MAP = {
    ADMIN: 'admin',
    WRITE: 'write'
  };

/**
 * Get the user auth level and check it against the
 * required auth level for a route. Send an error
 * if the user doesn't have permissions
 *
 * @param  {String} requiredLevel
 * @return {Function}
 */
function withAuthLevel(requiredLevel) {
  return function (req, res, next) {
    if (checkAuthLevel(_.get(req, 'user.auth', ''), requiredLevel)) {
      // If the user exists and meets the level requirement, let the request proceed
      next();
    } else {
      // None of the above, we need to error
      responses.unauthorized(res);
    }
  };
}

/**
 * Check the auth level to see if a user
 * has sufficient permissions
 *
 * @param  {String} userLevel
 * @param  {String} requiredLevel
 * @return {Boolean}
 */
function checkAuthLevel(userLevel, requiredLevel) {
  // User has to have an auth level set
  if (!userLevel) {
    throw new Error('User does not have an authentication level set');
  }

  if (userLevel === AUTH_LEVELS_MAP.ADMIN) {
    return true;
  } else if (userLevel !== requiredLevel) {
    return false;
  } else {
    return true;
  }
}

module.exports.withAuthLevel = withAuthLevel;
module.exports.authLevels = AUTH_LEVELS_MAP;

// Exposed for testing
module.exports.checkAuthLevel = checkAuthLevel;
