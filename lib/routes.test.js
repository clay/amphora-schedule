'use strict';

const { removeExtension, setupRoutes } = require('./routes'),
  files = require('nymag-fs'),
  path = require('path');

describe('routes', () => {
  describe('removeExtension', () => {
    test('removes the extension from an url', () => {
      const url = 'google.com';

      expect(removeExtension(url)).toBe('google');
    });

    test('removes the extension from an url with endlash', () => {
      const url = '/google.com';

      expect(removeExtension(url)).toBe('/google');
    });

    test('does not removes the extension from an bad url', () => {
      const url = 'google';

      expect(removeExtension(url)).toBe('google');
    });
  });

  describe('setUpRoutes', ()=> {
    const sites = files.getFiles([__dirname, 'routes'].join(path.sep)),
      router = {
        use: jest.fn()
      };

    test('sets up the schedule routes for each site', () => {
      setupRoutes(router);

      expect(router.use.mock.calls.length).toBe(sites.length);

      sites.forEach((site, index) => {
        expect(router.use.mock.calls[index][0]).toEqual(`/${removeExtension(site)}`);
      });
    });
  });
});
