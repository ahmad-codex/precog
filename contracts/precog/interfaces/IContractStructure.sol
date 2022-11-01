// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

interface IContractStructure {
    struct Investment {
        uint amount;
        uint unit;
        uint48 timestamp;
        uint16 idChanged;
        bool isWhitelist;
    }

    struct Cycle {
        uint16 id;
        uint48 startTime;
        uint48 endTime;
    }

    struct TokenPair {
        address token;
        address liquidityToken;
    }

    struct AccountProfitInfo {
        uint profit;
        uint profitForWhitelist;
        uint claimedProfit;
        uint claimedProfitForWhitelist;
        uint lastProfitId;
        uint lastInvestmentId;
    }

    struct AccountTradingInfo {
        uint depositedTimestampOf;
        uint availableAmount;
        bool isNotFirstIncreaseInvestment;
    }

    /**
     * @dev Structure about fee configurations for interacting with functions of Precog contract
     * This configurations use feeDecimalBase() function to calculate the rate of fees
     * NOTE Explainations of params in struct:
     * - `depositFee` - a fee base that be charged when user deposits into Precog
     * - `withdrawalFee` - a fee base that be charged when user withdraws from Precog
     * - `tradingFee` - a fee base that be charged when middleware sends profit to Precog
     * - `lendingFee` - a fee base that be charged when user lends to Precog
     */
    struct FeeConfiguration {
        uint64 depositFee;
        uint64 withdrawalFee;
        uint64 tradingFee;
        uint64 lendingFee;
    }

    /**
     * @dev Structure about cycle configurations when users interact in Precog contract:
     * - Taking investment
     * - Sending requested withdrawal
     * - Calculating profit
     * - Locking time
     * NOTE Explainations of params in struct:
     * - `firstDefundingCycle` - a duration is used when user requests withdrawal for the first time
     * - `fundingCycle` - a duration is used when user deposits or transfers IPCOG
     * - `defundingCycle` - a duration is used when user requests withdrawal or transfers IPCOG
     * - `tradingCycle` - a duration is used to calculate profit for users when middleware sends profit
     */
    struct CycleConfiguration {
        uint32 firstDefundingCycle;
        uint32 fundingCycle;
        uint32 defundingCycle;
        uint32 tradingCycle;
    }

    /**
     * @dev Structure about the time apply cycle configurations when admin set new cycle configurations
     * NOTE Explainations of params in struct:
     * - `firstDefundingDuration` - a duration is used when user requests withdrawal for the first time
     * - `fundingDuration` - a duration is used when user deposits or transfers IPCOG
     * - `defundingDuration` - a duration is used when user requests withdrawal or transfers IPCOG
     * - `tradingDuration` - a duration is used to calculate profit for users when middleware sends profit
     */
    struct CyclesChangedInfo {
        uint48 tradingApplyTime;
        uint48 fundingApplyTime;
        uint48 defundingApplyTime;
        uint48 fundingDuration;
        uint48 firstDefundingDuration;
        uint48 defundingDuration;
    }
}