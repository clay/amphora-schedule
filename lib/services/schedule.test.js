'use strict';

const { createScheduleObjectKey } = require('./schedule');

describe('services/schedule', () => {
  describe('createScheduleObjectKey', () => {
    test('creates an schedule object', () => {
      const uri = 'http://somehost.com/_pages/sometext',
        data = {
          at: 1000,
          publish: 'http://sometext.com/_components/instance'
        },
        scheduleKey = 'http://somehost.com/_schedule/c29tZXRleHQuY29tL19jb21wb25lbnRzL2luc3RhbmNl';

      expect(createScheduleObjectKey(uri, data)).toBe(scheduleKey);
    });

    test('throws an exception if the data is missing the at attribute', () => {
      const uri = 'http://somehost.com/_pages/sometext',
        data = {
          publish: 'http://sometext.com/_components/instance'
        };

      expect(createScheduleObjectKey.bind(null, uri, data)).toThrow('Client: Missing "at" property as number.');
    });

    test('throws an exception if the data is missing the publish attribute', () => {
      const uri = 'http://somehost.com/_pages/sometext',
        data = {
          at: 1000,
        };

      expect(createScheduleObjectKey.bind(null, uri, data)).toThrow('Client: Missing "publish" property as valid url.');
    });

    test('throws an exception if the data is missing the publish attribute is not valid', () => {
      const uri = 'http://somehost.com/_pages/sometext',
        data = {
          at: 1000,
          publish: 'sometestingtext'
        };

      expect(createScheduleObjectKey.bind(null, uri, data)).toThrow('Client: Missing "publish" property as valid url.');
    });
  });
});