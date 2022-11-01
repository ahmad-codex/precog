//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.10;

import "./interfaces/IExchangeRouter.sol";
import "../../@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockExchange is IExchangeRouter {
    mapping(address => mapping(address => uint)) public liquidity;

    function setLiquidity(
        address token1,
        address token2,
        uint liquidity1,
        uint liquidity2
    ) external {
        liquidity[token1][token2] = liquidity1;
        liquidity[token2][token1] = liquidity2;
    }

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts) {
        address token1 = path[0];
        address token2 = path[1];
        uint amountOut = (amountIn * liquidity[token2][token1]) / liquidity[token1][token2];
        if (token1 != address(0)) {
            IERC20(token1).transferFrom(msg.sender, address(this), amountIn);
        }
        if (token2 == address(0)) {
            payable(to).transfer(amountOut);
        } else {
            IERC20(token2).transfer(to, amountOut);
        }
    }

    function _transferFrom(
        address token,
        address to,
        uint amount
    ) internal {
        if (token == address(0)) {
            payable(to).transfer(amount);
        } else {
            IERC20(token).transfer(to, amount);
        }
    }

    function getAmountsOut(uint amountIn, address[] calldata path)
        external
        view
        override
        returns (uint[] memory amounts)
    {
        amounts = new uint[](2);
        amounts[0] = amountIn;
        amounts[1] = (amountIn * liquidity[path[1]][path[0]]) / liquidity[path[0]][path[1]];
    }

    function getAmountsIn(uint amountOut, address[] calldata path)
        external
        view
        override
        returns (uint[] memory amounts)
    {
        amounts = new uint[](2);
        amounts[0] = (amountOut * liquidity[path[0]][path[1]]) / liquidity[path[1]][path[0]];
        amounts[1] = amountOut;
    }

    receive() external payable {}
}
