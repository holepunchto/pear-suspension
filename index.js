const Suspendify = require('suspendify')

/**
 * Minimal v0: extends Suspendify, suspends corestore (opts.store), hyperswarm (opts.swarm),
 * , hooks Bare.on('suspend'/'resume'/'wakeup'), and calls Bare.idle() after suspend when not interrupted.
 */
class PearSuspension extends Suspendify {
  constructor(opts = {}) {
    const Bare = globalThis.Bare
    if (typeof Bare === 'undefined' || typeof Bare.on !== 'function') {
      throw new Error('PearSuspension requires global Bare')
    }
    const { store, swarm, pollLinger, suspend = noop, resume = noop, verbose = false } = opts
    const selfRef = { current: null }
    super({
      pollLinger,
      async suspend() {
        this.verbose && console.log('Suspending...')
        if (store && typeof store.close === 'function') await store.suspend()
        if (swarm && typeof swarm.destroy === 'function') await swarm.suspend()
        await suspend()
        if (selfRef.current.interrupted) {
          this.verbose && console.log('interrupted skipping idle')
        } else if (typeof Bare.idle === 'function') {
          this.verbose && console.log('Asking bare to go Idle')
          Bare.idle()
        }
      },
      async resume() {
        this.verbose && console.log('Resuming...')
        await resume()
        this.verbose && console.log('Resuming concluded')
      }
    })
    selfRef.current = this
    this.verbose = verbose

    Bare.on('suspend', (linger) => {
      const ms = linger === undefined || linger === null ? 0 : Math.max(0, linger)
      this.verbose && console.log('Bare suspend, linger', ms)
      this.verbose && console.log('Asking suspendify to suspend')
      this.suspend(ms)
    })
    Bare.on('resume', () => {
      this.verbose && console.log('Bare resume')
      this.resume()
    })
    Bare.on('wakeup', () => {
      this.verbose && console.log('Bare wakeup')
      this.wakeup()
    })
  }

  isBackgrounded() {
    return this.suspended || this.suspending
  }
}

function noop() {}

module.exports = PearSuspension
