// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "./IContractStructure.sol";

interface IPrecogCore is IContractStructure {
    

    /**
     * @dev Emits when admin set cycles configurations of trading
     * @param admin is address admin that sets cycles configurations
     * @param firstDefundingDuration is a duration is used when user requests withdrawal for the first time
     * @param fundingDuration is a duration is used when user deposits or transfers IPCOG
     * @param defundingDuration is a duration is used when user requests withdrawal or transfers IPCOG
     * @param tradingDuration is a duration is used to calculate profit for users when middleware sends profit
     */
    event SetCycleConfiguration(
        address indexed admin,
        uint32 firstDefundingDuration,
        uint32 fundingDuration,
        uint32 defundingDuration,
        uint32 tradingDuration
    );

    /**
     * @dev Emits when admin set fees configurations of trading
     * @param admin is address admin that sets fees configurations
     * @param depositFee is deposit fees when user deposit to trading pool
     * @param withdrawalFee is withdrawal fees when user withdraw tokens from trading pool
     * @param tradingFee is trading fees charge from users when middleware service sends profit to trading pool
     * @param lendingFee is lending fees when user lend tokens
     */
    event SetFeeConfiguration(
        address indexed admin,
        uint64 depositFee,
        uint64 withdrawalFee,
        uint64 tradingFee,
        uint64 lendingFee
    );
    event CollectFee(address indexed admin, address indexed token, uint amount);

    function feeDecimalBase() external view returns (uint8);

    function getFeeConfiguration() external view returns (FeeConfiguration memory);

    function getCycleConfiguration() external view returns (CycleConfiguration memory);

    /**
     * @notice Returns the data of CyclesChangedInfo of token address
     * @dev See {Struct - CyclesChangedInfo} to get explaination of CyclesChangedInfo
     * @param token is token address
     * @return CyclesChangedInfo of token
     */
    function getCyclesChangedInfo(address token) external view returns (CyclesChangedInfo memory);

    /**
     * @dev Be used by precog to change CyclesChangedInfo of token address
     * @param token is token address
     * @param config is new CyclesChangedInfo
     */
    function setCyclesChangedInfo(address token, CyclesChangedInfo memory config) external;

    /**
     * @notice Returns the last funding start time and next funding start time when middleware will take investment
     * @param token is token address
     * @return lastFundingStartTime is the last time middleware took investment
     * @return nextFundingStartTime is the next time middleware will take investment
     */
    function getCurrentFundingCycle(address token)
        external
        view
        returns (uint lastFundingStartTime, uint nextFundingStartTime);

    /**
     * @notice Returns the last defunding start time and next defunding start time 
     * when middleware will send requested withdrawal for users
     * @param token is token address
     * @return lastDefundingStartTime is the last time middleware sent requested withdrawal
     * @return nextDefundingStartTime is the next time middleware will send requested withdrawal
     */
    function getCurrentDefundingCycle(address token)
        external
        view
        returns (uint lastDefundingStartTime, uint nextDefundingStartTime);

    /**
     * @notice Returns the minimum amount token when user deposits
     * @param token is token address
     * @return the minimum funding amount
     */
    function minFunding(address token) external view returns (uint);

    /**
     * @notice Returns the maximum amount token when user deposits for token pool
     * @param token is token address
     * @return the maximum funding amount
     */
    function maxFunding(address token) external view returns (uint);

    /**
     * @notice Returns the maximum amount of liquidity pool that users can deposit
     * @param token is token address
     * @return the minimum funding amount of liquidity pool
     */
    function maxFundingPool(address token) external view returns (uint);

    /**
     * @notice Returns the minimum amount token when user requests withdrawal or force withdraws
     * @param token is token address
     * @return the minimum defunding amount
     */
    function minDefunding(address token) external view returns (uint);

    /**
     * @notice Updates defunding duration after admin changes cycles and applied time
     * @param token is token address
     */
    function updateDefundingDuration(address token) external;

    /**
     * @notice Updates funding duration after admin changes cycles and applied time
     * @param token is token address
     */
    function updateFundingDuration(address token) external;
}
