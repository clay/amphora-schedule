'use strict';

const { isUrl, urlToUri } = require('./references');

describe('services/references', () => {
  describe('isUrl', () => {
    test('validates if a url is well formed', () => {
      const url = 'http://www.google.com';

      expect(isUrl(url)).toBeTruthy();
    });

    test('detects non urls', () => {
      const badUrl = 'nourl';

      expect(isUrl(badUrl)).toBeFalsy();
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
