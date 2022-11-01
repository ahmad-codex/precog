// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import {IRewardController, IERC20} from "../interfaces/IRewardController.sol";
import {AuthorizerUpgradeable, IAccessControl} from "../../common/auth/AuthorizerUpgradeable.sol";

abstract contract BaseRewardController is IRewardController, AuthorizerUpgradeable {
    // Reward token to pay for accounts
    IERC20 public rewardToken;

    // Based check point
    uint public dailyCheckPoint;

    // Period for accounts to get rewards
    uint public period;

    // The disable time for this reward controller
    uint public disableTime;

    // Reward type: APR or Flexible
    Type public rewardType;

    function __initialize(IERC20 _rewardToken, IAccessControl _hr) internal {
        rewardToken = _rewardToken;
        __Authorizer_init(_hr);
        period = type(uint).max; // Default at max uint256
        disableTime = type(uint).max; // Default at max uint256
    }

    function setDailyCheckPoint(uint value) external onlyRole(ADMIN_ROLE) {
        dailyCheckPoint = value;
    }

    function setPeriod(uint value) external onlyRole(ADMIN_ROLE) {
        period = value;
    }

    function setDisableTime(uint value) external onlyRole(ADMIN_ROLE) {
        require(value > block.timestamp, "Invalid disable time");
        disableTime = value;
    }

    function getUserLatestCheckPoint(uint timestamp) public view returns (uint latestCheckPoint) {
        if (period == type(uint).max) {
            latestCheckPoint = type(uint).max;
        } else {
            require(timestamp > dailyCheckPoint, "Invalid timestamp");
            uint daysFromCheckPoint = (timestamp - dailyCheckPoint) / 1 days;
            latestCheckPoint = daysFromCheckPoint * 1 days + period + dailyCheckPoint;
        }
    }
}
