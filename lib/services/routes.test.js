'use strict';

const { removeExtension, setupRoutes, jsonBodyParser, textBodyParser } = require('./routes'),
  files = require('nymag-fs'),
  express = require('express'),
  path = require('path');

describe('routes', () => {
  describe('removeExtension', () => {
    test('removes the extension from an url', () => {
      const url = 'google.com';

      expect(removeExtension(url)).toBe('google');
    });

    test('removes the extension from an url with end slash', () => {
      const url = '/google.com';

      expect(removeExtension(url)).toBe('/google');
    });

    test('does not removes the extension from an bad url', () => {
      const url = 'google';

      expect(removeExtension(url)).toBe('google');
    });
  });

  describe('setUpRoutes', () => {
    const sites = files.getFiles([__dirname, '..', 'routes'].join(path.sep)),
      router = {
        use: jest.fn()
      };

    test('sets up the schedule routes for each site', () => {
      const controller = jest.fn(),
        pathRouter = {
          use: jest.fn()
        };

      express.Router = jest.fn(() => pathRouter);
      files.tryRequire = jest.fn(() => controller);

      setupRoutes(router);

      expect(router.use.mock.calls.length).toBe(sites.length);
      expect(controller.mock.calls.length).toBe(sites.length);
      expect(pathRouter.use.mock.calls.length).toBe(sites.length * 2);

      sites.forEach((site, index) => {
        expect(router.use.mock.calls[index][0]).toEqual(`/${removeExtension(site)}`);
        expect(router.use.mock.calls[index][1]).toBe(pathRouter);
        expect(pathRouter.use.mock.calls[index][0]).toBe(jsonBodyParser);
        expect(pathRouter.use.mock.calls[index + 1][0]).toBe(textBodyParser);
      });
    });
  });
});
