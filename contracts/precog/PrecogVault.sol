// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;
import "../../@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../../@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../ipcog/interfaces/IIPCOG.sol";
import "./interfaces/IPrecogVault.sol";

contract PrecogVault is IPrecogVault, IContractStructure, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IPrecogStorage public override precogStorage;
    IPrecogInternal public override precogInternal;

    function _getCoreInstance() internal view returns (IPrecogCore _core) {
        _core = IPrecogCore(precogStorage.getPrecogCore());
    }

    modifier onlyAdmin() {
        require(msg.sender == precogStorage.getAdmin(), "PrecogVault: Caller is not admin");
        _;
    }

    modifier onlyPrecog() {
        require(msg.sender == precogStorage.getPrecog(), "PrecogVault: Caller is not accessible");
        _;
    }

    modifier onlyMiddlewareService() {
        require(msg.sender == precogStorage.getMiddlewareService(), "PrecogVault: Caller is not middleware");
        _;
    }

    modifier isExistingToken(address token) {
        require(precogStorage.checkIsExistingToken(token), "PrecogVault: Token is not in trading");
        _;
    }

    constructor(IPrecogStorage _precogStorage, IPrecogInternal _precogInternal) {
        precogStorage = _precogStorage;
        precogInternal = _precogInternal;
    }

    function takeInvestment(address token) external override onlyMiddlewareService isExistingToken(token) nonReentrant {
        uint actualBalance = IERC20(token).balanceOf(address(this));
        uint idealRemainBalance = precogStorage.getLiquidity(token) / 10;
        if (idealRemainBalance < actualBalance) {
            IERC20(token).safeTransfer(msg.sender, actualBalance - idealRemainBalance);
        } else if (idealRemainBalance > actualBalance) {
            IERC20(token).safeTransferFrom(msg.sender, address(this), idealRemainBalance - actualBalance);
        }
    }

    function forceWithdraw(
        address token,
        address account,
        address to,
        uint amount,
        uint withdrawalFee
    ) external override onlyPrecog isExistingToken(token) nonReentrant {
        _withdrawBeforeFundingTime(token, account, to, amount, withdrawalFee);
    }

    function _decreaseInvestmentWhenWithdraw(
        address _token,
        address _account,
        uint _amount
    ) internal returns (uint _remainingAmount) {
        Investment[] memory _investmentsOf = precogStorage.getInvestmentsOf(_token, _account);
        Investment memory _lastInvestmentOf = _investmentsOf[_investmentsOf.length - 1];
        Cycle memory _futureTradingCycle = precogInternal.getTradingCycleByTimestamp(
            _token,
            _lastInvestmentOf.timestamp
        );
        // Update investment of
        uint _unit;
        unchecked {
            _lastInvestmentOf.amount -= _amount;
            _remainingAmount = _lastInvestmentOf.amount;
            _unit = _amount * (_futureTradingCycle.endTime - _lastInvestmentOf.timestamp);
            _lastInvestmentOf.unit -= _unit;
        }
        precogStorage.updateInvestmentOfByIndex(_token, _account, _investmentsOf.length - 1, _lastInvestmentOf);
        {
            // Decrease total units for pool
            uint _newUnit;
            unchecked {
                _newUnit = precogStorage.getTotalUnitsTradingCycle(_token, _futureTradingCycle.id) - _unit;
            }

            precogStorage.updateTotalUnitsTradingCycle(_token, _futureTradingCycle.id, _newUnit);
            // Decrease total units and liquidty for whitelist
            if (_lastInvestmentOf.isWhitelist) {
                // Decrease total units for whitelist
                uint _newTotalUnitsForWhitelist;
                unchecked {
                    _newTotalUnitsForWhitelist =
                        precogStorage.getTotalUnitsForWhitelistTradingCycle(_token, _futureTradingCycle.id) -
                        _unit;
                }

                precogStorage.updateTotalUnitsForWhitelistTradingCycle(
                    _token,
                    _futureTradingCycle.id,
                    _newTotalUnitsForWhitelist
                );

                // Decrease liquidity for whitelist
                uint _newLiquidityForWhitelist;
                unchecked {
                    _newLiquidityForWhitelist = precogStorage.getLiquidityWhitelist(_token) - _amount;
                }

                precogStorage.updateLiquidityWhitelist(_token, _newLiquidityForWhitelist);
            }
        }
        {
            // Update account trading info
            AccountTradingInfo memory _accountTradingInfo = precogStorage.getAccountTradingInfo(
                _token,
                _account
            );
            unchecked {
                _accountTradingInfo.availableAmount -= _amount;
            }

            precogStorage.updateAccountTradingInfo(_token, _account, _accountTradingInfo);
        }
        // Decrease liquidity amount
        precogStorage.updateLiquidity(_token, precogStorage.getLiquidity(_token) - _amount);
    }

    function _withdrawBeforeFundingTime(
        address _token,
        address _account,
        address _to,
        uint _amount,
        uint _fee
    ) internal {
        uint _availableWithdrawalAmount = precogInternal.availableDepositedAmount(_token, _account);
        require(_availableWithdrawalAmount >= _amount, "PrecogVault: Not available amount can withdraw");
        require(
            IERC20(_token).balanceOf(address(this)) >= _amount,
            "PrecogVault: Vault does not have enough token amount"
        );
        uint _remainingAmount = _decreaseInvestmentWhenWithdraw(_token, _account, _amount);
        require(
            _amount >= _getCoreInstance().minDefunding(_token),
            "PrecogVault: Amount must be greater than min defunding amount"
        );
        require(
            _remainingAmount == 0 || _remainingAmount >= _getCoreInstance().minFunding(_token),
            "PrecogVault: Remaining amount must be equal zero or greater than min funding amount"
        );
        IERC20(_token).safeTransfer(_to, _amount - _fee);
        IERC20(_token).safeTransfer(precogStorage.getPrecogCore(), _fee);
    }

    function withdrawRemainderTokenAfterRemoveLiquidityPool(address token) external override onlyAdmin {
        require(
            precogStorage.checkIsRemoved(token),
            "PrecogVault: Admin must withdraw remainder amount after remove pool"
        );
        IERC20(token).safeTransfer(msg.sender, IERC20(token).balanceOf(address(this)));
    }
}
