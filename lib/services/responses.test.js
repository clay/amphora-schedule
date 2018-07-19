'use strict';

const { removePrefix } = require('./responses');

describe('services/responses', () => {
  describe('removePrefix', () => {
    test('removes a prefix and all behind it from a string', () => {
      const text = 'prefix:suffix';

      expect(removePrefix(text, ':')).toBe('suffix');
    });

    test('removes nothing if not find the prefix token ', () => {
      const text = 'prefix:suffix';

      expect(removePrefix(text, '/')).toBe(text);
    });
  });
});
