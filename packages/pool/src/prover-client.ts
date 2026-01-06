/**
 * ZK Prover Client
 *
 * Promise-based wrapper for the prover web worker.
 * Provides a clean API for generating proofs without blocking the UI.
 *
 * @example
 * ```ts
 * const prover = new ProverClient()
 *
 * const proof = await prover.generateProof(input, {
 *   onProgress: (status) => console.log(status)
 * })
 *
 * prover.terminate()
 * ```
 */

import type {
  WithdrawalProofInput,
  WithdrawalProof,
  CircuitArtifacts,
  ProverStatus,
} from './types.js'
import type {
  ProverWorkerMessage,
  ProverWorkerResponse,
  WithdrawalProofInputSerialized,
} from './prover.worker.js'
import { DEFAULT_CIRCUIT_ARTIFACTS } from './prover.js'

export interface ProverClientOptions {
  /** Path to the worker script */
  workerUrl?: URL
  /** Circuit artifacts paths */
  artifacts?: CircuitArtifacts
}

export interface GenerateProofOptions {
  /** Progress callback */
  onProgress?: (status: ProverStatus) => void
  /** Abort signal for cancellation */
  signal?: AbortSignal
}

/**
 * Serialize input for postMessage (bigints → strings)
 */
function serializeInput(input: WithdrawalProofInput): WithdrawalProofInputSerialized {
  return {
    withdrawnValue: input.withdrawnValue.toString(),
    stateRoot: input.stateRoot.toString(),
    stateTreeDepth: input.stateTreeDepth,
    ASPRoot: input.ASPRoot.toString(),
    ASPTreeDepth: input.ASPTreeDepth,
    context: input.context.toString(),
    label: input.label.toString(),
    existingValue: input.existingValue.toString(),
    existingNullifier: input.existingNullifier.toString(),
    existingSecret: input.existingSecret.toString(),
    newNullifier: input.newNullifier.toString(),
    newSecret: input.newSecret.toString(),
    stateSiblings: input.stateSiblings.map((s) => s.toString()),
    stateIndex: input.stateIndex.toString(),
    ASPSiblings: input.ASPSiblings.map((s) => s.toString()),
    ASPIndex: input.ASPIndex.toString(),
  }
}

/**
 * ZK Prover Client
 *
 * Manages a web worker for proof generation with a clean Promise API.
 */
export class ProverClient {
  private worker: Worker | null = null
  private artifacts: CircuitArtifacts
  private workerUrl: URL | null

  constructor(options: ProverClientOptions = {}) {
    this.artifacts = options.artifacts ?? DEFAULT_CIRCUIT_ARTIFACTS
    this.workerUrl = options.workerUrl ?? null
  }

  /**
   * Get or create the worker instance
   */
  private getWorker(): Worker {
    if (this.worker) return this.worker

    if (typeof window === 'undefined') {
      throw new Error('ProverClient requires browser environment')
    }

    // Use provided URL or default worker from public folder
    // Note: Avoid using `new URL('./...', import.meta.url)` as it creates file:// URLs
    // that break Turbopack's NFT asset tracing during build
    const workerUrl = this.workerUrl ?? new URL('/prover.worker.js', window.location.origin)
    this.worker = new Worker(workerUrl, { type: 'module' })

    return this.worker
  }

  /**
   * Generate a withdrawal proof using the web worker.
   *
   * @param input - Withdrawal proof input
   * @param options - Generation options
   * @returns Generated proof
   */
  async generateProof(
    input: WithdrawalProofInput,
    options: GenerateProofOptions = {}
  ): Promise<WithdrawalProof> {
    const { onProgress, signal } = options

    return new Promise((resolve, reject) => {
      const worker = this.getWorker()

      // Handle abort signal
      const abortHandler = () => {
        worker.postMessage({ type: 'abort' } satisfies ProverWorkerMessage)
        reject(new Error('Proof generation aborted'))
      }

      if (signal?.aborted) {
        reject(new Error('Proof generation aborted'))
        return
      }

      signal?.addEventListener('abort', abortHandler, { once: true })

      // Handle worker messages
      const messageHandler = (event: MessageEvent<ProverWorkerResponse>) => {
        const { type } = event.data

        if (type === 'status') {
          onProgress?.(event.data.status)
        } else if (type === 'result') {
          signal?.removeEventListener('abort', abortHandler)
          worker.removeEventListener('message', messageHandler)
          worker.removeEventListener('error', errorHandler)

          // Deserialize proof (strings → bigints)
          const serialized = event.data.proof
          const proof: WithdrawalProof = {
            proof: serialized.proof,
            publicSignals: serialized.publicSignals,
            newCommitmentHash: BigInt(serialized.newCommitmentHash),
            existingNullifierHash: BigInt(serialized.existingNullifierHash),
          }

          resolve(proof)
        } else if (type === 'error') {
          signal?.removeEventListener('abort', abortHandler)
          worker.removeEventListener('message', messageHandler)
          worker.removeEventListener('error', errorHandler)

          reject(new Error(event.data.error))
        }
      }

      const errorHandler = (event: ErrorEvent) => {
        signal?.removeEventListener('abort', abortHandler)
        worker.removeEventListener('message', messageHandler)
        worker.removeEventListener('error', errorHandler)

        reject(new Error(event.message || 'Worker error'))
      }

      worker.addEventListener('message', messageHandler)
      worker.addEventListener('error', errorHandler)

      // Start proof generation
      const message: ProverWorkerMessage = {
        type: 'generate',
        input: serializeInput(input),
        artifacts: this.artifacts,
      }

      onProgress?.({ stage: 'loading', message: 'Starting worker...' })
      worker.postMessage(message)
    })
  }

  /**
   * Terminate the worker.
   * Call this when done to free resources.
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
  }
}

/**
 * Singleton prover instance for convenience.
 * Use this for most cases unless you need multiple workers.
 */
let defaultProver: ProverClient | null = null

export function getDefaultProver(): ProverClient {
  if (!defaultProver) {
    defaultProver = new ProverClient()
  }
  return defaultProver
}

/**
 * Generate a withdrawal proof using the default prover.
 * Convenience function for one-off proof generation.
 *
 * @param input - Withdrawal proof input
 * @param options - Generation options
 * @returns Generated proof
 */
export async function generateProofAsync(
  input: WithdrawalProofInput,
  options: GenerateProofOptions = {}
): Promise<WithdrawalProof> {
  return getDefaultProver().generateProof(input, options)
}
