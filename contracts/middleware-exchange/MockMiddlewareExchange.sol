// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;
import "../../@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../../@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IMiddlewareExchange.sol";

import "hardhat/console.sol";

contract MockMiddlewareExchange is IMiddlewareExchange {
    using SafeERC20 for IERC20;

    address exchange;

    constructor(address _exchange) {
        exchange = _exchange;
    }

    function getPath(address tokenIn, address tokenOut) internal pure returns (address[] memory) {
        address[] memory pair = new address[](2);
        pair[0] = tokenIn;
        pair[1] = tokenOut;
        return pair;
    }

    function buyToken(
        address tokenIn,
        address tokenOut,
        uint amountIn
    ) external override returns (uint amountOut) {
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        if (IERC20(tokenIn).allowance(address(this), exchange) < amountIn) {
            IERC20(tokenIn).safeApprove(exchange, 2**255);
        }
        amountOut = amountIn;
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
    }
}
