// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

interface IFlexibleRewardController {
    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
        uint256 storedReward;
        uint256 stakedTime;
    }
}
