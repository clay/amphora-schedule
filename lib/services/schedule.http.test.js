'use strict';

// The publish loop against a real HTTP server: what happens to a scheduled row for each kind of
// answer (or no answer) from the instance that publishes. Only the database is faked.

const http = require('http'),
  net = require('net'),
  { handlePublishInstances, publishExternally, setLog } = require('./schedule'),
  db = require('./db'),
  logger = jest.fn(),
  requests = [];

jest.mock('./db');
setLog(logger);

let server, base, rows;

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

/**
 * @returns {Promise<number>} a port nothing listens on
 */
function closedPort() {
  return new Promise((resolve) => {
    const s = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address();

      s.close(() => resolve(port));
    });
  });
}

beforeAll(async () => {
  server = http.createServer((req, res) => {
    requests.push({ method: req.method, path: req.url, authorization: req.headers.authorization });

    switch (req.url.replace('@published', '')) {
      case '/_pages/ok': return json(res, 200, { published: true });
      case '/_pages/missing': return json(res, 404, { message: 'no such page', code: 404 });
      case '/_pages/html': res.writeHead(500, { 'Content-Type': 'text/html' }); return res.end('<html>error</html>');
      case '/_pages/empty': res.writeHead(200); return res.end();
      case '/_pages/truncated':
        res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': '100' });
        res.write('{"a":');
        return setTimeout(() => res.socket.destroy(), 20);
      default: return json(res, 404, {});
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => {
  server.closeAllConnections();
  server.close();
});

beforeEach(() => {
  requests.length = 0;
  rows = new Map();
  db.db = { patchMeta: jest.fn(() => Promise.resolve()) };
  db.selectPublishableItems.mockImplementation(() => Promise.resolve({ rows: Array.from(rows.values()) }));
  db.selectItem.mockImplementation((id) => Promise.resolve({ rows: rows.has(id) ? [rows.get(id)] : [] }));
  db.deleteItem.mockImplementation((id) => {
    rows.delete(id);
    return Promise.resolve({});
  });
});

/**
 * @param {string} id
 * @param {string} page
 * @returns {Object} the scheduled row
 */
function schedule(id, page) {
  const row = { id, data: { at: 1, publish: `${base}${page}` } };

  rows.set(id, row);

  return row;
}

describe('services/schedule against an http server', () => {
  describe('publishExternally', () => {
    test('puts to the @published version of the url, with the access token and no body', async () => {
      const result = await publishExternally(`${base}/_pages/ok`);

      expect(result).toEqual({ published: true });
      expect(requests).toEqual([{ method: 'PUT', path: '/_pages/ok@published', authorization: `Token ${process.env.CLAY_ACCESS_KEY}` }]);
      expect(db.db.patchMeta).toHaveBeenCalledWith(`127.0.0.1:${server.address().port}/_pages/ok`, { scheduled: false, scheduledTime: null });
      expect(logger).not.toHaveBeenCalled();
    });

    test('logs a failed status but still resolves with the json the instance answered', async () => {
      const result = await publishExternally(`${base}/_pages/missing`);

      expect(result).toEqual({ message: 'no such page', code: 404 });
      expect(logger).toHaveBeenCalledTimes(1);
      expect(logger).toHaveBeenCalledWith('error', 'failed to publish url from schedule: [404] Not Found', { url: `${base}/_pages/missing`, status: 404 });
      expect(db.db.patchMeta).toHaveBeenCalledTimes(1);
    });

    test('rejects when the answer is not json, after the page metadata was updated and the status was logged', async () => {
      await expect(publishExternally(`${base}/_pages/html`)).rejects.toThrow(`invalid json response body at ${base}/_pages/html@published reason: Unexpected token '<'`);

      expect(logger).toHaveBeenCalledWith('error', 'failed to publish url from schedule: [500] Internal Server Error', { url: `${base}/_pages/html`, status: 500 });
      expect(db.db.patchMeta).toHaveBeenCalledTimes(1);
    });

    test('rejects when the answer is empty', async () => {
      await expect(publishExternally(`${base}/_pages/empty`)).rejects.toThrow(`invalid json response body at ${base}/_pages/empty@published reason: Unexpected end of JSON input`);
      expect(logger).not.toHaveBeenCalled();
    });

    test('rejects without touching the metadata when nothing answers', async () => {
      const port = await closedPort(),
        url = `http://127.0.0.1:${port}/_pages/ok`;

      await expect(publishExternally(url)).rejects.toThrow(`request to ${url}@published failed, reason: connect ECONNREFUSED 127.0.0.1:${port}`);
      expect(db.db.patchMeta).not.toHaveBeenCalled();
    });

    test('rejects, instead of waiting for ever, when the connection drops in the middle of the answer', async () => {
      await expect(publishExternally(`${base}/_pages/truncated`)).rejects.toThrow(`request to ${base}/_pages/truncated@published failed, reason: other side closed`);
    });
  });

  describe('handlePublishInstances', () => {
    test('publishes a due row and deletes it', async () => {
      const row = schedule('site/_schedule/a', '/_pages/ok');

      await expect(handlePublishInstances()).resolves.toEqual([row.data]);

      expect(requests).toHaveLength(1);
      expect(rows.size).toBe(0);
    });

    test('deletes the row of a page the instance refused with a json error (it is only logged)', async () => {
      schedule('site/_schedule/a', '/_pages/missing');

      await handlePublishInstances();

      expect(logger).toHaveBeenCalledTimes(1);
      expect(rows.size).toBe(0);
    });

    test.each([
      ['a non-json error page', '/_pages/html'],
      ['an empty answer', '/_pages/empty'],
      ['a connection that drops mid-answer', '/_pages/truncated']
    ])('keeps the row for the next interval after %s, and resolves with nothing', async (name, page) => {
      schedule('site/_schedule/a', page);

      await expect(handlePublishInstances()).resolves.toBeUndefined();

      expect(rows.has('site/_schedule/a')).toBe(true);
      expect(db.deleteItem).not.toHaveBeenCalled();
    });

    test('publishes every due row, and one that fails does not stop the others', async () => {
      schedule('site/_schedule/a', '/_pages/ok');
      schedule('site/_schedule/b', '/_pages/html');
      schedule('site/_schedule/c', '/_pages/ok');

      await expect(handlePublishInstances()).resolves.toBeUndefined();

      expect(requests).toHaveLength(3);
      expect(Array.from(rows.keys())).toEqual(['site/_schedule/b']);
    });

    test('logs every failure, with the schedule item it belongs to, and the error', async () => {
      schedule('site/_schedule/a', '/_pages/ok');
      schedule('site/_schedule/b', '/_pages/html');
      schedule('site/_schedule/c', '/_pages/truncated');
      schedule('site/_schedule/d', '/_pages/empty');

      await handlePublishInstances();

      const failures = logger.mock.calls.filter((call) => call[2] && call[2].id);

      expect(failures.map((call) => call[2].id).sort()).toEqual(['site/_schedule/b', 'site/_schedule/c', 'site/_schedule/d']);
      expect(failures.map((call) => call[2].publish).sort()).toEqual([`${base}/_pages/empty`, `${base}/_pages/html`, `${base}/_pages/truncated`]);
      failures.forEach(([level, message, data]) => {
        expect(level).toBe('error');
        expect(message).toBe(data.error.message);
        expect(data.stack).toBe(data.error.stack);
        expect(data.error).toBeInstanceOf(Error);
      });
    });

    test('a row without a publish url fails on its own, the other rows are still published', async () => {
      schedule('site/_schedule/a', '/_pages/ok');
      rows.set('site/_schedule/b', { id: 'site/_schedule/b', data: { at: 1 } });
      rows.set('site/_schedule/c', { id: 'site/_schedule/c' });

      await expect(handlePublishInstances()).resolves.toBeUndefined();

      expect(requests).toHaveLength(1);
      expect(Array.from(rows.keys())).toEqual(['site/_schedule/b', 'site/_schedule/c']);
      expect(logger.mock.calls.filter((call) => call[2] && call[2].id).map((call) => call[2].id).sort()).toEqual(['site/_schedule/b', 'site/_schedule/c']);
    });

    test('logs the failure and resolves with nothing when the database cannot be queried', async () => {
      const error = new Error('db is down');

      db.selectPublishableItems.mockImplementation(() => Promise.reject(error));

      await expect(handlePublishInstances()).resolves.toBeUndefined();

      expect(logger).toHaveBeenCalledTimes(1);
      expect(logger).toHaveBeenCalledWith('error', 'db is down', { stack: error.stack, error });
    });

    test('has nothing to publish, nothing to log', async () => {
      await expect(handlePublishInstances()).resolves.toEqual([]);

      expect(logger).not.toHaveBeenCalled();
      expect(requests).toHaveLength(0);
    });
  });
});
