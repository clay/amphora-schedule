'use strict';

const { withAuthLevel, authLevels } = require('../services/auth'),
  responses = require('../services/responses'),
  controller = require('../services/schedule'),
  route = {
    post(req, res) {
      return responses.expectJSON(() => {
        return controller.post(req.uri, req.body, req.user)
          .then((result) => {
            // creation success!
            res.status(201);
            return result;
          });
      }, res);
    },

    del(req, res) {
      return responses.expectJSON(() => controller.del(req.uri, req.user), res);
    },

    getList(req, res) {
      return responses.expectJSON(() => controller.getScheduleList(req.uri), res);
    },

    getItem(req, res) {
      return responses.expectJSON(() => controller.getScheduleItem(req.uri), res);
    },
  };

function routes(router) {
  router.all('/', responses.methodNotAllowed({ allow: ['get', 'post'] }));
  router.all('/', responses.notAcceptable({ accept: ['application/json'] }));
  router.get('/', route.getList);
  router.post('/', withAuthLevel(authLevels.WRITE));
  router.post('/', route.post);

  router.all('/:id', responses.methodNotAllowed({ allow: ['get', 'delete'] }));
  router.all('/:id', responses.notAcceptable({ accept: ['application/json'] }));
  router.get('/:id', route.getItem);
  router.delete('/:id', withAuthLevel(authLevels.WRITE));
  router.delete('/:id', route.del);
}

module.exports = routes;
module.exports.route = route;
