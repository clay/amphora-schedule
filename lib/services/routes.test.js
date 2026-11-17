'use strict';

const setupRoutes = require('./routes'),
  express = require('express'),
  controller = require('../routes/_schedule');

describe('routes', () => {
  describe('setupRoutes', () => {
    test('mounts the schedule routes at /_schedule, behind the json body parser', () => {
      const router = { use: jest.fn() },
        pathRouter = express.Router(),
        use = jest.spyOn(pathRouter, 'use'),
        newRouter = jest.spyOn(express, 'Router').mockReturnValue(pathRouter);

      setupRoutes(router);

      expect(router.use).toHaveBeenCalledTimes(1);
      expect(router.use).toHaveBeenCalledWith('/_schedule', pathRouter);
      expect(use.mock.calls[0][0]).toBe(setupRoutes.jsonBodyParser);
      // the routes of the controller are on that router, and the json body parser comes first
      expect(pathRouter.stack.length).toBeGreaterThan(1);
      expect(pathRouter.stack[0].handle).toBe(setupRoutes.jsonBodyParser);
      expect(pathRouter.stack.map((layer) => layer.route && Object.keys(layer.route.methods)[0]).filter(Boolean)).toEqual(expect.arrayContaining(['get', 'post', 'delete', '_all']));

      newRouter.mockRestore();
    });

    test('the controller sets up its routes on the router it is given', () => {
      const router = { all: jest.fn(), get: jest.fn(), post: jest.fn(), delete: jest.fn() };

      controller(router);

      expect(router.all.mock.calls.map((call) => call[0])).toEqual(['/', '/', '/:id', '/:id']);
      expect(router.get.mock.calls.map((call) => call[0])).toEqual(['/', '/:id']);
      expect(router.post.mock.calls.map((call) => call[0])).toEqual(['/']);
      expect(router.delete.mock.calls.map((call) => call[0])).toEqual(['/:id']);
    });
  });

  describe('jsonBodyParser', () => {
    test('is a middleware function', () => {
      expect(typeof setupRoutes.jsonBodyParser).toBe('function');
      expect(setupRoutes.jsonBodyParser.length).toBe(3);
    });
  });
});
