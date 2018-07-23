'use strict';

const logger = require('./logger');

describe('logger', () => {
  test('it should be initialized on require file', () => {
    expect(logger.amphoraScheduleLogInstance).toBeTruthy();
  });

  test('it should not set the logger if it is already set, even though we call init again', () => {
    const logInstance = logger.amphoraScheduleLogInstance;

    logger.init();

    expect(logInstance).toBe(logger.amphoraScheduleLogInstance);
  });

  test('it should let us set up the custom meta to clay log', () => {
    const oldLogger = logger.amphoraScheduleLogInstance;
    const newLogger = logger.setup({ someKey: 'someKey' });

    expect(newLogger).not.toBe(oldLogger);
  });

  test('it should throw if the meta is not an object', () => {
    expect(logger.setup.bind('some no meta')).toThrow();
  });

  test('it should set the logger is it is not set', () => {
    logger.setLogger(null);

    logger.init();

    expect(logger.amphoraScheduleLogInstance).toBeTruthy();
  })
});
