'use strict'

const EventEmitter = require('events')
const LRU = require('lru')

class AsyncCache extends EventEmitter {
  constructor (opts) {
    super()

    if (!opts) opts = {}
    if (!opts.load) throw new Error('Missing required `opts.load` option')

    this._cache = new LRU(opts)
    this._load = opts.load
    this._loading = {}

    this._cache.on('evict', elem => this.emit('evict', elem))
  }

  get length () {
    return this._cache.length
  }

  get keys () {
    return this._cache.keys
  }

  set (key, value) {
    return this._cache.set(key, value)
  }

  get (key, cb) {
    if (this._loading[key]) {
      return this._loading[key].push(cb)
    }

    const cached = this._cache.get(key)
    if (cached !== undefined) {
      return process.nextTick(() => cb(null, cached))
    }

    this._loading[key] = [ cb ]

    this._load(key, (err, value) => {
      if (!err) this._cache.set(key, value)

      const cbs = this._loading[key]
      if (cbs) {
        delete this._loading[key]
        cbs.forEach((cb) => cb(err, value))
      }
    })
  }

  peek (key) {
    return this._cache.peek(key)
  }

  remove (key) {
    return this._cache.remove(key)
  }

  clear () {
    return this._cache.clear()
  }
}

module.exports = AsyncCache
