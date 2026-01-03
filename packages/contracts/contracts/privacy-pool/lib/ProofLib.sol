// SPDX-License-Identifier: Apache-2.0
// Adapted from 0xbow privacy-pools-core
pragma solidity ^0.8.24;

/**
 * @title ProofLib
 * @notice Facilitates accessing the public signals of a Groth16 proof.
 */
library ProofLib {
    /*///////////////////////////////////////////////////////////////
                         WITHDRAWAL PROOF
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Struct containing Groth16 proof elements and public signals for withdrawal verification
     * @param pA First elliptic curve point of the Groth16 proof
     * @param pB Second elliptic curve point of the Groth16 proof
     * @param pC Third elliptic curve point of the Groth16 proof
     * @param pubSignals Array of public inputs and outputs:
     *        - [0] newCommitmentHash
     *        - [1] existingNullifierHash
     *        - [2] withdrawnValue
     *        - [3] stateRoot
     *        - [4] stateTreeDepth
     *        - [5] ASPRoot
     *        - [6] ASPTreeDepth
     *        - [7] context
     */
    struct WithdrawProof {
        uint256[2] pA;
        uint256[2][2] pB;
        uint256[2] pC;
        uint256[8] pubSignals;
    }

    function newCommitmentHash(WithdrawProof memory _p) internal pure returns (uint256) {
        return _p.pubSignals[0];
    }

    function existingNullifierHash(WithdrawProof memory _p) internal pure returns (uint256) {
        return _p.pubSignals[1];
    }

    function withdrawnValue(WithdrawProof memory _p) internal pure returns (uint256) {
        return _p.pubSignals[2];
    }

    function stateRoot(WithdrawProof memory _p) internal pure returns (uint256) {
        return _p.pubSignals[3];
    }

    function stateTreeDepth(WithdrawProof memory _p) internal pure returns (uint256) {
        return _p.pubSignals[4];
    }

    function ASPRoot(WithdrawProof memory _p) internal pure returns (uint256) {
        return _p.pubSignals[5];
    }

    function ASPTreeDepth(WithdrawProof memory _p) internal pure returns (uint256) {
        return _p.pubSignals[6];
    }

    function context(WithdrawProof memory _p) internal pure returns (uint256) {
        return _p.pubSignals[7];
    }

    /*///////////////////////////////////////////////////////////////
                          RAGEQUIT PROOF
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Struct for ragequit verification (original depositor exit)
     * @param pA First elliptic curve point of the Groth16 proof
     * @param pB Second elliptic curve point of the Groth16 proof
     * @param pC Third elliptic curve point of the Groth16 proof
     * @param pubSignals Array of public inputs:
     *        - [0] commitmentHash
     *        - [1] nullifierHash
     *        - [2] value
     *        - [3] label
     */
    struct RagequitProof {
        uint256[2] pA;
        uint256[2][2] pB;
        uint256[2] pC;
        uint256[4] pubSignals;
    }

    function commitmentHash(RagequitProof memory _p) internal pure returns (uint256) {
        return _p.pubSignals[0];
    }

    function nullifierHash(RagequitProof memory _p) internal pure returns (uint256) {
        return _p.pubSignals[1];
    }

    function value(RagequitProof memory _p) internal pure returns (uint256) {
        return _p.pubSignals[2];
    }

    function label(RagequitProof memory _p) internal pure returns (uint256) {
        return _p.pubSignals[3];
    }
}
