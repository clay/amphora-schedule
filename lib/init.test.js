'use strict';

const init = require('./init'),
  db = require('./db'),
  routes = require('./routes'),
  schedule = require('./services/schedule');

jest.mock('./db');
jest.mock('./routes');
jest.mock('./services/schedule');

db.mockResolvedValue(Promise.resolve());

describe('init', () => {
  describe('onInit', () => {
    test('it sets up the storage and the routes for the plugin', () => {
      const router = {},
        storage = {};

      return init(router, storage).then(() => {
        expect(db.mock.calls.length).toBe(1);
        expect(db.mock.calls[0][0]).toEqual(storage);
        expect(routes.mock.calls.length).toBe(1);
        expect(routes.mock.calls[0][0]).toEqual(router);
        expect(schedule.startListening.mock.calls.length).toBe(0);
      });
    });

    test('it sets up the storage, the routes for the plugin and start listening for scheduled pages', () => {
      const router = {},
        storage = {};

      process.env = {
        CLAY_SCHEDULING_ENABLED: 'true'
      };

      db.mockResolvedValue(Promise.resolve());

      return init(router, storage).then(() => {
        expect(db.mock.calls.length).toBe(1);
        expect(db.mock.calls[0][0]).toEqual(storage);
        expect(routes.mock.calls.length).toBe(1);
        expect(routes.mock.calls[0][0]).toEqual(router);
        expect(schedule.startListening.mock.calls.length).toBe(1);
      });
    });
  });
});
