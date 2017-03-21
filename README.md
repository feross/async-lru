# async-lru [![travis][travis-image]][travis-url] [![npm][npm-image]][npm-url] [![downloads][downloads-image]][downloads-url] [![javascript style guide][standard-image]][standard-url]

[travis-image]: https://img.shields.io/travis/feross/async-lru/master.svg
[travis-url]: https://travis-ci.org/feross/async-lru
[npm-image]: https://img.shields.io/npm/v/async-lru.svg
[npm-url]: https://npmjs.org/package/async-lru
[downloads-image]: https://img.shields.io/npm/dm/async-lru.svg
[downloads-url]: https://npmjs.org/package/async-lru
[standard-image]: https://img.shields.io/badge/code_style-standard-brightgreen.svg
[standard-url]: https://standardjs.com

### A simple async LRU cache supporting O(1) set, get and eviction of old keys

Also works in the browser with [browserify](http://browserify.org/)!

## install

```
npm install async-lru
```

## usage

```js
const AsyncLRU = require('async-lru')
const fs = require('fs')

const lru = new AsyncLRU({
  max: 2,
  load: (key, cb) => {
    fs.readFile(key, cb)
  }
})

lru.get('file.txt', (err, value) => { // not in cache, calls load()
  lru.get('file.txt', (err, value) => { // cached, will NOT call load()
    // ...
  })
})
```

### Differences from [`lru`](https://www.npmjs.com/package/lru)

Since values are fetched asynchronously, the `get` method takes a callback, rather
than returning the value synchronously.

While there is a `set(key, value)` method to manually seed the cache, typically
you'll just call `get` and let the `load` function fetch the key for you.

Keys must uniquely identify a single object, and must contain all the information
required to fetch an object.

## API

### `lru = AsyncLRU(opts)`

Create a new AsyncLRU cache. You must pass an options map with a `load` option:

```js
{
  load: function (key, callback) {
    callback(null, 'value') // get the data from an asyncronous store
  }
}
```

Optional options:

```js
{
  max: maxElementsToStore,
  maxAge: maxAgeInMilliseconds
}
```

If you pass `max`, items will be evicted if the cache is storing more than `max` items.
If you pass `maxAge`, items will be evicted if they are older than `maxAge` when you access them.

**Returns**: the newly created AsyncLRU cache

### `lru.length`

The number of keys currently in the cache.

### `lru.keys`

Array of all the keys currently in the cache.

### `lru.set(key, value)`

Set the value of the key and mark the key as most recently used.

**Returns**: `value`

### `lru.get(key, [loadArgs], callback)`

Query the value of the key and mark the key as most recently used.

If the key is in the cache, then calls `callback(null, cached)` on `nextTick`.
Otherwise, calls `load(key, callback)` where `load` is the function that was
supplied in the options object. If it doesn't return an error, then cache the
result. Multiple `get` calls with the same `key` will only ever have a single
`load` call at the same time.

Optionally, specify `loadArgs` if you want a custom array of arguments to be passed
into `load` instead of `key`, like `load.apply(null, loadArgs.concat(callback))`.

### `lru.peek(key)`

Query the value of the key without marking the key as most recently used.

**Returns**: value of key if found; `undefined` otherwise.

### `lru.remove(key)`

Remove the value from the cache.

**Returns**: value of key if found; `undefined` otherwise.

### `lru.clear()`

Clear the cache. This method does **NOT** emit the `evict` event.

### `lru.on(event, callback)`

Respond to events. Currently only the `evict` event is implemented. When a key is
evicted, the callback is executed with an associative array containing the evicted
key: `{key: key, value: value}`.

## license

MIT. Copyright (c) [Feross Aboukhadijeh](http://feross.org).
