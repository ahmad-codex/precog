// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "./IRewardController.sol";

interface IStakingPool {
    struct Pool {
        uint quota;
        uint40 stakingPeriod;
        uint16 stakeFeeRate;
        uint16 unstakeFeeRate;
        uint16 penaltyRate;
        IRewardController[] rewardControllers;
    }

    struct Staking {
        uint amount;
        uint deadline;
    }

    event Stake(address indexed user, uint amount);
    event Unstake(address indexed user, uint amount);
    event ClaimReward(address indexed user, uint indexed rewardId, uint amount);
    event SetPool(Pool pool);
}
