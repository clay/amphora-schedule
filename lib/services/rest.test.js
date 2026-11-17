'use strict';

const http = require('http'),
  net = require('net'),
  { putObject, readJson, jsonHeaders } = require('./rest');

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function redirect(res, status, location) {
  res.writeHead(status, { Location: location });
  res.end();
}

/**
 * What the server under test says for each path.
 * @param {{port: number}} others the server a redirect can leave for
 * @returns {Object<string, Function>}
 */
function answers(others) {
  return {
    '/json': (res) => json(res, 200, { published: true }),
    '/gone': (res) => json(res, 404, { message: 'gone' }),
    '/boom': (res) => json(res, 500, { message: 'boom' }),
    '/html': (res) => {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end('<html>boom</html>');
    },
    '/temporary': (res) => redirect(res, 307, '/json'),
    '/moved': (res) => redirect(res, 301, '/json'),
    '/other': (res) => redirect(res, 307, `http://localhost:${others.port}/elsewhere`),
    '/truncated': (res) => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': '100' });
      res.write('{"a":');
      setTimeout(() => res.socket.destroy(), 20);
    },
    '/empty': (res) => {
      res.writeHead(200);
      res.end();
    },
    '/missing': (res) => json(res, 404, {})
  };
}

/**
 * A local server that records each request it gets and answers with whatever `reply` says.
 * @param {Function} reply
 * @returns {Promise<{server: Object, requests: Object[], url: string}>}
 */
function listen(reply) {
  const requests = [],
    server = http.createServer((req, res) => {
      const chunks = [];

      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        requests.push({ method: req.method, path: req.url, headers: req.headers, body: Buffer.concat(chunks).toString() });
        reply(req, res);
      });
    });

  return new Promise((resolve) => {
    server.listen(0, () => resolve({ server, requests, port: server.address().port }));
  });
}

/**
 * @returns {Promise<number>} a port nothing listens on
 */
function closedPort() {
  return new Promise((resolve) => {
    const server = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = server.address();

      server.close(() => resolve(port));
    });
  });
}

describe('rest', () => {
  describe('putObject', () => {
    let origin, others;

    const url = (path) => `http://127.0.0.1:${origin.port}${path}`;

    beforeAll(async () => {
      // a second server on another host name: a redirect to it leaves the origin
      others = await listen((req, res) => json(res, 200, { answered: 'by the other origin' }));
      origin = await listen((req, res) => (answers(others)[req.url] || answers(others)['/missing'])(res));
    });

    afterAll(() => {
      origin.server.closeAllConnections();
      others.server.closeAllConnections();
      origin.server.close();
      others.server.close();
    });

    beforeEach(() => {
      origin.requests.length = 0;
      others.requests.length = 0;
    });

    test('puts to the url with the json headers, and no body when there is no data (what a publish sends)', async () => {
      const res = await putObject(url('/json'));

      expect(res.ok).toBe(true);
      expect(origin.requests).toHaveLength(1);
      expect(origin.requests[0].method).toBe('PUT');
      expect(origin.requests[0].path).toBe('/json');
      expect(origin.requests[0].headers['content-type']).toBe('application/json');
      expect(origin.requests[0].headers.authorization).toBe(jsonHeaders.Authorization);
      expect(origin.requests[0].headers['content-length']).toBe('0');
      expect(origin.requests[0].body).toBe('');
    });

    test('sends the data as json when there is some', async () => {
      await putObject(url('/json'), { some: 'somedata' });

      expect(origin.requests[0].body).toBe('{"some":"somedata"}');
      expect(origin.requests[0].headers['content-type']).toBe('application/json');
    });

    test('the Authorization header is a token made from CLAY_ACCESS_KEY', () => {
      expect(jsonHeaders.Authorization).toBe(`Token ${process.env.CLAY_ACCESS_KEY}`);
      expect(jsonHeaders['Content-type']).toBe('application/json');
    });

    test('resolves with the response whatever the status, so the caller can read it', async () => {
      const gone = await putObject(url('/gone')),
        boom = await putObject(url('/boom'));

      expect(gone.ok).toBe(false);
      expect(gone.status).toBe(404);
      expect(gone.statusText).toBe('Not Found');
      expect(await gone.json()).toEqual({ message: 'gone' });
      expect(boom.status).toBe(500);
      expect(boom.statusText).toBe('Internal Server Error');
    });

    test('a body that is not json rejects when it is read as json', async () => {
      const res = await putObject(url('/html'));

      await expect(res.json()).rejects.toMatchObject({ name: 'SyntaxError' });
    });

    test('keeps the PUT through a 307 and a 301 redirect', async () => {
      await putObject(url('/temporary'));
      await putObject(url('/moved'));

      expect(origin.requests.map((r) => `${r.method} ${r.path}`)).toEqual(['PUT /temporary', 'PUT /json', 'PUT /moved', 'PUT /json']);
    });

    test('does not forward the Authorization header when a redirect leaves the origin', async () => {
      const res = await putObject(url('/other'));

      expect(await res.json()).toEqual({ answered: 'by the other origin' });
      expect(origin.requests[0].headers.authorization).toBe(jsonHeaders.Authorization);
      expect(others.requests).toHaveLength(1);
      expect(others.requests[0].headers.authorization).toBeUndefined();
    });

    test('a connection that closes in the middle of the body rejects when the body is read, it does not hang', async () => {
      const res = await putObject(url('/truncated'));

      await expect(res.json()).rejects.toThrow('terminated');
    });

    test('rejects with the url and the reason when nothing answers, and keeps what fetch threw as the cause', async () => {
      const port = await closedPort(),
        refused = `http://127.0.0.1:${port}/_pages/abc@published`;

      await expect(putObject(refused)).rejects.toMatchObject({
        message: `request to ${refused} failed, reason: connect ECONNREFUSED 127.0.0.1:${port}`,
        cause: { cause: { code: 'ECONNREFUSED' } }
      });
    });

    test('rejects for a host that does not exist', async () => {
      await expect(putObject('http://no-such-host.invalid/_pages/abc')).rejects.toThrow(/^request to http:\/\/no-such-host\.invalid\/_pages\/abc failed, reason: .*ENOTFOUND/);
    });

    test('rejects for a url fetch cannot make a request to', async () => {
      await expect(putObject('ftp://127.0.0.1/_pages/abc')).rejects.toThrow('request to ftp://127.0.0.1/_pages/abc failed, reason: unknown scheme');
      await expect(putObject('not a url')).rejects.toThrow('request to not a url failed, reason: Invalid URL');
    });

    describe('when the failure has no message of its own', () => {
      const original = global.fetch;

      afterEach(() => {
        global.fetch = original;
      });

      test('says why from the addresses that were tried', async () => {
        const cause = Object.assign(new AggregateError([new Error('connect ECONNREFUSED 127.0.0.1:80'), new Error('connect ECONNREFUSED ::1:80')]), { code: 'ECONNREFUSED' });

        global.fetch = jest.fn().mockRejectedValue(new TypeError('fetch failed', { cause }));

        await expect(putObject('http://localhost/x')).rejects.toThrow('request to http://localhost/x failed, reason: connect ECONNREFUSED 127.0.0.1:80, connect ECONNREFUSED ::1:80');
      });

      test('falls back to the code, and then to the error itself', async () => {
        global.fetch = jest.fn().mockRejectedValue(new TypeError('fetch failed', { cause: Object.assign(new Error(''), { code: 'UND_ERR_SOCKET' }) }));
        await expect(putObject('http://x.test/')).rejects.toThrow('request to http://x.test/ failed, reason: UND_ERR_SOCKET');

        global.fetch = jest.fn().mockRejectedValue('plain string');
        await expect(putObject('http://x.test/')).rejects.toThrow('request to http://x.test/ failed, reason: plain string');
      });
    });
  });
  describe('readJson', () => {
    let origin, others;

    beforeAll(async () => {
      others = await listen((req, res) => json(res, 200, {}));
      origin = await listen((req, res) => (answers(others)[req.url] || answers(others)['/missing'])(res));
    });

    afterAll(() => {
      origin.server.closeAllConnections();
      others.server.closeAllConnections();
      origin.server.close();
      others.server.close();
    });

    const read = (path) => putObject(`http://127.0.0.1:${origin.port}${path}`).then(readJson);

    test('resolves with the parsed body, whatever the status', async () => {
      await expect(read('/json')).resolves.toEqual({ published: true });
      await expect(read('/gone')).resolves.toEqual({ message: 'gone' });
    });

    test('names the url when the body is not json, after the redirects were followed', async () => {
      await expect(read('/html')).rejects.toThrow(`invalid json response body at http://127.0.0.1:${origin.port}/html reason: Unexpected token '<'`);
      await expect(read('/empty')).rejects.toThrow(`invalid json response body at http://127.0.0.1:${origin.port}/empty reason: Unexpected end of JSON input`);
    });

    test('keeps the parse error as the cause', async () => {
      await expect(read('/html')).rejects.toMatchObject({ cause: { name: 'SyntaxError' } });
    });

    test('rejects as a failed request does when the connection drops in the middle of the body', async () => {
      await expect(read('/truncated')).rejects.toThrow(`request to http://127.0.0.1:${origin.port}/truncated failed, reason: other side closed`);
    });
  });
});
