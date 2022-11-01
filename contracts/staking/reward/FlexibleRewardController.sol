// SPDX-License-Identifier: MIT
// solhint-disable not-rely-on-time
pragma solidity ^0.8.2;

import {BaseRewardController, IAccessControl, IERC20} from "./BaseRewardController.sol";
import {IFlexibleRewardController} from "../interfaces/IFlexibleRewardController.sol";
import {SafeERC20} from "../../../@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract FlexibleRewardController is IFlexibleRewardController, BaseRewardController {
    using SafeERC20 for IERC20;

    uint private constant PRECISION_FACTOR = 1e26;
    uint private constant PRECISION_REWARD_FACTOR = 1e4;
    uint private constant MAX_UINT = type(uint).max;
    uint public rewardPerSec;
    uint public endTime;
    uint public lastRewardTime;
    uint public accRewardPerShare;
    uint public totalStaked;
    mapping(address => UserInfo) public users;
    mapping(uint => uint) public accRewardsPerShare;

    function initialize(IERC20 _rewardToken, IAccessControl _hr) external initializer {
        __initialize(_rewardToken, _hr);
        rewardType = Type.Flexible;
    }

    function initilizeData() external view override returns (bytes memory) {
        return abi.encodeWithSignature("initialize(address,address)", rewardToken, hr);
    }

    function _updateRewardAtDailyCheckPoint(uint _deltaTime) internal returns (uint _remainingDeltaTime) {
        uint _daysFromCheckPoint = (lastRewardTime - dailyCheckPoint) / 1 days + 1;
        uint _lastDailyCheckPoint = _daysFromCheckPoint * 1 days + dailyCheckPoint;
        uint _subDeltaTime = _lastDailyCheckPoint - lastRewardTime;
        uint _accRewardPerShare = accRewardPerShare;
        uint _lastRewardTime = lastRewardTime;
        uint _rewardPerSec = rewardPerSec;
        _remainingDeltaTime = _deltaTime;

        while (_remainingDeltaTime >= 1 days) {
            uint _lastRewards = _subDeltaTime * _rewardPerSec;
            _accRewardPerShare += (_lastRewards * PRECISION_FACTOR) / totalStaked;
            accRewardsPerShare[_lastDailyCheckPoint] = _accRewardPerShare;
            _lastDailyCheckPoint += _subDeltaTime;
            _remainingDeltaTime -= _subDeltaTime;
            _lastRewardTime += _subDeltaTime;
            _subDeltaTime = 1 days;
        }
        accRewardPerShare = _accRewardPerShare;
        lastRewardTime = _lastRewardTime;
    }

    function updateReward() public {
        uint deltaTime = _getDeltaTime(lastRewardTime, endTime);

        // no need to update
        if (deltaTime == 0) {
            if (block.timestamp > endTime) {
                rewardPerSec = 0;
            }
            return;
        }

        // round has not been staked yet
        if (totalStaked == 0) {
            lastRewardTime += deltaTime;
            return;
        }

        deltaTime = _updateRewardAtDailyCheckPoint(deltaTime);
        if (deltaTime == 0) return;
        uint lastRewards = deltaTime * rewardPerSec;
        accRewardPerShare = accRewardPerShare + ((lastRewards * PRECISION_FACTOR) / totalStaked);
        lastRewardTime += deltaTime;
    }

    function stake(address account, uint amount) external override onlyRole(POOL_ROLE) {
        UserInfo memory user = users[account];
        updateReward();
        users[account] = UserInfo({
            amount: user.amount + amount,
            rewardDebt: (user.amount * accRewardPerShare) / PRECISION_FACTOR,
            storedReward: user.storedReward + _getPendingReward(user),
            stakedTime: block.timestamp
        });
        totalStaked += amount;
    }

    function unstake(address account, uint amount) external override onlyRole(POOL_ROLE) {
        UserInfo memory user = users[account];
        if (amount > user.amount) {
            amount = user.amount;
        }
        updateReward();
        users[account] = UserInfo({
            amount: user.amount - amount,
            rewardDebt: (user.amount * accRewardPerShare) / PRECISION_FACTOR,
            storedReward: user.storedReward + _getPendingReward(user),
            stakedTime: user.stakedTime
        });
        totalStaked -= amount;
    }

    function verifyRewards(address account) external override onlyRole(POOL_ROLE) returns (uint) {
        UserInfo memory user = users[account];
        updateReward();
        uint reward = (user.storedReward + _getPendingReward(user)) / PRECISION_REWARD_FACTOR;
        user.storedReward = 0;
        user.rewardDebt = (user.amount * accRewardPerShare) / PRECISION_FACTOR;
        users[account] = user;
        return reward;
    }

    // ----------- view functions -----------

    function getRewards(address account) external view virtual override returns (uint) {
        UserInfo memory user = users[account];
        uint latestCheckPoint = getUserLatestCheckPoint(user.stakedTime);
        uint endRewardTime = endTime < latestCheckPoint ? endTime : latestCheckPoint;
        uint deltaTime = _getDeltaTime(lastRewardTime, endRewardTime);
        uint currentAccRewardPerShare = accRewardPerShare;
        if (deltaTime > 0) {
            uint reward = deltaTime * rewardPerSec;
            if(totalStaked > 0) {
                currentAccRewardPerShare += ((reward * PRECISION_FACTOR) / totalStaked);
            }
        } else {
            if (block.timestamp > latestCheckPoint) {
                currentAccRewardPerShare = accRewardsPerShare[latestCheckPoint];
            }
        }
        uint totalReward = (user.amount * currentAccRewardPerShare) / PRECISION_FACTOR;
        return (totalReward - user.rewardDebt + user.storedReward) / PRECISION_REWARD_FACTOR;
    }

    function getDailyRewards(address account) external view returns (uint reward) {
        if(totalStaked == 0) return reward;
        UserInfo memory user = users[account];
        return (rewardPerSec * user.amount * 1 days) / (totalStaked * PRECISION_REWARD_FACTOR);
    }

    // ----------- Middleware functions -----------

    function updateRewardInfo(uint _rewardPerSec, uint duration) external onlyRole(MIDDLEWARE_ROLE) {
        _updateRewardInfo(_rewardPerSec, duration);
    }

    // ----------- Internal functions -----------

    function _getDeltaTime(uint _lastTime, uint _endTime) internal view returns (uint) {
        return _endTime > block.timestamp ? (block.timestamp - _lastTime) : (_endTime - _lastTime);
    }

    function _updateRewardInfo(uint _rewardPerSec, uint _duration) internal {
        updateReward();
        rewardPerSec = _rewardPerSec;
        endTime = block.timestamp + _duration;
        lastRewardTime = block.timestamp;
    }

    function _getUserReward(UserInfo memory _user) internal view returns (uint _userReward) {
        uint _latestCheckPoint = getUserLatestCheckPoint(_user.stakedTime);
        uint _accRewardPerShare = block.timestamp < _latestCheckPoint
            ? accRewardPerShare
            : accRewardsPerShare[_latestCheckPoint];
        _userReward = (_user.amount * _accRewardPerShare) / PRECISION_FACTOR;
    }

    function _getPendingReward(UserInfo memory _user) internal view returns (uint _pendingReward) {
        if (_user.amount > 0) {
            uint _userReward = _getUserReward(_user);
            if (_user.rewardDebt < _userReward) {
                _pendingReward = _userReward - _user.rewardDebt;
            }
        }
    }
}
