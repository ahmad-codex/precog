// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "../../../@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IRewardController {
    enum Type {
        APR,
        Flexible
    }

    function rewardType() external view returns (Type);

    function initilizeData() external view returns (bytes memory);

    function stake(address account, uint amount) external;

    function unstake(address account, uint amount) external;

    function verifyRewards(address account) external returns (uint);

    function rewardToken() external view returns (IERC20);

    function getRewards(address account) external view returns (uint);

    function getDailyRewards(address account) external view returns (uint);
}
