'use strict';

const responses = require('../services/responses'),
  controller = require('../services/schedule'),
  route = {
    post(req, res) {
      if (!req.isAuthenticated()) {
        return responses.unauthorized(res);
      }

      return responses.expectJSON(() => {
        return controller.post(req.uri, req.body, req.user)
          .then((result) => {
            // creation success!
            res.status(201);
            return result;
          });
      }, res);
    },

    unschedule(req, res) {
      if (!req.isAuthenticated()) {
        return responses.unauthorized(res);
      }

      return responses.expectJSON(() => controller.unschedule(req.uri, req.user), res);
    },

    getList(req, res) {
      return responses.expectJSON(() => controller.getScheduleList(req.uri), res);
    },

    getItem(req, res) {
      return responses.expectJSON(() => controller.getScheduleItem(req.uri), res);
    },
  };

function routes(router) {
  router.all('/', responses.allow({ allow: ['get', 'post'] }));
  router.all('/', responses.accept({ accept: ['application/json'] }));
  router.get('/', route.getList);
  router.post('/', route.post);

  router.all('/:id', responses.allow({ allow: ['get', 'delete'] }));
  router.all('/:id', responses.accept({ accept: ['application/json'] }));
  router.get('/:id', route.getItem);
  router.delete('/:id', route.unschedule);
}

module.exports = routes;
module.exports.route = route;
