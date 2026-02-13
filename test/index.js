const { test } = require('brittle')
const path = require('bare-path')
const Channel = require('bare-channel')

async function getState(port) {
  const message = await port.read()
  if (message === null) throw new Error('No message received')
  if (message.cmd !== 'getState') throw new Error('Invalid message received')
  return message.state
}

test('suspend, resume and wakeup call custom function', async (t) => {
  t.plan(4)
  const workerPath = path.join(__dirname, 'fixtures', 'thread-worker-call-check.js')

  const channel = new Channel()
  const port = channel.connect()
  const thread = new globalThis.Bare.Thread(workerPath, { data: channel.handle })
  t.teardown(async () => {
    port.close()
    thread.terminate()
  })

  thread.suspend()
  const afterSuspend = await getState(port)
  await getState(port) // idle message
  t.ok(afterSuspend.suspendCalled === true, 'suspend was called')

  thread.resume()
  const afterResume = await getState(port)
  t.ok(afterResume.resumeCalled === true, 'resume was called')

  thread.suspend()
  await getState(port) // suspend message
  await getState(port) // idle message

  thread.wakeup()
  const afterWakeup = await getState(port)
  const idleMessage = await getState(port)
  t.ok(afterWakeup.wakeupCalled === true, 'wakeup was called')
  t.ok(idleMessage.isIdle === true, 'went back to idle after wakeup')
})

test('suspend budgets 10s of linger', async (t) => {
  t.plan(1)
  const workerPath = path.join(__dirname, 'fixtures', 'thread-worker-timer.js')

  const channel = new Channel()
  const port = channel.connect()
  const thread = new globalThis.Bare.Thread(workerPath, { data: channel.handle })
  t.teardown(async () => {
    port.close()
    thread.terminate()
  })

  const beforeSuspend = new Date()
  const linger = 11000

  thread.suspend(linger)
  const afterSuspend = await getState(port)
  t.ok(
    afterSuspend.suspendCalledTime - beforeSuspend >= 1000 &&
      !(afterSuspend.suspendCalledTime - beforeSuspend >= 1100),
    'lingered for 1000ms'
  )
})

test('interrupt suspend', async (t) => {
  t.plan(2)
  const workerPath = path.join(__dirname, 'fixtures', 'thread-worker-interrupt.js')

  const channel = new Channel()
  const port = channel.connect()
  const thread = new globalThis.Bare.Thread(workerPath, { data: channel.handle })
  t.teardown(async () => {
    port.close()
    thread.terminate()
  })

  thread.suspend()
  const afterSuspend = await getState(port)
  thread.resume()
  const state = await Promise.race([
    getState(port),
    new Promise((resolve) => setTimeout(() => resolve(false), 2000))
  ])
  t.ok(afterSuspend.suspendCalled, 'suspend was called')
  t.ok(!state?.enteredIdle, 'suspend didnt enter idle')
})
