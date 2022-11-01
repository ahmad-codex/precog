// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "./IIPCOGFactory.sol";
import "./IPrecogInternal.sol";

interface IPrecogFactory {
    event AddLiquidity(address indexed token, address indexed liquidityToken);
    event RemoveLiquidity(address indexed token, address indexed liquidityToken);

    function precogStorage() external view returns (IPrecogStorage);
    function precogInternal() external view returns (IPrecogInternal);
    function IPCOGfactory() external view returns (IIPCOGFactory);

    function addLiquidityPool(address token) external;
    function removeLiquidityPool(address token) external;
}