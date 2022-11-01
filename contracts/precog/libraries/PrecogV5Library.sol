// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;
import "../interfaces/IPrecogStorage.sol";


library PrecogV5Library {
    function _isAppliedChangedCycle(uint _nextCycleApplyChangingTimestamp) internal view returns (bool) {
        return block.timestamp > _nextCycleApplyChangingTimestamp;
    }

    function _chooseLastAvailableTradingId(
        IContractStructure.Investment[] memory _investments,
        uint _investmentId,
        uint _value
    ) internal pure returns (IContractStructure.Investment memory _nextInvestment, uint _lastAvailableProfitId) {
        unchecked {
            _nextInvestment = IContractStructure.Investment({
                amount: 0,
                unit: 0,
                timestamp: 0,
                idChanged: 0,
                isWhitelist: false
            });
            _lastAvailableProfitId = _value;
            if (_investmentId < _investments.length - 1) {
                _nextInvestment = _investments[_investmentId + 1];
                if (_nextInvestment.idChanged <= _value) {
                    _lastAvailableProfitId = _nextInvestment.idChanged;
                }
            }
        }
    }

    function _calculateProfitAtCycle(
        IContractStructure.Cycle memory _profitCycle,
        IContractStructure.Investment memory _investment,
        uint _totalInvestmentUnit,
        uint _lastProfit,
        uint _lastProfitIdOf
    ) internal pure returns (uint _profitAtCycle) {
        unchecked {
            if (_totalInvestmentUnit > 0) {
                if (_lastProfitIdOf == _investment.idChanged) {
                    _profitAtCycle = (_lastProfit * _investment.unit) / _totalInvestmentUnit;
                } else {
                    IContractStructure.Cycle memory lastCycle = _profitCycle;
                    _profitAtCycle =
                        (_lastProfit * _investment.amount * (lastCycle.endTime - lastCycle.startTime)) /
                        _totalInvestmentUnit;
                }
            }
        }
    }

    function _calculateTradingCycleByTimestamp(
        IContractStructure.Cycle memory _lastTradingCycle,
        uint48 _tradingCycleDuration,
        uint _tradingApplyTime,
        uint timestamp
    ) internal pure returns (IContractStructure.Cycle memory currentCycle) {
        unchecked {
            while (uint48(timestamp) >= _lastTradingCycle.endTime) {
                uint48 _newCycleStartTime = _lastTradingCycle.endTime;
                uint48 _duration;
                
                if (_lastTradingCycle.endTime < _tradingApplyTime) {
                    _duration = _lastTradingCycle.endTime - _lastTradingCycle.startTime;
                } else {
                    _duration = _tradingCycleDuration;
                }
                uint48 _newCycleEndTime = _newCycleStartTime + _duration;
                _lastTradingCycle = (
                    IContractStructure.Cycle(_lastTradingCycle.id + 1, _newCycleStartTime, _newCycleEndTime)
                );
            }
            currentCycle = _lastTradingCycle;
        }
    }

    function _nextFundingTime(uint48 _newFirstFundingStartTime, uint48 _fundingDuration)
        internal
        view
        returns (uint48 _nextFundingTimestamp)
    {
        unchecked {
            if (block.timestamp < _newFirstFundingStartTime) {
                _nextFundingTimestamp = _newFirstFundingStartTime;
            } else {
                _nextFundingTimestamp =
                    ((uint48(block.timestamp) - _newFirstFundingStartTime) / _fundingDuration + 1) *
                    _fundingDuration +
                    _newFirstFundingStartTime;
            }
        }
    }

    function _nextDefundingTime(
        uint48 _newFirstDefundingStartTime,
        uint48 _defundingDuration,
        uint48 _firstDefundingDuration
    ) internal view returns (uint48 _nextDefundingTimestamp) {
        unchecked {
            if (_firstDefundingDuration > 0) {
                if (block.timestamp < _newFirstDefundingStartTime) {
                    return _newFirstDefundingStartTime + _firstDefundingDuration - _defundingDuration;
                } else {
                    return
                        ((uint48(block.timestamp) - _newFirstDefundingStartTime) / _defundingDuration) *
                        _defundingDuration +
                        _newFirstDefundingStartTime +
                        _firstDefundingDuration;
                }
            } else {
                if (block.timestamp < _newFirstDefundingStartTime) {
                    return _newFirstDefundingStartTime;
                } else {
                    return
                        ((uint48(block.timestamp) - _newFirstDefundingStartTime) / _defundingDuration + 1) *
                        _defundingDuration +
                        _newFirstDefundingStartTime;
                }
            }
        }
    }
}
