// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Groth16Verifier
/// @notice Minimal Groth16 verifier to test BN254 precompiles on Mantle
/// @dev Tests EIP-196 (ecAdd, ecMul) and EIP-197 (pairing) precompiles
/// This is a proof-of-concept verifier for a simple "I know a secret" circuit
contract Groth16Verifier {
    // BN254 curve order
    uint256 constant SNARK_SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

    // Precompile addresses (EIP-196, EIP-197)
    uint256 constant PRECOMPILE_ADD = 0x06;
    uint256 constant PRECOMPILE_MUL = 0x07;
    uint256 constant PRECOMPILE_PAIRING = 0x08;

    // Verification key (for a simple "I know preimage of hash" circuit)
    // These are placeholder values - in production, use real circuit VK
    struct VerifyingKey {
        uint256[2] alfa1;
        uint256[2][2] beta2;
        uint256[2][2] gamma2;
        uint256[2][2] delta2;
        uint256[2][] IC;
    }

    // Events for testing
    event PrecompileTest(string name, bool success);
    event VerificationResult(bool valid);

    /// @notice Test if BN254 ecAdd precompile works
    /// @return success True if precompile call succeeded
    function testEcAdd() external returns (bool success) {
        // G1 generator point
        uint256[2] memory p1 = [uint256(1), uint256(2)];
        // G1 generator point (same, so result = 2*G1)
        uint256[2] memory p2 = [uint256(1), uint256(2)];

        uint256[4] memory input;
        input[0] = p1[0];
        input[1] = p1[1];
        input[2] = p2[0];
        input[3] = p2[1];

        uint256[2] memory result;

        assembly {
            success := staticcall(gas(), PRECOMPILE_ADD, input, 0x80, result, 0x40)
        }

        emit PrecompileTest("ecAdd", success);
        return success;
    }

    /// @notice Test if BN254 ecMul precompile works
    /// @return success True if precompile call succeeded
    function testEcMul() external returns (bool success) {
        // G1 generator point
        uint256[2] memory p = [uint256(1), uint256(2)];
        uint256 scalar = 2;

        uint256[3] memory input;
        input[0] = p[0];
        input[1] = p[1];
        input[2] = scalar;

        uint256[2] memory result;

        assembly {
            success := staticcall(gas(), PRECOMPILE_MUL, input, 0x60, result, 0x40)
        }

        emit PrecompileTest("ecMul", success);
        return success;
    }

    /// @notice Test if BN254 pairing precompile works
    /// @dev Uses a simple valid pairing check: e(P1, P2) == e(P1, P2)
    /// @return success True if precompile call succeeded
    function testPairing() external returns (bool success) {
        // This tests e(aG1, bG2) * e(-aG1, bG2) = 1 (identity)
        // Using G1 generator and G2 generator

        // G1 generator
        uint256 g1x = 1;
        uint256 g1y = 2;

        // Negation of G1 generator (negate y coordinate: p - y where p is field modulus)
        uint256 neg_g1x = 1;
        uint256 neg_g1y = 21888242871839275222246405745257275088696311157297823662689037894645226208581 - 2;

        // G2 generator (x is a Fp2 element: x0 + x1*i, same for y)
        uint256 g2x0 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
        uint256 g2x1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
        uint256 g2y0 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
        uint256 g2y1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;

        // Pairing input: 2 pairs of (G1, G2) points
        // e(G1, G2) * e(-G1, G2) should equal 1 (valid pairing)
        uint256[12] memory input;
        // First pair: G1, G2
        input[0] = g1x;
        input[1] = g1y;
        input[2] = g2x1; // Note: Fp2 elements are ordered (x1, x0) in precompile
        input[3] = g2x0;
        input[4] = g2y1;
        input[5] = g2y0;
        // Second pair: -G1, G2
        input[6] = neg_g1x;
        input[7] = neg_g1y;
        input[8] = g2x1;
        input[9] = g2x0;
        input[10] = g2y1;
        input[11] = g2y0;

        uint256[1] memory result;

        assembly {
            success := staticcall(gas(), PRECOMPILE_PAIRING, input, 0x180, result, 0x20)
        }

        // result[0] should be 1 if pairing is valid
        bool pairingValid = success && result[0] == 1;

        emit PrecompileTest("pairing", pairingValid);
        return pairingValid;
    }

    /// @notice Run all precompile tests
    /// @return addOk ecAdd works
    /// @return mulOk ecMul works
    /// @return pairingOk pairing works
    function testAllPrecompiles() external returns (bool addOk, bool mulOk, bool pairingOk) {
        addOk = this.testEcAdd();
        mulOk = this.testEcMul();
        pairingOk = this.testPairing();
    }

    /// @notice Get gas cost estimate for pairing operation
    /// @return gasCost Approximate gas used for pairing precompile
    function estimatePairingGas() external returns (uint256 gasCost) {
        uint256 gasBefore = gasleft();
        this.testPairing();
        gasCost = gasBefore - gasleft();
    }
}
