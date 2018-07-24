'use strict';

const { putObject, jsonHeaders } = require('./rest'),
  nodeFetch = require('node-fetch');

jest.mock('node-fetch');

describe('rest', () => {
  describe('putObject', () => {
    test('makes a put request for a component instance', () => {
      const url = 'http://some.com/_components/some/instances/someinstance',
        data = {
          some: 'somedata'
        },
        config = { method: 'PUT', body: JSON.stringify(data), headers: jsonHeaders };

      nodeFetch.mockResolvedValue(Promise.resolve());

      return putObject(url, data).then(() => {
        expect(nodeFetch.mock.calls.length).toBe(1);
        expect(nodeFetch.mock.calls[0][0]).toBe(url);
        expect(nodeFetch.mock.calls[0][1]).toEqual(config);
      });
    });
  });
});
