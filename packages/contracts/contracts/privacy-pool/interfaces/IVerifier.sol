// SPDX-License-Identifier: Apache-2.0
// Adapted from 0xbow privacy-pools-core
pragma solidity ^0.8.24;

/**
 * @title IVerifier
 * @notice Interface of the Groth16 verifier contracts
 */
interface IVerifier {
    /**
     * @notice Verifies a Withdrawal Proof (8 public signals)
     * @param _pA First elliptic curve point of the Groth16 proof
     * @param _pB Second elliptic curve point of the Groth16 proof
     * @param _pC Third elliptic curve point of the Groth16 proof
     * @param _pubSignals The proof public signals
     * @return _valid Whether the proof is valid
     */
    function verifyProof(
        uint256[2] memory _pA,
        uint256[2][2] memory _pB,
        uint256[2] memory _pC,
        uint256[8] memory _pubSignals
    ) external returns (bool _valid);

    /**
     * @notice Verifies a Ragequit Proof (4 public signals)
     * @param _pA First elliptic curve point of the Groth16 proof
     * @param _pB Second elliptic curve point of the Groth16 proof
     * @param _pC Third elliptic curve point of the Groth16 proof
     * @param _pubSignals The proof public signals
     * @return _valid Whether the proof is valid
     */
    function verifyProof(
        uint256[2] memory _pA,
        uint256[2][2] memory _pB,
        uint256[2] memory _pC,
        uint256[4] memory _pubSignals
    ) external returns (bool _valid);
}
