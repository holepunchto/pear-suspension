const { test } = require('brittle')
const Channel = require('bare-channel')
const Thread = require('bare-thread')

async function getState(port) {
  const message = await port.read()
  if (message === null) throw new Error('No message received')
  if (message.cmd !== 'getState') throw new Error('Invalid message received')
  return message.state
}

function spawnWorker(file, handle) {
  return new Thread(require.resolve(file), { data: handle })
}

test('suspend, resume and wakeup call constructor hooks', async (t) => {
  t.plan(4)

  const channel = new Channel()
  const port = channel.connect()
  const thread = spawnWorker('./fixtures/thread-worker-call-check.js', channel.handle)
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

test('added suspensions use stack order', async (t) => {
  t.plan(2)

  const channel = new Channel()
  const port = channel.connect()
  const thread = spawnWorker('./fixtures/thread-worker-order.js', channel.handle)
  t.teardown(async () => {
    port.close()
    thread.terminate()
  })

  thread.suspend()
  const afterSuspend = await getState(port)
  t.alike(
    afterSuspend.calls,
    ['suspend:swarm', 'suspend:store', 'suspend:extra'],
    'suspended in insertion order'
  )
  thread.resume()
  const afterResume = await getState(port)
  t.alike(
    afterResume.calls,
    [
      'suspend:swarm',
      'suspend:store',
      'suspend:extra',
      'resume:extra',
      'resume:store',
      'resume:swarm'
    ],
    'resumed in reverse order'
  )
})

test('suspend budgets 10s of linger', async (t) => {
  t.plan(1)

  const channel = new Channel()
  const port = channel.connect()
  const thread = spawnWorker('./fixtures/thread-worker-timer.js', channel.handle)
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

  const channel = new Channel()
  const port = channel.connect()
  const thread = spawnWorker('./fixtures/thread-worker-interrupt.js', channel.handle)
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
  t.ok(!state?.idleEntered, 'suspend didnt enter idle')
})
