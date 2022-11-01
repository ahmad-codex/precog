// SPDX-License-Identifier: MIT
// solhint-disable not-rely-on-time

pragma solidity ^0.8.2;

import "../../@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "../../@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "./interfaces/IStakingPool.sol";
import "./interfaces/IStakingFactory.sol";
import "../common/SafeERC20.sol";
import "../common/auth/AuthorizerUpgradeable.sol";

contract StakingPool is IStakingPool, ReentrancyGuardUpgradeable, AuthorizerUpgradeable, PausableUpgradeable {
    using SafeERC20 for IERC20;

    uint public constant HUNDRED_PERCENT = 10000;

    IStakingFactory public factory;
    Pool private pool;
    uint public minimumStakeAmount;
    uint public totalStaked;
    uint public stakersCount;

    // user => staking info
    mapping(address => Staking) public userStaking;
    // user => reward controller id => reward debt amount
    mapping(address => mapping(uint => uint)) internal userRewardDebt;

    function initialize(IAccessControl _hr, Pool memory _pool) external initializer {
        __ReentrancyGuard_init();
        __Authorizer_init(_hr);
        factory = IStakingFactory(msg.sender);
        _setPool(_pool);
    }

    function getPool()
        external
        view
        returns (
            uint quota,
            uint40 stakingPeriod,
            uint16 stakeFeeRate,
            uint16 unstakeFeeRate,
            uint16 penaltyRate,
            address[] memory rewardControllers
        )
    {
        Pool memory _pool = pool;
        quota = _pool.quota;
        stakingPeriod = _pool.stakingPeriod;
        stakeFeeRate = _pool.stakeFeeRate;
        unstakeFeeRate = _pool.unstakeFeeRate;
        penaltyRate = _pool.penaltyRate;
        rewardControllers = new address[](_pool.rewardControllers.length);
        for (uint i = 0; i < rewardControllers.length; i++) {
            rewardControllers[i] = address(_pool.rewardControllers[i]);
        }
    }

    function stake(uint amount) public nonReentrant whenNotPaused {
        require(amount >= minimumStakeAmount, "Stake amount invalid");

        address user = msg.sender;
        address treasury = factory.treasury();
        IERC20 stakeToken = factory.PCOG();

        Pool memory _pool = pool;
        Staking memory _staking = userStaking[user];

        uint fee = (amount * _pool.stakeFeeRate) / HUNDRED_PERCENT;
        amount -= fee;
        require(amount + _staking.amount <= _pool.quota, "Cannot stake over quota");

        IPriceFeed priceFeed = factory.priceFeed();
        for (uint i = 0; i < _pool.rewardControllers.length; i++) {
            IRewardController rewardController = _pool.rewardControllers[i];
            IERC20 rewardToken = rewardController.rewardToken();

            uint stakeAmount = rewardController.rewardType() == IRewardController.Type.APR
                ? priceFeed.getAmountOut(amount, address(stakeToken), address(rewardToken))
                : amount;
            rewardController.stake(user, stakeAmount);
        }

        _handleCountStakers(_staking.amount, _staking.amount + amount);
        userStaking[user] = Staking({
            amount: _staking.amount + amount,
            deadline: block.timestamp + _pool.stakingPeriod
        });
        totalStaked += amount;
        stakeToken.safeTransferFrom(user, address(this), amount);
        stakeToken.safeTransferFrom(user, treasury, fee);
        emit Stake(user, amount);
    }

    function unstake(uint amount) public nonReentrant {
        address user = msg.sender;
        address treasury = factory.treasury();
        IERC20 stakeToken = factory.PCOG();

        Pool memory _pool = pool;
        Staking memory _staking = userStaking[user];

        uint fee = (amount * _pool.unstakeFeeRate) / HUNDRED_PERCENT;
        require(amount <= _staking.amount, "Cannot unstake more than staked");

        IPriceFeed priceFeed = factory.priceFeed();
        bool earlyUnstake = block.timestamp < _staking.deadline;
        for (uint rewardId; rewardId < _pool.rewardControllers.length; rewardId++) {
            IRewardController rewardController = _pool.rewardControllers[rewardId];
            IERC20 rewardToken = rewardController.rewardToken();

            uint unstakeAmount = rewardController.rewardType() == IRewardController.Type.APR
                ? priceFeed.getAmountOut(amount, address(stakeToken), address(rewardToken))
                : amount;
            rewardController.unstake(user, unstakeAmount);
            uint rewardAmount = rewardController.verifyRewards(user);

            if (earlyUnstake) {
                uint penaltyAmount = (rewardAmount * _pool.penaltyRate) / HUNDRED_PERCENT;
                rewardAmount -= penaltyAmount;
                rewardToken.safeTransfer(treasury, penaltyAmount);
            }
            userRewardDebt[user][rewardId] += rewardAmount;
        }

        _handleCountStakers(_staking.amount, _staking.amount - amount);
        userStaking[user].amount -= amount;
        totalStaked -= amount;
        stakeToken.safeTransfer(user, amount - fee);
        stakeToken.safeTransfer(treasury, fee);

        emit Unstake(user, amount);
    }

    function claimReward(uint rewardId, uint amount) external nonReentrant {
        address user = msg.sender;
        IRewardController rewardController = pool.rewardControllers[rewardId];
        IERC20 rewardToken = rewardController.rewardToken();
        uint reward = rewardController.verifyRewards(user);
        uint rewardDebt = userRewardDebt[user][rewardId] + reward;
        uint claimed = amount < rewardDebt ? amount : rewardDebt;
        userRewardDebt[user][rewardId] = rewardDebt - claimed;
        rewardToken.safeTransfer(user, claimed);
        emit ClaimReward(user, rewardId, amount);
    }

    function rewardTotal(address user, uint rewardId) public view returns (uint) {
        require(rewardId < pool.rewardControllers.length, "Invalid reward id");
        IRewardController rewardController = pool.rewardControllers[rewardId];
        return userRewardDebt[user][rewardId] + rewardController.getRewards(user);
    }

    function getDailyReward(address user, uint rewardId) public view returns (uint) {
        require(rewardId < pool.rewardControllers.length, "Invalid reward id");
        IRewardController rewardController = pool.rewardControllers[rewardId];
        return rewardController.getDailyRewards(user);
    }

    // ----------- Admin functions -----------
    function setPool(Pool memory _pool) external onlyRole(ADMIN_ROLE) {
        if (_pool.rewardControllers.length == 0) {
            _pool.rewardControllers = pool.rewardControllers;
        }
        _setPool(_pool);
    }

    function setMinimumStakeAmount(uint value) external onlyRole(ADMIN_ROLE) {
        minimumStakeAmount = value;
    }

    // ----------- Internal functions -----------
    function _setPool(Pool memory _pool) internal {
        pool = _pool;
        emit SetPool(_pool);
    }

    function _handleCountStakers(uint _oldStakedAmount, uint _newStakedAmount) internal {
        if (_oldStakedAmount == 0 && _newStakedAmount != 0) stakersCount++;
        if (_oldStakedAmount != 0 && _newStakedAmount == 0) stakersCount--;
    }
}
