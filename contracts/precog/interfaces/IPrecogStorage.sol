// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "./IContractStructure.sol";

interface IPrecogStorage is IContractStructure {
    event TransferAdmin(address oldAdmin, address newAdmin);
    event AddOperator(address operator);
    event RemoveOperator(address operator);
    event SetPCOG(address pcog);
    event SetGMT(address gmt);

    function getAdmin() external view returns (address);

    function transferAdmin(address newAdmin) external;

    function getMiddlewareService() external view returns (address);

    function setMiddlewareService(address newMiddlewareService) external;

    function getPCOG() external view returns (address);

    function setPCOG(address newPCOG) external;

    function getGMT() external view returns (address);

    function setGMT(address newGMT) external;

    function isOperator(address operator) external view returns (bool);

    function getPrecog() external view returns (address);

    function setPrecog(address newPrecog) external;

    function getPrecogInternal() external view returns (address);

    function setPrecogInternal(address newPrecogInternal) external;

    function getPrecogCore() external view returns (address);

    function setPrecogCore(address newPrecogCore) external;

    function getPrecogFactory() external view returns (address);

    function setPrecogFactory(address newPrecogFactory) external;

    function getPrecogVault() external view returns (address);

    function setPrecogVault(address newPrecogVault) external;

    function getPrecogProfit() external view returns (address);

    function setPrecogProfit(address newPrecogProfit) external;

    function getMiddlewareExchange() external view returns (address);

    function setMiddlewareExchange(address newMiddlewareExchange) external;

    function getWithdrawalRegister() external view returns (address);

    function setWithdrawalRegister(address newWithdrawalRegister) external;

    function getExistingTokens() external view returns (address[] memory tokens);

    function findExistingTokenIndex(address token) external view returns (uint index);

    function pushExistingToken(address token) external;

    function swapExistingTokensByIndex(uint indexTokenA, uint indexTokenB) external;

    function popExistingToken() external;

    function getExistingTokensPair() external view returns (TokenPair[] memory pairs);

    function getExistingTokenPairByIndex(uint index)
        external
        view
        returns (TokenPair memory pair);

    function getCurrentProfitId(address token) external view returns (uint);

    function updateCurrentProfitId(address token, uint newValue) external;

    function checkIsExistingToken(address token) external view returns (bool);

    function updateIsExistingToken(address token, bool newValue) external;

    function getTokenConvert(address token) external view returns (address);

    function updateTokenConvert(address token, address newValue) external;

    function getLiquidity(address token) external view returns (uint);

    function updateLiquidity(address token, uint newValue) external;

    function getLiquidityWhitelist(address token) external view returns (uint);

    function updateLiquidityWhitelist(address token, uint newValue) external;

    function checkIsNotFirstInvestmentCycle(address token) external view returns (bool);

    function updateIsNotFirstInvestmentCycle(address token, bool newValue) external;

    function checkIsRemoved(address token) external view returns (bool);

    function updateIsRemoved(address token, bool newValue) external;

    function getWhitelist(address token) external view returns (address[] memory);

    function pushWhitelist(address token, address account) external;

    function removeFromWhitelist(address token, address account) external;

    function checkIsInWhitelist(address token, address account)
        external
        view
        returns (bool);

    function updateIsInWhitelist(
        address token,
        address account,
        bool newValue
    ) external;

    function getTradingCycles(address token) external view returns (Cycle[] memory);

    function getTradingCycleByIndex(address token, uint index)
        external
        view
        returns (Cycle memory);

    function getInfoTradingCycleById(address token, uint id)
        external
        view
        returns (
            uint48 startTime,
            uint48 endTime,
            uint unit,
            uint unitForWhitelist,
            uint profitAmount
        );

    function getLastTradingCycle(address token) external view returns (Cycle memory);

    function pushTradingCycle(address token, Cycle memory tradingCycle) external;

    function getProfits(address token) external view returns (uint[] memory);

    function updateProfitByIndex(
        address token,
        uint index,
        uint newValue
    ) external;

    function pushProfit(address token, uint newValue) external;

    function getProfitsForWhitelist(address token) external view returns (uint[] memory);

    function updateProfitForWhitelistByIndex(address token, uint index, uint newValue) external;

    function pushProfitForWhitelist(address token, uint newValue) external;

    function checkIsUpdateUnitTradingCycle(address token, uint index)
        external
        view
        returns (bool);

    function updateIsUpdateUnitTradingCycle(
        address token,
        uint index,
        bool newValue
    ) external;

    function getTotalUnitsTradingCycle(address token, uint index)
        external
        view
        returns (uint);

    function updateTotalUnitsTradingCycle(
        address token,
        uint index,
        uint newValue
    ) external;

    function getTotalUnitsForWhitelistTradingCycle(address token, uint index) external view returns (uint);

    function updateTotalUnitsForWhitelistTradingCycle(address token, uint index, uint newValue) external;

    function getInvestmentsOf(address token, address account)
        external
        view
        returns (Investment[] memory);

    function getInvestmentOfByIndex(
        address token,
        address account,
        uint index
    ) external view returns (Investment memory);

    /**
     * @dev Returns the last investment of user
     * @param token is token address
     * @param account is account address
     * @return lastInvestmentOf is the last Investment of user
     */
    function getLastInvestmentOf(address token, address account)
        external
        view
        returns (Investment memory);

    function updateInvestmentOfByIndex(
        address token,
        address account,
        uint index,
        Investment memory newValue
    ) external;

    function pushInvestmentOf(
        address token,
        address account,
        Investment memory newInvestmentOf
    ) external;

    function popInvestmentOf(address token, address account) external;

    function getAccountProfitInfo(address token, address account)
        external
        view
        returns (AccountProfitInfo memory);

    function updateAccountProfitInfo(
        address token,
        address account,
        AccountProfitInfo memory newValue
    ) external;

    function getAccountTradingInfo(address token, address account)
        external
        view
        returns (AccountTradingInfo memory);

    function updateAccountTradingInfo(
        address token,
        address account,
        AccountTradingInfo memory newValue
    ) external;

    function getUnitInTradingCycle(
        address token,
        address account,
        uint id
    ) external view returns (uint);
}
