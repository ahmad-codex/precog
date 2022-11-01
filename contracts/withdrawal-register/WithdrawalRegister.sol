// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;
import "../../@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../../@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IWithdrawalRegister.sol";

/**
 * @title WithdrawalRegister contract
 * @dev Implementation contract that be used to withdraw the requested withdrawal tokens
 */
contract WithdrawalRegister is IWithdrawalRegister {
    using SafeERC20 for IERC20;

    modifier onlyPrecog() {
        require(msg.sender == precog, "WithdrawalRegister: Caller is not precog");
        _;
    }

    // Address of precog contract
    address public override precog;

    // Address of precog core contract
    address public override precogCore;

    // Mapping from token address to register of account
    mapping(address => mapping(address => Register)) register;

    // Mapping from token address to check if the first request withdrawal of account
    mapping(address => mapping(address => bool)) isNotFirstWithdrawal;

    /**
     * @dev Constructor to set up contract
     * @param _precog is used to set up precog address when deploy contract
     * @param _precogCore is used to set precog core address when deploy contract
     */
    constructor(address _precog, address _precogCore) {
        precog = _precog;
        precogCore = _precogCore;
    }

    /**
     * @dev See {IWithdrawalRegister - getRegister}
     */
    function getRegister(address token, address account) external view override returns (Register memory _register) {
        _register = register[token][account];
    }

    /**
     * @dev See {IWithdrawalRegister - isFirstWithdraw}
     */
    function isFirstWithdraw(address token, address account) external view override returns (bool _isFirstWithdrawal) {
        _isFirstWithdrawal = !isNotFirstWithdrawal[token][account];
    }

    /**
     * @dev See {IWithdrawalRegister - isInDeadline}
     */
    function isInDeadline(address token, address account) public view override returns (bool) {
        Register memory lastRegister = register[token][account];
        return lastRegister.deadline >= block.timestamp;
    }

    /**
     * @dev See {IWithdrawalRegister - registerWithdrawal}
     */
    function registerWithdrawal(
        address token,
        address account,
        uint amount,
        uint deadline
    ) external override onlyPrecog {
        Register memory lastRegister = register[token][account];
        require(deadline >= lastRegister.deadline, "WithdrawalRegister: Deadline is invalid");
        require(
            isInDeadline(token, account) || lastRegister.amount == 0,
            "WithdrawalRegister: Must claim token before register again"
        );
        register[token][account] = Register(lastRegister.amount + amount, deadline);
        emit RegisterWithdrawal({token: token, account: account, amount: amount, deadline: deadline});
    }

    /**
     * @dev See {IWithdrawalRegister - claimWithdrawal}
     */
    function claimWithdrawal(
        address token,
        address account,
        address to,
        uint amount,
        uint fee
    ) external override onlyPrecog {
        Register memory lastRegister = register[token][account];
        require(lastRegister.deadline < block.timestamp, "WithdrawalRegister: Not out of deadline");
        require(lastRegister.amount >= amount, "WithdrawalRegister: Withdraw exceed requested amount");
        require(
            IERC20(token).balanceOf(address(this)) >= amount,
            "WithdrawalRegister: Middleware has not sent token yet"
        );
        IERC20(token).safeTransfer(to, amount - fee);
        IERC20(token).safeTransfer(precogCore, fee);
        register[token][account].amount -= amount;
        if (isNotFirstWithdrawal[token][account] == false) {
            isNotFirstWithdrawal[token][account] = true;
        }
        emit ClaimWithdrawal({token: token, account: account, amount: amount});
    }

    function modifyRegister(
        address token,
        address account,
        Register memory newRegister
    ) external override onlyPrecog {
        register[token][account] = newRegister;
    }
}
