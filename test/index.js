const { test } = require('brittle')
const PearSuspension = require('..')

function minimalOpts(overrides = {}) {
  return {
    suspend: async () => {},
    resume: async () => {},
    ...overrides
  }
}

test('PearSuspension instantiates and isBackgrounded is false initially', (t) => {
  t.plan(2)
  const sus = new PearSuspension(minimalOpts())
  t.ok(typeof sus.suspend === 'function')
  t.is(sus.isBackgrounded(), false)
})

test('verbose true produces logs, verbose false does not', async (t) => {
  t.plan(2)
  const logs = []
  const originalLog = console.log
  console.log = (...args) => logs.push(args.join(' '))

  const susQuiet = new PearSuspension(minimalOpts())
  await susQuiet.suspend(0)
  const quietLogCount = logs.length

  logs.length = 0
  const susVerbose = new PearSuspension(minimalOpts({ verbose: true }))
  await susVerbose.suspend(0)
  const verboseLogCount = logs.length

  console.log = originalLog

  t.is(quietLogCount, 0, 'no logs when verbose is false')
  t.ok(verboseLogCount > 0, 'logs produced when verbose is true')
})

test('PearSuspension works with optional pollLinger', (t) => {
  t.plan(1)
  const sus = new PearSuspension(minimalOpts({ pollLinger: async () => 60 }))
  t.ok(typeof sus.suspend === 'function')
})

test('suspend calls suspend callback and isBackgrounded becomes true', async (t) => {
  t.plan(2)
  let suspended = false
  const sus = new PearSuspension(
    minimalOpts({
      suspend: async () => {
        suspended = true
      }
    })
  )
  await sus.suspend(0)
  t.ok(suspended, 'suspend callback was called')
  t.is(sus.isBackgrounded(), true, 'isBackgrounded after suspend')
})

test('resume calls resume callback and isBackgrounded becomes false', async (t) => {
  t.plan(2)
  let resumed = false
  const sus = new PearSuspension(
    minimalOpts({
      resume: async () => {
        resumed = true
      }
    })
  )
  await sus.suspend(0)
  await sus.resume()
  t.ok(resumed, 'resume callback was called')
  t.is(sus.isBackgrounded(), false, 'isBackgrounded false after resume')
})

test('suspend(linger) waits before running suspend callback', async (t) => {
  t.plan(2)
  const lingerMs = 1500
  let suspendCalledAt = 0
  const startedAt = Date.now()
  const sus = new PearSuspension(
    minimalOpts({
      suspend: async () => {
        suspendCalledAt = Date.now()
      }
    })
  )
  t.comment(`waiting for ${lingerMs}ms`)
  await sus.suspend(lingerMs)
  const waited = suspendCalledAt - startedAt
  t.ok(suspendCalledAt > 0, 'suspend callback was called')
  t.ok(waited >= lingerMs - 1000, `suspend ran after ~${lingerMs}ms (waited ${waited}ms)`)
})

test('suspend calls store.suspend and swarm.suspend when provided', async (t) => {
  t.plan(3)
  let storeSuspended = false
  let swarmSuspended = false
  const sus = new PearSuspension({
    store: {
      close: () => {},
      suspend: async () => {
        storeSuspended = true
      }
    },
    swarm: {
      destroy: () => {},
      suspend: async () => {
        swarmSuspended = true
      }
    },
    suspend: async () => {},
    resume: async () => {}
  })
  await sus.suspend(0)
  t.ok(storeSuspended, 'store.suspend() was called')
  t.ok(swarmSuspended, 'swarm.suspend() was called')
  t.ok(sus.isBackgrounded(), 'is backgrounded after suspend')
})

test('Bare.Thread is available when running in Bare', (t) => {
  t.plan(1)
  if (typeof globalThis.Bare === 'undefined') {
    t.skip('Bare not available')
    return
  }
  t.ok(globalThis.Bare.Thread, 'Bare.Thread available')
})

test('thread fixture: suspend/resume via bare-channel', async (t) => {
  t.plan(3)
  if (typeof globalThis.Bare === 'undefined' || !globalThis.Bare.Thread) {
    t.skip('Bare.Thread not available')
    return
  }
  let Channel
  try {
    Channel = require('bare-channel')
  } catch (err) {
    t.pass('skipped: bare-channel unavailable')
    t.pass('skipped')
    t.pass('skipped')
    return
  }
  const path = require('bare-path')
  const workerPath = path.join(__dirname, 'fixtures', 'suspension-thread-worker.js')

  const channel = new Channel()
  const port = channel.connect()
  const thread = new globalThis.Bare.Thread(workerPath, { data: channel.handle })
  await new Promise((r) => setTimeout(r, 150))

  function send(cmd, linger) {
    port.write(JSON.stringify({ cmd, linger }) + '\n')
  }
  function recv() {
    return new Promise((resolve) => {
      let buf = ''
      const onData = (chunk) => {
        buf += chunk.toString()
        const i = buf.indexOf('\n')
        if (i !== -1) {
          port.removeListener('data', onData)
          resolve(JSON.parse(buf.slice(0, i)))
        }
      }
      port.on('data', onData)
    })
  }

  async function getState() {
    send('getState')
    return recv()
  }

  // Thread-like API wrapping channel communication
  async function suspend(linger = 0) {
    send('suspend', linger)
    return recv()
  }
  async function resume() {
    send('resume')
    return recv()
  }

  const r0 = await getState()
  t.ok(r0 && r0.ok && r0.isBackgrounded === false, 'initial state not backgrounded')

  const r1 = await suspend(0)
  t.ok(r1 && r1.ok && r1.isBackgrounded === true, 'after suspend is backgrounded')

  const r2 = await resume()
  t.ok(r2 && r2.ok && r2.isBackgrounded === false, 'after resume not backgrounded')

  port.end()
  thread.join()
})
