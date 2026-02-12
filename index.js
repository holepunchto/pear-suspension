const Suspendify = require('suspendify')

class PearSuspension extends Suspendify {
  constructor(opts = {}) {
    const Bare = globalThis.Bare
    if (typeof Bare === 'undefined' || typeof Bare.on !== 'function') {
      throw new Error('PearSuspension requires global Bare')
    }
    const { store, swarm, pollLinger, suspend = noop, resume = noop, verbose = false } = opts
    const selfRef = { current: null }
    const log = verbose ? console.log.bind(console) : () => {}
    super({
      pollLinger,
      async suspend() {
        log('Suspending...')
        if (store && typeof store.close === 'function') await store.suspend()
        if (swarm && typeof swarm.destroy === 'function') await swarm.suspend()
        await suspend()
        if (selfRef.current.interrupted) {
          log('interrupted skipping idle')
        } else if (typeof Bare.idle === 'function') {
          log('Asking bare to go Idle')
          Bare.idle()
        }
      },
      async resume() {
        log('Resuming...')
        await resume()
        log('Resuming concluded')
      }
    })
    selfRef.current = this
    this.verbose = verbose

    Bare.on('idle', function () {
      this.verbose && console.log('Bare has fully idled, zzz....')
    })

    Bare.on('suspend', (linger) => {
      const ms = linger === undefined || linger === null ? 0 : Math.max(0, linger)
      log('Bare suspend, linger', ms)
      log('Asking suspendify to suspend')
      this.suspend(ms)
    })
    Bare.on('resume', () => {
      log('Bare resume')
      this.resume()
    })
    Bare.on('wakeup', () => {
      log('Bare wakeup')
      this.wakeup()
    })
  }

  isBackgrounded() {
    return this.suspended || this.suspending
  }
}

function noop() {}

module.exports = PearSuspension
