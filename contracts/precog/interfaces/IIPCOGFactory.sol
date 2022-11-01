// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;
interface IIPCOGFactory {
    function create(uint8 decimals) external returns(address);
}