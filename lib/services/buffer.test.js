'use strict';

const { encode } = require('./buffer');

describe('services/buffer', () => {
  const text = 'sometext',
    encodedText = 'c29tZXRleHQ=';

  describe('encodes', () => {
    test('encodes a string to base64', () => {
      expect(encode(text)).toBe(encodedText);
    });
  });

  describe('encodes', () => {
    test('encodes what is not ASCII as utf-8', () => {
      expect(encode('site.test/_pages/é')).toBe('c2l0ZS50ZXN0L19wYWdlcy/DqQ==');
    });
  });
});
