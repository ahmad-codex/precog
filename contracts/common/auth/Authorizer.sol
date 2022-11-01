// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "../../../@openzeppelin/contracts/access/IAccessControl.sol";

abstract contract Authorizer {
    bytes32 internal constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 internal constant MIDDLEWARE_ROLE = keccak256("MIDDLEWARE_ROLE");
    bytes32 internal constant POOL_ROLE = keccak256("POOL_ROLE");
    IAccessControl public hr;

    event SetHR(IAccessControl hr);

    modifier onlyRole(bytes32 role) {
        require(hr.hasRole(role, msg.sender), "Pool: Unauthorized");
        _;
    }

    constructor(IAccessControl _hr) {
        _setHR(_hr);
    }

    function _setHR(IAccessControl _hr) internal {
        hr = _hr;
        emit SetHR(_hr);
    }
}
