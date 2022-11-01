// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;
import "../../@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../../@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../middleware-exchange/interfaces/IMiddlewareExchange.sol";
import "./interfaces/IPrecogCore.sol";
import "./interfaces/IPrecogProfit.sol";

contract PrecogProfit is IPrecogProfit, IContractStructure, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IPrecogStorage public override precogStorage;
    IPrecogInternal public override precogInternal;

    uint public profitCutRate;

    modifier onlyMiddlewareService() {
        require(msg.sender == precogStorage.getMiddlewareService(), "PrecogProfit: Only middleware service");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == precogStorage.getAdmin(), "PrecogProfit: Only admin");
        _;
    }

    modifier isExistingToken(address token) {
        require(precogStorage.checkIsExistingToken(token), "PrecogProfit: Token must be added to pool");
        _;
    }

    constructor(IPrecogStorage _precogStorage, IPrecogInternal _precogInternal) {
        precogStorage = _precogStorage;
        precogInternal = _precogInternal;
    }

    function _getCoreInstance() internal view returns (IPrecogCore _core) {
        _core = IPrecogCore(precogStorage.getPrecogCore());
    }

    function _getMiddlewareExchangeInstance() internal view returns (IMiddlewareExchange _middlewareExchange) {
        return IMiddlewareExchange(precogStorage.getMiddlewareExchange());
    }

    function setProfitCutRate(uint newProfitCutRate) external onlyAdmin {
        profitCutRate = newProfitCutRate;
    }

    /**
     * @dev Buys PCOG from exchange with token profit
     * @param _token is token address
     * @param _profitAmount is profit amount by token address
     * @param _currentProfitId is the last trading cycle that middleware sent profit
     * @return _pcogBoughtAmount is profit amount by PCOG address
     */
    function _buyPCOG(
        address _token,
        uint _profitAmount,
        uint _currentProfitId
    ) internal returns (uint _pcogBoughtAmount) {
        if (_profitAmount > 0) {
            if (IERC20(_token).allowance(address(this), precogStorage.getMiddlewareExchange()) < _profitAmount) {
                IERC20(_token).safeApprove(precogStorage.getMiddlewareExchange(), 2**255);
            }
            _pcogBoughtAmount = _getMiddlewareExchangeInstance().buyToken(
                _token,
                precogStorage.getPCOG(),
                _profitAmount
            );
            precogStorage.updateProfitByIndex(_token, _currentProfitId, _pcogBoughtAmount);
        }
    }

    /**
     * @dev Buys PCOG from exchange with token profit
     * @param _token is token address
     * @param _profitCutAmount is profit amount by token address
     * @return _gmtBoughtAmount is profit amount by GMT address
     */
    function _buyGMT(address _token, uint _profitCutAmount) internal returns (uint _gmtBoughtAmount) {
        if (IERC20(_token).allowance(address(this), precogStorage.getMiddlewareExchange()) < _profitCutAmount) {
            IERC20(_token).safeApprove(precogStorage.getMiddlewareExchange(), 2**255);
        }
        _gmtBoughtAmount = _getMiddlewareExchangeInstance().buyToken(_token, precogStorage.getGMT(), _profitCutAmount);
    }

    function sendProfit(address token, uint profitAmount)
        external
        override
        onlyMiddlewareService
        isExistingToken(token)
        nonReentrant
    {
        uint currentProfitId = precogStorage.getCurrentProfitId(token);
        uint totalUnit = precogStorage.getTotalUnitsTradingCycle(token, currentProfitId);
        uint profitAmountForWhitelist;

        if (totalUnit == 0) {
            profitAmount = 0;
        }
        precogInternal.updateCurrentTradingCycle(token, false, 0);
        IERC20(token).safeTransferFrom(msg.sender, address(this), profitAmount);
        IPrecogCore core = _getCoreInstance();
        {
            // Charge trading fee
            uint feeBased = 10**core.feeDecimalBase();
            uint tradingFee = (profitAmount * core.getFeeConfiguration().tradingFee) / feeBased;
            IERC20(token).safeTransfer(precogStorage.getPrecogCore(), tradingFee);

            // Get profit cut to buy GMT token
            uint profitCutAmount = (profitAmount * profitCutRate) / feeBased;
            if (profitCutAmount > 0) {
                uint gmtBoughtAmount = _buyGMT(token, profitCutAmount);
                IERC20(precogStorage.getGMT()).safeTransfer(precogStorage.getMiddlewareService(), gmtBoughtAmount);
                emit TransferGMT({
                    token: token,
                    middewareService: precogStorage.getMiddlewareService(),
                    profitCutAmount: profitCutAmount,
                    gmtBoughtAmount: gmtBoughtAmount,
                    timestamp: block.timestamp
                });
            }

            // Update profit amount to share for whitelist and buy PCOG
            profitAmount -= (tradingFee + profitCutAmount);
        }

        require(
            currentProfitId < precogStorage.getLastTradingCycle(token).id,
            "PrecogProfit: Trading cycle is still in trading time"
        );

        // Share profit for whitelist
        if (totalUnit > 0) {
            profitAmountForWhitelist =
                (profitAmount *
                    ((10**core.feeDecimalBase() *
                        precogStorage.getTotalUnitsForWhitelistTradingCycle(token, currentProfitId)) / totalUnit)) /
                10**core.feeDecimalBase();
        }
        precogStorage.updateProfitForWhitelistByIndex(token, currentProfitId, profitAmountForWhitelist);

        // Buy PCOG and update status
        uint pcogBoughtAmount = _buyPCOG(token, profitAmount - profitAmountForWhitelist, currentProfitId);
        emit SendProfit({
            token: token,
            PCOG: precogStorage.getPCOG(),
            cycleId: currentProfitId,
            profitByToken: profitAmount,
            profitForWhitelist: profitAmountForWhitelist,
            profitByPCOG: pcogBoughtAmount
        });
        precogStorage.updateCurrentProfitId(token, currentProfitId + 1);
        precogStorage.pushProfit(token, 0);
        precogStorage.pushProfitForWhitelist(token, 0);
    }

    function _handleProfitInfoAndTradingInfo(address _to, address _token)
        internal
        returns (uint _profitAmount, uint _profitAmountForWhitelist)
    {
        if (_to != msg.sender) {
            AccountProfitInfo memory _accountProfitInfoFrom = precogStorage.getAccountProfitInfo(_token, msg.sender);
            AccountProfitInfo memory _accountProfitInfoTo = precogStorage.getAccountProfitInfo(_token, _to);

            _profitAmount = _accountProfitInfoFrom.profit;
            _profitAmountForWhitelist = _accountProfitInfoFrom.profitForWhitelist;

            _accountProfitInfoTo.claimedProfit += _profitAmount;
            _accountProfitInfoTo.claimedProfitForWhitelist += _profitAmountForWhitelist;

            _accountProfitInfoFrom.profit = 0;
            _accountProfitInfoFrom.profitForWhitelist = 0;

            precogStorage.updateAccountProfitInfo(_token, msg.sender, _accountProfitInfoFrom);
            precogStorage.updateAccountProfitInfo(_token, _to, _accountProfitInfoTo);
        } else {
            AccountProfitInfo memory _accountProfitInfo = precogStorage.getAccountProfitInfo(_token, msg.sender);

            _profitAmount = _accountProfitInfo.profit;
            _profitAmountForWhitelist = _accountProfitInfo.profitForWhitelist;

            _accountProfitInfo.claimedProfit += _profitAmount;
            _accountProfitInfo.claimedProfitForWhitelist += _profitAmountForWhitelist;

            _accountProfitInfo.profit = 0;
            _accountProfitInfo.profitForWhitelist = 0;

            precogStorage.updateAccountProfitInfo(_token, msg.sender, _accountProfitInfo);
        }
    }

    function takeProfit(address to, address token) external override isExistingToken(token) nonReentrant {
        precogInternal.updateCurrentTradingCycle(token, false, 0);
        precogInternal.updateProfit(token, msg.sender);
        (uint profitAmount, uint profitAmountForWhitelist) = _handleProfitInfoAndTradingInfo(to, token);
        IERC20(precogStorage.getPCOG()).safeTransfer(to, profitAmount);
        IERC20(token).safeTransfer(to, profitAmountForWhitelist);
        emit TakeProfit(token, precogStorage.getPCOG(), msg.sender, profitAmount);
    }
}
