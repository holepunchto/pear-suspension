/**
 * Thread worker: PearSuspension with tracked suspend/resume/wakeup.
 * Responds to suspend, resume, wakeup, getState (returns { suspendCalled, resumeCalled, wakeupCalled }).
 */
const Bare = globalThis.Bare
const Channel = require('bare-channel')
const PearSuspension = require('../..')
const handle = Bare.Thread.self.data
const channel = Channel.from(handle)
const port = channel.connect()

const state = {
  suspendCalledTime: 0
}

new PearSuspension({
  suspend: async () => {
    state.suspendCalledTime = new Date()
    await port.write({ cmd: 'getState', state })
  }
})

Bare.on('idle', async function () {
  await port.write({ cmd: 'getState', state })
})
