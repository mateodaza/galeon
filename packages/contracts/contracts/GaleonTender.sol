// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title GaleonTender
/// @notice Aggregates and forwards funds from stealth addresses to user wallets
/// @dev Like a tender boat ferrying cargo from ship to shore, this contract
///      receives funds from multiple stealth addresses and forwards them to a recipient.
///      Protected against reentrancy from malicious tokens or recipients.
contract GaleonTender is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Emitted when funds are forwarded to recipient
    event Forwarded(
        address indexed recipient,
        address indexed token, // address(0) for native
        uint256 amount,
        uint256 stealthCount
    );

    constructor() Ownable(msg.sender) {}

    /// @notice Receive native currency from stealth addresses
    receive() external payable {}

    /// @notice Forward aggregated native funds to recipient
    /// @param recipient The user's main wallet
    /// @param stealthCount Number of stealth addresses aggregated (for event)
    function forwardNative(address recipient, uint256 stealthCount) external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");

        (bool success, ) = recipient.call{value: balance}("");
        require(success, "Transfer failed");

        emit Forwarded(recipient, address(0), balance, stealthCount);
    }

    /// @notice Forward aggregated ERC-20 tokens to recipient
    /// @param token The token contract
    /// @param recipient The user's main wallet
    /// @param stealthCount Number of stealth addresses aggregated (for event)
    function forwardToken(
        address token,
        address recipient,
        uint256 stealthCount
    ) external onlyOwner nonReentrant {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");

        IERC20(token).safeTransfer(recipient, balance);

        emit Forwarded(recipient, token, balance, stealthCount);
    }
}
