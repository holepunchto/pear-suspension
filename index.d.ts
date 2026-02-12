export interface PearSuspensionOptions {
  /** Corestore instance; suspended via .close() on suspend. */
  store?: { close(): Promise<void> }
  /** Hyperswarm instance; suspended via .destroy() on suspend. */
  swarm?: { destroy(): Promise<void> }
  /** Bare-rpc instance; suspended via .close() on suspend. */
  rpc?: { close(): Promise<void> }
  /** Optional. Return milliseconds left to linger (passed to Suspendify). */
  pollLinger?(): Promise<number>
  /** Optional. Called after store/swarm/rpc are suspended. */
  suspend?(): Promise<void>
  /** Optional. Called when resuming. */
  resume?(): Promise<void>
  /** Optional. Logger; default is (prefix, logs++, ...msg) => console.log(prefix, logs++, ...msg) with prefix from opts.prefix or random. */
  log?(...msg: unknown[]): void
  /** Optional. Prefix for default logger (ignored if opts.log is provided). */
  prefix?: string
}

declare class PearSuspension {
  constructor(opts?: PearSuspensionOptions)

  /** Wait up to linger ms then run suspend. */
  suspend(linger?: number): Promise<void>
  /** Resume ASAP. */
  resume(): Promise<void>
  wakeup(): Promise<void>
  resuspend(linger?: number): Promise<void>

  readonly suspending: boolean
  readonly suspended: boolean
  readonly resuming: boolean
  readonly resumed: boolean
  waitForResumed(): Promise<void>

  /** Whether the app is currently suspended or in the process of suspending. */
  isBackgrounded(): boolean
}

export default PearSuspension
