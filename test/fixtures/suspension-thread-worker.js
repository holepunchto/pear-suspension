/**
 * Thread fixture: worker uses PearSuspension (global Bare in this thread).
 * Receives commands via bare-channel, drives suspend/resume/wakeup (same as Bare would), sends state back.
 */
const Bare = globalThis.Bare
const Channel = require('bare-channel')
const PearSuspension = require('../..')

const handle = Bare.Thread.self.data
const channel = Channel.from(handle)
const duplex = channel.connect()

const sus = new PearSuspension({
  suspend: async () => {},
  resume: async () => {}
})

const adapter = {
  _buf: '',
  _ended: false,
  async read() {
    if (this._ended) return null
    while (true) {
      const i = this._buf.indexOf('\n')
      if (i !== -1) {
        const line = this._buf.slice(0, i)
        this._buf = this._buf.slice(i + 1)
        return JSON.parse(line)
      }
      const chunk = await new Promise((resolve) => {
        const onData = (c) => resolve(c)
        duplex.once('data', onData)
        duplex.once('end', () => {
          duplex.removeListener('data', onData)
          resolve(null)
        })
      })
      if (chunk === null) {
        this._ended = true
        return null
      }
      this._buf += chunk.toString()
    }
  },
  async write(obj) {
    if (!duplex.writable) return
    duplex.write(JSON.stringify(obj) + '\n')
  }
}

;(async () => {
  while (true) {
    const msg = await adapter.read()
    if (msg === null) break
    let response = { ok: false }
    try {
      if (msg.cmd === 'suspend') {
        const linger = msg.linger !== null && msg.linger !== undefined ? msg.linger : 0
        sus.suspend(linger)
        await new Promise((r) => setTimeout(r, 60))
        response = { ok: true, isBackgrounded: sus.isBackgrounded() }
      } else if (msg.cmd === 'resume') {
        sus.resume()
        await new Promise((r) => setTimeout(r, 60))
        response = { ok: true, isBackgrounded: sus.isBackgrounded() }
      } else if (msg.cmd === 'wakeup') {
        sus.wakeup()
        await new Promise((r) => setTimeout(r, 60))
        response = { ok: true, isBackgrounded: sus.isBackgrounded() }
      } else if (msg.cmd === 'getState') {
        response = { ok: true, isBackgrounded: sus.isBackgrounded() }
      } else {
        response = { ok: false, error: 'unknown cmd' }
      }
    } catch (err) {
      response = { ok: false, error: String(err.message) }
    }
    await adapter.write(response)
  }
})().catch(() => {})
