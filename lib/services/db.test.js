'use strict';

const db = require('./db'),
  fakeDbImpl = {
    raw: jest.fn(() => Promise.resolve({}))
  },
  uri = 'http://localhost.nymag.com/_components/layout-video/instances/original-vi';

beforeAll(() => {
  db.setDb(fakeDbImpl);
});

describe('db', () => {
  describe('setupDb', () => {
    test('it calls raw twice, first to create the schema and then to create the table', () => {
      const schema = 'schema',
        table = 'table';

      return db.setupDb(schema, table).then(() => {
        expect(db.db.raw.mock.calls.length).toBe(2);
        expect(db.db.raw.mock.calls[0][1]).toEqual([schema]);
        expect(db.db.raw.mock.calls[1][1]).toEqual([`${schema}.${table}`]);
      });
    });
  });

  describe('deleteItem', () => {
    test('it calls raw once and pass the parameter as the second arg to raw', () => {
      return db.deleteItem(uri).then(() => {
        expect(db.db.raw.mock.calls.length).toBe(1);
        expect(db.db.raw.mock.calls[0][1]).toEqual([uri]);
      });
    });
  });

  describe('selectItem', () => {
    test('it calls raw once and pass the parameter as the second arg to raw', () => {
      return db.selectItem(uri).then(() => {
        expect(db.db.raw.mock.calls.length).toBe(1);
        expect(db.db.raw.mock.calls[0][1]).toEqual([uri]);
      });
    });
  });

  describe('insertItem', () => {
    test('it calls raw once and pass the uri and the data to the raw function', () => {
      const data = {
        at: 123456789,
        publish: 'http://localhost.nymag.com/_components/layout-video/instances/original-vi'
      };

      return db.insertItem(uri, data).then(() => {
        const callParams = db.db.raw.mock.calls[0][1];

        expect(db.db.raw.mock.calls.length).toBe(1);
        expect(callParams[0]).toBe(uri);
        expect(callParams[1]).toBe(JSON.stringify(data));
      });
    });
  });

  describe('selectItemsFromSite', () => {
    test('it calls raw once and converts the prefix to a database regex', () => {
      const prefix = 'http://localhost.nymag.com';

      return db.selectItemsFromSite(prefix).then(() => {
        expect(db.db.raw.mock.calls.length).toBe(1);
        expect(db.db.raw.mock.calls[0][1]).toEqual([`${prefix}%`]);
      });
    });
  });

  describe('selectPublishableItems', () => {
    test('it calls raw once and pass the parameter as the second arg to raw', () => {
      const currentTime = 23434;

      return db.selectPublishableItems(currentTime).then(() => {
        expect(db.db.raw.mock.calls.length).toBe(1);
        expect(db.db.raw.mock.calls[0][1]).toEqual([currentTime]);
      });
    });

    test('it throws an error if bad uri is passed', () => {
      const currentTime = 'not a number';

      expect(db.selectPublishableItems.bind(null, currentTime)).toThrow(`\`currentTime\` must be a number, current value: ${currentTime}`);
    });
  });

  describe('setDb', () => {
    test('it sets the database instance to be used', () => {
      const dbInstance = {};

      db.setDb(dbInstance);

      expect(db.db).toEqual(dbInstance);
    });
  });

  describe('init', () => {
    test('initialize the plugin', () => {
      return db(fakeDbImpl).then(() => {
        expect(db.db).toEqual(fakeDbImpl);
        expect(db.db.raw.mock.calls.length).toBe(2);
        expect(db.db.raw.mock.calls[0][1]).toEqual(['schedule']);
        expect(db.db.raw.mock.calls[1][1]).toEqual(['schedule.pages']);
      });
    });
  })
});
