// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "./IPrecogInternal.sol";

interface IPrecogProfit {
    event SendProfit(
        address indexed token,
        address indexed PCOG,
        uint indexed cycleId, 
        uint profitByToken,
        uint profitForWhitelist,
        uint profitByPCOG
    );
    event TakeProfit(
        address indexed token, 
        address indexed PCOG,
        address indexed account, 
        uint amount
    );

    event TransferGMT(
        address indexed token,
        address indexed middewareService,
        uint256 profitCutAmount,
        uint256 gmtBoughtAmount,
        uint256 timestamp
    );

    function precogStorage() external view returns (IPrecogStorage);
    function precogInternal() external view returns (IPrecogInternal);
    function sendProfit(address token, uint profitAmount) external;
    function takeProfit(address to, address token) external;
}