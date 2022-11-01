// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

interface IPriceFeed {
    function getAmountOut(
        uint amountIn,
        address from,
        address to
    ) external view returns (uint);
}
