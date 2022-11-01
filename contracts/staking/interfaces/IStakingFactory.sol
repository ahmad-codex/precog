// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "./IStakingPool.sol";
import "../../price-feed/interfaces/IPriceFeed.sol";

interface IStakingFactory {
    event SetPoolBeacon(address beacon);
    event SetRewardControllerModels(address[] models);
    event CreatePool(address pool, IStakingPool.Pool poolInfo, uint[] rewardControllerIds);

    // ---------- Getter's functions ----------
    function PCOG() external view returns (IERC20);

    function treasury() external view returns (address);

    function priceFeed() external view returns (IPriceFeed);

    // ---------- Admin's functions ----------
    function setPoolBeacon(address beacon) external;

    function setRewardControllerModels(address[] calldata models) external;

    function createPool(IStakingPool.Pool memory poolInfo, uint[] calldata rewardControllerIds) external;
}
