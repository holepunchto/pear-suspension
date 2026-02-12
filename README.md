# pear-suspension

Suspendify wrapper for Pear threads. Handles Bare suspend/resume/wakeup events in the child, with optional store and swarm hooks.

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
  store,
  swarm,
  async pollLinger() {
    return msLeft
  },
  async suspend() {},
  async resume() {}
})
```

## API

#### `new PearSuspension(opts)`

Creates instance. Wires `Bare.on('suspend'/'resume'/'wakeup')`. Calls `Bare.idle()` after suspend if not interrupted.

Options:

- `store` — optional, called `.suspend()` on suspend
- `swarm` — optional, called `.suspend()` on suspend
- `pollLinger()` — optional, returns ms left to linger
- `suspend()` — optional, called after store/swarm
- `resume()` — optional, called on resume
- `verbose` — optional, default `false`

#### `sus.suspend(ms)`

Wait up to `ms` then suspend.

#### `sus.resume()`

Resume ASAP.

#### `sus.wakeup()`

Wake up then re-suspend.

#### `sus.isBackgrounded()`

Returns `true` when suspended or suspending.

## License

Apache-2.0
