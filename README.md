# pear-suspension

Suspendify wrapper for Bare threads. Handles Bare suspend/resume/wakeup events in the child, with ordered lifecycle hooks.

```sh
npm install pear-suspension
```

## Usage

**Parent**

```js
const thread = new Bare.Thread('./worker.js')

thread.suspend(5000)
thread.resume()
```

**Child (worker.js)**

```js
const PearSuspension = require('pear-suspension')

const sus = new PearSuspension({
  async pollLinger() {
    return msLeft
  },
  async suspend() {},
  async resume() {},
  async wakeup() {}
})

sus
  .add('swarm', {
    suspend: () => swarm.suspend(),
    resume: () => swarm.resume()
  })
  .add('store', {
    suspend: () => store.suspend(),
    resume: () => store.resume()
  })
```

Registered suspensions run in registration order and resume in reverse order. In the example above, `swarm` suspends before `store`, while `store` resumes before `swarm`.

## API

#### `new PearSuspension(opts)`

Creates instance. Wires `Bare.on('suspend'/'resume'/'wakeup')`. Calls `Bare.idle()` after suspend if not interrupted.

Options:

- `pollLinger()` — optional, returns ms left to linger
- `wakeupLinger` — optional, ms to linger before suspending after wakeup
- `suspend()` — optional, called after registered suspensions
- `resume()` — optional, called after registered suspensions
- `wakeup()` — optional, called when temporarily waking
- `verbose` — optional, default `false`

#### `sus.add(name, { suspend, resume })`

Register a named suspension. Returns `sus` for chaining.

#### `sus.suspend(ms)`

Wait up to `ms` then suspend.

#### `sus.resume()`

Resume ASAP.

#### `sus.wakeup()`

Wake up then re-suspend.

## License

Apache-2.0
