// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVerifier} from "../privacy-pool/interfaces/IVerifier.sol";

/**
 * @title MockVerifier
 * @notice Mock verifier for testing Privacy Pool contracts
 * @dev Always returns true for valid proofs, can be configured to reject
 */
contract MockVerifier is IVerifier {
    /// @notice Whether the verifier should reject proofs
    bool public shouldReject;

    /// @notice Set whether the verifier should reject all proofs
    function setShouldReject(bool _reject) external {
        shouldReject = _reject;
    }

    /// @inheritdoc IVerifier
    function verifyProof(
        uint256[2] memory,
        uint256[2][2] memory,
        uint256[2] memory,
        uint256[8] memory
    ) external view override returns (bool _valid) {
        return !shouldReject;
    }

    /// @inheritdoc IVerifier
    function verifyProof(
        uint256[2] memory,
        uint256[2][2] memory,
        uint256[2] memory,
        uint256[4] memory
    ) external view override returns (bool _valid) {
        return !shouldReject;
    }
}
