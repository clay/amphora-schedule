'use strict';

const { removeExtension } = require('./routes');

describe('routes', () => {
  describe('removeExtension', () => {
    test('', () => {
      const url = 'google.com';

      expect(removeExtension(url)).toBe('google');
    });
  });
});
