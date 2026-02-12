const { test } = require('brittle')
const path = require('bare-path')
const Channel = require('bare-channel')

test('thread: suspend, resume and wakeup are called via thread.suspend() / thread.resume() / thread.wakeup()', async (t) => {
  t.plan(5)
  const workerPath = path.join(__dirname, 'fixtures', 'thread-worker.js')

  const channel = new Channel()
  const port = channel.connect()
  const thread = new globalThis.Bare.Thread(workerPath, { data: channel.handle })
  t.teardown(async () => {
    port.close()
    thread.terminate()
  })

  async function getState() {
    const message = await port.read()
    if (message === null) throw new Error('No message received')
    if (message.cmd !== 'getState') throw new Error('Invalid message received')
    return message.state
  }

  const beforeSuspend = new Date()
  const linger = 1000
  t.comment(`lingering for ${linger}ms`)
  thread.suspend(linger)
  const afterSuspend = await getState()
  await getState() // idle message
  t.ok(afterSuspend.suspendCalled === true, 'suspend was called')
  t.ok(afterSuspend.suspendCalledTime - beforeSuspend >= 1000, 'suspend took at least 1000ms')

  thread.resume()
  const afterResume = await getState()
  t.ok(afterResume.resumeCalled === true, 'resume was called')

  thread.suspend()
  await getState() // suspend message
  await getState() // idle message

  thread.wakeup()
  const afterWakeup = await getState()
  const idleMessage = await getState()
  t.ok(afterWakeup.wakeupCalled === true, 'wakeup was called')
  t.ok(idleMessage.isIdle === true, 'went back to idle after wakeup')
})
