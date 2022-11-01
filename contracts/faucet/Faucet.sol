// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;


import "../../@openzeppelin/contracts/access/Ownable.sol";
import "../../@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../../@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Faucet is Ownable, ReentrancyGuard {
  
  using SafeERC20 for IERC20;

  mapping(address => mapping(address => uint256)) public nextFaucet;
  mapping(address => uint256) public faucetAmount;
  IERC20[] internal _supportedTokens;
  mapping(address => bool) public isSupportedTokens;
  uint256 public lockPeriod;
  
  address private _sponsorAddress;

  modifier onlySponsor {
    require(_msgSender() == _sponsorAddress, "not allowed");
    _;
  }

  constructor() Ownable(){}

  function getAllSupportedToken() public view returns (IERC20[] memory) {
    return _supportedTokens;
  }

  function setSponsor(address _newSponsor) external onlyOwner {
    _sponsorAddress = _newSponsor;
  }

  function adjustAmount (address _token, uint256 _amount) external onlySponsor {
    faucetAmount[_token] = _amount;
  }

  function addToken (IERC20 _newToken, uint256 _faucetAmount) external onlySponsor {
    (, , bool existing) = checkToken(_newToken);
    require(!existing, "token supported");
    _supportedTokens.push(_newToken);
    faucetAmount[address(_newToken)] = _faucetAmount;
    isSupportedTokens[address(_newToken)] = true;
  }

  function removeToken (IERC20 _token) external onlySponsor {
    (uint256 position, uint256 length, bool existing) = checkToken(_token);
    require(existing, "non-supported token");
    _supportedTokens[position] = _supportedTokens[length-1];
    _supportedTokens.pop();
    isSupportedTokens[address(_token)] = false;
  }

  function setLockPeriod(uint256 _newLockPeriod) external {
    require(_msgSender() == _sponsorAddress || _msgSender() == owner(), "not allowed");

    lockPeriod = _newLockPeriod;
  }

  function faucet(address token, uint amount) external nonReentrant {
    require(isSupportedTokens[token] == true, "token is not supported");
    require(nextFaucet[_msgSender()][token] <= block.timestamp, "must wait util the end of next faucet time");
    require(amount <= faucetAmount[address(token)], "faucet greater than allowed amount");

    if (IERC20(token).balanceOf(_sponsorAddress) >= amount){
        IERC20(token).safeTransferFrom(_sponsorAddress, _msgSender(), amount);
    }
    nextFaucet[_msgSender()][token] = block.timestamp + lockPeriod;

  }

  function donate(IERC20 _token, uint256 _amount) external nonReentrant {
    require(_token.balanceOf(_msgSender()) >= _amount, "not enough fund");
    _token.transferFrom(_msgSender(), _sponsorAddress, _amount);
  }


  function checkToken(IERC20 _token) internal view returns (uint256 position, uint256 length, bool existing) {
    IERC20[] memory tokens = _supportedTokens;
    length = tokens.length;
    for (uint256 i = 0; i < length; i++){
      if (tokens[i] == _token){
        position = i;
        existing = true;
      }
    }

    position = length;
    existing = false;
  }


}