const { assert, expect } = require("chai");
const { utils } = require("ethers");
const { ethers } = require("hardhat");
const BigNumber = require("big-number");

describe("Test Precog 2", async () => {
  let owner;
  let clients;

  let pcog;
  let usdc;
  let middlewareExchange;
  let ipcogFactory;
  let precogStorage;
  let precogInternal;
  let precogCore;
  let precogFactory;
  let precogVault;
  let precogProfit;
  let precogV5;
  let withdrawalRegister;

  let testToken1;
  let testToken2;

  const ADDRESS_ZERO = ethers.constants.AddressZero;
  const MAX_UINT_DIVIDED_BY_2 =
    "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe";

  let now;

  before(async () => {
    const [_owner, account1, account2, account3, account4, account5] =
      await ethers.getSigners();
    owner = _owner;
    clients = [account1, account2, account3, account4, account5];

    const USDC = await ethers.getContractFactory("ERC20");
    const PCOG = await ethers.getContractFactory("PCOG");
    const MiddlewareExchange = await ethers.getContractFactory(
      "MockMiddlewareExchange"
    );
    const IPCOGFactory = await ethers.getContractFactory("IPCOGFactory");
    const PrecogStorage = await ethers.getContractFactory("PrecogStorage");
    const PrecogInternal = await ethers.getContractFactory("PrecogInternal");
    const PrecogCore = await ethers.getContractFactory("PrecogCore");
    const PrecogFactory = await ethers.getContractFactory("PrecogFactory");
    const PrecogVault = await ethers.getContractFactory("PrecogVault");
    const PrecogProfit = await ethers.getContractFactory("PrecogProfit");
    const PrecogV5 = await ethers.getContractFactory("PrecogV5");
    const WithdrawalRegister = await ethers.getContractFactory(
      "WithdrawalRegister"
    );

    //deploy contract
    testToken1 = await USDC.deploy("USD Coin Test", "USDC", 6);
    testToken2 = await USDC.deploy("Tether USD test", "USDT", 6);
    usdc = await USDC.deploy("USD Coin", "USDC", 6);
    pcog = await PCOG.deploy();
    middlewareExchange = await MiddlewareExchange.deploy(
      owner.address,
      pcog.address
    );
    ipcogFactory = await IPCOGFactory.deploy();
    precogStorage = await PrecogStorage.deploy(owner.address);
    precogInternal = await PrecogInternal.deploy(precogStorage.address);
    precogCore = await PrecogCore.deploy(
      precogStorage.address,
      precogInternal.address
    );
    precogFactory = await PrecogFactory.deploy(
      precogStorage.address,
      precogInternal.address,
      ipcogFactory.address
    );
    precogVault = await PrecogVault.deploy(
      precogStorage.address,
      precogInternal.address
    );
    precogProfit = await PrecogProfit.deploy(
      precogStorage.address,
      precogInternal.address
    );
    precogV5 = await PrecogV5.deploy(
      precogStorage.address,
      precogInternal.address
    );
    withdrawalRegister = await WithdrawalRegister.deploy(
      precogV5.address,
      precogCore.address
    );

    // Check contracts are deployed
    assert.notEqual(
      usdc.address,
      ADDRESS_ZERO,
      "USDC contract is not deployed"
    );
    assert.notEqual(
      pcog.address,
      ADDRESS_ZERO,
      "PCOG contract is not deployed"
    );
    assert.notEqual(
      middlewareExchange.address,
      ADDRESS_ZERO,
      "MiddlewareExchange contract is not deployed"
    );
    assert.notEqual(
      ipcogFactory.address,
      ADDRESS_ZERO,
      "IPCOGFactory contract is not deployed"
    );
    assert.notEqual(
      precogStorage.address,
      ADDRESS_ZERO,
      "PrecogStorage contract is not deployed"
    );
    assert.notEqual(
      precogInternal.address,
      ADDRESS_ZERO,
      "PrecogInternal contract is not deployed"
    );
    assert.notEqual(
      precogCore.address,
      ADDRESS_ZERO,
      "PrecogCore contract is not deployed"
    );
    assert.notEqual(
      precogFactory.address,
      ADDRESS_ZERO,
      "PrecogFactory contract is not deployed"
    );
    assert.notEqual(
      precogVault.address,
      ADDRESS_ZERO,
      "PrecogVault contract is not deployed"
    );
    assert.notEqual(
      precogProfit.address,
      ADDRESS_ZERO,
      "PrecogProfit contract is not deployed"
    );
    assert.notEqual(
      precogV5.address,
      ADDRESS_ZERO,
      "PrecogV5 contract is not deployed"
    );
    assert.notEqual(
      withdrawalRegister.address,
      ADDRESS_ZERO,
      "WithdrawalRegister contract is not deployed"
    );
  });

  describe("Set up contracts", async () => {
    it("Check contracts are mapping together", async () => {
      assert(
        precogStorage.address,
        await precogInternal.precogStorage(),
        "Deployed PrecogInternal with wrong constructor"
      );
      assert(
        precogStorage.address,
        await precogCore.precogStorage(),
        "Deployed PrecogCore with wrong constructor"
      );
      assert(
        precogInternal.address,
        await precogCore.precogInternal(),
        "Deployed PrecogCore with wrong constructor"
      );
      assert(
        precogStorage.address,
        await precogFactory.precogStorage(),
        "Deployed PrecogFactory with wrong constructor"
      );
      assert(
        precogInternal.address,
        await precogFactory.precogInternal(),
        "Deployed PrecogFactory with wrong constructor"
      );
      assert(
        precogStorage.address,
        await precogVault.precogStorage(),
        "Deployed PrecogVault with wrong constructor"
      );
      assert(
        precogInternal.address,
        await precogVault.precogInternal(),
        "Deployed PrecogVault with wrong constructor"
      );
      assert(
        precogStorage.address,
        await precogProfit.precogStorage(),
        "Deployed PrecogProfit with wrong constructor"
      );
      assert(
        precogInternal.address,
        await precogProfit.precogInternal(),
        "Deployed PrecogProfit with wrong constructor"
      );
      assert(
        precogStorage.address,
        await precogV5.precogStorage(),
        "Deployed PrecogV5 with wrong constructor"
      );
      assert(
        precogInternal.address,
        await precogV5.precogInternal(),
        "Deployed PrecogV5 with wrong constructor"
      );
      assert(
        precogV5.address,
        await withdrawalRegister.precog(),
        "Deployed WithdrawalRegister with wrong constructor"
      );
      assert(
        precogCore.address,
        await withdrawalRegister.precogCore(),
        "Deployed WithdrawalRegister with wrong constructor"
      );
    });

    it("Set middleware service address for PrecogStorage", async () => {
      await precogStorage.setMiddlewareService(owner.address);
      const getMiddlewareServiceAddress =
        await precogStorage.getMiddlewareService();
      assert.equal(
        getMiddlewareServiceAddress.toString(),
        owner.address,
        "Middleware service is not changed"
      );
    });

    it("Set MiddlewareExchange address for PrecogStorage", async () => {
      await precogStorage.setMiddlewareExchange(middlewareExchange.address);
      const getMiddlewareExchangeAddress =
        await precogStorage.getMiddlewareExchange();
      assert.equal(
        getMiddlewareExchangeAddress.toString(),
        middlewareExchange.address,
        "MiddlewareExchange is not changed"
      );
    });

    it("Set PCOG address for PrecogStorage", async () => {
      await precogStorage.setPCOG(pcog.address);
      const getPCOGAddress = await precogStorage.getPCOG();
      assert.equal(
        getPCOGAddress.toString(),
        pcog.address,
        "PCOG Token is not changed"
      );
    });

    it("Set PrecogInternal address for PrecogStorage", async () => {
      await precogStorage.setPrecogInternal(precogInternal.address);
      const getPrecogInternalAddress = await precogStorage.getPrecogInternal();
      assert.equal(
        getPrecogInternalAddress.toString(),
        precogInternal.address,
        "PrecogInternal is not changed"
      );
    });

    it("Set PrecogCore address for PrecogStorage", async () => {
      await precogStorage.setPrecogCore(precogCore.address);
      const getPrecogCoreAddress = await precogStorage.getPrecogCore();
      assert.equal(
        getPrecogCoreAddress.toString(),
        precogCore.address,
        "PrecogCore is not changed"
      );
    });

    it("Set PrecogFactory address for PrecogStorage", async () => {
      await precogStorage.setPrecogFactory(precogFactory.address);
      const getPrecogFactoryAddress = await precogStorage.getPrecogFactory();
      assert.equal(
        getPrecogFactoryAddress.toString(),
        precogFactory.address,
        "PrecogFactory is not changed"
      );
    });

    it("Set PrecogVault address for PrecogStorage", async () => {
      await precogStorage.setPrecogVault(precogVault.address);
      const getPrecogVaultAddress = await precogStorage.getPrecogVault();
      assert.equal(
        getPrecogVaultAddress.toString(),
        precogVault.address,
        "PrecogVault is not changed"
      );
    });

    it("Set PrecogProfit address for PrecogStorage", async () => {
      await precogStorage.setPrecogProfit(precogProfit.address);
      const getPrecogProfitAddress = await precogStorage.getPrecogProfit();
      assert.equal(
        getPrecogProfitAddress.toString(),
        precogProfit.address,
        "PrecogProfit is not changed"
      );
    });

    it("Set Precog address for PrecogStorage", async () => {
      await precogStorage.setPrecog(precogV5.address);
      const getPrecogAddress = await precogStorage.getPrecog();
      assert.equal(
        getPrecogAddress.toString(),
        precogV5.address,
        "Precog is not changed"
      );
    });

    it("Set Precog address for PrecogStorage", async () => {
      await precogStorage.setPrecog(precogV5.address);
      const getPrecogAddress = await precogStorage.getPrecog();
      assert.equal(
        getPrecogAddress.toString(),
        precogV5.address,
        "Precog is not changed"
      );
    });

    it("Set WithdrawalRegister address for PrecogStorage", async () => {
      await precogStorage.setWithdrawalRegister(withdrawalRegister.address);
      const getWithdrawalRegisterAddress =
        await precogStorage.getWithdrawalRegister();
      assert.equal(
        getWithdrawalRegisterAddress.toString(),
        withdrawalRegister.address,
        "Precog is not changed"
      );
    });

    it("Check contracts are set up into PrecogStorare are operators", async () => {
      const isOperatorWithPrecogInternal = await precogStorage.isOperator(
        precogInternal.address
      );
      const isOperatorWithPrecogCore = await precogStorage.isOperator(
        precogCore.address
      );
      const isOperatorWithPrecogFactory = await precogStorage.isOperator(
        precogFactory.address
      );
      const isOperatorWithPrecogVault = await precogStorage.isOperator(
        precogVault.address
      );
      const isOperatorWithPrecogProfit = await precogStorage.isOperator(
        precogProfit.address
      );
      const isOperatorWithPrecog = await precogStorage.isOperator(
        precogV5.address
      );

      assert(isOperatorWithPrecogInternal, true);
      assert(isOperatorWithPrecogCore, true);
      assert(isOperatorWithPrecogFactory, true);
      assert(isOperatorWithPrecogVault, true);
      assert(isOperatorWithPrecogProfit, true);
      assert(isOperatorWithPrecog, true);
    });

    it("Set configuration of cycles", async () => {
      await precogCore.setCycleConfiguration([800, 300, 400, 900]);
    });

    it("Get configuration of cycles", async () => {
      const config = await precogCore.getCycleConfiguration();
      assert.equal(config.fundingCycle, 300);
      assert.equal(config.defundingCycle, 400);
      assert.equal(config.firstDefundingCycle, 800);
      assert.equal(config.tradingCycle, 900);
    });
  });

  describe("Revert set up contracts from not admin address", async () => {
    it("Revert set middleware service address for PrecogStorage", async () => {
      let error = null;
      await precogStorage
        .connect(clients[0])
        .setMiddlewareService(owner.address)
        .catch((err) => {
          error = err;
        });
      assert.notEqual(
        error,
        null,
        "Error: Transaction sucessfully without admin role"
      );
    });

    it("Revert set MiddlewareExchange address for PrecogStorage", async () => {
      let error = null;
      await precogStorage
        .connect(clients[0])
        .setMiddlewareExchange(middlewareExchange.address)
        .catch((err) => {
          error = err;
        });
      assert.notEqual(
        error,
        null,
        "Error: Transaction sucessfully without admin role"
      );
    });

    it("Revert set PCOG address for PrecogStorage", async () => {
      let error = null;
      await precogStorage
        .connect(clients[0])
        .setPCOG(pcog.address)
        .catch((err) => {
          error = err;
        });
      assert.notEqual(
        error,
        null,
        "Error: Transaction sucessfully without admin role"
      );
    });

    it("Revert set PrecogInternal address for PrecogStorage", async () => {
      let error = null;
      await precogStorage
        .connect(clients[0])
        .setPrecogInternal(precogInternal.address)
        .catch((err) => {
          error = err;
        });
      assert.notEqual(
        error,
        null,
        "Error: Transaction sucessfully without admin role"
      );
    });

    it("Revert set PrecogCore address for PrecogStorage", async () => {
      let error = null;
      await precogStorage
        .connect(clients[0])
        .setPrecogCore(precogCore.address)
        .catch((err) => {
          error = err;
        });
      assert.notEqual(
        error,
        null,
        "Error: Transaction sucessfully without admin role"
      );
    });

    it("Revert set PrecogFactory address for PrecogStorage", async () => {
      let error = null;
      await precogStorage
        .connect(clients[0])
        .setPrecogFactory(precogFactory.address)
        .catch((err) => {
          error = err;
        });
      assert.notEqual(
        error,
        null,
        "Error: Transaction sucessfully without admin role"
      );
    });

    it("Revert set PrecogVault address for PrecogStorage", async () => {
      let error = null;
      await precogStorage
        .connect(clients[0])
        .setPrecogVault(precogVault.address)
        .catch((err) => {
          error = err;
        });
      assert.notEqual(
        error,
        null,
        "Error: Transaction sucessfully without admin role"
      );
    });

    it("Revert set PrecogProfit address for PrecogStorage", async () => {
      let error = null;
      await precogStorage
        .connect(clients[0])
        .setPrecogProfit(precogProfit.address)
        .catch((err) => {
          error = err;
        });
      assert.notEqual(
        error,
        null,
        "Error: Transaction sucessfully without admin role"
      );
    });

    it("Revert set Precog address for PrecogStorage", async () => {
      let error = null;
      await precogStorage
        .connect(clients[0])
        .setPrecog(precogV5.address)
        .catch((err) => {
          error = err;
        });
      assert.notEqual(
        error,
        null,
        "Error: Transaction sucessfully without admin role"
      );
    });

    it("Revert set Precog address for PrecogStorage", async () => {
      let error = null;
      await precogStorage
        .connect(clients[0])
        .setPrecog(precogV5.address)
        .catch((err) => {
          error = err;
        });
      assert.notEqual(
        error,
        null,
        "Error: Transaction sucessfully without admin role"
      );
    });

    it("Revert set WithdrawalRegister address for PrecogStorage", async () => {
      let error = null;
      await precogStorage
        .connect(clients[0])
        .setWithdrawalRegister(withdrawalRegister.address)
        .catch((err) => {
          error = err;
        });
      assert.notEqual(
        error,
        null,
        "Error: Transaction sucessfully without admin role"
      );
    });
  });

  describe("Revert interactions with PrecogStorage data from not operator address", async () => {
    it("Revert pushExistingToken function from not operator address", async () => {
      let error = null;
      await precogStorage.pushExistingToken(usdc.address).catch((err) => {
        error = err;
      });
      assert.notEqual(
        error,
        null,
        "Error: Interact with pushExistingToken function without operator role"
      );
    });

    it("Revert swapExistingTokensByIndex function from not operator address", async () => {
      await precogFactory.addLiquidityPool(testToken1.address);
      await precogFactory.addLiquidityPool(testToken2.address);

      const indexOfTestToken1 = await precogStorage.findExistingTokenIndex(
        testToken1.address
      );
      const indexOfTestToken2 = await precogStorage.findExistingTokenIndex(
        testToken2.address
      );

      let error = null;
      await precogStorage
        .swapExistingTokensByIndex(
          indexOfTestToken1.toString(),
          indexOfTestToken2.toString()
        )
        .catch((err) => {
          error = err;
        });
      assert.equal(
        Number(indexOfTestToken1),
        0,
        "Index of indexOfTestToken1 is wrong"
      );
      assert.equal(
        Number(indexOfTestToken2),
        1,
        "Index of indexOfTestToken2 is wrong"
      );
      assert.notEqual(
        error,
        null,
        "Error: Interact with swapExistingTokensByIndex function without operator role"
      );
    });

    it("Revert popExistingToken function from not operator address", async () => {
      let error = null;
      const formerTokens = await precogStorage.getExistingTokens();
      await precogStorage.popExistingToken().catch((err) => {
        error = err;
      });
      const laterTokens = await precogStorage.getExistingTokens();
      assert.equal(
        formerTokens.length,
        laterTokens.length,
        "Error: Remove sucessfully without opeartor role"
      );
      assert.notEqual(
        error,
        null,
        "Error: Interact with popExistingToken function without operator role"
      );
    });

    it("Revert updateCurrentProfitId function from not operator address", async () => {
      let error = null;
      await precogStorage
        .updateCurrentProfitId(testToken1.address, 1)
        .catch((err) => {
          error = err;
        });
      assert.notEqual(
        error,
        null,
        "Error: Interact with updateCurrentProfitId function without operator role"
      );
    });

    it("Revert updateIsExistingToken function from not operator address", async () => {
      let error = null;
      await precogStorage
        .updateIsExistingToken(testToken1.address, false)
        .catch((err) => {
          error = err;
        });
      assert.notEqual(
        error,
        null,
        "Error: Interact with updateIsExistingToken function without operator role"
      );
    });

    it("Revert updateTokenConvert function from not operator address", async () => {
      let error = null;
      await precogStorage
        .updateTokenConvert(testToken1.address, ADDRESS_ZERO)
        .catch((err) => {
          error = err;
        });
      assert.notEqual(
        error,
        null,
        "Error: Interact with updateTokenConvert function without operator role"
      );
    });

    it("Revert updateLiquidity function from not operator address", async () => {
      let error = null;
      await precogStorage
        .updateLiquidity(testToken1.address, 0)
        .catch((err) => {
          error = err;
        });
      assert.notEqual(
        error,
        null,
        "Error: Interact with updateLiquidity function without operator role"
      );
    });

    it("Revert updateIsNotFirstInvestmentCycle function from not operator address", async () => {
      let error = null;
      await precogStorage
        .updateIsNotFirstInvestmentCycle(testToken1.address, true)
        .catch((err) => {
          error = err;
        });
      assert.notEqual(
        error,
        null,
        "Error: Interact with updateIsNotFirstInvestmentCycle function without operator role"
      );
    });

    it("Revert updateIsRemoved function from not operator address", async () => {
      let error = null;
      await precogStorage
        .updateIsRemoved(testToken1.address, true)
        .catch((err) => {
          error = err;
        });
      assert.notEqual(
        error,
        null,
        "Error: Interact with updateIsRemoved function without operator role"
      );
    });

    it("Revert pushTradingCycle function from not operator address", async () => {
      let error = null;
      const tradingCycle = {
        id: 1,
        startTime: 1000,
        endTime: 1000,
      };
      await precogStorage
        .pushTradingCycle(testToken1.address, tradingCycle)
        .catch((err) => {
          error = err;
        });
      assert.notEqual(
        error,
        null,
        "Error: Interact with pushTradingCycle function without operator role"
      );
    });

    it("Revert updateProfitByIndex function from not operator address", async () => {
      let error = null;
      await precogStorage
        .updateProfitByIndex(testToken1.address, 0, 10000)
        .catch((err) => {
          error = err;
        });
      assert.notEqual(
        error,
        null,
        "Error: Interact with updateProfitByIndex function without operator role"
      );
    });

    it("Revert pushProfit function from not operator address", async () => {
      let error = null;
      await precogStorage.pushProfit(testToken1.address, 0).catch((err) => {
        error = err;
      });
      assert.notEqual(
        error,
        null,
        "Error: Interact with pushProfit function without operator role"
      );
    });

    it("Revert updateIsUpdateUnitTradingCycle function from not operator address", async () => {
      let error = null;
      await precogStorage
        .updateIsUpdateUnitTradingCycle(testToken1.address, 1, true)
        .catch((err) => {
          error = err;
        });
      assert.notEqual(
        error,
        null,
        "Error: Interact with updateIsUpdateUnitTradingCycle function without operator role"
      );
    });

    it("Revert updateTotalUnitsTradingCycle function from not operator address", async () => {
      let error = null;
      await precogStorage
        .updateTotalUnitsTradingCycle(testToken1.address, 1, 10000)
        .catch((err) => {
          error = err;
        });
      assert.notEqual(
        error,
        null,
        "Error: Interact with updateTotalUnitsTradingCycle function without operator role"
      );
    });

    it("Revert updateInvestmentOfByIndex function from not operator address", async () => {
      let error = null;
      const investmentOf = {
        amount: 1000,
        unit: 10000,
        timestamp: 1000,
        idChanged: 0,
      };
      await precogStorage
        .updateInvestmentOfByIndex(
          testToken1.address,
          owner.address,
          0,
          investmentOf
        )
        .catch((err) => {
          error = err;
        });
      assert.notEqual(
        error,
        null,
        "Error: Interact with updateInvestmentOfByIndex function without operator role"
      );
    });

    it("Revert pushInvestmentOf function from not operator address", async () => {
      let error = null;
      const investmentOf = {
        amount: 1000,
        unit: 10000,
        timestamp: 1000,
        idChanged: 0,
      };
      await precogStorage
        .pushInvestmentOf(testToken1.address, owner.address, investmentOf)
        .catch((err) => {
          error = err;
        });
      assert.notEqual(
        error,
        null,
        "Error: Interact with pushInvestmentOf function without operator role"
      );
    });

    it("Revert updateAccountProfitInfo function from not operator address", async () => {
      let error = null;
      const accountProfitInfo = {
        profitOf: 1000,
        claimedProfitOf: 10000,
        lastProfitIdOf: 1,
        lastInvestmentIdOf: 0,
      };
      await precogStorage
        .updateAccountProfitInfo(
          testToken1.address,
          owner.address,
          accountProfitInfo
        )
        .catch((err) => {
          error = err;
        });
      assert.notEqual(
        error,
        null,
        "Error: Interact with updateAccountProfitInfo function without operator role"
      );
    });

    it("Revert updateAccountTradingInfo function from not operator address", async () => {
      let error = null;
      const accountTradingInfo = {
        depositedTimestampOf: 1000,
        availableAmount: 10000,
        isNotFirstIncreaseInvestment: true,
      };
      await precogStorage
        .updateAccountTradingInfo(
          testToken1.address,
          owner.address,
          accountTradingInfo
        )
        .catch((err) => {
          error = err;
        });
      assert.notEqual(
        error,
        null,
        "Error: Interact with updateAccountTradingInfo function without operator role"
      );
    });
  });

  describe("Prepare currency", async () => {
    it("Clear liquidity pool and add USDC token to pool", async () => {
      now = Math.floor(new Date().getTime() / 1000.0) + 10000;
      await network.provider.send("evm_setNextBlockTimestamp", [Number(now)]);
      await precogFactory.removeLiquidityPool(testToken1.address);
      await precogFactory.removeLiquidityPool(testToken2.address);
      await precogFactory.addLiquidityPool(usdc.address);
    });

    it("Initialize PCOG", async () => {
      const formerBalanceOfOwner = await pcog.balanceOf(owner.address);
      await pcog.initialize();
      const laterBalanceOfOwner = await pcog.balanceOf(owner.address);
      assert.equal(Number(formerBalanceOfOwner), 0);
      assert.notEqual(
        Number(laterBalanceOfOwner),
        Number(formerBalanceOfOwner)
      );
    });

    it("Prepare pcog for MockMiddlewareExchange and approve for precog", async () => {
      await pcog.transfer(middlewareExchange.address, "10000000000000000");
      await usdc.approve(precogProfit.address, "1000000000000000000000000");
    });

    it("Mint USDC token for users", async () => {
      const amount = "10000000000";
      const formerBalanceOfUser1 = await usdc.balanceOf(clients[0].address);
      const formerBalanceOfUser2 = await usdc.balanceOf(clients[1].address);
      const formerBalanceOfUser3 = await usdc.balanceOf(clients[2].address);
      const formerBalanceOfUser4 = await usdc.balanceOf(clients[3].address);
      const formerBalanceOfUser5 = await usdc.balanceOf(clients[4].address);

      await usdc.mint(owner.address, "100000000000000");
      await usdc.mint(clients[0].address, amount);
      await usdc.mint(clients[1].address, amount);
      await usdc.mint(clients[2].address, amount);
      await usdc.mint(clients[3].address, amount);
      await usdc.mint(clients[4].address, amount);

      const laterBalanceOfUser1 = await usdc.balanceOf(clients[0].address);
      const laterBalanceOfUser2 = await usdc.balanceOf(clients[1].address);
      const laterBalanceOfUser3 = await usdc.balanceOf(clients[2].address);
      const laterBalanceOfUser4 = await usdc.balanceOf(clients[3].address);
      const laterBalanceOfUser5 = await usdc.balanceOf(clients[4].address);

      assert.equal(
        Number(formerBalanceOfUser1) + Number(amount),
        Number(laterBalanceOfUser1),
        "Mint USDC for user1 failed"
      );
      assert.equal(
        Number(formerBalanceOfUser2) + Number(amount),
        Number(laterBalanceOfUser2),
        "Mint USDC for user2 failed"
      );
      assert.equal(
        Number(formerBalanceOfUser3) + Number(amount),
        Number(laterBalanceOfUser3),
        "Mint USDC for user3 failed"
      );
      assert.equal(
        Number(formerBalanceOfUser4) + Number(amount),
        Number(laterBalanceOfUser4),
        "Mint USDC for user4 failed"
      );
      assert.equal(
        Number(formerBalanceOfUser5) + Number(amount),
        Number(laterBalanceOfUser5),
        "Mint USDC for user5 failed"
      );
    });

    it("Approve tokens for contracts", async () => {
      await usdc.approve(precogV5.address, MAX_UINT_DIVIDED_BY_2);
      await usdc
        .connect(clients[0])
        .approve(precogV5.address, MAX_UINT_DIVIDED_BY_2);
      await usdc
        .connect(clients[1])
        .approve(precogV5.address, MAX_UINT_DIVIDED_BY_2);
      await usdc
        .connect(clients[2])
        .approve(precogV5.address, MAX_UINT_DIVIDED_BY_2);
      await usdc
        .connect(clients[3])
        .approve(precogV5.address, MAX_UINT_DIVIDED_BY_2);
      await usdc
        .connect(clients[4])
        .approve(precogV5.address, MAX_UINT_DIVIDED_BY_2);

      const liquidityTokenAddress = await precogStorage.getTokenConvert(
        usdc.address
      );
      const IPCOG = await ethers.getContractFactory("IPCOG");
      const liquidityToken = await hre.ethers.getContractAt(
        "IPCOG",
        liquidityTokenAddress
      );

      await liquidityToken
        .connect(clients[0])
        .approve(precogV5.address, MAX_UINT_DIVIDED_BY_2);
      await liquidityToken
        .connect(clients[1])
        .approve(precogV5.address, MAX_UINT_DIVIDED_BY_2);
      await liquidityToken
        .connect(clients[2])
        .approve(precogV5.address, MAX_UINT_DIVIDED_BY_2);
      await liquidityToken
        .connect(clients[3])
        .approve(precogV5.address, MAX_UINT_DIVIDED_BY_2);
      await liquidityToken
        .connect(clients[4])
        .approve(precogV5.address, MAX_UINT_DIVIDED_BY_2);

      await pcog.approve(precogProfit.address, MAX_UINT_DIVIDED_BY_2);
    });

    it("Prepare tokens for WithdrawalRegister", async () => {
      const amount = "1000000000000";
      await usdc.transfer(withdrawalRegister.address, amount);
    });
  });

  describe("Trading cycle 0", async () => {
    it("User1 deposit 1000 USDC", async () => {
      await precogV5.connect(clients[0]).deposit(usdc.address, "1000000000");
    });

    it("User1 force withdraw 1000 USDC", async () => {
      //await network.provider.send("evm_increaseTime", [10]);
      await precogV5
        .connect(clients[0])
        .withdraw(clients[0].address, usdc.address, "999000000", true);
    });

    it("User1 deposit 1000USDC again", async () => {
      await network.provider.send("evm_increaseTime", [176]);
      await precogV5.connect(clients[0]).deposit(usdc.address, "1000000000");
    });

    it("User1 transfer 499 IPCOG for user2", async () => {
      await network.provider.send("evm_increaseTime", [1063]);
      const liquidityTokenAddress = await precogStorage.getTokenConvert(
        usdc.address
      );
      const IPCOG = await ethers.getContractFactory("IPCOG");
      const liquidityToken = await hre.ethers.getContractAt(
        "IPCOG",
        liquidityTokenAddress
      );
      // await liquidityToken.connect(clients[0]).transfer(clients[1].address, "499000000").catch(err => {});
    });

    it("User2 deposit 1000USDC", async () => {
      await network.provider.send("evm_increaseTime", [80]);
      await precogV5.connect(clients[1]).deposit(usdc.address, "1000000000");
    });

    it("User2 force withdraw 899.1 USDC", async () => {
      await network.provider.send("evm_increaseTime", [149]);
      await precogV5
        .connect(clients[1])
        .withdraw(clients[1].address, usdc.address, "899100000", true);
    });

    it("User2 transfer 99.9 IPCOG for user3", async () => {
      await network.provider.send("evm_increaseTime", [1005]);
      const liquidityTokenAddress = await precogStorage.getTokenConvert(
        usdc.address
      );
      const IPCOG = await ethers.getContractFactory("IPCOG");
      const liquidityToken = await hre.ethers.getContractAt(
        "IPCOG",
        liquidityTokenAddress
      );
      // await liquidityToken.connect(clients[1]).transfer(clients[2].address, "99900000").catch(err => {});
    });
  });

  describe("Trading cycle 1", async () => {
    it("Set configuration of cycles [600, 200, 300, 600]", async () => {
      await network.provider.send("evm_increaseTime", [239]);
      await precogCore.setCycleConfiguration([600, 200, 300, 600]);
    });

    it("User3 deposit 500 USDC", async () => {
      await network.provider.send("evm_increaseTime", [85]);
      await precogV5.connect(clients[2]).deposit(usdc.address, "500000000");
    });

    it("User2 deposit 900 USDC", async () => {
      await network.provider.send("evm_increaseTime", [227]);
      await precogV5.connect(clients[1]).deposit(usdc.address, "900000000");
    });

    it("User1 request withdrawal all", async () => {
      await network.provider.send("evm_increaseTime", [181]);
      await precogV5
        .connect(clients[0])
        .requestWithdrawal(usdc.address, "999000000");
    });

    it("User1 deposit 500 USDC", async () => {
      await network.provider.send("evm_increaseTime", [56]);
      await precogV5.connect(clients[0]).deposit(usdc.address, "500000000");
    });
  });

  describe("Trading cycle 2", async () => {
    it("User3 request withdrawal all", async () => {
      await network.provider.send("evm_increaseTime", [394]);
      await precogV5
        .connect(clients[2])
        .requestWithdrawal(usdc.address, "499500000");
    });

    it("User2 request withdrawal all", async () => {
      await network.provider.send("evm_increaseTime", [279]);
      await precogV5
        .connect(clients[1])
        .requestWithdrawal(usdc.address, "999000000");
    });

    it("User1 withdraw 499.5 USDC", async () => {
      await precogV5
        .connect(clients[0])
        .withdraw(clients[0].address, usdc.address, "499500000", false);
    });

    it("User1 request withdrawal all", async () => {
      await network.provider.send("evm_increaseTime", [108]);
      const amount = await precogStorage.getLastInvestmentOf(
        usdc.address,
        clients[0].address
      );
      await precogV5
        .connect(clients[0])
        .requestWithdrawal(usdc.address, "499500000");
    });
  });

  describe("Trading cycle 3", async () => {
    it("Skip trading cycle 3", async () => {
      await network.provider.send("evm_increaseTime", [1200]);
    });
  });

  describe("Trading cycle 4", async () => {
    it("Send profit for trading cycle 0", async () => {
      await precogProfit.sendProfit(usdc.address, "10000000000");
    });

    it("Send profit for trading cycle 1", async () => {
      await precogProfit.sendProfit(usdc.address, "10000000000");
    });

    it("Send profit for trading cycle 2", async () => {
      await precogProfit.sendProfit(usdc.address, "10000000000");
    });

    it("Send profit for trading cycle 3", async () => {
      await precogProfit.sendProfit(usdc.address, "10000000000");
    });

    it("User1 withdraw 499.5 USDC", async () => {
      await precogV5
        .connect(clients[0])
        .withdraw(clients[0].address, usdc.address, "499500000", false);
    });

    it("User2 withdraw 999 USDC", async () => {
      await precogV5
        .connect(clients[1])
        .withdraw(clients[1].address, usdc.address, "999000000", false);
    });

    it("User3 withdraw 499.5 USDC", async () => {
      await precogV5
        .connect(clients[2])
        .withdraw(clients[2].address, usdc.address, "499500000", false);
    });

    it("Check total unit at trading cycle 0", async () => {
      const totalUnitsCycle0 = await precogStorage.getTotalUnitsTradingCycle(
        usdc.address,
        0
      );
      const unitUser1AtCycle0 = await precogStorage.getUnitInTradingCycle(
        usdc.address,
        clients[0].address,
        0
      );
      const unitUser2AtCycle0 = await precogStorage.getUnitInTradingCycle(
        usdc.address,
        clients[1].address,
        0
      );
      const unitUser3AtCycle0 = await precogStorage.getUnitInTradingCycle(
        usdc.address,
        clients[2].address,
        0
      );
      console.log("totalUnitsCycle0:", totalUnitsCycle0.toString());
      console.log("unitUser1AtCycle0:", unitUser1AtCycle0.toString());
      console.log("unitUser2AtCycle0:", unitUser2AtCycle0.toString());
      console.log("unitUser3AtCycle0:", unitUser3AtCycle0.toString());
      assert.equal(
        Number(totalUnitsCycle0),
        Number(unitUser1AtCycle0) +
          Number(unitUser2AtCycle0) +
          Number(unitUser3AtCycle0),
        "Wrong unit"
      );
    });

    it("Check total unit at trading cycle 1", async () => {
      const totalUnitsCycle1 = await precogStorage.getTotalUnitsTradingCycle(
        usdc.address,
        1
      );
      const unitUser1AtCycle1 = await precogStorage.getUnitInTradingCycle(
        usdc.address,
        clients[0].address,
        1
      );
      const unitUser2AtCycle1 = await precogStorage.getUnitInTradingCycle(
        usdc.address,
        clients[1].address,
        1
      );
      const unitUser3AtCycle1 = await precogStorage.getUnitInTradingCycle(
        usdc.address,
        clients[2].address,
        1
      );
      console.log("totalUnitsCycle1:", totalUnitsCycle1.toString());
      console.log("unitUser1AtCycle1:", unitUser1AtCycle1.toString());
      console.log("unitUser2AtCycle1:", unitUser2AtCycle1.toString());
      console.log("unitUser3AtCycle1:", unitUser3AtCycle1.toString());
      assert.equal(
        Number(totalUnitsCycle1),
        Number(unitUser1AtCycle1) +
          Number(unitUser2AtCycle1) +
          Number(unitUser3AtCycle1),
        "Wrong unit"
      );
    });

    it("Check total unit at trading cycle 2", async () => {
      const totalUnitsCycle2 = await precogStorage.getTotalUnitsTradingCycle(
        usdc.address,
        2
      );
      const unitUser1AtCycle2 = await precogStorage.getUnitInTradingCycle(
        usdc.address,
        clients[0].address,
        2
      );
      const unitUser2AtCycle2 = await precogStorage.getUnitInTradingCycle(
        usdc.address,
        clients[1].address,
        2
      );
      const unitUser3AtCycle2 = await precogStorage.getUnitInTradingCycle(
        usdc.address,
        clients[2].address,
        2
      );
      // console.log("totalUnitsCycle2:", totalUnitsCycle2.toString());
      // console.log("unitUser1AtCycle2:", unitUser1AtCycle2.toString());
      // console.log("unitUser2AtCycle2:", unitUser2AtCycle2.toString());
      // console.log("unitUser3AtCycle2:", unitUser3AtCycle2.toString());
      assert.equal(
        Number(totalUnitsCycle2),
        Number(unitUser1AtCycle2) +
          Number(unitUser2AtCycle2) +
          Number(unitUser3AtCycle2),
        "Wrong unit"
      );
    });

    it("Check total unit at trading cycle 3", async () => {
      const totalUnitsCycle3 = await precogStorage.getTotalUnitsTradingCycle(
        usdc.address,
        3
      );
      const unitUser1AtCycle3 = await precogStorage.getUnitInTradingCycle(
        usdc.address,
        clients[0].address,
        3
      );
      const unitUser2AtCycle3 = await precogStorage.getUnitInTradingCycle(
        usdc.address,
        clients[1].address,
        3
      );
      const unitUser3AtCycle3 = await precogStorage.getUnitInTradingCycle(
        usdc.address,
        clients[2].address,
        3
      );
      // console.log("totalUnitsCycle13:", totalUnitsCycle3.toString());
      // console.log("unitUser1AtCycle3:", unitUser1AtCycle3.toString());
      // console.log("unitUser2AtCycle3:", unitUser2AtCycle3.toString());
      // console.log("unitUser3AtCycle3:", unitUser3AtCycle3.toString());
      assert.equal(
        Number(totalUnitsCycle3),
        Number(unitUser1AtCycle3) +
          Number(unitUser2AtCycle3) +
          Number(unitUser3AtCycle3),
        "Wrong unit"
      );
    });

    it("Check users do not have any amount", async () => {
      const investmentOfUser1 = await precogStorage.getLastInvestmentOf(
        usdc.address,
        clients[0].address
      );
      const investmentOfUser2 = await precogStorage.getLastInvestmentOf(
        usdc.address,
        clients[1].address
      );
      const investmentOfUser3 = await precogStorage.getLastInvestmentOf(
        usdc.address,
        clients[2].address
      );

      const registerUser1 = await withdrawalRegister.getRegister(
        usdc.address,
        clients[0].address
      );
      const registerUser2 = await withdrawalRegister.getRegister(
        usdc.address,
        clients[1].address
      );
      const registerUser3 = await withdrawalRegister.getRegister(
        usdc.address,
        clients[2].address
      );

      assert.equal(
        investmentOfUser1.amount,
        0,
        "User1 did not withdraw all investment"
      );
      assert.equal(
        investmentOfUser2.amount,
        0,
        "User2 did not withdraw all investment"
      );
      assert.equal(
        investmentOfUser3.amount,
        0,
        "User3 did not withdraw all investment"
      );

      assert.equal(
        registerUser1.amount,
        0,
        "User1 did not withdraw all from register"
      );
      assert.equal(
        registerUser2.amount,
        0,
        "User2 did not withdraw all from register"
      );
      assert.equal(
        registerUser3.amount,
        0,
        "User3 did not withdraw all from register"
      );
    });

    it("Users take profit", async () => {
      const calculateProfitUser1 = await precogInternal.calculateProfit(
        usdc.address,
        clients[0].address
      );
      console.log(calculateProfitUser1.toString());

      const calculateProfitUser2 = await precogInternal.calculateProfit(
        usdc.address,
        clients[1].address
      );
      console.log(calculateProfitUser2.toString());

      const calculateProfitUser3 = await precogInternal.calculateProfit(
        usdc.address,
        clients[2].address
      );
      console.log(calculateProfitUser3.toString());

      await precogProfit
        .connect(clients[0])
        .takeProfit(clients[0].address, usdc.address);
      await precogProfit
        .connect(clients[1])
        .takeProfit(clients[1].address, usdc.address);
      await precogProfit
        .connect(clients[2])
        .takeProfit(clients[2].address, usdc.address);

      const totalPCOG = await pcog.balanceOf(precogProfit.address);
      console.log(totalPCOG.toString());
    });
  });
});
