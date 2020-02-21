'use strict';

const bus = require('./bus');

describe('services/bus', () => {
  const fn = () => 'a setter';

  describe('setPublish', () => {
    test('if setPublish is a setter', () => {
      bus.setPublish(fn);
      expect(bus.publish).toBe(fn);
    });
  });

});
