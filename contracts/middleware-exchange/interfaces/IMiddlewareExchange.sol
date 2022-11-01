// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

interface IMiddlewareExchange {
  function buyToken(address tokenIn, address tokenOut, uint amountIn) external returns (uint256 amountOut);
}