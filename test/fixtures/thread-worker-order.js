const Bare = globalThis.Bare
const Channel = require('bare-channel')
const PearSuspension = require('../..')
const handle = Bare.Thread.self.data
const channel = Channel.from(handle)
const port = channel.connect()

const state = {
  calls: []
}

const swarm = {
  suspend: () => {
    state.calls.push('suspend:swarm')
  },
  resume: async () => {
    state.calls.push('resume:swarm')
    await port.write({ cmd: 'getState', state })
  }
}

const store = {
  suspend: () => {
    state.calls.push('suspend:store')
  },
  resume: () => {
    state.calls.push('resume:store')
  }
}

const suspension = new PearSuspension()

suspension.add('swarm', swarm)
suspension.add('store', store)
suspension.add('extra', {
  suspend: () => {
    state.calls.push('suspend:extra')
  },
  resume: () => {
    state.calls.push('resume:extra')
  }
})

Bare.on('idle', async function () {
  await port.write({ cmd: 'getState', state })
})
