// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;
import "../../@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./libraries/PrecogV5Library.sol";
import "./interfaces/IPrecogCore.sol";
import "./interfaces/IPrecogInternal.sol";

contract PrecogInternal is IPrecogInternal {
    using SafeERC20 for IERC20;

    IPrecogStorage public precogStorage;

    modifier onlyPrecog() {
        require(msg.sender == precogStorage.getPrecog(), "PrecogInternal: Caller is not accessible");
        _;
    }

    modifier isExistingToken(address token) {
        require(precogStorage.checkIsExistingToken(token), "PrecogInternal: Token is not in trading");
        _;
    }

    constructor(IPrecogStorage _precogStorage) {
        precogStorage = _precogStorage;
    }

    function _getCoreInstance() internal view returns (IPrecogCore core) {
        return IPrecogCore(precogStorage.getPrecogCore());
    }

    /**
     * @dev Returns the trading cycle following the timestamp
     * @param _token is token address
     * @param _timestamp is the timestamp that be used to calculate trading cycle
     * @return _currentTradingCycleByTimestamp is the trading cycle is calculated by timestamp
     */
    function _getTradingCycleByTimestamp(address _token, uint _timestamp)
        internal
        view
        returns (Cycle memory _currentTradingCycleByTimestamp)
    {
        Cycle[] memory _tradingCycles = precogStorage.getTradingCycles(_token);
        Cycle memory _lastTradingCycle = _tradingCycles[_tradingCycles.length - 1];

        // Returns the last cycle if token pool has been removed
        if (precogStorage.checkIsRemoved(_token)) {
            return _lastTradingCycle;
        }

        // Get current trading cycle by timestamp
        _currentTradingCycleByTimestamp = PrecogV5Library._calculateTradingCycleByTimestamp(
            _lastTradingCycle,
            _getCoreInstance().getCycleConfiguration().tradingCycle,
            _getCoreInstance().getCyclesChangedInfo(_token).tradingApplyTime,
            _timestamp
        );
    }

    function getTradingCycleByTimestamp(address token, uint timestamp)
        external
        view
        override
        returns (Cycle memory currentTradingCycleByTimestamp)
    {
        currentTradingCycleByTimestamp = _getTradingCycleByTimestamp(token, timestamp);
    }

    /**
     * @dev Returns profit of account from investment and profit of trading cycles
     * @param _token is token address
     * @param _account is account address
     * @return _accountProfitInfo is profit info of account
     * NOTE Function get virtual data, not storage data
     */
    function _calculateProfit(address _token, address _account)
        internal
        view
        returns (AccountProfitInfo memory _accountProfitInfo)
    {
        // Declare memory datas
        Investment[] memory _investments = precogStorage.getInvestmentsOf(_token, _account);
        Cycle[] memory _tradingCycles = precogStorage.getTradingCycles(_token);
        uint[] memory _profits = precogStorage.getProfits(_token);
        uint[] memory _profitsForWhitelist = precogStorage.getProfitsForWhitelist(_token);
        uint _updatedLatestCycle = precogStorage.getCurrentProfitId(_token);
        uint _lastAvailableProfitId;
        _accountProfitInfo = precogStorage.getAccountProfitInfo(_token, _account);
        if (_accountProfitInfo.lastProfitId < _updatedLatestCycle) {
            // Start the loop of investmentsOf
            for (_accountProfitInfo.lastInvestmentId; _accountProfitInfo.lastInvestmentId < _investments.length; ) {
                Investment memory _nextInvestment;
                // Return the algorithm (1)
                if (
                    _accountProfitInfo.lastProfitId == _updatedLatestCycle &&
                    _updatedLatestCycle == _investments[_accountProfitInfo.lastInvestmentId].idChanged
                ) {
                    return _accountProfitInfo;
                }
                // Get next investment of account and available profit id for the loop of profitId
                (_nextInvestment, _lastAvailableProfitId) = PrecogV5Library._chooseLastAvailableTradingId(
                    _investments,
                    _accountProfitInfo.lastInvestmentId,
                    _updatedLatestCycle
                );
                // Start the loop of profitId
                for (_accountProfitInfo.lastProfitId; _accountProfitInfo.lastProfitId < _lastAvailableProfitId; ) {
                    // Calculate profit for whitelist at trading cycle
                    if (_investments[_accountProfitInfo.lastInvestmentId].isWhitelist) {
                        // Get total units for whitelists
                        uint _totalUnitsForWhitelist = precogStorage.getTotalUnitsForWhitelistTradingCycle(
                            _token,
                            _accountProfitInfo.lastProfitId
                        );
                        // Calculate profit for account at trading cycle
                        _accountProfitInfo.profitForWhitelist += PrecogV5Library._calculateProfitAtCycle(
                            _tradingCycles[_accountProfitInfo.lastProfitId],
                            _investments[_accountProfitInfo.lastInvestmentId],
                            _totalUnitsForWhitelist,
                            _profitsForWhitelist[_accountProfitInfo.lastProfitId],
                            _accountProfitInfo.lastProfitId
                        );
                    }
                    // Calcuclate profit for normal account at trading cycle
                    else {
                        // Get total units for normal accounts
                        uint _totalUnits = (precogStorage.getTotalUnitsTradingCycle(
                            _token,
                            _accountProfitInfo.lastProfitId
                        ) -
                            precogStorage.getTotalUnitsForWhitelistTradingCycle(
                                _token,
                                _accountProfitInfo.lastProfitId
                            ));
                        // Calculate profit for account at trading cycle
                        _accountProfitInfo.profit += PrecogV5Library._calculateProfitAtCycle(
                            _tradingCycles[_accountProfitInfo.lastProfitId],
                            _investments[_accountProfitInfo.lastInvestmentId],
                            _totalUnits,
                            _profits[_accountProfitInfo.lastProfitId],
                            _accountProfitInfo.lastProfitId
                        );
                    }
                    unchecked {
                        _accountProfitInfo.lastProfitId++;
                    }
                }
                // Return the algorithm (2)
                if (
                    _accountProfitInfo.lastProfitId == _updatedLatestCycle &&
                    _updatedLatestCycle != _nextInvestment.idChanged
                ) {
                    return _accountProfitInfo;
                }

                unchecked {
                    _accountProfitInfo.lastInvestmentId++;
                }

                // NOTE:
                // (1) happens when the current profit id of trading cycle is at the middle of two investmentsOf
                // (2) happens when the current profit id of trading cycle is at the start of investmentOf
            }
        }
    }

    function calculateProfit(address token, address account)
        external
        view
        override
        returns (AccountProfitInfo memory accountProfitInfo)
    {
        accountProfitInfo = _calculateProfit(token, account);
    }

    /**
     * @dev Calculates and updates profit of account from investment and profit of trading cycles
     * @param _token is token address
     * @param _account is account address
     */
    function _updateProfit(address _token, address _account) internal {
        precogStorage.updateAccountProfitInfo(_token, _account, _calculateProfit(_token, _account));
    }

    function updateProfit(address token, address account) external override {
        _updateProfit(token, account);
    }

    function _processFirstTimeIncreaseInvestment(
        address _token,
        address _account,
        Cycle memory _futureTradingCycle
    ) internal {
        AccountTradingInfo memory _accountTradingInfo = precogStorage.getAccountTradingInfo(
            _token,
            _account
        );
        AccountProfitInfo memory _accountProfitInfo = precogStorage.getAccountProfitInfo(
            _token,
            _account
        );

        if (!precogStorage.getAccountTradingInfo(_token, _account).isNotFirstIncreaseInvestment) {
            // Modify the profit id to future trading cycle
            _accountProfitInfo.lastProfitId = uint16(_futureTradingCycle.id);

            // Mark that the account has deposited for the first time at token pool
            _accountTradingInfo.isNotFirstIncreaseInvestment = true;

            // Update account trading info and account profit info
            precogStorage.updateAccountTradingInfo(_token, _account, _accountTradingInfo);
            precogStorage.updateAccountProfitInfo(_token, _account, _accountProfitInfo);
        }
    }

    function _updateTotalUnitsForFirstTimeOfTradingCycle(
        address _token,
        Cycle memory _futureTradingCycle
    ) internal {
        if (!precogStorage.checkIsUpdateUnitTradingCycle(_token, _futureTradingCycle.id)) {
            uint _duration;
            uint _newTotalUnits;
            uint _newTotalUnitsForWhitelist;

            // Get duration of future trading cycle
            unchecked {
                _duration = _futureTradingCycle.endTime - _futureTradingCycle.startTime;
            }

            // Update total units for trading cycle
            unchecked {
                _newTotalUnits =
                    precogStorage.getTotalUnitsTradingCycle(_token, _futureTradingCycle.id) +
                    (precogStorage.getLiquidity(_token) * _duration);
            }

            precogStorage.updateTotalUnitsTradingCycle(_token, _futureTradingCycle.id, _newTotalUnits);

            // Update total units of whitelists for trading cycle

            unchecked {
                _newTotalUnitsForWhitelist =
                    precogStorage.getTotalUnitsForWhitelistTradingCycle(_token, _futureTradingCycle.id) +
                    (precogStorage.getLiquidityWhitelist(_token) * _duration);
            }

            precogStorage.updateTotalUnitsForWhitelistTradingCycle(
                _token,
                _futureTradingCycle.id,
                _newTotalUnitsForWhitelist
            );

            // Mark the trading cycle is updated total units
            precogStorage.updateIsUpdateUnitTradingCycle(_token, _futureTradingCycle.id, true);
        }
    }

    function _processIncreaseInvestment(
        address _token,
        address _account,
        uint _amount,
        uint48 _timestamp,
        Cycle memory _futureTradingCycle
    ) internal {
        Investment[] memory _investmentsOf = precogStorage.getInvestmentsOf(_token, _account);
        uint _unit;

        // Calculate increased unit for account
        unchecked {
            _unit = _amount * (_futureTradingCycle.endTime - _timestamp);
        }
        if (_investmentsOf.length > 0) {
            Investment memory _lastInvestmentOf = _investmentsOf[_investmentsOf.length - 1];
            Investment memory _newInvestmentOf = Investment({
                amount: _lastInvestmentOf.amount + _amount,
                unit: 0,
                timestamp: _timestamp,
                idChanged: _futureTradingCycle.id,
                isWhitelist: precogStorage.checkIsInWhitelist(_token, _account)
            });
            if (_lastInvestmentOf.idChanged < _futureTradingCycle.id) {
                unchecked {
                    _newInvestmentOf.unit =
                        _lastInvestmentOf.amount *
                        (_futureTradingCycle.endTime - _futureTradingCycle.startTime) +
                        _unit;
                }
                precogStorage.pushInvestmentOf(_token, _account, _newInvestmentOf);
            } else if (_lastInvestmentOf.idChanged == _futureTradingCycle.id) {
                unchecked {
                    _newInvestmentOf.unit = _lastInvestmentOf.unit + _unit;
                }
                precogStorage.updateInvestmentOfByIndex(_token, _account, _investmentsOf.length - 1, _newInvestmentOf);
            }
            uint newTotalUnits = precogStorage.getTotalUnitsForWhitelistTradingCycle(_token, _futureTradingCycle.id);
            // Last investment and current investment are different from isWhitelist
            if (_lastInvestmentOf.isWhitelist != _newInvestmentOf.isWhitelist) {
                // Current investment is whitelist
                if (_newInvestmentOf.isWhitelist) {
                    // Transfer all unit of investment into totalUnitsForWhitelist
                    newTotalUnits += _newInvestmentOf.unit;
                } else {
                    // Current investment is not whitelist
                    newTotalUnits -= _newInvestmentOf.unit;
                }
            } else {
                if (_newInvestmentOf.isWhitelist) {
                    newTotalUnits += _unit;
                }
            }
            precogStorage.updateTotalUnitsForWhitelistTradingCycle(_token, _futureTradingCycle.id, newTotalUnits);
        } else {
            Investment memory _newInvestmentOf = Investment({
                amount: _amount,
                unit: _unit,
                timestamp: _timestamp,
                idChanged: _futureTradingCycle.id,
                isWhitelist: precogStorage.checkIsInWhitelist(_token, _account)
            });
            precogStorage.pushInvestmentOf(_token, _account, _newInvestmentOf);
            if (_newInvestmentOf.isWhitelist) {
                precogStorage.updateTotalUnitsForWhitelistTradingCycle(_token, _futureTradingCycle.id, _unit);
            }
        }

        uint _newUnit;
        unchecked {
            _newUnit = precogStorage.getTotalUnitsTradingCycle(_token, _futureTradingCycle.id) + _unit;
        }
        precogStorage.updateTotalUnitsTradingCycle(_token, _futureTradingCycle.id, _newUnit);
    }

    /**
     * @dev Calculates and updates investment amount, unit, 
     trading cycle id at current investment or push new investment into array
     * @param _token is token address
     * @param _account is account address
     * @param _amount is token amount that is used to increase unit in trading cycle
     * @param _timestamp is timestamp that is the next funding cycle with deposit or block.timestamp with transfer IPCOG
     */
    function _increaseInvestment(
        address _token,
        address _account,
        uint _amount,
        uint48 _timestamp
    ) internal {
        Cycle memory _futureTradingCycle = _getTradingCycleByTimestamp(_token, _timestamp);
        _processFirstTimeIncreaseInvestment(_token, _account, _futureTradingCycle);
        _updateTotalUnitsForFirstTimeOfTradingCycle(_token, _futureTradingCycle);
        _processIncreaseInvestment(_token, _account, _amount, _timestamp, _futureTradingCycle);
    }

    function increaseInvestment(
        address token,
        address account,
        uint amount,
        uint48 timestamp
    ) external override isExistingToken(token) {
        require(precogStorage.isOperator(msg.sender), "PrecogInternal: Caller is not allowed");
        _increaseInvestment(token, account, amount, timestamp);
    }

    function _isBeforeFundingTime(address _token, address _account)
        internal
        view
        returns (bool _isBeforeInvestmentCycle)
    {
        _isBeforeInvestmentCycle = _availableDepositedAmount(_token, _account) > 0;
    }

    function isBeforeFundingTime(address token, address account)
        external
        view
        override
        returns (bool _isBeforeInvestmentCycle)
    {
        _isBeforeInvestmentCycle = _isBeforeFundingTime(token, account);
    }

    function _processDecreaseInvestment(
        address _token,
        address _account,
        uint _amount,
        uint48 _timestamp,
        Cycle memory _futureTradingCycle
    ) internal returns (uint _remainingAmount) {
        Investment[] memory _investmentsOf = precogStorage.getInvestmentsOf(_token, _account);
        Investment memory _lastInvestmentOf = _investmentsOf[_investmentsOf.length - 1];
        Investment memory _newInvestmentOf = Investment({
            amount: _lastInvestmentOf.amount - _amount,
            unit: 0,
            timestamp: _lastInvestmentOf.timestamp,
            idChanged: _futureTradingCycle.id,
            isWhitelist: precogStorage.checkIsInWhitelist(_token, _account)
        });
        _remainingAmount = _newInvestmentOf.amount;
        uint _unit = _amount * (_futureTradingCycle.endTime - _timestamp);

        if (_lastInvestmentOf.idChanged < _futureTradingCycle.id) {
            _newInvestmentOf.unit = (_lastInvestmentOf.amount *
                (_futureTradingCycle.endTime - _futureTradingCycle.startTime) -
                _unit);
            precogStorage.pushInvestmentOf(_token, _account, _newInvestmentOf);
        } else {
            _newInvestmentOf.unit = _lastInvestmentOf.unit - _unit;
            precogStorage.updateInvestmentOfByIndex(_token, _account, _investmentsOf.length - 1, _newInvestmentOf);
        }
        uint newTotalUnits = precogStorage.getTotalUnitsForWhitelistTradingCycle(_token, _futureTradingCycle.id);
        // Last investment and current investment are different from isWhitelist
        if (_lastInvestmentOf.isWhitelist != _newInvestmentOf.isWhitelist) {
            // Current investment is whitelist
            if (_newInvestmentOf.isWhitelist) {
                // Transfer all unit of investment into totalUnitsForWhitelist
                newTotalUnits += _newInvestmentOf.unit;
            } else {
                // Current investment is not whitelist
                newTotalUnits -= _newInvestmentOf.unit;
            }
        } else {
            if (_newInvestmentOf.isWhitelist) {
                newTotalUnits -= _unit;
            }
        }
        precogStorage.updateTotalUnitsForWhitelistTradingCycle(_token, _futureTradingCycle.id, newTotalUnits);
        uint _newUnit = precogStorage.getTotalUnitsTradingCycle(_token, _futureTradingCycle.id) - _unit;
        precogStorage.updateTotalUnitsTradingCycle(_token, _futureTradingCycle.id, _newUnit);
    }

    function _decreaseInvestment(
        address _token,
        address _account,
        uint _amount,
        uint48 _timestamp
    ) internal returns (uint _remainingAmount) {
        require(
            !_isBeforeFundingTime(_token, _account),
            "PrecogInternal: Cannot request withdrawal before funding time"
        );

        Cycle memory _futureTradingCycle = _getTradingCycleByTimestamp(_token, _timestamp);
        _updateTotalUnitsForFirstTimeOfTradingCycle(_token, _futureTradingCycle);
        _remainingAmount = _processDecreaseInvestment(_token, _account, _amount, _timestamp, _futureTradingCycle);
    }

    function decreaseInvestment(
        address token,
        address account,
        uint amount,
        uint48 timestamp
    ) external override isExistingToken(token) returns (uint remainingAmount) {
        require(precogStorage.isOperator(msg.sender), "PrecogInternal: Caller is not allowed");
        remainingAmount = _decreaseInvestment(token, account, amount, timestamp);
    }

    function _updateDepositInfo(
        address _token,
        address _account,
        uint _amount
    ) internal {
        AccountTradingInfo memory _accountTradingInfo = precogStorage.getAccountTradingInfo(
            _token,
            _account
        );
        if (block.timestamp >= _accountTradingInfo.depositedTimestampOf) {
            _accountTradingInfo.availableAmount = _amount;
            _accountTradingInfo.depositedTimestampOf = precogStorage.getLastInvestmentOf(_token, _account).timestamp;
        } else {
            unchecked {
                _accountTradingInfo.availableAmount += _amount;
            }
        }
        precogStorage.updateAccountTradingInfo(_token, _account, _accountTradingInfo);
    }

    function updateDepositInfo(
        address token,
        address account,
        uint amount
    ) external override onlyPrecog {
        _updateDepositInfo(token, account, amount);
    }

    function _availableDepositedAmount(address _token, address _account) internal view returns (uint _amount) {
        AccountTradingInfo memory _accountTradingInfo = precogStorage.getAccountTradingInfo(
            _token,
            _account
        );
        _amount = _accountTradingInfo.depositedTimestampOf > block.timestamp ? _accountTradingInfo.availableAmount : 0;
    }

    function availableDepositedAmount(address token, address account) external view override returns (uint amount) {
        amount = _availableDepositedAmount(token, account);
    }

    /**
     * @dev Updates last trading cycle to current trading cycle when anyone interacts with contract
     * @param _token is token address
     * @param _isLimitedTradingCycles is check if msg.sender want to limit the trading cycles to update
     * @param _limitTradingCycles is the limit of trading cycles to update
     * NOTE The trading cycle get by
     * entTradingCycle function in Precog contract is virtual data,
     * it is not updated in storage real time so that when anyone interacts with contract,
     * it will be updated the storage
     */
    function _updateCurrentTradingCycle(
        address _token,
        bool _isLimitedTradingCycles,
        uint _limitTradingCycles
    ) internal {
        _getCoreInstance().updateFundingDuration(_token);
        _getCoreInstance().updateDefundingDuration(_token);
        Cycle memory _lastTradingCycle = precogStorage.getLastTradingCycle(_token);
        uint48 _newCycleStartTime;
        uint48 _duration;
        uint48 _tradingCycle = _getCoreInstance().getCycleConfiguration().tradingCycle;
        uint _timestampApplyNewTradingCycle = _getCoreInstance().getCyclesChangedInfo(_token).tradingApplyTime;
        while (uint48(block.timestamp) >= _lastTradingCycle.endTime) {
            if (_isLimitedTradingCycles) {
                if (_limitTradingCycles > 0) {
                    unchecked {
                        _limitTradingCycles--;
                    }
                } else {
                    return;
                }
            }
            emit UpdateTradingCycle({
                token: _token,
                cycleId: _lastTradingCycle.id,
                liquidity: precogStorage.getLiquidity(_token),
                duration: _lastTradingCycle.endTime - _lastTradingCycle.startTime
            });

            unchecked {
                _newCycleStartTime = _lastTradingCycle.endTime;
                _duration = _newCycleStartTime < _timestampApplyNewTradingCycle
                    ? _lastTradingCycle.endTime - _lastTradingCycle.startTime
                    : _duration = _tradingCycle;

                _lastTradingCycle = Cycle({
                    id: _lastTradingCycle.id + 1,
                    startTime: _newCycleStartTime,
                    endTime: _newCycleStartTime + _duration
                });
            }

            precogStorage.pushTradingCycle(_token, _lastTradingCycle);
            _updateTotalUnitsForFirstTimeOfTradingCycle(_token, _lastTradingCycle);
        }
    }

    function updateCurrentTradingCycle(
        address token,
        bool isLimitedTradingCycles,
        uint limitTradingCycles
    ) external override isExistingToken(token) {
        _updateCurrentTradingCycle(token, isLimitedTradingCycles, limitTradingCycles);
    }

    function getCurrentTradingCycle(address token) external view override returns (Cycle memory) {
        return _getTradingCycleByTimestamp(token, block.timestamp);
    }

    function getTradingCycle(address token, uint48 tradingTime)
        external
        view
        override
        returns (Cycle memory)
    {
        return _getTradingCycleByTimestamp(token, tradingTime);
    }
}
