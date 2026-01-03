/**
 * ZK Prover Web Worker
 *
 * Runs CPU-intensive proof generation in a separate thread.
 * This prevents UI blocking during the 10-30 second proof computation.
 *
 * Usage:
 * ```ts
 * const worker = new Worker(new URL('./prover.worker.ts', import.meta.url))
 * worker.postMessage({ type: 'generate', input, artifacts })
 * worker.onmessage = (e) => console.log(e.data)
 * ```
 */

import type { WithdrawalProofInput, CircuitArtifacts, ProverStatus } from './types.js'

/** Message types for worker communication */
export type ProverWorkerMessage =
  | { type: 'generate'; input: WithdrawalProofInputSerialized; artifacts: CircuitArtifacts }
  | { type: 'abort' }

/** Serialized input (bigints as strings for postMessage) */
export interface WithdrawalProofInputSerialized {
  withdrawnValue: string
  stateRoot: string
  stateTreeDepth: number
  ASPRoot: string
  ASPTreeDepth: number
  context: string
  label: string
  existingValue: string
  existingNullifier: string
  existingSecret: string
  newNullifier: string
  newSecret: string
  stateSiblings: string[]
  stateIndex: string
  ASPSiblings: string[]
  ASPIndex: string
}

/** Response types from worker */
export type ProverWorkerResponse =
  | { type: 'status'; status: ProverStatus }
  | { type: 'result'; proof: ProofSerialized }
  | { type: 'error'; error: string }

/** Serialized proof (bigints as strings) */
export interface ProofSerialized {
  proof: {
    pi_a: [string, string, string]
    pi_b: [[string, string], [string, string], [string, string]]
    pi_c: [string, string, string]
    protocol: 'groth16'
    curve: 'bn128'
  }
  publicSignals: string[]
  newCommitmentHash: string
  existingNullifierHash: string
}

/**
 * Deserialize input from postMessage
 */
function deserializeInput(serialized: WithdrawalProofInputSerialized): WithdrawalProofInput {
  return {
    withdrawnValue: BigInt(serialized.withdrawnValue),
    stateRoot: BigInt(serialized.stateRoot),
    stateTreeDepth: serialized.stateTreeDepth,
    ASPRoot: BigInt(serialized.ASPRoot),
    ASPTreeDepth: serialized.ASPTreeDepth,
    context: BigInt(serialized.context),
    label: BigInt(serialized.label),
    existingValue: BigInt(serialized.existingValue),
    existingNullifier: BigInt(serialized.existingNullifier),
    existingSecret: BigInt(serialized.existingSecret),
    newNullifier: BigInt(serialized.newNullifier),
    newSecret: BigInt(serialized.newSecret),
    stateSiblings: serialized.stateSiblings.map((s) => BigInt(s)),
    stateIndex: BigInt(serialized.stateIndex),
    ASPSiblings: serialized.ASPSiblings.map((s) => BigInt(s)),
    ASPIndex: BigInt(serialized.ASPIndex),
  }
}

/**
 * Send status update to main thread
 */
function sendStatus(status: ProverStatus): void {
  self.postMessage({ type: 'status', status } satisfies ProverWorkerResponse)
}

/**
 * Generate proof in worker context
 */
async function generateProofInWorker(
  serializedInput: WithdrawalProofInputSerialized,
  artifacts: CircuitArtifacts
): Promise<void> {
  try {
    sendStatus({ stage: 'loading', message: 'Loading snarkjs...' })

    // Dynamic import inside worker
    const snarkjs = await import('snarkjs')
    const { poseidon } = await import('maci-crypto/build/ts/hashing')

    const input = deserializeInput(serializedInput)

    sendStatus({ stage: 'loading', message: 'Loading circuit artifacts...' })

    // Prepare circuit inputs
    const circuitInputs = prepareCircuitInputsInWorker(input)

    sendStatus({ stage: 'computing', message: 'Computing witness...', progress: 20 })

    // Generate proof
    sendStatus({ stage: 'computing', message: 'Generating ZK proof...', progress: 40 })

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      circuitInputs,
      artifacts.wasmPath,
      artifacts.zkeyPath
    )

    sendStatus({ stage: 'computing', message: 'Finalizing...', progress: 90 })

    // Compute output hashes
    const existingNullifierHash = poseidon([input.existingNullifier])
    const newPrecommitment = poseidon([input.newNullifier, input.newSecret])
    const newValue = input.existingValue - input.withdrawnValue
    const newCommitmentHash = poseidon([newValue, input.label, newPrecommitment])

    const result: ProofSerialized = {
      proof: proof as ProofSerialized['proof'],
      publicSignals,
      newCommitmentHash: newCommitmentHash.toString(),
      existingNullifierHash: existingNullifierHash.toString(),
    }

    self.postMessage({ type: 'result', proof: result } satisfies ProverWorkerResponse)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    self.postMessage({ type: 'error', error: message } satisfies ProverWorkerResponse)
  }
}

/**
 * Prepare inputs for circuit (worker version)
 */
function prepareCircuitInputsInWorker(
  input: WithdrawalProofInput
): Record<string, string | string[]> {
  const MAX_TREE_DEPTH = 32

  const paddedStateSiblings = [...input.stateSiblings]
  while (paddedStateSiblings.length < MAX_TREE_DEPTH) {
    paddedStateSiblings.push(BigInt(0))
  }

  const paddedASPSiblings = [...input.ASPSiblings]
  while (paddedASPSiblings.length < MAX_TREE_DEPTH) {
    paddedASPSiblings.push(BigInt(0))
  }

  return {
    withdrawnValue: input.withdrawnValue.toString(),
    stateRoot: input.stateRoot.toString(),
    stateTreeDepth: input.stateTreeDepth.toString(),
    ASPRoot: input.ASPRoot.toString(),
    ASPTreeDepth: input.ASPTreeDepth.toString(),
    context: input.context.toString(),
    label: input.label.toString(),
    existingValue: input.existingValue.toString(),
    existingNullifier: input.existingNullifier.toString(),
    existingSecret: input.existingSecret.toString(),
    newNullifier: input.newNullifier.toString(),
    newSecret: input.newSecret.toString(),
    stateSiblings: paddedStateSiblings.map((s) => s.toString()),
    stateIndex: input.stateIndex.toString(),
    ASPSiblings: paddedASPSiblings.map((s) => s.toString()),
    ASPIndex: input.ASPIndex.toString(),
  }
}

// Worker message handler
self.onmessage = async (event: MessageEvent<ProverWorkerMessage>) => {
  const { type } = event.data

  if (type === 'generate') {
    await generateProofInWorker(event.data.input, event.data.artifacts)
  } else if (type === 'abort') {
    // Worker can't be aborted mid-computation, but we can acknowledge
    self.postMessage({ type: 'error', error: 'Aborted by user' } satisfies ProverWorkerResponse)
  }
}
