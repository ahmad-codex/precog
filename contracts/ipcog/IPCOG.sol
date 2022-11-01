// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts v4.4.0 (token/ERC20/ERC20.sol)

pragma solidity ^0.8.2;

import "./interfaces/IIPCOG.sol";
import "../../@openzeppelin/contracts/utils/Context.sol";
import "../common/Ownable.sol";
import "../precog/interfaces/IPrecogV5.sol";
import "../precog/interfaces/IPrecogStorage.sol";
import "../precog/interfaces/IPrecogInternal.sol";
import "../withdrawal-register/interfaces/IWithdrawalRegister.sol";

contract IPCOG is Context, IIPCOG, Ownable {
    modifier onlyBurner() {
        require(isBurners[msg.sender] == true, "IPCOG: Not burner address");
        _;
    }

    mapping(address => uint) private _balances;

    mapping(address => mapping(address => uint)) private _allowances;

    uint private _totalSupply;
    uint public override holders;
    uint8 private _decimals;
    string private _name;
    string private _symbol;

    mapping(address => bool) isBurners;

    function isBurner(address account) external view override returns (bool) {
        return isBurners[account];
    }

    function setBurner(address account, bool isBurnerRole) external override onlyOwner {
        isBurners[account] = isBurnerRole;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) {
        _name = name_;
        _symbol = symbol_;
        _decimals = decimals_;
    }

    function name() public view virtual override returns (string memory) {
        return _name;
    }

    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    function totalSupply() public view virtual override returns (uint) {
        return _totalSupply;
    }

    function balanceOf(address account) public view virtual override returns (uint) {
        return _balances[account];
    }

    function transfer(address recipient, uint amount) public virtual override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function allowance(address owner, address spender) public view virtual override returns (uint) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint amount) public virtual override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint amount
    ) public virtual override returns (bool) {
        _transfer(sender, recipient, amount);

        uint currentAllowance = _allowances[sender][_msgSender()];
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        unchecked {
            _approve(sender, _msgSender(), currentAllowance - amount);
        }

        return true;
    }

    function burn(uint amount) external virtual override onlyBurner {
        _burn(_msgSender(), amount);
    }

    function burnFrom(address account, uint amount) external virtual override onlyBurner {
        uint currentAllowance = allowance(account, _msgSender());
        require(currentAllowance >= amount, "ERC20: burn amount exceeds allowance");
        unchecked {
            _approve(account, _msgSender(), currentAllowance - amount);
        }
        _burn(account, amount);
    }

    function mint(address account, uint amount) external virtual override onlyOwner {
        _mint(account, amount);
    }

    function increaseAllowance(address spender, uint addedValue) public virtual returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender] + addedValue);
        return true;
    }

    function decreaseAllowance(address spender, uint subtractedValue) public virtual returns (bool) {
        uint currentAllowance = _allowances[_msgSender()][spender];
        require(currentAllowance >= subtractedValue, "ERC20: decreased allowance below zero");
        unchecked {
            _approve(_msgSender(), spender, currentAllowance - subtractedValue);
        }

        return true;
    }

    function _transfer(
        address sender,
        address recipient,
        uint amount
    ) internal virtual {
        revert("Feature is not available");
    }

    function _mint(address account, uint amount) internal virtual {
        require(account != address(0), "ERC20: mint to the zero address");

        if (_balances[account] == 0) {
            holders++;
            emit SwitchHolders(holders);
        }

        _beforeTokenTransfer(address(0), account, amount);

        _totalSupply += amount;
        _balances[account] += amount;

        emit Transfer(address(0), account, amount);

        _afterTokenTransfer(address(0), account, amount);
    }

    function _burn(address account, uint amount) internal virtual {
        require(account != address(0), "ERC20: burn from the zero address");

        _beforeTokenTransfer(account, address(0), amount);

        uint accountBalance = _balances[account];

        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
        unchecked {
            _balances[account] = accountBalance - amount;
        }
        _totalSupply -= amount;

        emit Transfer(account, address(0), amount);

        _afterTokenTransfer(account, address(0), amount);
        if (_balances[account] == 0) {
            holders--;
            emit SwitchHolders(holders);
        }
    }

    function _approve(
        address owner,
        address spender,
        uint amount
    ) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint amount
    ) internal virtual {}

    function _afterTokenTransfer(
        address from,
        address to,
        uint amount
    ) internal virtual {}
}
