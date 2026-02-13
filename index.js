const Suspendify = require('suspendify')

class PearSuspension extends Suspendify {
  constructor(opts = {}) {
    super({
      pollLinger: opts.pollLinger,
      wakeupLinger: opts.wakeupLinger
    })

    const Bare = globalThis.Bare
    if (typeof Bare === 'undefined' || typeof Bare.on !== 'function') {
      throw new Error('PearSuspension requires global Bare')
    }

    const log = opts.verbose ? console.log.bind(console) : () => {}
    this.log = log
    this.verbose = !!opts.verbose
    this._customSuspend = typeof opts.suspend === 'function' ? opts.suspend : null
    this._customResume = typeof opts.resume === 'function' ? opts.resume : null
    this._customWakeup = typeof opts.wakeup === 'function' ? opts.wakeup : null

    Bare.on('idle', function () {
      console.log('Bare has fully idled, zzz....')
    })
    Bare.on('suspend', async (linger) => {
      linger = Math.max(linger - 10_000, 0)
      this.log('Waiting for suspendify to suspend')
      await this.suspend(linger)
    })
    Bare.on('resume', async () => {
      this.log('Bare resume')
      await this.resume()
    })
    Bare.on('wakeup', async () => {
      this.log('Bare wakeup')
      await this.wakeup()
    })
  }

  async _suspend() {
    this.log('Suspending...')
    if (this.swarm) await this.swarm.suspend()
    if (this.store) await this.store.suspend()
    if (this._customSuspend !== null) await this._customSuspend()
    if (this.interrupted) {
      this.log('interrupted skipping idle')
    } else {
      this.log('Asking bare to go Idle')
      Bare.idle()
    }
  }

  async _resume() {
    this.log('Resuming...')
    if (this.store) await this.store.resume()
    if (this.swarm) await this.swarm.resume()
    if (this._customResume !== null) await this._customResume()
    this.log('Resuming concluded')
  }

  async _wakeup() {
    this.log('Waking up...')
    if (this._customWakeup !== null) await this._customWakeup()
    this.log('Wakeup concluded')
  }
}

module.exports = PearSuspension
