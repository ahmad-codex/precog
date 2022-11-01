// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

interface IWithdrawalRegister {
    struct Register {
        uint256 amount;
        uint256 deadline;
    }


    event RegisterWithdrawal(
        address token,
        address account, 
        uint256 amount,
        uint256 deadline
    );

    /**
     * @dev Emits when user claim the token amount
     * @param token is token address
     * @param account is account address
     * @param amount is token amount
     */
    event ClaimWithdrawal(
        address token,
        address account,
        uint256 amount
    );

    /**
     * @dev Returns the precog address
     */
    function precog() external view returns (address);

    /**
     * @dev Returns the precog core address
     */
    function precogCore() external view returns (address);

    /**
     * @notice Returns the register of user that includes amount and deadline
     * @param token is token address
     * @param account is user address
     * @return register is the set of amount and deadline for token address and account address
     */
    function getRegister(address token, address account) external view returns (Register memory register);

    /**
     * @notice Check if user has a first request withdrawal
     * @param token is token address
     * @param account is user address
     * @return _isFirstWithdrawal is the value if user has a first request withdrawal or not
     */
    function isFirstWithdraw(address token, address account) external view returns (bool _isFirstWithdrawal);

    /**
     * @notice Check if register of user is in deadline
     * @param token is token address
     * @param account is user address
     * @return _isInDeadline - the value of register if it is in deadline or not
     */
    function isInDeadline(address token, address account) external view returns (bool _isInDeadline);

    /**
     * @notice Register the token amount and deadline for user
     * @dev Requirements:
     * - Must be called by only precog contract
     * - Deadline of register must be less than or equal to param `deadline`
     * - If deadline of register is completed, user must claim withdrawal before calling this function
     * @param token is token address that user wants to request withdrawal
     * @param account is user address
     * @param amount is token amount that user wants to request withdrawal  
     * @param deadline is deadline that precog calculates and is used for locking token amount of user 
     */
    function registerWithdrawal(address token, address account, uint256 amount, uint256 deadline) external;

    /**
     * @notice Withdraw token amount that user registered and out of deadline
     * @dev Requirements:
     * - Must be called only by precog contract
     * - Deadline of register must be less than or equal to now
     * - Amount of register must be greater than or equal to param `amount`
     * - This contract has enough token amount for user
     * @param token is token address that user want to claim the requested withdrawal
     * @param account is user address
     * @param to is account address that user want to transfer when claiming requested withdrawal
     * @param amount is amount token that user want to claim
     * @param fee is fee token that precog core charges when user claim token
     */
    function claimWithdrawal(address token, address account, address to, uint256 amount, uint256 fee) external;

    /**
     * @notice Modify register info
     * @dev Requirements:
     * Only Precog address can call this function
     * @param token is token address
     * @param account is user address
     * @param newRegister is new register data for user with the `token`  
     */
    function modifyRegister(address token, address account, Register memory newRegister) external;
}