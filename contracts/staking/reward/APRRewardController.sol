// SPDX-License-Identifier: MIT
// solhint-disable not-rely-on-time
pragma solidity ^0.8.2;

import {BaseRewardController, IAccessControl, IERC20} from "./BaseRewardController.sol";
import {IAPRRewardController} from "../interfaces/IAPRRewardController.sol";
import {SafeERC20} from "../../common/SafeERC20.sol";
import "hardhat/console.sol";

contract APRRewardController is BaseRewardController, IAPRRewardController {
    using SafeERC20 for IERC20;

    uint private constant PRECISION_FACTOR = 1e4;
    uint private constant MAX_UINT = type(uint).max;
    uint public interestRate;
    uint public totalStaked;
    mapping(address => UserInfo) public users;

    function initialize(
        IERC20 _rewardToken,
        IAccessControl _hr,
        uint _interestRate
    ) external initializer {
        __initialize(_rewardToken, _hr);
        interestRate = _interestRate;
        rewardType = Type.APR;
    }

    function initilizeData() external view returns (bytes memory) {
        return abi.encodeWithSignature("initialize(address,address,uint256)", rewardToken, hr, interestRate);
    }

    function updateReward(address account) public returns (uint reward) {
        UserInfo memory user = users[account];
        uint latestCheckPoint = getUserLatestCheckPoint(user.stakedTime);
        user.storedReward = reward = getRewards(account);
        user.lastRewardTime = latestCheckPoint > block.timestamp ? block.timestamp : latestCheckPoint;
        users[account] = user;
    }

    function stake(address account, uint amount) external onlyRole(POOL_ROLE) {
        updateReward(account);
        UserInfo memory user = users[account];
        user.stakedTime = block.timestamp;
        user.amount += amount;
        totalStaked += amount;
        users[account] = user;
    }

    function unstake(address account, uint amount) external onlyRole(POOL_ROLE) {
        updateReward(account);
        UserInfo memory user = users[account];
        if (amount > user.amount) {
            amount = user.amount;
        }
        users[account].amount -= amount;
        totalStaked -= amount;
    }

    function verifyRewards(address account) external onlyRole(POOL_ROLE) returns (uint reward) {
        reward = updateReward(account);
        users[account].storedReward = 0;
    }

    function getRewards(address account) public view returns (uint reward) {
        UserInfo memory user = users[account];
        uint deltaTime = _getDeltaTime(user);
        uint rewardAdded = ((user.amount * deltaTime * interestRate) / (365 days * PRECISION_FACTOR));
        reward = user.storedReward + rewardAdded;
    }

    function getDailyRewards(address account) external view returns (uint reward) {
        UserInfo memory user = users[account];
        reward = interestRate * user.amount * 1 days / (365 days * PRECISION_FACTOR);
    }

    function _getDeltaTime(UserInfo memory _user) internal view returns (uint _deltaTime) {
        uint _latestCheckPoint = getUserLatestCheckPoint(_user.stakedTime);
        uint _endTime = _latestCheckPoint > block.timestamp ? block.timestamp : _latestCheckPoint;
        uint _rewardTime = _endTime < disableTime ? _endTime : disableTime;
        _deltaTime = _rewardTime - _user.lastRewardTime;
    }

    function updateRewardInfo(uint newInterestRate) external onlyRole(MIDDLEWARE_ROLE) {
        interestRate = newInterestRate;
    }

    
}
