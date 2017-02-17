const test = require('tape')
const AsyncLRU = require('../')

test('pass `loadArgs` option to get()', (t) => {
  t.plan(3)

  const lru = new AsyncLRU({
    max: 2,
    load: (key, cb) => {
      t.equal(key, 'BAR')
      cb(null, 'bar')
    }
  })

  lru.get('foo', ['BAR'], (err, value) => {
    t.error(err)
    t.equal(value, 'bar')
  })
})

test('pass `loadArgs` option with multiple args to get()', (t) => {
  t.plan(4)

  const lru = new AsyncLRU({
    max: 2,
    load: (key1, key2, cb) => {
      t.equal(key1, 'BAR')
      t.equal(key2, 'BAZ')
      cb(null, 'bar')
    }
  })

  lru.get('foo', ['BAR', 'BAZ'], (err, value) => {
    t.error(err)
    t.equal(value, 'bar')
  })
})

test('clear() sets the cache to its initial state', (t) => {
  const lru = new AsyncLRU({
    max: 2,
    load: () => { t.fail('load should not be called') }
  })

  const json1 = JSON.stringify(lru._cache.cache)

  lru.set('foo', 'bar')
  lru.clear()
  const json2 = JSON.stringify(lru._cache.cache)

  t.equal(json2, json1)
  t.end()
})

test('setting keys doesn\'t grow past max size', (t) => {
  const lru = new AsyncLRU({
    max: 3,
    load: () => { t.fail('load should not be called') }
  })

  t.equal(lru.length, 0)
  lru.set('foo1', 'bar1')
  t.equal(lru.length, 1)
  lru.set('foo2', 'bar2')
  t.equal(lru.length, 2)
  lru.set('foo3', 'bar3')
  t.equal(lru.length, 3)
  lru.set('foo4', 'bar4')
  t.equal(lru.length, 3)

  t.end()
})

test('repeated gets only calls load() once', (t) => {
  t.plan(7)

  const lru = new AsyncLRU({
    max: 2,
    load: (key, cb) => {
      t.equal(key, 'foo')
      cb(null, 'bar')
    }
  })

  lru.get('foo', (err, value) => {
    t.error(err)
    t.equal(value, 'bar') // not in cache, will call load()

    lru.get('foo', (err, value) => {
      t.error(err)
      t.equal(value, 'bar') // already in cache

      lru.get('foo', (err, value) => {
        t.error(err)
        t.equal(value, 'bar') // already in cache
      })
    })
  })
})

test('maxAge option evicts old values', (t) => {
  t.plan(8)

  const lru = new AsyncLRU({
    max: 2,
    maxAge: 500,
    load: (key, cb) => {
      t.equal(key, 'foo') // CALLED 2X!
      cb(null, 'bar')
    }
  })

  lru.get('foo', (err, value) => {
    t.error(err)
    t.equal(value, 'bar') // not in cache, will call load()

    lru.get('foo', (err, value) => {
      t.error(err)
      t.equal(value, 'bar') // already in cache

      setTimeout(() => {
        lru.get('foo', (err, value) => {
          t.error(err)
          t.equal(value, 'bar') // not in cache, will call load()
        })
      }, 600)
    })
  })
})

test('setting keys returns the value', (t) => {
  t.plan(10)

  const lru = new AsyncLRU({
    max: 2,
    load: (key, cb) => {
      t.equal(key, 'foo1')
      cb(null, 'baz1')
    }
  })

  t.equal(lru.set('foo1', 'bar1'), 'bar1')
  t.equal(lru.set('foo2', 'bar2'), 'bar2')
  t.equal(lru.set('foo3', 'bar3'), 'bar3')

  lru.get('foo2', (err, value) => {
    t.error(err)
    t.equal(value, 'bar2') // already in cache

    lru.get('foo1', (err, value) => {
      t.error(err)
      t.equal(value, 'baz1') // not in cache, will call load()

      lru.get('foo1', (err, value) => {
        t.error(err)
        t.equal(value, 'baz1') // already in cache
      })
    })
  })
})

test('lru invariant is maintained for get()', (t) => {
  t.plan(13)

  const lru = new AsyncLRU({
    max: 2,
    load: (key, cb) => {
      t.pass('load called') // CALLED 4X!
      cb(null, key.replace('foo', 'bar'))
    }
  })

  lru.get('foo1', (err, value) => {
    t.error(err)
    t.equal(value, 'bar1')
    lru.get('foo2', (err, value) => {
      t.error(err)
      t.equal(value, 'bar2')
      lru.get('foo3', (err, value) => {
        t.error(err)
        t.equal(value, 'bar3')
        lru.get('foo4', (err, value) => {
          t.error(err)
          t.equal(value, 'bar4')

          t.deepEqual(lru.keys, ['foo3', 'foo4'])
        })
      })
    })
  })
})

test('do not ever have two active load() calls for same key', (t) => {
  t.plan(5)

  const lru = new AsyncLRU({
    max: 2,
    load: (key, cb) => {
      t.equal(key, 'foo1')
      setTimeout(() => cb(null, 'bar1'), 100)
    }
  })

  lru.get('foo1', (err, value) => {
    t.error(err)
    t.equal(value, 'bar1')
  })
  lru.get('foo1', (err, value) => {
    t.error(err)
    t.equal(value, 'bar1')
  })
})

test('lru invariant is maintained for get()', (t) => {
  t.plan(3)

  const lru = new AsyncLRU({
    max: 2,
    load: () => { t.fail('load should not be called') }
  })

  lru.set('foo1', 'bar1')
  lru.set('foo2', 'bar2')

  lru.get('foo1', (err, value) => {
    // now foo2 should be deleted instead of foo1

    t.error(err)
    t.equal(value, 'bar1')

    lru.set('foo3', 'bar3')
    t.deepEqual(['foo1', 'foo3'], lru.keys)
  })
})

test('lru invariant is maintained after set(), get() and remove()', (t) => {
  t.plan(3)

  const lru = new AsyncLRU({
    max: 2,
    load: () => { t.fail('load should not be called') }
  })
  lru.set('a', 1)
  lru.set('b', 2)
  lru.get('a', (err, value) => {
    t.error(err)
    t.deepEqual(value, 1)

    lru.remove('a')
    lru.set('c', 1)
    lru.set('d', 1)
    t.deepEqual(lru.keys, ['c', 'd'])
  })
})

test('lru invariant is maintained in the corner case size == 1', (t) => {
  const lru = new AsyncLRU({
    max: 1,
    load: () => { t.fail('load should not be called') }
  })
  lru.set('foo1', 'bar1')
  lru.set('foo2', 'bar2')
  lru.set('foo3', 'bar3')

  t.deepEqual(['foo3'], lru.keys)
  t.end()
})

test('peek() returns item value without changing the order', (t) => {
  t.plan(5)

  const lru = new AsyncLRU({
    max: 2,
    load: (key, cb) => {
      t.equal(key, 'foo')
      cb(null, 'baz')
    }
  })

  lru.set('foo', 'bar')
  lru.set('bar', 'baz')
  t.equal(lru.peek('foo'), 'bar')

  lru.set('baz', 'foo')
  t.equal(lru.peek('foo'), undefined)

  lru.get('foo', (err, value) => {
    t.error(err)
    t.equal(value, 'baz')
  })
})

test('set() and remove() on empty LRU is idempotent', (t) => {
  const lru = new AsyncLRU({
    load: () => { t.fail('load should not be called') }
  })
  const json1 = JSON.stringify(lru._cache.cache)
  lru.set('foo1', 'bar1')
  lru.remove('foo1')
  const json2 = JSON.stringify(lru._cache.cache)

  t.deepEqual(json2, json1)
  t.end()
})

test('2 set()s and 2 remove()s on empty LRU is idempotent', (t) => {
  const lru = new AsyncLRU({
    load: () => { t.fail('load should not be called') }
  })
  const json1 = JSON.stringify(lru._cache.cache)

  lru.set('foo1', 'bar1')
  lru.set('foo2', 'bar2')
  lru.remove('foo1')
  lru.remove('foo2')
  const json2 = JSON.stringify(lru._cache.cache)

  t.deepEqual(json2, json1)
  t.end()
})

test('2 set()s and 2 remove()s (in opposite order) on empty LRU is idempotent', (t) => {
  const lru = new AsyncLRU({
    load: () => { t.fail('load should not be called') }
  })
  const json1 = JSON.stringify(lru._cache.cache)

  lru.set('foo1', 'bar1')
  lru.set('foo2', 'bar2')
  lru.remove('foo2')
  lru.remove('foo1')
  const json2 = JSON.stringify(lru._cache.cache)

  t.deepEqual(json2, json1)
  t.end()
})

test('after setting one key, get() is idempotent', (t) => {
  t.plan(2)

  const lru = new AsyncLRU({
    load: () => { t.fail('load should not be called') }
  })
  lru.set('a', 'a')
  const json1 = JSON.stringify(lru._cache.cache)

  lru.get('a', (err, value) => {
    t.error(err)
    const json2 = JSON.stringify(lru._cache.cache)
    t.equal(json2, json1)
  })
})

test('after setting two keys, get() on last-set key is idempotent', (t) => {
  t.plan(2)

  const lru = new AsyncLRU({
    load: () => { t.fail('load should not be called') }
  })
  lru.set('a', 'a')
  lru.set('b', 'b')
  const json1 = JSON.stringify(lru._cache.cache)

  lru.get('b', (err, value) => {
    t.error(err)
    const json2 = JSON.stringify(lru._cache.cache)
    t.equal(json2, json1)
  })
})

test('`evict` event is fired when evicting old keys', (t) => {
  const lru = new AsyncLRU({
    max: 2,
    load: () => { t.fail('load should not be called') }
  })
  const events = []

  lru.on('evict', (element) => events.push(element))

  lru.set('foo1', 'bar1')
  lru.set('foo2', 'bar2')
  lru.set('foo3', 'bar3')
  lru.set('foo4', 'bar4')

  const expect = [{key: 'foo1', value: 'bar1'}, {key: 'foo2', value: 'bar2'}]
  t.deepEqual(events, expect)
  t.end()
})
