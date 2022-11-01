// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "./IPrecogStorage.sol";

interface IPrecogInternal is IContractStructure {
    event UpdateTradingCycle(address indexed token, uint indexed cycleId, uint liquidity, uint duration);

    function getTradingCycleByTimestamp(address token, uint timestamp)
        external
        view
        returns (Cycle memory currentTradingCycleByTimestamp);

    function calculateProfit(address _token, address _account)
        external
        view
        returns (AccountProfitInfo memory accountProfitInfo);

    function updateProfit(address _token, address _account) external;

    function increaseInvestment(
        address _token,
        address _account,
        uint _amount, 
        uint48 _timestamp
    ) external;

    function isBeforeFundingTime(address _token, address _account)
        external
        view
        returns (bool _isBeforeInvestmentCycle);

    function decreaseInvestment(
        address _token,
        address _account,
        uint _amount,
        uint48 _timestamp
    ) external returns (uint remainingAmount);

    function updateDepositInfo(
        address _token,
        address _account,
        uint _amount
    ) external;

    function availableDepositedAmount(address token, address account)
        external
        view
        returns (
            uint amount
        );

    function updateCurrentTradingCycle(
        address token,
        bool isLimitedTradingCycles,
        uint limitTradingCycles
    ) external;

    function getTradingCycle(address token, uint48 tradingTime) external view returns (Cycle memory);
    
    function getCurrentTradingCycle(address token) external view returns (Cycle memory);
}