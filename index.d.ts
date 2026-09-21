export interface Suspension {
  suspend(): void | Promise<void>
  resume(): void | Promise<void>
}

export interface PearSuspensionOptions {
  /** Optional. Return milliseconds left to linger (passed to Suspendify). */
  pollLinger?(): number | Promise<number>
  /** Optional milliseconds to linger before suspending after wakeup. */
  wakeupLinger?: number
  /** Optional. Called after registered suspensions are suspended. */
  suspend?(): void | Promise<void>
  /** Optional. Called after registered suspensions are resumed. */
  resume?(): void | Promise<void>
  /** Optional. Called when temporarily waking from suspension. */
  wakeup?(): void | Promise<void>
  /** Optional. Enable logs. Default false. */
  verbose?: boolean
}

declare class PearSuspension {
  constructor(opts?: PearSuspensionOptions)

  /** Register a named suspension. */
  add(name: string, suspension: Suspension): this

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
  readonly interrupted: boolean
  waitForResumed(): Promise<void>
}

export default PearSuspension
