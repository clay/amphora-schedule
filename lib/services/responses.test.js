'use strict';

const {
  removePrefix,
  handleError,
  expectJSON,
  methodNotAllowed,
  sendDefaultErrorCode,
  sendJSONErrorCode,
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

      return expectJSON(() => fakeData, res).then(() => {
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
        status = jest.fn(),
        json = jest.fn();

      ['put', 'delete'].forEach(method => {
        middleware({ method }, { set, status, json, default: jest.fn() }, next);
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

  describe('sendDefaultResponseForCode', () => {
    test('calls format to get default response type', () => {
      const code = 400,
        res = {
          status: jest.fn(),
          json: jest.fn(),
          default: jest.fn()
        };

      sendDefaultResponseForCode(code, 'some message', res, {});

      expect(res.status.mock.calls.length).toBe(1);
      expect(res.status.mock.calls[0][0]).toEqual(code);
      expect(res.json.mock.calls.length).toBe(1);
      expect(res.default.mock.calls.length).toBe(1);
    });
  });

  describe('notAcceptable', () => {
    test('it should call next function if accepts header matches', () => {
      const options = { accept: ['application/json'] },
        req = {
          accepts: jest.fn((acceptableType) => acceptableType.includes('application/json'))
        },
        res = {
          status: jest.fn(),
          json: jest.fn(),
          default: jest.fn()
        },
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
        res = {
          set: jest.fn(),
          status: jest.fn(),
          json: jest.fn(),
          default: jest.fn()
        },
        next = jest.fn();

      notAcceptable(options)(req, res, next);

      expect(req.accepts.mock.calls.length).toBe(1);
      expect(next.mock.calls.length).toBe(0);
      expect(req.get.mock.calls.length).toBe(1);
      expect(req.get.mock.calls[0][0]).toBe('Accept');
      expect(res.set.mock.calls.length).toBe(1);
      expect(res.set.mock.calls[0][0]).toBe('Accept');
      expect(res.json.mock.calls.length).toBe(1);
    });
  });

  describe('unauthorized', () => {
    test('send unauthorized response from a response object', () => {
      const res = {
        status: jest.fn(),
        json: jest.fn(),
        default: jest.fn()
      };

      unauthorized(res);

      expect(res.status.mock.calls.length).toBe(1);
      expect(res.status.mock.calls[0][0]).toBe(401);
    });
  });
});
