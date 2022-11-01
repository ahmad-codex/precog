// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "./interfaces/IPriceFeed.sol";
import "../middleware-exchange/interfaces/IExchangeRouter.sol";
import "../../@openzeppelin/contracts/access/Ownable.sol";

contract BasicPriceFeed is IPriceFeed, Ownable {
    IExchangeRouter public exchange;
    mapping(address => mapping(address => address)) public intermediateTokens;

    constructor(IExchangeRouter _exchange) {
        exchange = _exchange;
    }

    function getAmountOut(
        uint amountIn,
        address from,
        address to
    ) external view returns (uint) {
        if (from == to) return amountIn;
        address intermediateToken = intermediateTokens[from][to];
        address[] memory path = new address[](2);
        if (intermediateToken == address(0)) {
            path[0] = from;
            path[1] = to;
            return exchange.getAmountsOut(amountIn, path)[1];
        } else {
            path[0] = from;
            path[1] = intermediateToken;
            uint amountIntermediate = exchange.getAmountsOut(amountIn, path)[1];
            path[0] = intermediateToken;
            path[1] = to;
            return exchange.getAmountsOut(amountIntermediate, path)[1];
        }
    }

    function setIntermediateToken(
        address intermediateToken,
        address token1,
        address token2
    ) external onlyOwner {
        intermediateTokens[token1][token2] = intermediateToken;
        intermediateTokens[token2][token1] = intermediateToken;
    }
}
