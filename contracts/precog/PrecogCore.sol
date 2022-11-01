// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "../../@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./libraries/PrecogV5Library.sol";
import "../withdrawal-register/interfaces/IWithdrawalRegister.sol";
import "./interfaces/IPrecogV5.sol";
import "./interfaces/IPrecogCore.sol";
import "./interfaces/IPrecogInternal.sol";

contract PrecogCore is IPrecogCore {
    using SafeERC20 for IERC20;

    modifier onlyAdmin() {
        require(msg.sender == precogStorage.getAdmin(), "PrecogCore: Caller is not admin");
        _;
    }

    modifier onlyOperator() {
        require(precogStorage.isOperator(msg.sender), "PrecogCore: Caller is not an operator");
        _;
    }

    IPrecogStorage public precogStorage;
    IPrecogInternal public precogInternal;

    FeeConfiguration private feeConfiguration;
    CycleConfiguration private cycleConfiguration;
    uint8 public constant override feeDecimalBase = 18;
    mapping(address => CyclesChangedInfo) cyclesChangedInfo;
    mapping(address => uint) public override minFunding;
    mapping(address => uint) public override maxFunding;
    mapping(address => uint) public override maxFundingPool;
    mapping(address => uint) public override minDefunding;

    constructor(IPrecogStorage _precogStorage, IPrecogInternal _precogInternal) {
        precogStorage = _precogStorage;
        precogInternal = _precogInternal;
        feeConfiguration = FeeConfiguration({
            depositFee: 1000000000000000,
            withdrawalFee: 1000000000000000,
            tradingFee: 1000000000000000,
            lendingFee: 1000000000000000
        });
        cycleConfiguration = CycleConfiguration({
            firstDefundingCycle: 259200,
            fundingCycle: 86400,
            defundingCycle: 86400,
            tradingCycle: 604800
        });
    }

    function getFeeConfiguration() external view override returns (FeeConfiguration memory) {
        return feeConfiguration;
    }

    function getCycleConfiguration() external view override returns (CycleConfiguration memory) {
        return cycleConfiguration;
    }

    function getCyclesChangedInfo(address _token) external view override returns (CyclesChangedInfo memory) {
        return cyclesChangedInfo[_token];
    }

    function setCycleConfiguration(CycleConfiguration memory newCycleConfiguration) external onlyAdmin {
        uint32 firstDefundingCycle = newCycleConfiguration.firstDefundingCycle;
        uint32 fundingCycle = newCycleConfiguration.fundingCycle;
        uint32 defundingCycle = newCycleConfiguration.defundingCycle;
        uint32 tradingCycle = newCycleConfiguration.tradingCycle;

        require(firstDefundingCycle > 0 && defundingCycle > 0 && fundingCycle > 0);
        require(fundingCycle <= tradingCycle);
        require(tradingCycle >= firstDefundingCycle && tradingCycle >= defundingCycle);
        require((firstDefundingCycle / defundingCycle) * defundingCycle == firstDefundingCycle);

        _updateAdjustments(newCycleConfiguration);

        cycleConfiguration = newCycleConfiguration;
        emit SetCycleConfiguration({
            admin: precogStorage.getAdmin(),
            firstDefundingDuration: firstDefundingCycle,
            fundingDuration: fundingCycle,
            defundingDuration: defundingCycle,
            tradingDuration: tradingCycle
        });
    }

    function setCyclesChangedInfo(address _token, CyclesChangedInfo memory _cyclesChangedInfo)
        external
        override
        onlyOperator
    {
        cyclesChangedInfo[_token] = _cyclesChangedInfo;
    }

    function _updateAdjustments(CycleConfiguration memory _newCycleConfiguration) internal {
        TokenPair[] memory _pairs = IPrecogStorage(precogStorage).getExistingTokensPair();
        for (uint i = 0; i < _pairs.length; i++) {
            precogInternal.updateCurrentTradingCycle(_pairs[i].token, false, 2**255);
            CyclesChangedInfo memory _cycleChangedInfo = cyclesChangedInfo[_pairs[i].token];

            {
                Cycle memory _currentTradingcycle = precogInternal.getCurrentTradingCycle(_pairs[i].token);
                uint _tradingDuration = _currentTradingcycle.endTime - _currentTradingcycle.startTime;
                require(
                    _newCycleConfiguration.firstDefundingCycle <= _tradingDuration &&
                        _newCycleConfiguration.fundingCycle <= _tradingDuration &&
                        _newCycleConfiguration.defundingCycle <= _tradingDuration,
                    "PrecogCore: Funding and defunding duration must be less than current trading duration"
                );
            }

            uint48 _nextFundingTime = PrecogV5Library._nextFundingTime(
                _cycleChangedInfo.fundingApplyTime,
                _cycleChangedInfo.fundingDuration
            );
            uint48 _nextTradingTime = _nextFundingTime;

            uint48 _nextDefundingTime = PrecogV5Library._nextDefundingTime(
                _cycleChangedInfo.defundingApplyTime,
                _cycleChangedInfo.defundingDuration,
                _cycleChangedInfo.firstDefundingDuration
            );

            if (_nextFundingTime < _nextDefundingTime) {
                _nextTradingTime = _nextDefundingTime;
            }

            Cycle memory _futureTradingcycle = precogInternal.getTradingCycle(_pairs[i].token, _nextTradingTime);

            if (_cycleChangedInfo.tradingApplyTime < _futureTradingcycle.endTime) {
                _cycleChangedInfo.tradingApplyTime = _futureTradingcycle.endTime;
            }

            _nextDefundingTime = PrecogV5Library._nextDefundingTime(
                _cycleChangedInfo.defundingApplyTime,
                _cycleChangedInfo.defundingDuration,
                0
            );
            cyclesChangedInfo[_pairs[i].token] = CyclesChangedInfo({
                tradingApplyTime: _cycleChangedInfo.tradingApplyTime,
                fundingApplyTime: _nextFundingTime,
                defundingApplyTime: _nextDefundingTime,
                fundingDuration: _cycleChangedInfo.fundingDuration,
                firstDefundingDuration: _cycleChangedInfo.firstDefundingDuration,
                defundingDuration: _cycleChangedInfo.defundingDuration
            });
        }
    }

    function setFeeConfiguration(FeeConfiguration memory _feeConfiguration) external onlyAdmin {
        feeConfiguration = _feeConfiguration;
        emit SetFeeConfiguration({
            admin: precogStorage.getAdmin(),
            depositFee: _feeConfiguration.depositFee,
            withdrawalFee: _feeConfiguration.withdrawalFee,
            tradingFee: _feeConfiguration.tradingFee,
            lendingFee: _feeConfiguration.lendingFee
        });
    }

    function collectFee(address token) external onlyAdmin {
        address admin = precogStorage.getAdmin();
        uint balanceOf = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransfer(admin, balanceOf);
        emit CollectFee({admin: admin, token: token, amount: balanceOf});
    }

    function setMinFunding(address token, uint amount) external onlyAdmin {
        minFunding[token] = amount;
    }

    function setMaxFunding(address token, uint limitation) external onlyAdmin {
        maxFunding[token] = limitation;
    }

    function setMaxFundingPool(address token, uint limitation) external onlyAdmin {
        maxFundingPool[token] = limitation;
    }

    function setMinDefunding(address token, uint amount) external onlyAdmin {
        require(amount <= minFunding[token], "PrecogCore: MIN_DEFUNDING_MUST_LESS_THAN_MIN_FUNDING");
        minDefunding[token] = amount;
    }

    function getCurrentFundingCycle(address token)
        external
        view
        override
        returns (uint lastFundingStartTime, uint nextFundingStartTime)
    {
        CyclesChangedInfo memory _cycleChangedInfo = cyclesChangedInfo[token];
        uint48 fundingApplyTime = _cycleChangedInfo.fundingApplyTime;
        uint48 fundingDuration = fundingApplyTime >= block.timestamp
            ? cycleConfiguration.fundingCycle
            : _cycleChangedInfo.fundingDuration;
        nextFundingStartTime = PrecogV5Library._nextFundingTime(fundingApplyTime, fundingDuration);
        lastFundingStartTime = nextFundingStartTime - fundingDuration;
    }

    function getCurrentDefundingCycle(address token)
        external
        view
        override
        returns (uint lastDefundingStartTime, uint nextDefundingStartTime)
    {
        CyclesChangedInfo memory cycleChangedInfo = cyclesChangedInfo[token];
        uint48 defundingApplyTime = cycleChangedInfo.defundingApplyTime;
        uint48 defundingDuration = cycleChangedInfo.defundingDuration;
        uint48 firstDefundingDuration = cycleChangedInfo.firstDefundingDuration;
        if (defundingApplyTime >= block.timestamp) {
            defundingDuration = cycleConfiguration.defundingCycle;
            firstDefundingDuration = cycleConfiguration.firstDefundingCycle;
        }
        address withdrawalRegister = IPrecogStorage(precogStorage).getWithdrawalRegister();
        if (IWithdrawalRegister(withdrawalRegister).isFirstWithdraw(token, msg.sender)) {
            if (IWithdrawalRegister(withdrawalRegister).isInDeadline(token, msg.sender)) {
                nextDefundingStartTime = IWithdrawalRegister(withdrawalRegister)
                    .getRegister(token, msg.sender)
                    .deadline;
            } else {
                nextDefundingStartTime = PrecogV5Library._nextDefundingTime(
                    defundingApplyTime,
                    defundingDuration,
                    firstDefundingDuration
                );
            }
        } else {
            nextDefundingStartTime = PrecogV5Library._nextDefundingTime(defundingApplyTime, defundingDuration, 0);
        }
        lastDefundingStartTime =
            PrecogV5Library._nextDefundingTime(defundingApplyTime, defundingDuration, 0) -
            defundingDuration;
    }

    function updateFundingDuration(address token) external override {
        if (PrecogV5Library._isAppliedChangedCycle(cyclesChangedInfo[token].fundingApplyTime)) {
            cyclesChangedInfo[token].fundingDuration = cycleConfiguration.fundingCycle;
        }
    }

    /**
     * @notice Use to update the defunding cycle after the applied time when admin change cycle configuration
     * @param token is token address
     */
    function updateDefundingDuration(address token) external override {
        if (PrecogV5Library._isAppliedChangedCycle(cyclesChangedInfo[token].defundingApplyTime)) {
            cyclesChangedInfo[token].firstDefundingDuration = cycleConfiguration.firstDefundingCycle;
            cyclesChangedInfo[token].defundingDuration = cycleConfiguration.defundingCycle;
        }
    }
}
