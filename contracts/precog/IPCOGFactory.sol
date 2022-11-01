// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;
import "../ipcog/IPCOG.sol";
import "./interfaces/IIPCOGFactory.sol";

contract IPCOGFactory is IIPCOGFactory {
    function create(uint8 decimals) external override returns(address) {
        address IPCOGToken = address(new IPCOG("IPrecog", "IPCOG", decimals));
        IPCOG(IPCOGToken).setBurner(msg.sender, true);
        IPCOG(IPCOGToken).transferOwnership(msg.sender);
        return IPCOGToken;
    }
}