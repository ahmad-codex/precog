// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import "../../@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "./interfaces/IBeaconProxyModel.sol";

contract BeaconProxyModel is BeaconProxy, IBeaconProxyModel {
    constructor(address _beacon, bytes memory _data) BeaconProxy(_beacon, _data) {}

    function beacon() external view override returns (address) {
        return _beacon();
    }
}
