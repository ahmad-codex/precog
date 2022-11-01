// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "../../../@openzeppelin/contracts/access/AccessControlEnumerable.sol";

contract HumanResource is AccessControlEnumerable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MIDDLEWARE_ROLE = keccak256("MIDDLEWARE_ROLE");
    bytes32 public constant FACTORY_ROLE = keccak256("FACTORY_ROLE");
    bytes32 public constant POOL_ROLE = keccak256("POOL_ROLE");

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _setRoleAdmin(ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(MIDDLEWARE_ROLE, ADMIN_ROLE);
        _setRoleAdmin(FACTORY_ROLE, ADMIN_ROLE);
        _setRoleAdmin(POOL_ROLE, FACTORY_ROLE);
    }
}
