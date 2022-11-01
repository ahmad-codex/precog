// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;
import "../../@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../../@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IPrecogCore.sol";
import "../ipcog/interfaces/IIPCOG.sol";
import "../middleware-exchange/interfaces/IMiddlewareExchange.sol";
import "../withdrawal-register/interfaces/IWithdrawalRegister.sol";
import "./interfaces/IIPCOGFactory.sol";
import "./interfaces/IPrecogStorage.sol";
import "./interfaces/IPrecogVault.sol";
import "./interfaces/IPrecogV5.sol";
import "./libraries/PrecogV5Library.sol";

contract PrecogV5 is IPrecogV5, IContractStructure, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IPrecogStorage public override precogStorage;
    IPrecogInternal public override precogInternal;

    modifier onlyPrecogCore() {
        require(msg.sender == precogStorage.getPrecogCore(), "PrecogV5: Only Precog Core");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == precogStorage.getAdmin(), "PrecogV5: Only admin");
        _;
    }

    modifier isExistingToken(address token) {
        require(precogStorage.checkIsExistingToken(token), "PrecogV5: Token must be added to pool");
        _;
    }

    constructor(IPrecogStorage _precogStorage, IPrecogInternal _precogInternal) {
        precogStorage = _precogStorage;
        precogInternal = _precogInternal;
    }

    function _getCoreInstance() internal view returns (IPrecogCore _core) {
        _core = IPrecogCore(precogStorage.getPrecogCore());
    }

    function _getWithdrawalRegisterInstance() internal view returns (IWithdrawalRegister _register) {
        _register = IWithdrawalRegister(precogStorage.getWithdrawalRegister());
    }

    function _getVaultInstance() internal view returns (IPrecogVault _vault) {
        _vault = IPrecogVault(precogStorage.getPrecogVault());
    }

    function _processHandleIncreaseInvestment(
        address _token,
        address _account,
        uint _amount
    ) internal returns (uint _depositAmount) {
        IWithdrawalRegister _withdrawalRegister = _getWithdrawalRegisterInstance();
        uint48 _nextFundingTime;
        {
            IPrecogCore _core = _getCoreInstance();
            CyclesChangedInfo memory _cycleChangedInfo = _core.getCyclesChangedInfo(_token);
            _nextFundingTime = PrecogV5Library._nextFundingTime(
                _cycleChangedInfo.fundingApplyTime,
                _cycleChangedInfo.fundingDuration
            );
        }

        if (precogStorage.getInvestmentsOf(_token, _account).length == 0) {
            // Account deposit at the first time
            precogInternal.increaseInvestment(_token, _account, _amount, _nextFundingTime);
            _depositAmount = _amount;
        } else {
            Investment memory _lastInvestmentOf = precogStorage.getLastInvestmentOf(_token, _account);
            Cycle memory _futureTradingCycle = precogInternal.getTradingCycleByTimestamp(_token, _nextFundingTime);

            if (_futureTradingCycle.id >= _lastInvestmentOf.idChanged) {
                // If the future trading cycle id is greater than or equal to last investment id

                precogInternal.increaseInvestment(_token, _account, _amount, _nextFundingTime);
                _depositAmount = _amount;
            } else {
                // If the future trading cycle id is less than last investment id (deposit after requesting withdrawal)

                if (_amount < _withdrawalRegister.getRegister(_token, _account).amount) {
                    // If amount is less than register amount
                    // Increase investment with time is register deadline

                    IWithdrawalRegister.Register memory _register = _withdrawalRegister.getRegister(_token, _account);
                    precogInternal.increaseInvestment(_token, _account, _amount, uint48(_register.deadline));

                    // Modify amount for register
                    _withdrawalRegister.modifyRegister(
                        _token,
                        _account,
                        IWithdrawalRegister.Register({amount: _register.amount - _amount, deadline: _register.deadline})
                    );
                } else if (_amount == _withdrawalRegister.getRegister(_token, _account).amount) {
                    // If amount is equal to register amount
                    // Increase investment with time is register deadline

                    IWithdrawalRegister.Register memory _register = _withdrawalRegister.getRegister(_token, _account);
                    precogInternal.increaseInvestment(_token, _account, _register.amount, uint48(_register.deadline));

                    // Close register for account
                    _withdrawalRegister.modifyRegister(
                        _token,
                        _account,
                        IWithdrawalRegister.Register({amount: 0, deadline: block.timestamp})
                    );
                } else {
                    // If amount is greater than register amount
                    {
                        IWithdrawalRegister.Register memory _register = _withdrawalRegister.getRegister(
                            _token,
                            _account
                        );
                        precogInternal.increaseInvestment(
                            _token,
                            _account,
                            _register.amount,
                            uint48(_register.deadline)
                        );

                        precogStorage.popInvestmentOf(_token, _account);
                        _withdrawalRegister.modifyRegister(
                            _token,
                            _account,
                            IWithdrawalRegister.Register({amount: 0, deadline: block.timestamp})
                        );
                        _depositAmount = _amount - _register.amount;
                    }
                    precogInternal.increaseInvestment(_token, _account, _depositAmount, _nextFundingTime);
                    for (uint i = _futureTradingCycle.id + 1; i <= _lastInvestmentOf.idChanged; ) {
                        _futureTradingCycle = precogInternal.getTradingCycleByTimestamp(
                            _token,
                            _futureTradingCycle.endTime
                        );
                        {
                            uint _newUnit;
                            unchecked {
                                _newUnit =
                                    precogStorage.getTotalUnitsTradingCycle(_token, i) +
                                    _depositAmount *
                                    (_futureTradingCycle.endTime - _futureTradingCycle.startTime);
                            }
                            precogStorage.updateTotalUnitsTradingCycle(_token, i, _newUnit);
                        }

                        if (_lastInvestmentOf.isWhitelist) {
                            unchecked {
                                precogStorage.updateTotalUnitsForWhitelistTradingCycle(
                                    _token,
                                    i,
                                    precogStorage.getTotalUnitsForWhitelistTradingCycle(_token, i) +
                                        _depositAmount *
                                        (_futureTradingCycle.endTime - _futureTradingCycle.startTime)
                                );
                            }
                        }
                        unchecked {
                            i++;
                        }
                    }
                }
            }
        }
    }

    function _increaseLiquidity(address _token, uint _amount) internal {
        uint _newLiquidity;
        unchecked {
            _newLiquidity = precogStorage.getLiquidity(_token) + _amount;
        }
        precogStorage.updateLiquidity(_token, _newLiquidity);
        if (precogStorage.checkIsInWhitelist(_token, msg.sender)) {
            uint _newLiquidityForWhitelist;
            unchecked {
                _newLiquidityForWhitelist = precogStorage.getLiquidityWhitelist(_token) + _amount;
            }
            precogStorage.updateLiquidityWhitelist(_token, _newLiquidityForWhitelist);
        }
    }

    function deposit(address token, uint amount) external override isExistingToken(token) nonReentrant {
        IPrecogCore core = _getCoreInstance();
        require(amount >= core.minFunding(token), "PrecogV5: Amount must be greater than min funding amount");
        precogInternal.updateCurrentTradingCycle(token, false, 0);
        // Calculate fees and actual deposit amount
        uint feeDeposit;
        uint actualDepositAmount;
        unchecked {
            feeDeposit = (amount * core.getFeeConfiguration().depositFee) / 10**core.feeDecimalBase();
            actualDepositAmount = amount - feeDeposit;
        }

        uint depositAmount = _processHandleIncreaseInvestment(token, msg.sender, actualDepositAmount);
        {
            uint amountInvestment = precogStorage.getLastInvestmentOf(token, msg.sender).amount;
            require(
                amountInvestment <= core.maxFunding(token),
                "PrecogV5: You can not deposit greater than max funding amount"
            );
        }

        // Update profit for caller
        precogInternal.updateProfit(token, msg.sender);
        // Increase liquidity and liquidity for whitelist (in case caller is whitelist)
        _increaseLiquidity(token, actualDepositAmount);
        require(
            precogStorage.getLiquidity(token) <= core.maxFundingPool(token),
            "PrecogV5: Liquidity amount must be less than limitation of pool"
        );
        // Transfer token amount and fees
        IERC20(token).safeTransferFrom(msg.sender, precogStorage.getPrecogVault(), depositAmount);
        IERC20(token).safeTransferFrom(msg.sender, precogStorage.getPrecogCore(), feeDeposit);
        // Mint liquidity token for caller
        IIPCOG(precogStorage.getTokenConvert(token)).mint(msg.sender, depositAmount);

        // Update deposit info for caller
        precogInternal.updateDepositInfo(token, msg.sender, depositAmount);
        emit Deposit({token: token, account: msg.sender, amount: amount, fee: feeDeposit});
    }

    function _processHandleDecreaseInvestment(
        address _token,
        uint _amount,
        bool _isFirstRequestWithdrawal
    ) internal returns (uint _remainingAmount) {
        uint48 _nextDefundingTime;
        CyclesChangedInfo memory _cycleChangedInfo = _getCoreInstance().getCyclesChangedInfo(_token);
        IWithdrawalRegister _withdrawalRegister = _getWithdrawalRegisterInstance();

        if (_isFirstRequestWithdrawal) {
            // If caller has requested withdrawal before and is still in deadline
            if (_withdrawalRegister.isInDeadline(_token, msg.sender)) {
                _nextDefundingTime = uint48(_withdrawalRegister.getRegister(_token, msg.sender).deadline);
            } else {
                // Get the time if caller requests withdrawal with the first time
                _nextDefundingTime = PrecogV5Library._nextDefundingTime(
                    _cycleChangedInfo.defundingApplyTime,
                    _cycleChangedInfo.defundingDuration,
                    _cycleChangedInfo.firstDefundingDuration
                );
            }
        } else {
            // Get the time if caller requests withdrawal with the not first time
            _nextDefundingTime = PrecogV5Library._nextDefundingTime(
                _cycleChangedInfo.defundingApplyTime,
                _cycleChangedInfo.defundingDuration,
                0
            );
        }
        // Decrease investment of caller with the next defunding time
        _remainingAmount = precogInternal.decreaseInvestment(_token, msg.sender, _amount, _nextDefundingTime);
    }

    function _decreaseLiquidity(address _token, uint _amount) internal {
        precogStorage.updateLiquidity(_token, precogStorage.getLiquidity(_token) - _amount);
        if (precogStorage.checkIsInWhitelist(_token, msg.sender)) {
            precogStorage.updateLiquidityWhitelist(_token, precogStorage.getLiquidityWhitelist(_token) - _amount);
        }
    }

    function requestWithdrawal(address token, uint amount) external override isExistingToken(token) nonReentrant {
        IPrecogCore core = _getCoreInstance();
        IWithdrawalRegister withdrawalRegister = _getWithdrawalRegisterInstance();
        require(amount >= core.minDefunding(token), "PrecogV5: Amount must be greater than min defunding amount");
        precogInternal.updateCurrentTradingCycle(token, false, 0);
        bool isFirstRequestWithdrawal = withdrawalRegister.isFirstWithdraw(token, msg.sender);
        uint remainingAmount = _processHandleDecreaseInvestment(token, amount, isFirstRequestWithdrawal);
        require(
            remainingAmount == 0 || remainingAmount >= core.minFunding(token),
            "PrecogV5: Remaining amount must be equal to zero or greater than min funding amount"
        );
        _registerWithdrawal(token, msg.sender, amount, isFirstRequestWithdrawal);
        precogInternal.updateProfit(token, msg.sender);
        _decreaseLiquidity(token, amount);
        emit RequestWithdrawal({token: token, account: msg.sender, amount: amount});
    }

    function _registerWithdrawal(
        address _token,
        address _account,
        uint _amount,
        bool _isFirstRequestWithdrawal
    ) internal {
        IPrecogCore _core = _getCoreInstance();
        IWithdrawalRegister _withdrawalRegister = _getWithdrawalRegisterInstance();
        CyclesChangedInfo memory _cycleChangedInfo = _core.getCyclesChangedInfo(_token);
        uint48 _duration = _isFirstRequestWithdrawal ? _core.getCycleConfiguration().firstDefundingCycle : 0;
        uint48 _nextDefundingTime = PrecogV5Library._nextDefundingTime(
            _cycleChangedInfo.defundingApplyTime,
            _cycleChangedInfo.defundingDuration,
            _duration
        );
        uint48 _locktime = _withdrawalRegister.isInDeadline(_token, _account)
            ? uint48(_withdrawalRegister.getRegister(_token, _account).deadline)
            : _nextDefundingTime;

        _withdrawalRegister.registerWithdrawal(_token, _account, _amount, _locktime);
    }

    function withdraw(
        address to,
        address token,
        uint amount,
        bool isEmergency
    ) external override isExistingToken(token) nonReentrant {
        IPrecogCore core = _getCoreInstance();
        IWithdrawalRegister _withdrawalRegister = _getWithdrawalRegisterInstance();
        uint withdrawalFee = (amount * core.getFeeConfiguration().withdrawalFee) / 10**core.feeDecimalBase();
        IIPCOG(precogStorage.getTokenConvert(token)).burnFrom(msg.sender, amount);
        if (isEmergency) {
            _getVaultInstance().forceWithdraw(token, msg.sender, to, amount, withdrawalFee);
        } else {
            _withdrawalRegister.claimWithdrawal(token, msg.sender, to, amount, withdrawalFee);
        }
        emit Withdraw({token: token, account: msg.sender, to: to, amount: amount, fee: withdrawalFee});
    }

    function turnOnWhitelist(address token, address account) external isExistingToken(token) onlyAdmin {
        require(!precogStorage.checkIsInWhitelist(token, account), "This account is current whitelist");
        precogInternal.updateCurrentTradingCycle(token, false, 0);
        uint futureIdForNextFunding;
        uint futureIdforNextFirstDefunding;
        uint timestamp;
        {
            IPrecogCore _core = _getCoreInstance();
            CyclesChangedInfo memory _cycleChangedInfo = _core.getCyclesChangedInfo(token);

            uint fundingTime = PrecogV5Library._nextFundingTime(
                _cycleChangedInfo.fundingApplyTime,
                _cycleChangedInfo.fundingDuration
            );
            uint defundingTime = PrecogV5Library._nextDefundingTime(
                _cycleChangedInfo.defundingApplyTime,
                _cycleChangedInfo.defundingDuration,
                _cycleChangedInfo.firstDefundingDuration
            );
            timestamp = precogInternal.getTradingCycleByTimestamp(token, fundingTime).endTime;
            futureIdForNextFunding = precogInternal.getTradingCycleByTimestamp(token, fundingTime).id;
            futureIdforNextFirstDefunding = precogInternal.getTradingCycleByTimestamp(token, defundingTime).id;
        }
        uint formerLiquidity = precogStorage.getLiquidityWhitelist(token);

        precogStorage.updateIsInWhitelist(token, account, true);
        precogStorage.pushWhitelist(token, account);
        _processHandleIncreaseInvestment(token, account, 0);
        uint amount = precogStorage.getLastInvestmentOf(token, account).amount;
        precogStorage.updateLiquidityWhitelist(token, precogStorage.getLiquidityWhitelist(token) + amount);

        uint laterLiquidity = precogStorage.getLiquidityWhitelist(token);
        uint offsetLiquidity = laterLiquidity - formerLiquidity;
        for (uint i = futureIdForNextFunding + 1; i <= futureIdforNextFirstDefunding; i++) {
            if (precogStorage.checkIsUpdateUnitTradingCycle(token, i)) {
                uint duration;
                {
                    Cycle memory futureTradingCycle = precogInternal.getTradingCycleByTimestamp(token, timestamp);
                    duration = futureTradingCycle.endTime - futureTradingCycle.startTime;
                    timestamp = futureTradingCycle.endTime;
                }
                uint totalUnits = precogStorage.getTotalUnitsForWhitelistTradingCycle(token, i);
                uint offsetUnits = offsetLiquidity * duration;
                precogStorage.updateTotalUnitsForWhitelistTradingCycle(token, i, totalUnits + offsetUnits);
            }
        }
    }

    function turnOffWhitelist(address token, address account) external isExistingToken(token) onlyAdmin {
        require(precogStorage.checkIsInWhitelist(token, account), "This account is not current whitelist");
        precogInternal.updateCurrentTradingCycle(token, false, 0);
        uint futureIdForNextFunding;
        uint futureIdforNextFirstDefunding;
        uint timestamp;
        {
            IPrecogCore _core = _getCoreInstance();
            CyclesChangedInfo memory _cycleChangedInfo = _core.getCyclesChangedInfo(token);

            uint fundingTime = PrecogV5Library._nextFundingTime(
                _cycleChangedInfo.fundingApplyTime,
                _cycleChangedInfo.fundingDuration
            );
            uint defundingTime = PrecogV5Library._nextDefundingTime(
                _cycleChangedInfo.defundingApplyTime,
                _cycleChangedInfo.defundingDuration,
                _cycleChangedInfo.firstDefundingDuration
            );
            timestamp = precogInternal.getTradingCycleByTimestamp(token, fundingTime).endTime;
            futureIdForNextFunding = precogInternal.getTradingCycleByTimestamp(token, fundingTime).id;
            futureIdforNextFirstDefunding = precogInternal.getTradingCycleByTimestamp(token, defundingTime).id;
        }
        uint formerLiquidity = precogStorage.getLiquidityWhitelist(token);

        precogStorage.updateIsInWhitelist(token, account, false);
        precogStorage.removeFromWhitelist(token, account);
        _processHandleIncreaseInvestment(token, account, 0);
        uint amount = precogStorage.getLastInvestmentOf(token, account).amount;
        precogStorage.updateLiquidityWhitelist(token, formerLiquidity - amount);

        uint laterLiquidity = precogStorage.getLiquidityWhitelist(token);
        uint offsetLiquidity = formerLiquidity - laterLiquidity;
        for (uint i = futureIdForNextFunding + 1; i <= futureIdforNextFirstDefunding; i++) {
            if (precogStorage.checkIsUpdateUnitTradingCycle(token, i)) {
                uint duration;
                {
                    Cycle memory futureTradingCycle = precogInternal.getTradingCycleByTimestamp(token, timestamp);
                    duration = futureTradingCycle.endTime - futureTradingCycle.startTime;
                    timestamp = futureTradingCycle.endTime;
                }
                uint totalUnits = precogStorage.getTotalUnitsForWhitelistTradingCycle(token, i);
                uint offsetUnits = offsetLiquidity * duration;
                precogStorage.updateTotalUnitsForWhitelistTradingCycle(token, i, totalUnits - offsetUnits);
            }
        }
    }
}
