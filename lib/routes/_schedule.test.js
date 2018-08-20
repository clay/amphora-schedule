'use strict';

const routes = require('./_schedule'),
  controller = require('../services/schedule');

jest.mock('../services/schedule');

describe('routes/_schedule', () => {
  describe('routes/post', () => {
    test('should pass insert props correctly to controller', () => {
      const data = { at: 1000, publish: 'someinstanceuri' },
        req = {
          uri: 'http://local.nymag.com/_schedule',
          body: {
            at: 100,
            publish: 'local.nymag.com/_pages/dhbshjkcd'
          },
          user: {
            role: 'somerole'
          }
        },
        res = {
          status: jest.fn(),
          json: jest.fn(),
        };

      controller.post.mockResolvedValue(Promise.resolve(data));

      return routes.route.post(req, res).then(() => {
        expect(controller.post.mock.calls.length).toBe(1);
        expect(controller.post.mock.calls[0][0]).toBe(req.uri);
        expect(controller.post.mock.calls[0][1]).toEqual(req.body);
        expect(controller.post.mock.calls[0][2]).toEqual(req.user);
      });
    });
  });

  describe('routes/del', () => {
    test('should pass delete props correctly to controller', () => {
      const data = { at: 1000, publish: 'someinstanceuri' },
        req = {
          uri: 'http://local.nymag.com/_schedule',
          user: {
            role: 'somerole'
          }
        },
        res = {
          status: jest.fn(),
          json: jest.fn(),
        };

      controller.del.mockResolvedValue(Promise.resolve(data));

      return routes.route.del(req, res).then(() => {
        expect(controller.del.mock.calls.length).toBe(1);
        expect(controller.del.mock.calls[0][0]).toBe(req.uri);
        expect(controller.del.mock.calls[0][1]).toEqual(req.user);
      });
    });
  });

  describe('routes/getList', () => {
    test('should pass get list props correctly to controller', () => {
      const data = [
          { at: 1000, publish: 'someinstanceuri' },
          { at: 1000, publish: 'someinstanceuri' },
          { at: 1000, publish: 'someinstanceuri' }
        ],
        req = {
          uri: 'http://local.nymag.com/_schedule',
        },
        res = {
          status: jest.fn(),
          json: jest.fn(),
        };

      controller.getScheduleList.mockResolvedValue(Promise.resolve(data));

      return routes.route.getList(req, res).then(() => {
        expect(controller.getScheduleList.mock.calls.length).toBe(1);
        expect(controller.getScheduleList.mock.calls[0][0]).toBe(req.uri);
      });
    });
  });

  describe('routes/getItem', () => {
    test('should pass get item props correctly to controller', () => {
      const data = { at: 1000, publish: 'someinstanceuri' },
        req = {
          uri: 'http://local.nymag.com/_schedule',
        },
        res = {
          status: jest.fn(),
          json: jest.fn(),
        };

      controller.getScheduleItem.mockResolvedValue(Promise.resolve(data));

      return routes.route.getItem(req, res).then(() => {
        expect(controller.getScheduleItem.mock.calls.length).toBe(1);
        expect(controller.getScheduleItem.mock.calls[0][0]).toBe(req.uri);
      });
    });
  });

  describe('routes', () => {
    test('should set the schedule middlewares to the router', () => {
      const router = {
        all: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        delete: jest.fn(),
      };

      routes(router);

      expect(router.all.mock.calls.length).toBe(4);
      expect(router.get.mock.calls.length).toBe(2);
      expect(router.delete.mock.calls.length).toBe(2);
      expect(router.post.mock.calls.length).toBe(2);
    });
  });
});
