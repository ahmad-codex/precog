// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "../../@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "./interfaces/IStakingFactory.sol";
import "./interfaces/IRewardController.sol";
import "../common/auth/Authorizer.sol";
import "../common/interfaces/IBeaconProxyModel.sol";

contract StakingFactory is IStakingFactory, Authorizer {
    string private constant POOL_INITIALIZER = "initialize(address,(uint256,uint40,uint16,uint16,uint16,address[]))";

    IERC20 public override PCOG;
    address public override treasury;
    address public poolBeacon;
    address[] public rewardControllerModels;
    IPriceFeed public priceFeed;

    constructor(
        IAccessControl _hr,
        IERC20 _PCOG,
        address _treasury,
        address _poolBeacon,
        IPriceFeed _priceFeed,
        address[] memory _rewardControllerModels
    ) Authorizer(_hr) {
        PCOG = _PCOG;
        treasury = _treasury;
        poolBeacon = _poolBeacon;
        rewardControllerModels = _rewardControllerModels;
        priceFeed = _priceFeed;
    }

    function setPoolBeacon(address _poolBeacon) external override onlyRole(ADMIN_ROLE) {
        poolBeacon = _poolBeacon;

        emit SetPoolBeacon(_poolBeacon);
    }

    function setRewardControllerModels(address[] calldata _rewardControllerModels)
        external
        override
        onlyRole(ADMIN_ROLE)
    {
        rewardControllerModels = _rewardControllerModels;

        emit SetRewardControllerModels(_rewardControllerModels);
    }

    function createPool(IStakingPool.Pool memory poolInfo, uint[] calldata rewardControllerIds)
        external
        override
        onlyRole(ADMIN_ROLE)
    {
        poolInfo.rewardControllers = new IRewardController[](rewardControllerIds.length);

        for (uint i = 0; i < rewardControllerIds.length; i++) {
            uint id = rewardControllerIds[i];
            require(id < rewardControllerModels.length, "Reward controllers id invalid");

            address model = rewardControllerModels[id];
            address beacon = IBeaconProxyModel(model).beacon();
            bytes memory initializeReward = IRewardController(model).initilizeData();

            address rewardController = address(new BeaconProxy(beacon, initializeReward));
            poolInfo.rewardControllers[i] = IRewardController(rewardController);
        }

        bytes memory initializePool = abi.encodeWithSignature(POOL_INITIALIZER, hr, poolInfo);
        address pool = address(new BeaconProxy(poolBeacon, initializePool));
        hr.grantRole(POOL_ROLE, pool);

        emit CreatePool(pool, poolInfo, rewardControllerIds);
    }
}
