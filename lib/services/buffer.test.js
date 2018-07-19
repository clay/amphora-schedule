'use strict';

const { decode, encode } = require('./buffer');

describe('services/buffer', () => {
  const text = 'sometext',
    encodedText = 'c29tZXRleHQ=';

  describe('encodes', () => {
    test('encodes a string to base64', () => {
      expect(encode(text)).toBe(encodedText);
    });
  });

  describe('encodes', () => {
    test('encodes a string to base64', () => {
      expect(decode(encodedText)).toBe(text);
    });
  });
});
