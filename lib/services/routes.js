'use strict';

const express = require('express'),
  files = require('nymag-fs'),
  path = require('path'),
  bodyParser = require('body-parser'),
  jsonBodyParser = bodyParser.json({ strict: true, type: 'application/json', limit: '50mb' }),
  textBodyParser = bodyParser.text({ type: 'text/*' });

/**
 * Set up scheduling routes for all sites. eg. nymag.com/_schedule
 * @param {object} router
 */
function setupRoutes(router) {
  const routesPath = 'routes';

  // load all controller routers
  files.getFiles([__dirname, '..', routesPath].join(path.sep)).filter((filename) => {
    const pathRouter = express.Router(),
      name = removeExtension(filename),
      controller = files.tryRequire([__dirname, '..', routesPath, name].join(path.sep));

    // assume json or text for anything in request bodies
    pathRouter.use(jsonBodyParser);
    pathRouter.use(textBodyParser);

    controller(pathRouter);

    router.use(`/${name}`, pathRouter);
  });
}

/**
 * Remove extension from route / path.
 * @param {string} path
 * @returns {string}
 */
function removeExtension(path) {
  let leadingDot, endSlash = path.lastIndexOf('/');

  if (endSlash > -1) {
    leadingDot = path.indexOf('.', endSlash);
  } else {
    leadingDot = path.indexOf('.');
  }

  if (leadingDot > -1) {
    path = path.substr(0, leadingDot);
  }

  return path;
}

module.exports = setupRoutes;
module.exports.removeExtension = removeExtension;
module.exports.setupRoutes = setupRoutes;

// Exposed for testing
module.exports.jsonBodyParser = jsonBodyParser;
module.exports.textBodyParser = textBodyParser;
