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

  test('returns a function that can log errors', () => {
    const log = jest.fn(),
      error = {
        message: 'Error message',
        stack: 'error stack'
      },
      loggerFunction = logger.logError(log);

    loggerFunction(error);

    expect(log.mock.calls.length).toBe(1);
    expect(log.mock.calls[0][0]).toBe('error');
    expect(log.mock.calls[0][1]).toBe(error.message);
    expect(log.mock.calls[0][2]).toEqual({ stack: error.stack });
  });
});
