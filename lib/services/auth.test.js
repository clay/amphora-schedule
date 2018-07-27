'use strict';

const { checkAuthLevel, withAuthLevel } = require('./auth');

describe('auth', () => {
  describe('checkAuthLevel', () => {
    test('validates if an admin user has permissions', () => {
      expect(checkAuthLevel('admin')).toBeTruthy();
    });

    test('no user means permission denied', () => {
      expect(checkAuthLevel.bind(null, '')).toThrow();
    });

    test('permission denied when passed a user and a higher permission level', () => {
      expect(checkAuthLevel('noAdmin', 'admin')).toBeFalsy();
    });

    test('permission granted when passed a user and a equal permission level', () => {
      expect(checkAuthLevel('noAdmin', 'noAdmin')).toBeTruthy();
    });
  });

  describe('withAuthLevel', () => {
    const next = jest.fn(),
      req = {
        user: {
          auth: 'write'
        }
      };

    test('throws an error if user level is undefined', () => {
      const middleWare = withAuthLevel('write');

      expect(middleWare.bind(this, {}, {}, next)).toThrow();
    });

    test('call next to pass the request down when the request is authorized', () => {
      const middleWare = withAuthLevel('write');

      middleWare(req, {}, next);
      expect(next.mock.calls.length).toBe(1);
    });

    test('returns 401 status code', () => {
      const middleWare = withAuthLevel('admin'),
        res = {
          status: jest.fn((code) => ({
            format: jest.fn()
          }))
        };

      middleWare(req, res, next);
      expect(next.mock.calls.length).toBe(0);
      expect(res.status.mock.calls.length).toBe(1);
      expect(res.status.mock.calls[0][0]).toBe(401);
    });
  });
});
