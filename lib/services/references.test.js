'use strict';

const { isUrl, urlToUri } = require('./references');

describe('services/references', () => {
  describe.each([
    ['http://www.google.com', true],
    ['nourl', false]
  ])('isUrl', (url, expectedValue) => {
    test('', () => {
      expect(isUrl(url)).toBe(expectedValue);
    });
  });

  describe('urlToUri', () => {
    test('removes port and protocol from an url', () => {
      const url = 'http://www.google.com:3001';

      expect(urlToUri(url)).toBe('www.google.com/');
    });

    test('throws an error when a bad url is passed', () => {
      const badUrl = 'nourl';

      expect(urlToUri.bind(null, badUrl)).toThrow('Invalid url ' + badUrl);
    });
  });
});
