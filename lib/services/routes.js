'use strict';

const express = require('express'),
  routeName = '_schedule',
  controller = require('../routes/_schedule'),
  jsonBodyParser = express.json({ strict: true, type: 'application/json', limit: '50mb' });

/**
 * Set up the scheduling routes for all sites. eg. nymag.com/_schedule
 * @param {object} router
 */
function setupRoutes(router) {
  const pathRouter = express.Router();

  // assume json or text for anything in request bodies
  pathRouter.use(jsonBodyParser);

  controller(pathRouter);

  router.use(`/${routeName}`, pathRouter);
}

module.exports = setupRoutes;

// Exposed for testing
module.exports.jsonBodyParser = jsonBodyParser;
