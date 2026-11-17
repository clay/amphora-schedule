'use strict';

const { isUrl } = require('./references');

describe('services/references', () => {
  describe.each([
    ['http://www.google.com', true],
    ['https://www.google.com/_pages/abc', true],
    ['http://localhost:3001/_pages/abc@published', true],
    ['http://www.google.com:3001', true],
    ['nourl', false],
    ['', false],
    ['/_pages/abc', false],
    ['http:///_pages/abc', false],
    ['http://host.test', true],
    [undefined, false],
    [null, false],
    [5, false],
    [{ protocol: 'http:', hostname: 'a.com', path: '/' }, false],
    [['http://www.google.com'], false]
  ])('isUrl(%p)', (url, expectedValue) => {
    test(`is ${expectedValue}`, () => {
      expect(isUrl(url)).toBe(expectedValue);
    });
  });
});
