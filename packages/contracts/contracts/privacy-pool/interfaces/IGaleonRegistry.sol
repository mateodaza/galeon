// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/**
 * @title IGaleonRegistry
 * @author Galeon
 * @notice Interface for GaleonRegistry - Port verification for Privacy Pool integration
 * @dev This interface provides the methods needed by the Privacy Pool to verify
 *      that deposits come from valid Port stealth addresses
 */
interface IGaleonRegistry {
    /**
     * @notice Check if a Port is active
     * @param portId The unique identifier of the Port
     * @return True if the Port is active
     */
    function portActive(bytes32 portId) external view returns (bool);

    /**
     * @notice Get the owner of a Port
     * @param portId The unique identifier of the Port
     * @return The owner address of the Port
     */
    function portOwners(bytes32 portId) external view returns (address);

    /**
     * @notice Check if an address is a valid Port stealth address
     * @dev Used by Privacy Pool to enforce Port-only deposits
     * @param _address The address to check
     * @return True if the address received payment through a Port
     */
    function isPortStealthAddress(address _address) external view returns (bool);

    /**
     * @notice Get the Port ID associated with a stealth address
     * @dev Used for compliance tracking and ASP filtering
     * @param _address The stealth address to query
     * @return The Port ID that received the payment (bytes32(0) if not found)
     */
    function stealthAddressToPort(address _address) external view returns (bytes32);

    /**
     * @notice Get the verified balance for an address and asset (funds received via Port payments)
     * @dev Used by Privacy Pool to enforce deposit limits - only verified funds can be deposited
     * @param _address The address to check
     * @param _asset The asset address (address(0) for native currency)
     * @return The verified balance that can be deposited to the Privacy Pool
     */
    function verifiedBalance(address _address, address _asset) external view returns (uint256);

    /**
     * @notice Consume verified balance when depositing to Privacy Pool
     * @dev Only callable by authorized Privacy Pools - prevents double-deposits and dirty sends
     * @param _address The address whose balance to consume
     * @param _asset The asset address (address(0) for native currency)
     * @param _amount The amount to consume
     */
    function consumeVerifiedBalance(address _address, address _asset, uint256 _amount) external;

    /**
     * @notice Check if a stealth address is frozen
     * @param _address The address to check
     * @return True if the address is frozen (cannot deposit)
     */
    function frozenStealthAddresses(address _address) external view returns (bool);

    /**
     * @notice Check if a stealth address can deposit (is valid Port address AND not frozen)
     * @param _address The address to check
     * @return True if the address can deposit to Privacy Pool
     */
    function canDeposit(address _address) external view returns (bool);
}
