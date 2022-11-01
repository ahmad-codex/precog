// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "./IPrecogCore.sol";
import "./IPrecogInternal.sol";


interface IPrecogVault {
    function precogInternal() external view returns (IPrecogInternal);
    function precogStorage() external view returns (IPrecogStorage);
    function takeInvestment(address token) external;
    function forceWithdraw(
        address token,
        address account,
        address to,
        uint amount,
        uint withdrawalFee
    ) external;

    function withdrawRemainderTokenAfterRemoveLiquidityPool(address token) external;

}