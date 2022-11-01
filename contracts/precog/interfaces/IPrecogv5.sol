// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;


import "./IPrecogInternal.sol";


interface IPrecogV5 {
    // Events
    event Deposit(
        address indexed token, 
        address indexed account, 
        uint amount, 
        uint fee
    );
    event RequestWithdrawal(
        address indexed token, 
        address indexed account, 
        uint amount
    );
    event Withdraw(
        address indexed token,
        address indexed account,
        address indexed to,
        uint amount,
        uint fee
    );
    
    function precogStorage() external view returns (IPrecogStorage);

    function precogInternal() external view returns (IPrecogInternal);

    /**
     * @notice Use to deposit the token amount to contract
     * @dev Requirements:
     * - `token` must be added to pool
     * - user must approve token for this contract
     * - `amount` must be greater than or equal the min funding amount
     * @param token is token address
     * @param amount is token amount that user will deposit to contract
     */
    function deposit(address token, uint amount) external;

    /**
     * 
     */
    function requestWithdrawal(address liquidityToken, uint amount) external;

    function withdraw(address to, address token, uint amount, bool isEmergency) external;
}
