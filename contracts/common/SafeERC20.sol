// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import "../../@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "../../@openzeppelin/contracts/token/ERC20/IERC20.sol";

library SafeERC20 {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    function safeTransfer(
        IERC20 token,
        address to,
        uint value
    ) internal {
        IERC20Upgradeable(address(token)).safeTransfer(to, value);
    }

    function safeTransferFrom(
        IERC20 token,
        address from,
        address to,
        uint value
    ) internal {
        IERC20Upgradeable(address(token)).safeTransferFrom(from, to, value);
    }

    function safeApprove(
        IERC20 token,
        address spender,
        uint value
    ) internal {
        IERC20Upgradeable(address(token)).safeApprove(spender, value);
    }
}
