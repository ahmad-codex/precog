// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

interface IAPRRewardController {
    struct UserInfo {
        uint256 amount;
        uint256 lastRewardTime;
        uint256 storedReward;
        uint256 stakedTime;
    }
}
