# Amphora Schedule

> A scheduling module for Amphora to schedule instances publishing.

## Installation & Usage

First install the module:

```ssh
$ npm install -s amphora-postgres-redis
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

At startup time the module will create the db schema and table needed to work properly, this will be made using the amphora database adapter.

## Environmental Variables

`CLAY_SCHEDULING_ENABLED`: Must be set to `true` in order to enable `amphora-schedule` to check in intervals for publishing instances. If this is not set or equal to `false`, it will still save the schedule pages but will not publish them.

## License

MIT
