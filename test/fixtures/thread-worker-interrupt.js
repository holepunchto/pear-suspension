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
  suspendCalled: false,
  idleEntered: false
}

new PearSuspension({
  suspend: async () => {
    state.suspendCalled = true
    await port.write({ cmd: 'getState', state })
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
})

Bare.on('idle', async function () {
  state.idleEntered = true
  await port.write({ cmd: 'getState', state })
})
