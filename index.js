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
    this._suspensions = []
    this._customSuspend = typeof opts.suspend === 'function' ? opts.suspend : null
    this._customResume = typeof opts.resume === 'function' ? opts.resume : null
    this._customWakeup = typeof opts.wakeup === 'function' ? opts.wakeup : null

    Bare.on('idle', function () {
      log('Bare has fully idled, zzz....')
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

  add(name, suspension) {
    this._suspensions.push({ name, suspension })
    return this
  }

  async _suspend() {
    this.log('Suspending...')
    for (const { name, suspension } of this._suspensions) {
      this.log(`Suspending ${name}`)
      await suspension.suspend()
    }
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
    for (let i = this._suspensions.length - 1; i >= 0; i--) {
      const { name, suspension } = this._suspensions[i]
      this.log(`Resuming ${name}`)
      await suspension.resume()
    }
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
