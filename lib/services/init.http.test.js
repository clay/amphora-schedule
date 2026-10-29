'use strict';

// The plugin as Amphora uses it: onInit(router, storage, publish) on an express app, then HTTP
// requests to /_schedule. Only the storage is faked: it keeps the schedule table in memory and
// records the SQL it was given.

const express = require('express'),
  onInit = require('./init'),
  pageUri = '127.0.0.1:3001/_pages/abc',
  pageUrl = `http://${pageUri}`,
  json = { 'Content-Type': 'application/json', Accept: 'application/json' },
  user = { username: 'editor', provider: 'local' },
  events = [],
  sql = [],
  table = new Map(),
  metas = new Map();

let server, base, setupSql, failing = false;

/**
 * What Amphora hands the plugin to publish on its event bus.
 * @param {string} name
 * @param {Object} payload
 */
function publish(name, payload) {
  events.push([name, payload]);
}

/**
 * A storage with just the parts of the Postgres adapter that the plugin calls.
 * @returns {Object}
 */
function fakeStorage() {
  return {
    raw(statement, bindings) {
      const text = statement.replace(/\s+/g, ' ').trim();

      sql.push([text, bindings]);

      if (failing) {
        return Promise.reject(new Error('db is down'));
      } else if (/^SELECT \* from schedule\.pages WHERE id = \?/.test(text)) {
        return Promise.resolve({ rows: table.has(bindings[0]) ? [table.get(bindings[0])] : [] });
      } else if (/^SELECT \* FROM schedule\.pages WHERE id LIKE \?/.test(text)) {
        return Promise.resolve({ rows: Array.from(table.values()).filter((row) => row.id.startsWith(bindings[0].slice(0, -1))) });
      } else if (/^INSERT INTO schedule\.pages/.test(text)) {
        table.set(bindings[0], { id: bindings[0], data: JSON.parse(bindings[1]) });
      } else if (/^DELETE from schedule\.pages WHERE id = \?/.test(text)) {
        table.delete(bindings[0]);
      }

      return Promise.resolve({ rows: [] });
    },
    getMeta: (uri) => Promise.resolve(JSON.parse(JSON.stringify(metas.get(uri)))),
    patchMeta: (uri, patch) => {
      metas.set(uri, Object.assign({}, metas.get(uri), patch));

      return Promise.resolve();
    }
  };
}

beforeAll(async () => {
  const app = express(),
    router = express.Router(),
    storage = fakeStorage();

  // what Amphora does before the plugin routes: says who the user is and what the uri is
  app.use((req, res, next) => {
    req.uri = req.hostname + req.originalUrl.split('?')[0];
    req.isAuthenticated = () => !req.headers['x-anonymous'];
    req.user = user;
    next();
  });

  await onInit(router, storage, publish);
  setupSql = sql.splice(0);
  app.use(router);

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => {
  server.closeAllConnections();
  server.close();
});

beforeEach(() => {
  failing = false;
  events.length = 0;
  table.clear();
  metas.clear();
  metas.set(pageUri, { url: pageUri, history: [{ action: 'create' }] });
  sql.length = 0;
});

/**
 * @param {string} method
 * @param {string} path
 * @param {Object} [options]
 * @returns {Promise<{status: number, headers: Headers, text: string, body: *}>}
 */
async function call(method, path, options = {}) {
  const res = await fetch(base + path, { method, headers: options.headers || json, body: options.body }),
    text = await res.text();
  let body;

  try {
    body = JSON.parse(text);
  } catch (e) {
    body = undefined;
  }

  return { status: res.status, headers: res.headers, text, body };
}

/**
 * @param {number} [at]
 * @param {string} [publish]
 * @returns {Promise}
 */
function schedule(at = 1700000000000, publish = pageUrl) {
  return call('POST', '/_schedule', { body: JSON.stringify({ at, publish }) });
}

describe('the plugin on an express app', () => {
  test('creates the schema and the table when it starts, and only the first time in a process', async () => {
    const calls = [];

    expect(setupSql).toEqual([
      ['CREATE SCHEMA IF NOT EXISTS ??;', ['schedule']],
      ['CREATE TABLE IF NOT EXISTS ?? ( id TEXT PRIMARY KEY NOT NULL, data JSONB );', ['schedule.pages']]
    ]);

    await onInit({ use: (...args) => calls.push(args) }, fakeStorage(), publish);

    expect(calls.map((c) => c[0])).toEqual(['/_schedule']);
    expect(sql).toEqual([]);
  });

  describe('POST /_schedule', () => {
    test('schedules a page: 201, the data, one row, the page metadata and an event', async () => {
      const res = await schedule();

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ at: 1700000000000, publish: pageUrl });
      expect(Array.from(table.values())).toEqual([{ id: '127.0.0.1/_schedule/MTI3LjAuMC4xOjMwMDEvX3BhZ2VzL2FiYw==', data: { at: 1700000000000, publish: pageUrl } }]);
      expect(metas.get(pageUri)).toMatchObject({ scheduled: true, scheduledTime: '2023-11-14T22:13:20.000Z' });
      expect(metas.get(pageUri).history).toEqual([
        { action: 'create' },
        { action: 'schedule', users: [user], timestamp: expect.stringMatching(/^\d{4}-\d\d-\d\dT.*Z$/) }
      ]);
      expect(events).toEqual([['schedulePage', { uri: pageUri, data: { at: 1700000000000, publish: pageUrl }, user }]]);
    });

    test('scheduling the same page again moves its time', async () => {
      await schedule(1700000000000);
      await schedule(1800000000000);

      expect(table.size).toBe(1);
      expect(Array.from(table.values())[0].data.at).toBe(1800000000000);
    });

    test('is for signed in users only', async () => {
      const res = await call('POST', '/_schedule', { headers: Object.assign({ 'x-anonymous': '1' }, json), body: '{}' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: 'Unauthorized request', code: 401 });
      expect(table.size).toBe(0);
    });

    test.each([
      ['no time', { publish: pageUrl }, 'Client: Missing "at" property as number.'],
      ['a time that is a string', { at: '1700000000000', publish: pageUrl }, 'Client: Missing "at" property as number.'],
      ['no page', { at: 1 }, 'Client: Missing "publish" property as valid url.'],
      ['a page that is not a url', { at: 1, publish: 'abc' }, 'Client: Missing "publish" property as valid url.']
    ])('refuses %s, but answers 200 with the stack as text (it always has)', async (name, data, message) => {
      const res = await call('POST', '/_schedule', { body: JSON.stringify(data) });

      expect(res.status).toBe(200);
      expect(res.text.split('\n')[0]).toBe(`Error: ${message}`);
      expect(table.size).toBe(0);
    });

    test('a body that is not json is a 400 from the body parser', async () => {
      const res = await call('POST', '/_schedule', { body: '{"at":' });

      expect(res.status).toBe(400);
    });

    test('a body that is a json string or number is a 400 too (the parser is strict)', async () => {
      expect((await call('POST', '/_schedule', { body: '"text"' })).status).toBe(400);
      expect((await call('POST', '/_schedule', { body: '5' })).status).toBe(400);
    });

    test('when the db is down it answers 201 with no body, and logs the failure', async () => {
      failing = true;

      const res = await schedule();

      expect(res.status).toBe(201);
      expect(res.text).toBe('');
      expect(events).toEqual([]);
    });
  });

  describe('GET /_schedule', () => {
    test('lists the scheduled pages of the site', async () => {
      await schedule();

      const res = await call('GET', '/_schedule');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: '127.0.0.1/_schedule/MTI3LjAuMC4xOjMwMDEvX3BhZ2VzL2FiYw==', data: { at: 1700000000000, publish: pageUrl } }]);
      expect(sql.pop()).toEqual(['SELECT * FROM schedule.pages WHERE id LIKE ?', ['127.0.0.1%']]);
    });

    test('lists nothing when nothing is scheduled', async () => {
      expect((await call('GET', '/_schedule')).body).toEqual([]);
    });

    test('gets one scheduled page by its id, or {} when there is none', async () => {
      await schedule();

      const found = await call('GET', '/_schedule/MTI3LjAuMC4xOjMwMDEvX3BhZ2VzL2FiYw==');

      expect(found.body.data).toEqual({ at: 1700000000000, publish: pageUrl });
      expect((await call('GET', '/_schedule/nope')).body).toEqual({});
    });

    test('answers 200 with no body when the db is down', async () => {
      failing = true;

      const res = await call('GET', '/_schedule');

      expect(res.status).toBe(200);
      expect(res.text).toBe('');
    });
  });

  describe('DELETE /_schedule/:id', () => {
    test('unschedules a page: the row goes, the page metadata is updated, an event is published', async () => {
      await schedule();
      events.length = 0;

      const res = await call('DELETE', '/_schedule/MTI3LjAuMC4xOjMwMDEvX3BhZ2VzL2FiYw==');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ unscheduledUri: pageUri });
      expect(table.size).toBe(0);
      expect(metas.get(pageUri)).toMatchObject({ scheduled: false, scheduledTime: null });
      expect(metas.get(pageUri).history.map((entry) => entry.action)).toEqual(['create', 'schedule', 'unschedule']);
      expect(events).toEqual([['unschedulePage', { uri: pageUri, user }]]);
    });

    test('answers {} for a page that is not scheduled', async () => {
      const res = await call('DELETE', '/_schedule/nope');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
      expect(events).toEqual([]);
    });

    test('is for signed in users only', async () => {
      const res = await call('DELETE', '/_schedule/abc', { headers: Object.assign({ 'x-anonymous': '1' }, json) });

      expect(res.status).toBe(401);
    });

    test('answers {} when the db is down', async () => {
      failing = true;

      expect((await call('DELETE', '/_schedule/abc')).body).toEqual({});
    });
  });

  describe('methods and content types', () => {
    test.each([
      ['PUT', '/_schedule', 'GET, POST'],
      ['DELETE', '/_schedule', 'GET, POST'],
      ['POST', '/_schedule/abc', 'GET, DELETE'],
      ['PUT', '/_schedule/abc', 'GET, DELETE']
    ])('%s %s is a 405 that lists what is allowed', async (method, path, allow) => {
      const res = await call(method, path, { body: '{}' });

      expect(res.status).toBe(405);
      expect(res.headers.get('allow')).toBe(allow);
      expect(res.body).toEqual({ message: `Method ${method} not allowed`, code: 405, allow: allow.toLowerCase().split(', ') });
    });

    test('a client that does not take json gets a 406 that says what is acceptable', async () => {
      const res = await call('GET', '/_schedule', { headers: { Accept: 'text/html' } });

      expect(res.status).toBe(406);
      expect(res.headers.get('accept')).toBe('application/json');
      expect(res.text).toBe('Not Acceptable');
    });

    test('a client that takes anything gets json', async () => {
      const res = await call('GET', '/_schedule', { headers: { Accept: '*/*' } });

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });
});
