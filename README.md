# Amphora Schedule

> A scheduling module for Amphora to schedule pages/layouts to so those can be published at a future date.

## Requirements

Node 26.12.1 or later (publishing uses the built-in `fetch`).

## Installation & Usage

First install the module:

```ssh
$ npm install -s amphora-schedule
```

Then pass the module into Amphora as an item for the `plugins` array property.

```javascript
amphora({
  ...
  plugins: [
    ...
    require('amphora-schedule'),
    ...
  ],
  ...
})
```

At startup time the module will create the db schema and table needed to work properly  (a new `schedule` schema with `pages` -- each with their own `id` and `data`), this is done using the amphora database adapter. After the database is ready, this module will act as any other amphora plugin that sets up
a route -- `domain/_schedule` in this case -- and handles requests made to that route.

What makes this plugin "special" is its ability to frequently "poll" the database looking for scheduled pages (in the new table) in order to publish them. This logic is implemented in the `schedule.js` file inside the services folder. There will be an interval delay that determines the "polling" frequency.

The main reason this was made as an external module and not part of `amphora`'s core, is to make it an optional feature that any `amphora` instance could use.

A GET request to the `domain/_schedule` endpoint will return an array of objects that look like the following:

```
  {
    "id": "domain/_schedule/id",
    "data": {
      "at": 1671541200000,
      "publish": "domain/_pages/clbr3qz9600000iddckqyk2oj"
  }
```

To schedule a page a POST request has to be made to the `_schedule` route with a payload object that looks like the following:

```
  {
    "at": 1671645600050,
    "publish": "domain/_pages/id"
  }
```

Where `at` is the desired time in the future when the page should be published, and `publish` is the URI of the page that would be published.

To unschedule a page a DELETE request has to be made to the same route with the `id` as part of the URL. It will like the following:

```
  domain/_schedule/id
```

The `id` is generated when the page is scheduled.

## Publishing, and what happens when it fails

While `CLAY_SCHEDULING_ENABLED` is `true` the process looks, every 50 to 60 seconds (picked at random when it starts), for the rows whose `at` has passed, and publishes each page by sending `PUT <page url>@published`, with the token in `CLAY_ACCESS_KEY` as its `Authorization` header and no body. Nobody is waiting for the answer, so the logs are the only place a failure shows up:

| What the instance answers | The row | Logged |
| --- | --- | --- |
| JSON, with a status of 2xx | deleted, the page is marked as not scheduled | nothing |
| JSON, with any other status | deleted, the page is marked as not scheduled | `failed to publish url from schedule: [status] text`, with `url` and `status` |
| A body that is not JSON (empty, an HTML error page) | kept, so the next interval tries again | the error |
| Nothing: connection refused or reset, a DNS failure, a host that does not exist | kept, so the next interval tries again | the error |

Every failure is logged through [clay-log](https://github.com/clay/clay-log) at the `error` level, with the Error as `error` (its kind, message, stack and causes), the `id` of the row and the `publish` url. A row that is still being published when the next interval starts is left to the first one.

## Environmental Variables

`CLAY_SCHEDULING_ENABLED`: Must be set to `true` in order to enable `amphora-schedule` to check, between intervals, for publishing instances. If this is not set or equal to `false`, it will still save the schedule pages but will not publish them.

`CLAY_ACCESS_KEY`: The access key sent as `Authorization: Token <key>` when a scheduled page is published.

## License

MIT
