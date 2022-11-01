// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;
import "../../@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../../@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../common/interfaces/IOwnable.sol";
import "../ipcog/interfaces/IIPCOG.sol";
import "./interfaces/IPrecogCore.sol";
import "./interfaces/IPrecogFactory.sol";

contract PrecogFactory is IPrecogFactory, IContractStructure {
    using SafeERC20 for IERC20;

    IPrecogStorage public override precogStorage;
    IPrecogInternal public override precogInternal;
    IIPCOGFactory public override IPCOGfactory;

    modifier onlyAdmin() {
        require(msg.sender == precogStorage.getAdmin(), "PrecogFactory: Caller is not admin");
        _;
    }

    modifier isExistingToken(address token) {
        require(precogStorage.checkIsExistingToken(token), "PrecogFactory: Token is not in trading");
        _;
    }

    constructor(
        IPrecogStorage _precogStorage,
        IPrecogInternal _precogInternal,
        IIPCOGFactory _IPCOGfactory
    ) {
        precogStorage = _precogStorage;
        precogInternal = _precogInternal;
        IPCOGfactory = _IPCOGfactory;
    }

    function _getCoreInstance() internal view returns (IPrecogCore _core) {
        _core = IPrecogCore(precogStorage.getPrecogCore());
    }

    function _updateConvertTokenWhenAddLiquidityPool(address _tokenA, address _tokenB) internal {
        precogStorage.updateTokenConvert(_tokenA, _tokenB);
        precogStorage.updateTokenConvert(_tokenB, _tokenA);
    }

    function _handleFirstTimeAddLiquidityPool(address _token, CycleConfiguration memory _cycleConfig)
        internal
        returns (Cycle memory _currentTradingCycle)
    {
        if (!precogStorage.checkIsNotFirstInvestmentCycle(_token)) {
            precogStorage.pushTradingCycle(
                _token,
                Cycle({
                    id: 0,
                    startTime: uint48(block.timestamp),
                    endTime: uint48(block.timestamp) + _cycleConfig.tradingCycle
                })
            );
            _currentTradingCycle = precogStorage.getLastTradingCycle(_token);
            precogStorage.pushProfit(_token, 0);
            precogStorage.pushProfitForWhitelist(_token, 0);
            precogStorage.updateIsNotFirstInvestmentCycle(_token, true);
            precogStorage.updateIsUpdateUnitTradingCycle(_token, 0, true);
        }
    }

    function _handleAddLiquidityPoolFromRemovedPool(
        address _token,
        CycleConfiguration memory _cycleConfig,
        Cycle memory _lastTradingCycle
    ) internal returns (Cycle memory _currentTradingCycle) {
        if (precogStorage.checkIsRemoved(_token) == true) {
            _lastTradingCycle = precogStorage.getLastTradingCycle(_token);
            if (block.timestamp >= _lastTradingCycle.endTime) {
                Cycle memory newCycle = Cycle({
                    id: _lastTradingCycle.id + 1,
                    startTime: uint48(block.timestamp),
                    endTime: uint48(block.timestamp) + _cycleConfig.tradingCycle
                });
                precogStorage.pushTradingCycle(_token, newCycle);
                precogStorage.pushProfit(_token, 0);
                precogStorage.pushProfitForWhitelist(_token, 0);
                precogStorage.updateIsUpdateUnitTradingCycle(_token, _lastTradingCycle.id, true);
            }
            precogStorage.updateIsRemoved(_token, false);
        }
        _currentTradingCycle = _lastTradingCycle;
    }

    function addLiquidityPool(address token) external override onlyAdmin {
        require(!precogStorage.checkIsExistingToken(token), "PrecogFactory: Token is existed");
        require(
            precogStorage.getTokenConvert(token) == address(0) &&
                token != precogStorage.getPCOG() &&
                token != address(0),
            "PrecogFactory: Invalid token address"
        );
        // Deploy new IPCOG
        address liquidityToken = IPCOGfactory.create(IERC20Metadata(token).decimals());

        // Set burner for Precog
        IIPCOG(liquidityToken).setBurner(precogStorage.getPrecog(), true);

        // Transfer ownership to Precog
        IOwnable(liquidityToken).transferOwnership(precogStorage.getPrecog());

        // Update convert token for token and liquidity toen
        _updateConvertTokenWhenAddLiquidityPool(token, liquidityToken);

        // Add token to existing tokens
        precogStorage.updateIsExistingToken(token, true);
        precogStorage.pushExistingToken(token);

        // Generate cycles configs for token
        CycleConfiguration memory cycleConfig = _getCoreInstance().getCycleConfiguration();
        Cycle memory currentTradingCycle;
        currentTradingCycle = _handleFirstTimeAddLiquidityPool(token, cycleConfig);
        currentTradingCycle = _handleAddLiquidityPoolFromRemovedPool(token, cycleConfig, currentTradingCycle);
        _getCoreInstance().setCyclesChangedInfo(
            token,
            CyclesChangedInfo({
                tradingApplyTime: currentTradingCycle.endTime,
                fundingApplyTime: uint48(block.timestamp),
                defundingApplyTime: uint48(block.timestamp),
                fundingDuration: cycleConfig.fundingCycle,
                firstDefundingDuration: cycleConfig.firstDefundingCycle,
                defundingDuration: cycleConfig.defundingCycle
            })
        );

        // Emits event AddLiquidity
        emit AddLiquidity({token: token, liquidityToken: liquidityToken});
    }

    function _handleRemoveLiquidityPool(address _token) internal {
        uint indexOfToken = precogStorage.findExistingTokenIndex(_token);
        precogStorage.swapExistingTokensByIndex(indexOfToken, precogStorage.getExistingTokens().length - 1);
        precogStorage.popExistingToken();
        precogStorage.updateIsExistingToken(_token, false);
        precogStorage.updateIsRemoved(_token, true);
    }

    function _updateTokenConvertWhenRemoveLiquidityPool(address _tokenA, address _tokenB) internal {
        precogStorage.updateTokenConvert(_tokenA, address(0));
        precogStorage.updateTokenConvert(_tokenB, address(0));
    }

    function removeLiquidityPool(address token) external override onlyAdmin isExistingToken(token) {
        precogInternal.updateCurrentTradingCycle(token, false, 0);
        address liquidityToken = precogStorage.getTokenConvert(token);
        require(IERC20(liquidityToken).totalSupply() == 0, "PrecogFactory: Token is still in trading");
        _handleRemoveLiquidityPool(token);
        _updateTokenConvertWhenRemoveLiquidityPool(token, liquidityToken);
        emit RemoveLiquidity({token: token, liquidityToken: liquidityToken});
    }
}
