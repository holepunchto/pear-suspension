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
  resumeCalled: false,
  wakeupCalled: false,
  suspendCalledTime: 0
}

new PearSuspension({
  suspend: async () => {
    state.suspendCalled = true
    state.suspendCalledTime = new Date()
    await port.write({ cmd: 'getState', state })
  },
  resume: async () => {
    state.isIdle = false
    state.resumeCalled = true
    await port.write({ cmd: 'getState', state })
  },
  wakeup: async () => {
    state.wakeupCalled = true
    state.isIdle = false
    await port.write({ cmd: 'getState', state })
  }
})

Bare.on('idle', async function () {
  state.isIdle = true
  await port.write({ cmd: 'getState', state })
})
