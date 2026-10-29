'use strict';

const logger = require('./logger');

describe('logger', () => {
  test('it should be initialized on require file', () => {
    expect(logger.getLogger()).toBeTruthy();
  });

  test('it should not set the logger if it is already set, even though we call init again', () => {
    const logInstance = logger.getLogger();

    logger.init();

    expect(logInstance).toBe(logger.getLogger());
  });

  test('it should let us set up the custom meta to clay log', () => {
    const oldLogger = logger.getLogger(),
      newLogger = logger.setup({ someKey: 'someKey' });

    expect(newLogger).not.toBe(oldLogger);
  });

  test('it should throw if the meta is not an object', () => {
    expect(logger.setup.bind('some no meta')).toThrow();
  });

  test('it should set the logger is it is not set', () => {
    logger.setLogger(null);
    logger.init();

    expect(logger.getLogger()).toBeTruthy();
  });

  describe('logError', () => {
    test('returns a function that logs the message and the stack, and the error itself', () => {
      const log = jest.fn(),
        error = new Error('Error message');

      logger.logError(log)(error);

      expect(log).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenCalledWith('error', 'Error message', { stack: error.stack, error });
    });

    test('adds the context it is given to the log data', () => {
      const log = jest.fn(),
        error = new Error('Error message');

      logger.logError(log)(error, { id: 'site/_schedule/abc', publish: 'http://site.test/_pages/abc' });

      expect(log).toHaveBeenCalledWith('error', 'Error message', { stack: error.stack, error, id: 'site/_schedule/abc', publish: 'http://site.test/_pages/abc' });
    });

    test('logs what is not an Error too', () => {
      const log = jest.fn();

      logger.logError(log)('plain string');
      logger.logError(log)(undefined);
      logger.logError(log)({ message: 'object with a message', stack: 'its stack' });
      logger.logError(log)(new Error(''));

      expect(log.mock.calls).toEqual([
        ['error', 'plain string', { stack: undefined, error: 'plain string' }],
        ['error', 'undefined', { stack: undefined, error: undefined }],
        ['error', 'object with a message', { stack: 'its stack', error: { message: 'object with a message', stack: 'its stack' } }],
        ['error', 'Error', { stack: expect.any(String), error: expect.any(Error) }]
      ]);
    });
  });
});
