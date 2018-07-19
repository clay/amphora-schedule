'use strict';

const { checkAuthLevel } = require('./auth');

describe('auth', () => {
  describe('checkAuthLevel', () => {
    test('validates if an admin user has permissions', () => {
      expect(checkAuthLevel('admin')).toBeTruthy();
    });

    test('no user means permission denied', () => {
      expect(checkAuthLevel.bind(null, '')).toThrow();
    });

    test('permission denied when passed a user and a higher permission level', () => {
      expect(checkAuthLevel('noadmin', 'admin')).toBeFalsy();
    });

    test('permission granted when passed a user and a equal permission level', () => {
      expect(checkAuthLevel('noadmin', 'noadmin')).toBeTruthy();
    });
  });
});
