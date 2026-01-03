// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PrecompileChecker
/// @notice Direct precompile tests for Mantle BN254 support
contract PrecompileChecker {
    /// @notice Check if pairing precompile exists and works
    /// @dev Calls precompile 0x08 directly with valid input
    /// @return exists Whether precompile responded
    /// @return success Whether call succeeded
    /// @return result The raw result (should be 0x01 for valid pairing)
    function checkPairingPrecompile() external view returns (bool exists, bool success, bytes32 result) {
        // Valid pairing input: e(G1, G2) * e(-G1, G2) = 1
        // This is the standard test pairing that should return 1

        bytes memory input = hex"0000000000000000000000000000000000000000000000000000000000000001" // g1.x
                             hex"0000000000000000000000000000000000000000000000000000000000000002" // g1.y
                             hex"198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c2" // g2.x[1]
                             hex"1800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed" // g2.x[0]
                             hex"090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b" // g2.y[1]
                             hex"12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa" // g2.y[0]
                             hex"0000000000000000000000000000000000000000000000000000000000000001" // -g1.x (same)
                             hex"30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd45" // -g1.y (negated)
                             hex"198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c2" // g2.x[1]
                             hex"1800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed" // g2.x[0]
                             hex"090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b" // g2.y[1]
                             hex"12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa"; // g2.y[0]

        (success, ) = address(0x08).staticcall{gas: 200000}(input);
        exists = success;

        if (success) {
            bytes memory output;
            (, output) = address(0x08).staticcall{gas: 200000}(input);
            if (output.length >= 32) {
                assembly {
                    result := mload(add(output, 32))
                }
            }
        }
    }

    /// @notice Simple ecAdd test
    function checkEcAdd() external view returns (bool success, uint256 rx, uint256 ry) {
        // Add G1 + G1 = 2*G1
        bytes memory input = hex"0000000000000000000000000000000000000000000000000000000000000001"
                             hex"0000000000000000000000000000000000000000000000000000000000000002"
                             hex"0000000000000000000000000000000000000000000000000000000000000001"
                             hex"0000000000000000000000000000000000000000000000000000000000000002";

        bytes memory output;
        (success, output) = address(0x06).staticcall{gas: 100000}(input);

        if (success && output.length >= 64) {
            assembly {
                rx := mload(add(output, 32))
                ry := mload(add(output, 64))
            }
        }
    }

    /// @notice Simple ecMul test
    function checkEcMul() external view returns (bool success, uint256 rx, uint256 ry) {
        // 2 * G1
        bytes memory input = hex"0000000000000000000000000000000000000000000000000000000000000001"
                             hex"0000000000000000000000000000000000000000000000000000000000000002"
                             hex"0000000000000000000000000000000000000000000000000000000000000002";

        bytes memory output;
        (success, output) = address(0x07).staticcall{gas: 100000}(input);

        if (success && output.length >= 64) {
            assembly {
                rx := mload(add(output, 32))
                ry := mload(add(output, 64))
            }
        }
    }

    /// @notice Check what happens with identity pairing (empty input)
    function checkEmptyPairing() external view returns (bool success, bytes32 result) {
        // Empty pairing should return 1
        (success, ) = address(0x08).staticcall{gas: 100000}("");

        if (success) {
            bytes memory output;
            (, output) = address(0x08).staticcall{gas: 100000}("");
            if (output.length >= 32) {
                assembly {
                    result := mload(add(output, 32))
                }
            }
        }
    }
}
