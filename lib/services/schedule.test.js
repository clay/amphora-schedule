'use strict';

const {
    createScheduleObjectKey,
    setScheduleInterval,
    getIntervalDelay,
    publishExternally,
    del,
    post,
    getScheduleItem,
    getPrefix,
    setCustomInterval,
    getInterval,
    stopListening,
    startListening,
    handlePublishInstances,
    getScheduleList,
    setLog,
    unschedule
  } = require('./schedule'),
  rest = require('./rest'),
  db = require('./db'),
  bus = require('./bus'),
  logger = jest.fn();

jest.mock('./rest');
jest.mock('./db');
setLog(logger);
bus.publish = jest.fn( () => Promise.resolve({}) );

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

  describe('setScheduleInterval', () => {
    test('sets the interval delay to be used', () => {
      const interval = 100;

      setScheduleInterval(interval);

      expect(interval).toBe(getIntervalDelay());
    });
  });

  describe('publishExternally', () => {
    test('publishes an instance, replacing any version for the published version', () => {
      const uri = '/_component/some/instances/someinstance',
        publishedUri = '/_component/some/instances/someinstance@published';

      rest.putObject.mockResolvedValue(Promise.resolve({ ok: true, json: jest.fn() }));
      db.db = { patchMeta: jest.fn( () => Promise.resolve()) };

      return publishExternally(uri).then(() => {
        expect(rest.putObject.mock.calls.length).toBe(1);
        expect(rest.putObject.mock.calls[0][0]).toBe(publishedUri);
        expect(db.db.patchMeta.mock.calls.length).toBe(1);
        expect(db.db.patchMeta.mock.calls[0][0]).toBe(uri);
        expect(db.db.patchMeta.mock.calls[0][1]).toEqual({ scheduled: false, scheduledTime: null });
      });
    });

    test('handles false-y response from the rest service', () => {
      const uri = '/_component/some/instances/someinstance@scheduled';

      rest.putObject.mockResolvedValue(Promise.resolve({ ok: false, json: jest.fn() }));

      return publishExternally(uri).then(() => {
        expect(logger.mock.calls.length).toBe(1);
      });
    });
  });

  describe('del', () => {
    test('deletes an instance of a schedule component', () => {
      const uri = '/_components/some/instances/someinstance',
        mockSelect = {
          rows: [
            {
              data: {
                at: 10000,
                publish: 'some/uri'
              }
            }
          ]
        };

      db.selectItem.mockResolvedValue(Promise.resolve(mockSelect));
      db.deleteItem.mockResolvedValue(Promise.resolve({}));

      return del(uri).then((data) => {
        expect(data).toEqual(mockSelect.rows[0].data);
        expect(db.selectItem.mock.calls.length).toBe(1);
        expect(db.selectItem.mock.calls[0][0]).toBe(uri);
        expect(db.deleteItem.mock.calls.length).toBe(1);
        expect(db.deleteItem.mock.calls[0][0]).toBe(uri);
      });
    });

    test('does not delete an instance of a schedule component if publish prop is missing', () => {
      const uri = '/_components/some/instances/someinstance',
        mockSelect = {
          rows: [
            {
              data: {
                at: 10000,
              }
            }
          ]
        };

      db.selectItem.mockResolvedValue(Promise.resolve(mockSelect));
      db.deleteItem.mockResolvedValue(Promise.resolve({}));

      return del(uri).then((data) => {
        expect(data).toEqual(mockSelect.rows[0].data);
        expect(db.selectItem.mock.calls.length).toBe(1);
        expect(db.selectItem.mock.calls[0][0]).toBe(uri);
        expect(db.deleteItem.mock.calls.length).toBe(0);
      });
    });

    test('does not delete an instance of a schedule item if it does not exists', () => {
      const uri = '/_components/some/instances/someinstance',
        mockSelect = {
          rows: []
        };

      db.selectItem.mockResolvedValue(Promise.resolve(mockSelect));

      return del(uri).then((data) => {
        expect(data).toEqual({});
        expect(db.selectItem.mock.calls.length).toBe(1);
        expect(db.selectItem.mock.calls[0][0]).toBe(uri);
        expect(db.deleteItem.mock.calls.length).toBe(0);
      });
    });
  });

  describe('unschedule', () => {
    test('deletes an instance of a schedule component', () => {
      const uri = '/_components/some/instances/instance',
        user = {},
        scheduleData = { at: 1000, publish: 'https://page.com/page' },
        mockSelect = {
          rows: [
            {
              data: scheduleData
            }
          ]
        };

      db.selectItem.mockResolvedValue(Promise.resolve(mockSelect));
      db.deleteItem.mockResolvedValue(Promise.resolve({}));

      return unschedule(uri, user).then(() => {
        expect(db.deleteItem.mock.calls.length).toBe(1);
      });
    });

    test('updates the metadata of the item whose publishing is to be unscheduled', () => {
      const uri = '/_components/some/instances/instance',
        user = {},
        scheduleData = { at: 1000, publish: 'https://some.com/url' },
        mockSelect = {
          rows: [
            {
              data: scheduleData
            }
          ]
        };

      db.db = { getMeta: jest.fn(), patchMeta: jest.fn() };
      db.selectItem.mockResolvedValue(Promise.resolve(mockSelect));
      db.deleteItem.mockResolvedValue(Promise.resolve({}));
      db.db.getMeta.mockResolvedValue(Promise.resolve({ url: 'https://some.com/url', history: [{action: 'create'}, { action: 'schedule' }] }));

      return unschedule(uri, user).then(() => {
        expect(db.db.getMeta.mock.calls.length).toBe(1);
        expect(db.db.getMeta.mock.calls[0][0]).toBe('some.com/url');
        expect(db.db.patchMeta.mock.calls.length).toBe(1);
        expect(db.db.patchMeta.mock.calls[0][1].scheduled).toBe(false);
        expect(bus.publish.mock.calls.length).toBe(1);
      });
    });
  });

  describe('post', () => {
    test('creates a schedule item to publish something in the future', () => {
      const uri = '/_components/someinstance',
        data = {
          at: 12345677,
          publish: 'http://some.com/_components/someinstance'
        },
        newRef = createScheduleObjectKey(uri, data);

      db.insertItem.mockResolvedValue(Promise.resolve({}));

      return post(uri, data, {}).then(() => {
        expect(db.insertItem.mock.calls.length).toBe(1);
        expect(bus.publish.mock.calls.length).toBe(1);
        expect(db.insertItem.mock.calls[0][0]).toBe(newRef);
        expect(db.insertItem.mock.calls[0][1]).toBe(data);
      });
    });

    test('updates metadata of the scheduled page', () => {
      const uri = '/_components/someinstance',
        data = {
          at: 12345677,
          publish: 'http://some.com/_components/someinstance'
        },
        newRef = createScheduleObjectKey(uri, data);

      db.db = { getMeta: jest.fn(), patchMeta: jest.fn() };
      db.insertItem.mockResolvedValue(Promise.resolve({}));
      db.db.getMeta.mockResolvedValue(Promise.resolve({ url: 'https://some.com/url', history: [{action: 'create'}] }));

      return post(uri, data, {}).then(() => {
        expect(db.insertItem.mock.calls.length).toBe(1);
        expect(db.insertItem.mock.calls[0][0]).toBe(newRef);
        expect(db.insertItem.mock.calls[0][1]).toBe(data);
        expect(db.db.getMeta.mock.calls.length).toBe(1);
        expect(db.db.getMeta.mock.calls[0][0]).toBe('some.com/_components/someinstance');
        expect(db.db.patchMeta.mock.calls.length).toBe(1);
        expect(db.db.patchMeta.mock.calls[0][1].scheduled).toBe(true);
      });
    });
  });

  describe('getScheduleItem', () => {
    test('gets a schedule item by its id', () => {
      const uri = 'http://some.com/_schedule/someinstance',
        mockSelect = {
          rows: [
            {
              data: {
                at: 10000,
                publish: 'http://some.com/_page/someinstance,'
              }
            }
          ]
        };

      db.selectItem.mockResolvedValue(Promise.resolve(mockSelect));

      return getScheduleItem(uri).then(() => {
        expect(db.selectItem.mock.calls.length).toBe(1);
        expect(db.selectItem.mock.calls[0][0]).toBe(uri);
      });
    });

    test('gets no schedule item if it does not exists', () => {
      const uri = 'http://some.com/_schedule/someinstance',
        mockSelect = {
          rows: []
        };

      db.selectItem.mockResolvedValue(Promise.resolve(mockSelect));

      return getScheduleItem(uri).then((data) => {
        expect(data).toEqual({});
        expect(db.selectItem.mock.calls.length).toBe(1);
        expect(db.selectItem.mock.calls[0][0]).toBe(uri);
      });
    });
  });

  describe('getScheduleList', () => {
    test('gets a schedule item list for a site', () => {
      const uri = 'http://some.com/_schedule/someinstance',
        prefix = getPrefix(uri);

      db.selectItemsFromSite.mockResolvedValue(Promise.resolve({}));

      return getScheduleList(uri).then(() => {
        expect(db.selectItemsFromSite.mock.calls.length).toBe(1);
        expect(db.selectItemsFromSite.mock.calls[0][0]).toBe(prefix);
      });
    });
  });

  describe('stopListening', () => {
    test('stops checking in intervals for publishable instances if the interval is set', () => {
      const mockInterval = 'some interval';

      setCustomInterval(mockInterval);

      expect(getInterval()).toBe(mockInterval);

      stopListening();

      expect(getInterval()).toBeNull();
    });

    test('do nothing when no interval is set', () => {
      setCustomInterval(null);

      expect(getInterval()).toBeFalsy();

      stopListening();

      expect(getInterval()).toBeFalsy();
    });
  });

  describe('startListening', () => {
    test('starts listening in intervals for publishable instances setting an interval', () => {
      setCustomInterval(null);

      expect(getInterval()).toBeNull();

      jest.useFakeTimers();

      startListening();

      expect(getInterval()).toBeTruthy();
      expect(setInterval).toHaveBeenCalledTimes(1);
      expect(setInterval).toHaveBeenCalledWith(handlePublishInstances, getIntervalDelay());
    });

    test('no starts listening in intervals for publishable instances if an already interval is set', () => {
      const interval = { someKey: 'interval' };

      setCustomInterval(interval);

      expect(getInterval()).toBeTruthy();

      startListening();

      expect(getInterval()).toEqual(interval);
    });
  });

  describe('handlePublishInstances', () => {
    test('gets publishable instances, publishes and then delete them', () => {
      const response = {
        rows: [
          {
            data: {
              publish: 'some uri',
              at: 1000
            },
            id: 'schedule id'
          }
        ]
      };

      rest.putObject.mockResolvedValue(Promise.resolve({ ok: true, json: jest.fn() }));
      db.selectPublishableItems.mockResolvedValue(Promise.resolve(response));
      db.selectItem.mockResolvedValue(Promise.resolve(response));
      db.deleteItem.mockResolvedValue(Promise.resolve(response));
      db.db = { getMeta: jest.fn(), patchMeta: jest.fn( () => Promise.resolve() ) };

      return handlePublishInstances().then(() => {
        expect(db.selectPublishableItems.mock.calls.length).toBe(1);
        expect(rest.putObject.mock.calls.length).toBe(1);
        expect(db.selectItem.mock.calls.length).toBe(1);
        expect(db.deleteItem.mock.calls.length).toBe(1);
      });
    });

    test('publishes and deletes no instances, if there is not publishable instance', () => {
      const response = {
        rows: []
      };

      rest.putObject = jest.fn(instance => instance);
      db.selectPublishableItems.mockResolvedValue(Promise.resolve(response));

      return handlePublishInstances().then(() => {
        expect(db.selectPublishableItems.mock.calls.length).toBe(1);
        expect(rest.putObject.mock.calls.length).toBe(0);
        expect(db.selectItem.mock.calls.length).toBe(0);
        expect(db.deleteItem.mock.calls.length).toBe(0);
      });
    });
  });
});
