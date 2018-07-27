'use strict';

const {
  removePrefix,
  handleError,
  expectJSON,
  methodNotAllowed,
  sendDefaultErrorCode,
  sendHTMLErrorCode,
  sendJSONErrorCode,
  sendTextErrorCode,
  sendDefaultResponseForCode,
  notAcceptable,
  unauthorized
} = require('./responses');

describe('services/responses', () => {
  describe.each([
    ['prefix:suffix', ':', 'suffix'],
    ['prefix:suffix', '/', 'prefix:suffix'],
  ])('removePrefix', (text, prefix, expectedResult) => {
    test('removes a prefix and all behind it from a string if the prefix is found', () => {
      expect(removePrefix(text, prefix)).toBe(expectedResult);
    });
  });

  describe('handleError', () => {
    const send = jest.fn(),
      res = {
        status: jest.fn().mockReturnValue({ send }),
        send
      };

    test('if there is an error code it should add it to the response', () => {
      const err = {
        code: 401,
        stack: 'some stack'
      };

      handleError(res)(err);

      expect(res.status.mock.calls.length).toBe(1);
      expect(res.send.mock.calls.length).toBe(1);
      expect(res.status.mock.calls[0][0]).toBe(401);
      expect(res.send.mock.calls[0][0]).toBe('some stack');
    });

    test('if there is no error code it should just send the response', () => {
      const err = {
        stack: 'some stack'
      };

      handleError(res)(err);

      expect(res.status.mock.calls.length).toBe(0);
      expect(res.send.mock.calls.length).toBe(1);
      expect(res.send.mock.calls[0][0]).toBe('some stack');
    });
  });

  describe('expectJSON', () => {
    test('should send json response if the function resolves without errors', () => {
      const send = jest.fn(),
        res = {
          status: jest.fn().mockReturnValue({ send }),
          json: jest.fn((some) => some)
        },
        fakeData = { data: 'someData' };

      return expectJSON(() => (fakeData), res).then(() => {
        expect(res.json.mock.calls.length).toBe(1);
        expect(res.json.mock.calls[0][0]).toEqual(fakeData);
        expect(send.mock.calls.length).toBe(0);
      });
    });
  });

  describe('methodNotAllowed', () => {
    test('it calls next in the express middleware for valid methods', () => {
      const options = { allow: ['get', 'post'] },
        middleware = methodNotAllowed(options),
        next = jest.fn();

      ['get', 'post'].forEach(method => {
        middleware({ method }, {}, next);
      });

      expect(next.mock.calls.length).toBe(2);
    });

    test('it does not call next in the express middleware for invalid methods', () => {
      const options = { allow: ['get', 'post'] },
        middleware = methodNotAllowed(options),
        next = jest.fn(),
        set = jest.fn(),
        status = jest.fn().mockReturnValue({ format: jest.fn() });

      ['put', 'delete'].forEach(method => {
        middleware({ method }, { set, status }, next);
      });

      expect(next.mock.calls.length).toBe(0);
    });
  });

  describe('sendDefaultErrorCode', () => {
    test('sends a default error code', () => {
      const res = {
        sendStatus: jest.fn()
      };

      sendDefaultErrorCode(400, res)();

      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(400);
    });
  });

  describe('sendHTMLErrorCode', () => {
    test('sends html error page with format code + message', () => {
      const res = {
          type: jest.fn(),
          send: jest.fn()
        },
        message = 'some message',
        code = 400;

      sendHTMLErrorCode(code, message, res)();

      expect(res.type.mock.calls.length).toBe(1);
      expect(res.send.mock.calls.length).toBe(1);
      expect(res.type.mock.calls[0][0]).toBe('html');
      expect(res.send.mock.calls[0][0]).toBe(code + ' ' + message);
    });
  });

  describe('sendJSONErrorCode', () => {
    test('sends json response with code, message and any extra', () => {
      const code = 400,
        message = 'some error message',
        extras = 'some extra data',
        res = {
          json: jest.fn(),
        },
        expectedArgument = Object.assign({ message, code }, extras);

      sendJSONErrorCode(code, message, res, extras)();

      expect(res.json.mock.calls.length).toBe(1);
      expect(res.json.mock.calls[0][0]).toEqual(expectedArgument);
    });
  });

  describe('sendTextErrorCode', () => {
    test('sends text response with format code + message', () => {
      const res = {
          type: jest.fn(),
          send: jest.fn()
        },
        message = 'some message',
        code = 400;

      sendTextErrorCode(code, message, res)();

      expect(res.type.mock.calls.length).toBe(1);
      expect(res.send.mock.calls.length).toBe(1);
      expect(res.type.mock.calls[0][0]).toBe('text');
      expect(res.send.mock.calls[0][0]).toBe(code + ' ' + message);
    });
  });

  describe('sendDefaultResponseForCode', () => {
    test('calls format to get default response type', () => {
      const code = 400,
        format = jest.fn(),
        res = {
          status: jest.fn(() => ({
            format
          }))
        };

      sendDefaultResponseForCode(code, 'some message', res, {});

      expect(res.status.mock.calls.length).toBe(1);
      expect(res.status.mock.calls[0][0]).toEqual(code);
      expect(format.mock.calls.length).toBe(1);
    });
  });

  describe('notAcceptable', () => {
    test('it should call next function if accepts header matches', () => {
      const options = { accept: ['application/json'] },
        req = {
          accepts: jest.fn((acceptableType) => acceptableType.includes('application/json'))
        },
        res = {},
        next = jest.fn();

      notAcceptable(options)(req, res, next);

      expect(req.accepts.mock.calls.length).toBe(1);
      expect(next.mock.calls.length).toBe(1);
    });

    test('it should not call next function if accepts header does not match', () => {
      const options = { accept: ['text/html'] },
        req = {
          accepts: jest.fn((acceptableType) => acceptableType.includes('application/json')),
          get: jest.fn()
        },
        format = jest.fn(),
        res = {
          set: jest.fn(),
          status: jest.fn(() => ({
            format
          }))
        },
        next = jest.fn();

      notAcceptable(options)(req, res, next);

      expect(req.accepts.mock.calls.length).toBe(1);
      expect(next.mock.calls.length).toBe(0);
      expect(req.get.mock.calls.length).toBe(1);
      expect(req.get.mock.calls[0][0]).toBe('Accept');
      expect(res.set.mock.calls.length).toBe(1);
      expect(res.set.mock.calls[0][0]).toBe('Accept');
      expect(format.mock.calls.length).toBe(1);
    });
  });

  describe('unauthorized', () => {
    test('send unauthorized response from a response object', () => {
      const res = {
        status: jest.fn((code) => ({
          format: jest.fn()
        }))
      };

      unauthorized(res);

      expect(res.status.mock.calls.length).toBe(1);
      expect(res.status.mock.calls[0][0]).toBe(401);
    });
  });
});
