const Suspendify = require('suspendify')

class PearSuspension extends Suspendify {
  constructor(opts = {}) {
    const Bare = globalThis.Bare
    if (typeof Bare === 'undefined' || typeof Bare.on !== 'function') {
      throw new Error('PearSuspension requires global Bare')
    }
    const { store, swarm, pollLinger, verbose = false, wakeupLinger } = opts
    let selfRef
    const log = verbose ? console.log.bind(console) : () => {}
    super({
      pollLinger,
      ...(wakeupLinger !== undefined && { wakeupLinger }),
      async suspend() {
        log('Suspending...')
        if (swarm && typeof swarm.suspend === 'function') await swarm.suspend()
        if (store && typeof store.suspend === 'function') await store.suspend()
        if (opts.suspend && typeof opts.suspend === 'function') await opts.suspend()
        if (selfRef?.interrupted) {
          log('interrupted skipping idle')
        } else if (typeof Bare.idle === 'function') {
          log('Asking bare to go Idle')
          Bare.idle()
        }
      },
      async resume() {
        log('Resuming...')
        if (store && typeof store.resume === 'function') await store.resume()
        if (swarm && typeof swarm.resume === 'function') await swarm.resume()
        if (opts.resume && typeof opts.resume === 'function') await opts.resume()
        log('Resuming concluded')
      },
      async wakeup() {
        log('Waking up...')
        if (opts.wakeup && typeof opts.wakeup === 'function') await opts.wakeup()
        log('Wakeup concluded')
      }
    })
    selfRef = this
    this.verbose = verbose

    Bare.on('idle', function () {
      console.log('Bare has fully idled, zzz....')
    })

    Bare.on('suspend', async (ms) => {
      log('Waiting for suspendify to suspend')
      await this.suspend(ms === undefined || ms === null ? 0 : Math.max(0, ms))
    })
    Bare.on('resume', async () => {
      log('Bare resume')
      await this.resume()
    })
    Bare.on('wakeup', async () => {
      log('Bare wakeup')
      await this.wakeup()
    })
  }
}

module.exports = PearSuspension
