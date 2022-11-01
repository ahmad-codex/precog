const { assert, expect } = require("chai");

const ERC20 = artifacts.require("ERC20");
const _PCOG = artifacts.require("PCOG")
const IPToken = artifacts.require("IPCOG");
const PrecogCore = artifacts.require("PrecogCore");
const MiddlewareExchange = artifacts.require("MiddlewareExchange");
const IPCOGFactory = artifacts.require("IPCOGFactory")
const Precog = artifacts.require("PrecogV5");
const WithdrawalRegister = artifacts.require("WithdrawalRegister");
const IRouter = artifacts.require("IExchangeRouter");
const fs = require("fs");
const { resolve } = require("path");

const BigNumber = require("big-number");

const routerAddress = fs.readFileSync(__dirname + "/uniswapAddress.txt", {
  encoding: "utf-8",
  flag: "r",
});

require("chai").use(require("chai-as-promised")).should();

const sleep = (time) => new Promise((resolve, reject) => {
  setTimeout(resolve, time);
});

// utils functionuint48(block.timestamp)
const ETHToWei = function (ether) {
  return web3.utils.toWei(ether, "ether");
};
const mweiToWei = function (ether) {
  return web3.utils.toWei(ether, "mwei");
};
const weiToMwei = function (weight) {
  return web3.utils.fromWei(weight, "mwei");
};
const weiToETH = function (weight) {
  return web3.utils.fromWei(weight, "ether");
};
const deadline = function () {
  return (Math.round(new Date().getTime() / 1000) + 1000).toString();
}

contract("PrecogV5", async ([deployer, tester1, tester2, tester3, tester4, tester5, tester6, USDCOwner, middleware, exchange]) => {
  let USDC, USDT, IP1, IP2, PCOG, FACTORY, PRECOG_CORE, MIDDLEWARE_EXCHANGE, PRECOGV5, ROUTER, WITHDRAWAL_REGISTER;
  before(async () => {
    // deploy
    [USDC, USDT, PCOG, ROUTER] = await Promise.all([
      ERC20.new("USD Coin", "USDC", "6"),
      ERC20.new("Tether USD", "USDT", "18"),
      _PCOG.new(),
      IRouter.at(routerAddress),
    ]);

    PRECOG_CORE = await PrecogCore.new(deployer, middleware, PCOG.address, routerAddress);
    MIDDLEWARE_EXCHANGE = await MiddlewareExchange.new(routerAddress, PCOG.address);
    FACTORY = await IPCOGFactory.new();
    PRECOGV5 = await Precog.new(PRECOG_CORE.address, MIDDLEWARE_EXCHANGE.address, FACTORY.address);
    WITHDRAWAL_REGISTER = await WithdrawalRegister.new(PRECOGV5.address, PRECOG_CORE.address);

    await PRECOGV5.setWithdrawalRegister(WITHDRAWAL_REGISTER.address);
    await PCOG.initialize();

    await Promise.all([
      PRECOG_CORE.setCycleConfiguration(["60", "60", "30", "30", "30"]),
    ])

    // create pools
    await Promise.all([
      await PRECOGV5.addLiquidityPool(USDC.address),
      await PRECOGV5.addLiquidityPool(USDT.address),
    ]);

    // get IP addresses
    [IPAddress1, IPAddress2] = await Promise.all([
      PRECOGV5.tokenConvert(USDC.address),
      PRECOGV5.tokenConvert(USDT.address),
    ]);
    
    // get IP contract instances
    [IP1, IP2] = await Promise.all([
      IPToken.at(IPAddress1),
      IPToken.at(IPAddress2),
    ]);

    // approve and mint
    await Promise.all([
      IP1.approve(PRECOGV5.address, mweiToWei("100000000000000000000000"), {
        from: tester1,
      }),
      IP2.approve(PRECOGV5.address, ETHToWei("100000000000000000000000"), {
        from: tester1,
      }),
      USDC.approve(PRECOGV5.address, mweiToWei("100000000000000000000000"), {
        from: tester1,
      }),
      USDT.approve(PRECOGV5.address, ETHToWei("100000000000000000000000"), {
        from: tester1,
      }),

      IP1.approve(PRECOGV5.address, mweiToWei("100000000000000000000000"), {
        from: tester2,
      }),
      IP2.approve(PRECOGV5.address, ETHToWei("100000000000000000000000"), {
        from: tester2,
      }),
      USDC.approve(PRECOGV5.address, mweiToWei("100000000000000000000000"), {
        from: tester2,
      }),
      USDT.approve(PRECOGV5.address, ETHToWei("100000000000000000000000"), {
        from: tester2,
      }),

      IP1.approve(PRECOGV5.address, mweiToWei("100000000000000000000000"), {
        from: tester3,
      }),
      IP2.approve(PRECOGV5.address, ETHToWei("100000000000000000000000"), {
        from: tester3,
      }),
      USDC.approve(PRECOGV5.address, mweiToWei("100000000000000000000000"), {
        from: tester3,
      }),
      USDT.approve(PRECOGV5.address, ETHToWei("100000000000000000000000"), {
        from: tester3,
      }),

      IP1.approve(PRECOGV5.address, mweiToWei("100000000000000000000000"), {
        from: tester4,
      }),
      IP2.approve(PRECOGV5.address, ETHToWei("100000000000000000000000"), {
        from: tester4,
      }),
      USDC.approve(PRECOGV5.address, mweiToWei("100000000000000000000000"), {
        from: tester4,
      }),
      USDT.approve(PRECOGV5.address, ETHToWei("100000000000000000000000"), {
        from: tester4,
      }),

      IP1.approve(PRECOGV5.address, mweiToWei("100000000000000000000000"), {
        from: middleware,
      }),
      IP2.approve(PRECOGV5.address, ETHToWei("100000000000000000000000"), {
        from: middleware,
      }),
      USDC.approve(PRECOGV5.address, mweiToWei("100000000000000000000000"), {
        from: middleware,
      }),
      USDT.approve(PRECOGV5.address, ETHToWei("100000000000000000000000"), {
        from: middleware,
      }),

      USDC.approve(routerAddress, mweiToWei("100000000000000000000000")),
      USDT.approve(routerAddress, ETHToWei("100000000000000000000000")),
      PCOG.approve(routerAddress, ETHToWei("100000000000000000000000")),

      // mint
      USDC.mint(tester1, mweiToWei("100005")),
      USDC.mint(tester2, mweiToWei("100005")),
      USDC.mint(tester3, mweiToWei("100005")),
      USDC.mint(tester4, mweiToWei("100005")),
      USDC.mint(middleware, mweiToWei("100000000000")),

      USDT.mint(tester1, ETHToWei("10005")),
      USDT.mint(tester2, ETHToWei("10005")),
      USDT.mint(tester3, ETHToWei("10005")),
      USDT.mint(tester4, ETHToWei("10005")),
      USDT.mint(middleware, ETHToWei("1000000000000")),

      USDC.mint(deployer, mweiToWei("100000000")),
      USDT.mint(deployer, ETHToWei("300000000")),
      USDC.mint(WITHDRAWAL_REGISTER.address, mweiToWei("100000000")),
      USDT.mint(WITHDRAWAL_REGISTER.address, ETHToWei("300000000")),
      //PCOG.mint(deployer, ETHToWei("500000000")),
      PCOG.transfer(MIDDLEWARE_EXCHANGE.address, ETHToWei("500000000")),
    ]);


    // create uniswapv2 liquidity pool

    await Promise.all([
      ROUTER.addLiquidity(
        USDC.address,
        PCOG.address,
        mweiToWei("100000000"),
        ETHToWei("100000000"),
        mweiToWei("150000000"),
        ETHToWei("150000000"),
        deployer,
        (Math.round(new Date().getTime() / 1000) + 1000).toString()
      ),
      ROUTER.addLiquidity(
        USDT.address,
        PCOG.address,
        ETHToWei("300000000"),
        ETHToWei("300000000"),
        ETHToWei("350000000"),
        ETHToWei("350000000"),
        deployer,
        deadline()
      ),
    ]);

    // set cycles 
    

  });

  describe("DEPLOYMENT AND CONFIGURATION", async () => {
    it("Should be equal to symbols", async () => {
      
      const [USDCSymbol, IP1Symbol, IP2Symbol, PCSymbol] = await Promise.all([
        USDC.symbol(),
        IP1.symbol(),
        IP2.symbol(),
        PCOG.symbol(),
      ]);
      assert.equal(USDCSymbol, "USDC", "USDC is not deployed well");
      assert.equal(IP1Symbol, "IPCOG", "IP is not deployed well");
      assert.equal(IP2Symbol, "IPCOG", "IP is not deployed well");
      assert.equal(PCSymbol, "PCOG", "PCOG is not deployed well");
    });

    it("Should return owner of tokens and contract", async () =>{
      const [PrecogOwner, IP1Owner, IP2Owner, PCOwner] = await Promise.all([
        PRECOG_CORE.getCoreConfiguration(),
        IP1.owner(),
        IP2.owner(),
        PCOG.owner(),
      ]);
      assert.equal(PrecogOwner.admin, deployer, "PRECOG deployer is not the owner");
      assert.equal(IP1Owner, PRECOGV5.address, "PRECOG is not the owner of IP1");
      assert.equal(IP2Owner, PRECOGV5.address, "PRECOG is not the owner of IP1");
      assert.equal(PCOwner, deployer, "PCOG deployer is not the owner");

    });

    it("Check pools are created", async () => {
      const [isUSDC, isUSDT] = await Promise.all([
        PRECOGV5.isExistingToken(USDC.address),
        PRECOGV5.isExistingToken(USDT.address),
      ]);
      assert.equal(isUSDC, true, "USDC was not added to pool");
      assert.equal(isUSDT, true, "USDT was not added to pool");
    });

    it("Check decimals of IP tokens", async () => {
      const [IP1Decimals, IP2Decimals] = await Promise.all([
        IP1.decimals(),
        IP2.decimals(),
      ]);
      assert.equal(IP1Decimals, 6, "Decimals of IP1 is not the same with USDC");
      assert.equal(IP2Decimals, 18, "Decimals of IP2 is not the same with USDT");
    });
  });


  describe("1-1: USER1, USER2 DEPOSIT TO PRECOG", async () => { 
    it("Should get enough IP1 and lose USDC", async () => { 
      // deposit
      let currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      let currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());
      await PRECOGV5.deposit(USDC.address, mweiToWei("1000"), { from: tester1 });
      await PRECOGV5.deposit(USDC.address, mweiToWei("1000"), { from: tester1 });
      await sleep(5000);
      await PRECOGV5.deposit(USDC.address, mweiToWei("1000"), { from: tester2 });
      currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      const totalInvestmentUnits = await PRECOGV5.totalInvestmentUnits(USDC.address, currentProfitTrading[0]);
      const investmentOfTester1 = await PRECOGV5.investmentOf(USDC.address, tester1, 0);
      const investmentOfTester2 = await PRECOGV5.investmentOf(USDC.address, tester2, 0);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());
      console.log("totalInvestmentUnits:", totalInvestmentUnits.toString());
      console.log("investmentOfTester1:", investmentOfTester1[0].toString(), investmentOfTester1[1].toString(), investmentOfTester1[2].toString());
      console.log("investmentOfTester2:", investmentOfTester2[0].toString(), investmentOfTester2[1].toString(), investmentOfTester2[2].toString());
      await sleep(60000);
    });
  });


  describe("1-2: USER1, USER2 DEPOSIT TO PRECOG", async () => { 
    it("Should get enough IP1 and lose USDC", async () => { 
      // deposit
      await sleep(10000)
      let currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      let currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());
      await PRECOGV5.deposit(USDC.address, mweiToWei("700"), { from: tester1 });
      await sleep(5000);
      await PRECOGV5.deposit(USDC.address, mweiToWei("800"), { from: tester2 });
      currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      const totalInvestmentUnits = await PRECOGV5.totalInvestmentUnits(USDC.address, currentProfitTrading[0]);
      const investmentOfTester1 = await PRECOGV5.investmentOf(USDC.address, tester1, 0);
      const investmentOfTester2 = await PRECOGV5.investmentOf(USDC.address, tester2, 0);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());
      console.log("totalInvestmentUnits:", totalInvestmentUnits.toString());
      console.log("investmentOfTester1:", investmentOfTester1[0].toString(), investmentOfTester1[1].toString(), investmentOfTester1[2].toString());
      console.log("investmentOfTester2:", investmentOfTester2[0].toString(), investmentOfTester2[1].toString(), investmentOfTester2[2].toString());
    });
  });

  describe("1-3: USER1, USER2 DEPOSIT TO PRECOG", async () => { 
    it("Should get enough IP1 and lose USDC", async () => { 
      // deposit
      await sleep(10000)
      let currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      let currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());
      await PRECOGV5.deposit(USDC.address, mweiToWei("900"), { from: tester1 });
      await sleep(5000);
      await PRECOGV5.deposit(USDC.address, mweiToWei("300"), { from: tester2 });
      currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      const totalInvestmentUnits = await PRECOGV5.totalInvestmentUnits(USDC.address, currentProfitTrading[0]);
      const investmentOfTester1 = await PRECOGV5.investmentOf(USDC.address, tester1, 1);
      const investmentOfTester2 = await PRECOGV5.investmentOf(USDC.address, tester2, 1);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());
      console.log("totalInvestmentUnits:", totalInvestmentUnits.toString());
      console.log("investmentOfTester1:", investmentOfTester1[0].toString(), investmentOfTester1[1].toString(), investmentOfTester1[2].toString());
      console.log("investmentOfTester2:", investmentOfTester2[0].toString(), investmentOfTester2[1].toString(), investmentOfTester2[2].toString());
    });
  });

  describe("1-4: USER1, USER2 DEPOSIT TO PRECOG", async () => { 
    it("Should get enough IP1 and lose USDC", async () => { 
      // deposit
      await sleep(15000)
      let currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      let currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());
      await PRECOGV5.deposit(USDC.address, mweiToWei("1000"), { from: tester1 });
      await sleep(5000);
      await PRECOGV5.deposit(USDC.address, mweiToWei("1000"), { from: tester2 });
      currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      const totalInvestmentUnits = await PRECOGV5.totalInvestmentUnits(USDC.address, currentProfitTrading[0]);
      const investmentOfTester1 = await PRECOGV5.investmentOf(USDC.address, tester1, 2);
      const investmentOfTester2 = await PRECOGV5.investmentOf(USDC.address, tester2, 2);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());
      console.log("totalInvestmentUnits:", totalInvestmentUnits.toString());
      console.log("investmentOfTester1:", investmentOfTester1[0].toString(), investmentOfTester1[1].toString(), investmentOfTester1[2].toString());
      console.log("investmentOfTester2:", investmentOfTester2[0].toString(), investmentOfTester2[1].toString(), investmentOfTester2[2].toString());
    });
  });

  describe("1-5: MIDDLEWARE SENDS PROFIT", async () => {
    it("Send and calculate profit step 1", async () => {
      await sleep(20000);
      await PRECOGV5.sendProfit(USDC.address, mweiToWei("10000"), {from: middleware});
      const profitOFTester1 = await PRECOGV5.calculateProfit(USDC.address, tester1);
      const profitOFTester2 = await PRECOGV5.calculateProfit(USDC.address, tester2);
      const PCOGOfPrecog = await PCOG.balanceOf(PRECOGV5.address);
      console.log("profitOFTester1:", profitOFTester1[0].toString(), profitOFTester1[1].toString(), profitOFTester1[2].toString());
      console.log("profitOFTester2:", profitOFTester2[0].toString(), profitOFTester2[1].toString(), profitOFTester2[2].toString());
      console.log("PCOGOfPrecog:", PCOGOfPrecog.toString());
    })

    it("Send and calculate profit step 2", async () => {
      await sleep(20000);
      await PRECOGV5.sendProfit(USDC.address, mweiToWei("10000"), {from: middleware});
      const profitOFTester1 = await PRECOGV5.calculateProfit(USDC.address, tester1);
      const profitOFTester2 = await PRECOGV5.calculateProfit(USDC.address, tester2);
      const PCOGOfPrecog = await PCOG.balanceOf(PRECOGV5.address);
      console.log("profitOFTester1:", profitOFTester1[0].toString(), profitOFTester1[1].toString(), profitOFTester1[2].toString());
      console.log("profitOFTester2:", profitOFTester2[0].toString(), profitOFTester2[1].toString(), profitOFTester2[2].toString());
      console.log("PCOGOfPrecog:", PCOGOfPrecog.toString());
    })

    it("Send and calculate profit step 3", async () => {
      await sleep(20000);
      await PRECOGV5.sendProfit(USDC.address, mweiToWei("10000"), {from: middleware});
      const profitOFTester1 = await PRECOGV5.calculateProfit(USDC.address, tester1);
      const profitOFTester2 = await PRECOGV5.calculateProfit(USDC.address, tester2);
      const PCOGOfPrecog = await PCOG.balanceOf(PRECOGV5.address);
      console.log("profitOFTester1:", profitOFTester1[0].toString(), profitOFTester1[1].toString(), profitOFTester1[2].toString());
      console.log("profitOFTester2:", profitOFTester2[0].toString(), profitOFTester2[1].toString(), profitOFTester2[2].toString());
      console.log("PCOGOfPrecog:", PCOGOfPrecog.toString());
    })

    it("Send and calculate profit step 3", async () => {
      await sleep(20000);
      await PRECOGV5.sendProfit(USDC.address, mweiToWei("10000"), {from: middleware});
      const profitOFTester1 = await PRECOGV5.calculateProfit(USDC.address, tester1);
      const profitOFTester2 = await PRECOGV5.calculateProfit(USDC.address, tester2);
      const PCOGOfPrecog = await PCOG.balanceOf(PRECOGV5.address);
      console.log("profitOFTester1:", profitOFTester1[0].toString(), profitOFTester1[1].toString(), profitOFTester1[2].toString());
      console.log("profitOFTester2:", profitOFTester2[0].toString(), profitOFTester2[1].toString(), profitOFTester2[2].toString());
      console.log("PCOGOfPrecog:", PCOGOfPrecog.toString());
    })

    it("Statistical data", async () => {
      
      

      for(let i = 0; i < 4; i++) {
        const totalInvestmentUnits = await PRECOGV5.totalInvestmentUnits(USDC.address, i).catch(err => {console.log("abc")});
        console.log(`totalInvestmentUnits ${i}:`, totalInvestmentUnits.toString());
      }

      let investmentOfTester1 = await PRECOGV5.investmentOf(USDC.address, tester1, 0).catch(err => {console.log("abc")});
      let investmentOfTester2 = await PRECOGV5.investmentOf(USDC.address, tester2, 0).catch(err => {console.log("abc")});
      console.log("investmentOfTester1:", investmentOfTester1[0].toString(), investmentOfTester1[1].toString(), investmentOfTester1[2].toString());
      console.log("investmentOfTester2:", investmentOfTester2[0].toString(), investmentOfTester2[1].toString(), investmentOfTester2[2].toString());

      investmentOfTester1 = await PRECOGV5.investmentOf(USDC.address, tester1, 1).catch(err => {console.log("abc")});
      investmentOfTester2 = await PRECOGV5.investmentOf(USDC.address, tester2, 1).catch(err => {console.log("abc")});
      console.log("investmentOfTester1:", investmentOfTester1[0].toString(), investmentOfTester1[1].toString(), investmentOfTester1[2].toString());
      console.log("investmentOfTester2:", investmentOfTester2[0].toString(), investmentOfTester2[1].toString(), investmentOfTester2[2].toString());

      investmentOfTester1 = await PRECOGV5.investmentOf(USDC.address, tester1, 2).catch(err => {console.log("abc")});
      investmentOfTester2 = await PRECOGV5.investmentOf(USDC.address, tester2, 2).catch(err => {console.log("abc")});
      console.log("investmentOfTester1:", investmentOfTester1[0].toString(), investmentOfTester1[1].toString(), investmentOfTester1[2].toString());
      console.log("investmentOfTester2:", investmentOfTester2[0].toString(), investmentOfTester2[1].toString(), investmentOfTester2[2].toString());

      investmentOfTester1 = await PRECOGV5.investmentOf(USDC.address, tester1, 3).catch(err => {console.log("abc")});
      investmentOfTester2 = await PRECOGV5.investmentOf(USDC.address, tester2, 3).catch(err => {console.log("abc")});
      console.log("investmentOfTester1:", investmentOfTester1[0].toString(), investmentOfTester1[1].toString(), investmentOfTester1[2].toString());
      console.log("investmentOfTester2:", investmentOfTester2[0].toString(), investmentOfTester2[1].toString(), investmentOfTester2[2].toString());
      
    })

    it("Take Profit", async () => {
      
      await PRECOGV5.takeProfit(tester1, USDC.address, {from: tester1});
      await PRECOGV5.takeProfit(tester2, USDC.address, {from: tester2});
      const PCOGOfPrecog = await PCOG.balanceOf(PRECOGV5.address);
      console.log("PCOGOfPrecog:", PCOGOfPrecog.toString());
      
    })

    it("Send and calculate profit step 4", async () => {
      await sleep(20000);
      await PRECOGV5.sendProfit(USDC.address, mweiToWei("10000"), {from: middleware});
      const profitOFTester1 = await PRECOGV5.calculateProfit(USDC.address, tester1);
      const profitOFTester2 = await PRECOGV5.calculateProfit(USDC.address, tester2);
      const PCOGOfPrecog = await PCOG.balanceOf(PRECOGV5.address);
      console.log("profitOFTester1:", profitOFTester1[0].toString(), profitOFTester1[1].toString(), profitOFTester1[2].toString());
      console.log("profitOFTester2:", profitOFTester2[0].toString(), profitOFTester2[1].toString(), profitOFTester2[2].toString());
      console.log("PCOGOfPrecog:", PCOGOfPrecog.toString());
    })

    it("Send and calculate profit step 5", async () => {
      await sleep(20000);
      await PRECOGV5.sendProfit(USDC.address, mweiToWei("10000"), {from: middleware});
      const profitOFTester1 = await PRECOGV5.calculateProfit(USDC.address, tester1);
      const profitOFTester2 = await PRECOGV5.calculateProfit(USDC.address, tester2);
      const PCOGOfPrecog = await PCOG.balanceOf(PRECOGV5.address);
      console.log("profitOFTester1:", profitOFTester1[0].toString(), profitOFTester1[1].toString(), profitOFTester1[2].toString());
      console.log("profitOFTester2:", profitOFTester2[0].toString(), profitOFTester2[1].toString(), profitOFTester2[2].toString());
      console.log("PCOGOfPrecog:", PCOGOfPrecog.toString());
    })

    it("Take Profit", async () => {
      
      await PRECOGV5.takeProfit(tester1, USDC.address, {from: tester1});
      await PRECOGV5.takeProfit(tester2, USDC.address, {from: tester2});
      const PCOGOfPrecog = await PCOG.balanceOf(PRECOGV5.address);
      console.log("PCOGOfPrecog:", PCOGOfPrecog.toString());
      
    })

  })
  


  return;



  describe("1-1: USER1, USER2 DEPOSIT TO PRECOG", async () => { 
    it("Should get enough IP1 and lose USDC", async () => { 
      // deposit
      //await sleep(25000);

      const currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      const currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());
      await PRECOGV5.deposit(USDC.address, mweiToWei("1000"), { from: tester1 });
      await PRECOGV5.deposit(USDC.address, mweiToWei("1000"), { from: tester2 });
    
    });

   

    
  });

  describe("1-1: USER1, USER2 DEPOSIT TO PRECOG", async () => { 
    it("Should get enough IP1 and lose USDC", async () => { 
      // deposit
      //await sleep(25000);

      const currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      const currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());
      await PRECOGV5.deposit(USDC.address, mweiToWei("1000"), { from: tester1 });
      await PRECOGV5.deposit(USDC.address, mweiToWei("1000"), { from: tester2 });
    
    });

  describe("1-2: MIDDLEWARE TAKE INVESTMENT", async () => {
    it("Should take 90% tokens of USDC pool", async() => {
      
      await PRECOGV5.takeInvestment(USDC.address, { from: middleware });
      await PRECOGV5.takeInvestment(USDT.address, { from: middleware });
      const currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      const currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());

    });

  });

  describe("1-3: MIDDLEWARE SEND PROFITS", async () => {
    it("Should have PCOG as profit in USDC pool", async () => {
      const formerProfitCycleID = await PRECOGV5.currentProfitCycleId(USDC.address);
      const formerProfitOfCurrentCycleStr = await PRECOGV5.profit(
        USDC.address,
        formerProfitCycleID
      );
      const formerPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);
      let currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      let currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());
      
      await sleep(15000);
      // start cycle 1
      await PRECOGV5.sendProfit(USDC.address, mweiToWei("10000"), {from: middleware});
      currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());

      const laterProfitCycleID = await PRECOGV5.currentProfitCycleId(USDC.address);
      const laterProfitOfPreviousCycleStr = await PRECOGV5.profit(
        USDC.address,
        formerProfitCycleID
      );
      const laterPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);


      const formerProfit = parseFloat(weiToETH(formerProfitOfCurrentCycleStr));
      const laterProfit = parseFloat(weiToETH(laterProfitOfPreviousCycleStr));
      const formerPCOGBalance = parseFloat(weiToETH(formerPCOGPrecogBalance));
      const laterPCOGBalance = parseFloat(weiToETH(laterPCOGPrecogBalance));

      assert.equal(parseInt(formerProfitCycleID), parseInt(laterProfitCycleID) - 1, "New profit cycle was not created");
      expect(laterPCOGBalance).to.greaterThan(formerPCOGBalance, "PCOG was not bought");
    });
  });
  
  describe("2-1: USER3, USER4 DEPOSIT TO PRECOG", async () => { 
    it("Should get enough IP1 and lose USDC", async () => {
      // deposit cycle2
      
      // deposit
      const currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      const currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());
      await PRECOGV5.deposit(USDC.address, mweiToWei("1000"), { from: tester3 });
      await PRECOGV5.deposit(USDC.address, mweiToWei("1000"), { from: tester4 });

      

    });
  });

  describe("2-2: MIDDLEWARE TAKES INVESTMENTS", async () => {
    it("Should take 90% tokens of USDC pool", async() => {
      
      await PRECOGV5.takeInvestment(USDC.address, { from: middleware });
      const currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      const currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());

      // cast to number
    });
  });

  describe("2-3: MIDDLEWARE SENDS PROFITS", async () => {
    it("Should have PCOG as profit in USDC pool", async () => {
      const formerProfitCycleID = await PRECOGV5.currentProfitCycleId(USDC.address);
      const formerProfitOfCurrentCycleStr = await PRECOGV5.profit(
        USDC.address,
        formerProfitCycleID
      );
      const formerPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);
      await sleep(20000);
      // start cycle 2
      await PRECOGV5.sendProfit(USDC.address, mweiToWei("10000"), {from: middleware});
      const currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      const currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());

      const laterProfitCycleID = await PRECOGV5.currentProfitCycleId(USDC.address);
      const laterProfitOfPreviousCycleStr = await PRECOGV5.profit(
        USDC.address,
        formerProfitCycleID
      );
      const laterPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);

      const formerProfit = parseFloat(weiToETH(formerProfitOfCurrentCycleStr));
      const laterProfit = parseFloat(weiToETH(laterProfitOfPreviousCycleStr));
      const formerPCOGBalance = parseFloat(weiToETH(formerPCOGPrecogBalance));
      const laterPCOGBalance = parseFloat(weiToETH(laterPCOGPrecogBalance));

      assert.equal(parseInt(formerProfitCycleID), parseInt(laterProfitCycleID) - 1, "New profit cycle was not created");
      expect(laterProfit).to.greaterThan(formerProfit, "profit was not updated");
      expect(laterPCOGBalance).to.greaterThan(formerPCOGBalance, "PCOG was not bought");
    });

  });

  describe("1-1: USER1, USER2 DEPOSIT TO PRECOG", async () => { 
    it("Should get enough IP1 and lose USDC", async () => { 
      // deposit
      //await sleep(25000);

      const currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      const currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());
      await PRECOGV5.deposit(USDC.address, mweiToWei("1000"), { from: tester1 });
      await PRECOGV5.deposit(USDC.address, mweiToWei("1000"), { from: tester2 });
    
    });

   

    
  });

  describe("3-1: USER1, USER2 TAKE PROFIT", async () => {
    it("Should increase PCOG balance of tester1 and tester2, take all profit from USDC pool", async () => {
      // former state
      
      let PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
      const formerPCOGBalanceOfTester1 = parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
      const formerPCOGBalanceOfTester2 = parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
      const calculateProfitTester1 = parseFloat(weiToETH(await PRECOGV5.calculateProfit(USDC.address, tester1)));
      const calculateProfitTester2 = parseFloat(weiToETH(await PRECOGV5.calculateProfit(USDC.address, tester2)));
      const calculateProfitTester3 = parseFloat(weiToETH(await PRECOGV5.calculateProfit(USDC.address, tester3)));
      const calculateProfitTester4 = parseFloat(weiToETH(await PRECOGV5.calculateProfit(USDC.address, tester4)));

      console.log("PCOGBalanceOfContract:", PCOGBalanceOfContract);
      console.log("calculateProfitTester1", calculateProfitTester1);
      console.log("calculateProfitTester2", calculateProfitTester2);
      console.log("calculateProfitTester3:", calculateProfitTester3);
      console.log("calculateProfitTester4:", calculateProfitTester4);
      console.log("formerPCOGBalanceOfTester1:", formerPCOGBalanceOfTester1);
      console.log("formerPCOGBalanceOfTester2:", formerPCOGBalanceOfTester2);
      

      
      await sleep(15000);
      let currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      let currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());
      const investmentOfTester1 = await PRECOGV5.investmentOf(USDC.address, tester1);
      const investmentOfTester2 = await PRECOGV5.investmentOf(USDC.address, tester2);
      const investmentOfTester3 = await PRECOGV5.investmentOf(USDC.address, tester3);
      const investmentOfTester4 = await PRECOGV5.investmentOf(USDC.address, tester4);

      console.log("investmentOfTester1:", investmentOfTester1[0].toString(), investmentOfTester1[1].toString(), investmentOfTester1[2].toString());
      console.log("investmentOfTester2:", investmentOfTester2[0].toString(), investmentOfTester2[1].toString(), investmentOfTester2[2].toString());
      console.log("investmentOfTester3:", investmentOfTester3[0].toString(), investmentOfTester3[1].toString(), investmentOfTester3[2].toString());
      console.log("investmentOfTester4:", investmentOfTester4[0].toString(), investmentOfTester4[1].toString(), investmentOfTester4[2].toString());
      let totalInvestmentUnits = await PRECOGV5.totalInvestmentUnits(USDC.address, 0);
      console.log("totalInvestmentUnits:", totalInvestmentUnits.toString());
      totalInvestmentUnits = await PRECOGV5.totalInvestmentUnits(USDC.address, 1);
      console.log("totalInvestmentUnits:", totalInvestmentUnits.toString());
      await PRECOGV5.takeProfit(tester1, USDC.address, {from: tester1});
      await PRECOGV5.takeProfit(tester2, USDC.address, {from: tester2});
      currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());
      
      // later state
      const laterPCOGBalanceOfTester1 =  parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
      const laterPCOGBalanceOfTester2 =  parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
      PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));

      console.log("PCOGBalanceOfContract: ", PCOGBalanceOfContract);
      console.log("laterPCOGBalanceOfTester1:", laterPCOGBalanceOfTester1);
      console.log("laterPCOGBalanceOfTester2:", laterPCOGBalanceOfTester2);
    });

  });

  describe("3-2: MIDDLEWARE TAKES INVESTMENTS", async () => {
    it("Should take 90% tokens of USDC pool", async () => {
      await PRECOGV5.takeInvestment(USDC.address, { from: middleware });
      const currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      const currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());

    });
  });

  describe("3-3: USER3, USER4 TAKE PROFIT", async () => {
    it("Should increase PCOG balance of tester3 and tester4, take all profit from USDC pool", async () => {
      // former state
      let PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
      const formerPCOGBalanceOfTester3 = parseFloat(weiToETH(await PCOG.balanceOf(tester3)));
      const formerPCOGBalanceOfTester4 = parseFloat(weiToETH(await PCOG.balanceOf(tester4)));
      const calculateProfitTester1 = parseFloat(weiToETH(await PRECOGV5.calculateProfit(USDC.address, tester1)));
      const calculateProfitTester2 = parseFloat(weiToETH(await PRECOGV5.calculateProfit(USDC.address, tester2)));
      const calculateProfitTester3 = parseFloat(weiToETH(await PRECOGV5.calculateProfit(USDC.address, tester3)));
      const calculateProfitTester4 = parseFloat(weiToETH(await PRECOGV5.calculateProfit(USDC.address, tester4)));

      console.log("PCOGBalanceOfContract:", PCOGBalanceOfContract);
      console.log("calculateProfitTester1", calculateProfitTester1);
      console.log("calculateProfitTester2", calculateProfitTester2);
      console.log("calculateProfitTester3:", calculateProfitTester3);
      console.log("calculateProfitTester4:", calculateProfitTester4);
      console.log("formerPCOGBalanceOfTester3:", formerPCOGBalanceOfTester3);
      console.log("formerPCOGBalanceOfTester4:", formerPCOGBalanceOfTester4);
      
      await sleep(15000);
      let currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      let currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());
      const investmentOfTester1 = await PRECOGV5.investmentOf(USDC.address, tester1);
      const investmentOfTester2 = await PRECOGV5.investmentOf(USDC.address, tester2);
      const investmentOfTester3 = await PRECOGV5.investmentOf(USDC.address, tester3);
      const investmentOfTester4 = await PRECOGV5.investmentOf(USDC.address, tester4);

      console.log("investmentOfTester1:", investmentOfTester1[0].toString(), investmentOfTester1[1].toString(), investmentOfTester1[2].toString());
      console.log("investmentOfTester2:", investmentOfTester2[0].toString(), investmentOfTester2[1].toString(), investmentOfTester2[2].toString());
      console.log("investmentOfTester3:", investmentOfTester3[0].toString(), investmentOfTester3[1].toString(), investmentOfTester3[2].toString());
      console.log("investmentOfTester4:", investmentOfTester4[0].toString(), investmentOfTester4[1].toString(), investmentOfTester4[2].toString());
      const totalInvestmentUnits = await PRECOGV5.totalInvestmentUnits(USDC.address, 1);
      console.log("totalInvestmentUnits:", totalInvestmentUnits.toString());
      await PRECOGV5.takeProfit(tester3, USDC.address, {from: tester3});
      await PRECOGV5.takeProfit(tester4, USDC.address, {from: tester4});
      currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());

      // later state
      const laterPCOGBalanceOfTester3 =  parseFloat(weiToETH(await PCOG.balanceOf(tester3)));
      const laterPCOGBalanceOfTester4 =  parseFloat(weiToETH(await PCOG.balanceOf(tester4)));
      PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));

      console.log("PCOGBalanceOfContract: ", PCOGBalanceOfContract);
      console.log("laterPCOGBalanceOfTester3:", laterPCOGBalanceOfTester3);
      console.log("laterPCOGBalanceOfTester4:", laterPCOGBalanceOfTester4);
    });

  });

  describe("3-4: MIDDLEWARE SENDS PROFITS", async () => {
    it("Should have PCOG as profit in USDC pool", async () => {
      const formerProfitCycleID = await PRECOGV5.currentProfitCycleId(
        USDC.address
      );
      const formerProfitOfCurrentCycleStr = await PRECOGV5.profit(
        USDC.address,
        formerProfitCycleID
      );
      const formerPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);
      // start cycle 3
      await sleep(15000);
      await PRECOGV5.sendProfit(USDC.address, mweiToWei("10000"), {from: middleware});
      const currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      const currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());
    });

  });

  describe("1-1: USER1, USER2 DEPOSIT TO PRECOG", async () => { 
    it("Should get enough IP1 and lose USDC", async () => { 
      // deposit
      //await sleep(25000);

      const currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      const currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());
      await PRECOGV5.deposit(USDC.address, mweiToWei("1000"), { from: tester1 });
      await PRECOGV5.deposit(USDC.address, mweiToWei("1000"), { from: tester2 });
    
    });

   

    
  });

  describe("4-1: 4 USERS TAKE PROFIT", async () => {
    it("Should increase PCOG balance of 4 users, take all profit from USDC pool", async () => {
      // former state
      let PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
      const formerPCOGBalanceOfTester1 = parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
      const formerPCOGBalanceOfTester2 = parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
      const formerPCOGBalanceOfTester3 = parseFloat(weiToETH(await PCOG.balanceOf(tester3)));
      const formerPCOGBalanceOfTester4 = parseFloat(weiToETH(await PCOG.balanceOf(tester4)));
      const calculateProfitTester1 = parseFloat(weiToETH(await PRECOGV5.calculateProfit(USDC.address, tester1)));
      const calculateProfitTester2 = parseFloat(weiToETH(await PRECOGV5.calculateProfit(USDC.address, tester2)));
      const calculateProfitTester3 = parseFloat(weiToETH(await PRECOGV5.calculateProfit(USDC.address, tester3)));
      const calculateProfitTester4 = parseFloat(weiToETH(await PRECOGV5.calculateProfit(USDC.address, tester4)));

      console.log("PCOGBalanceOfContract:", PCOGBalanceOfContract);
      console.log("calculateProfitTester1", calculateProfitTester1);
      console.log("calculateProfitTester2", calculateProfitTester2);
      console.log("calculateProfitTester3:", calculateProfitTester3);
      console.log("calculateProfitTester4:", calculateProfitTester4);
      console.log("formerPCOGBalanceOfTester1:", formerPCOGBalanceOfTester1);
      console.log("formerPCOGBalanceOfTester2:", formerPCOGBalanceOfTester2);
      console.log("formerPCOGBalanceOfTester3:", formerPCOGBalanceOfTester3);
      console.log("formerPCOGBalanceOfTester4:", formerPCOGBalanceOfTester4);

      await sleep(30000);
      let currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      let currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());
      const investmentOfTester1 = await PRECOGV5.investmentOf(USDC.address, tester1);
      const investmentOfTester2 = await PRECOGV5.investmentOf(USDC.address, tester2);
      const investmentOfTester3 = await PRECOGV5.investmentOf(USDC.address, tester3);
      const investmentOfTester4 = await PRECOGV5.investmentOf(USDC.address, tester4);

      console.log("investmentOfTester1:", investmentOfTester1[0].toString(), investmentOfTester1[1].toString(), investmentOfTester1[2].toString());
      console.log("investmentOfTester2:", investmentOfTester2[0].toString(), investmentOfTester2[1].toString(), investmentOfTester2[2].toString());
      console.log("investmentOfTester3:", investmentOfTester3[0].toString(), investmentOfTester3[1].toString(), investmentOfTester3[2].toString());
      console.log("investmentOfTester4:", investmentOfTester4[0].toString(), investmentOfTester4[1].toString(), investmentOfTester4[2].toString());
      const totalInvestmentUnits = await PRECOGV5.totalInvestmentUnits(USDC.address, 2);
      console.log("totalInvestmentUnits:", totalInvestmentUnits.toString());

      await PRECOGV5.takeProfit(tester1, USDC.address, {from: tester1});
      await PRECOGV5.takeProfit(tester2, USDC.address, {from: tester2});
      await PRECOGV5.takeProfit(tester3, USDC.address, {from: tester3});
      await PRECOGV5.takeProfit(tester4, USDC.address, {from: tester4});
      currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());

      // later state
      const laterPCOGBalanceOfTester1 =  parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
      const laterPCOGBalanceOfTester2 =  parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
      const laterPCOGBalanceOfTester3 =  parseFloat(weiToETH(await PCOG.balanceOf(tester3)));
      const laterPCOGBalanceOfTester4 =  parseFloat(weiToETH(await PCOG.balanceOf(tester4)));

      PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
      console.log("PCOGBalanceOfContract: ", PCOGBalanceOfContract);
      console.log("laterPCOGBalanceOfTester1:", laterPCOGBalanceOfTester1);
      console.log("laterPCOGBalanceOfTester2:", laterPCOGBalanceOfTester2);
      console.log("laterPCOGBalanceOfTester3:", laterPCOGBalanceOfTester3);
      console.log("laterPCOGBalanceOfTester4:", laterPCOGBalanceOfTester4);
    });


    it("PCOG in Precog must be out of amount", async() => {
      const investmentOfTester1 = await PRECOGV5.investmentOf(USDC.address, tester1);
      const investmentOfTester2 = await PRECOGV5.investmentOf(USDC.address, tester2);
      const investmentOfTester3 = await PRECOGV5.investmentOf(USDC.address, tester3);
      const investmentOfTester4 = await PRECOGV5.investmentOf(USDC.address, tester4);

      console.log("investmentOfTester1:", investmentOfTester1[0].toString(), investmentOfTester1[1].toString(), investmentOfTester1[2].toString());
      console.log("investmentOfTester2:", investmentOfTester2[0].toString(), investmentOfTester2[1].toString(), investmentOfTester2[2].toString());
      console.log("investmentOfTester3:", investmentOfTester3[0].toString(), investmentOfTester3[1].toString(), investmentOfTester3[2].toString());
      console.log("investmentOfTester4:", investmentOfTester4[0].toString(), investmentOfTester4[1].toString(), investmentOfTester4[2].toString());

      const laterPCOGBalanceOfTester1 =  parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
      const laterPCOGBalanceOfTester2 =  parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
      const laterPCOGBalanceOfTester3 =  parseFloat(weiToETH(await PCOG.balanceOf(tester3)));
      const laterPCOGBalanceOfTester4 =  parseFloat(weiToETH(await PCOG.balanceOf(tester4)));

      let PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
      console.log("PCOGBalanceOfContract: ", PCOGBalanceOfContract);
      console.log("laterPCOGBalanceOfTester1:", laterPCOGBalanceOfTester1);
      console.log("laterPCOGBalanceOfTester2:", laterPCOGBalanceOfTester2);
      console.log("laterPCOGBalanceOfTester3:", laterPCOGBalanceOfTester3);
      console.log("laterPCOGBalanceOfTester4:", laterPCOGBalanceOfTester4);
      PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
      console.log("PCOGBalanceOfContract: ", PCOGBalanceOfContract);
      expect(PCOGBalanceOfContract).to.lessThanOrEqual(1e-15, "Users don't take all profit from Precog");
    });

  });

  describe("3-4: MIDDLEWARE SENDS PROFITS", async () => {
    it("Should have PCOG as profit in USDC pool", async () => {
      const formerProfitCycleID = await PRECOGV5.currentProfitCycleId(
        USDC.address
      );
      const formerProfitOfCurrentCycleStr = await PRECOGV5.profit(
        USDC.address,
        formerProfitCycleID
      );
      const formerPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);
      // start cycle 3
      await sleep(15000);
      await PRECOGV5.sendProfit(USDC.address, mweiToWei("10000"), {from: middleware});
      const currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      const currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());
    });

  });

  describe("4-1: 4 USERS TAKE PROFIT", async () => {
    it("Should increase PCOG balance of 4 users, take all profit from USDC pool", async () => {
      // former state
      let PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
      const formerPCOGBalanceOfTester1 = parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
      const formerPCOGBalanceOfTester2 = parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
      const formerPCOGBalanceOfTester3 = parseFloat(weiToETH(await PCOG.balanceOf(tester3)));
      const formerPCOGBalanceOfTester4 = parseFloat(weiToETH(await PCOG.balanceOf(tester4)));
      const calculateProfitTester1 = parseFloat(weiToETH(await PRECOGV5.calculateProfit(USDC.address, tester1)));
      const calculateProfitTester2 = parseFloat(weiToETH(await PRECOGV5.calculateProfit(USDC.address, tester2)));
      const calculateProfitTester3 = parseFloat(weiToETH(await PRECOGV5.calculateProfit(USDC.address, tester3)));
      const calculateProfitTester4 = parseFloat(weiToETH(await PRECOGV5.calculateProfit(USDC.address, tester4)));

      console.log("PCOGBalanceOfContract:", PCOGBalanceOfContract);
      console.log("calculateProfitTester1", calculateProfitTester1);
      console.log("calculateProfitTester2", calculateProfitTester2);
      console.log("calculateProfitTester3:", calculateProfitTester3);
      console.log("calculateProfitTester4:", calculateProfitTester4);
      console.log("formerPCOGBalanceOfTester1:", formerPCOGBalanceOfTester1);
      console.log("formerPCOGBalanceOfTester2:", formerPCOGBalanceOfTester2);
      console.log("formerPCOGBalanceOfTester3:", formerPCOGBalanceOfTester3);
      console.log("formerPCOGBalanceOfTester4:", formerPCOGBalanceOfTester4);

      await sleep(30000);
      let currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      let currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());
      const investmentOfTester1 = await PRECOGV5.investmentOf(USDC.address, tester1);
      const investmentOfTester2 = await PRECOGV5.investmentOf(USDC.address, tester2);
      const investmentOfTester3 = await PRECOGV5.investmentOf(USDC.address, tester3);
      const investmentOfTester4 = await PRECOGV5.investmentOf(USDC.address, tester4);

      console.log("investmentOfTester1:", investmentOfTester1[0].toString(), investmentOfTester1[1].toString(), investmentOfTester1[2].toString());
      console.log("investmentOfTester2:", investmentOfTester2[0].toString(), investmentOfTester2[1].toString(), investmentOfTester2[2].toString());
      console.log("investmentOfTester3:", investmentOfTester3[0].toString(), investmentOfTester3[1].toString(), investmentOfTester3[2].toString());
      console.log("investmentOfTester4:", investmentOfTester4[0].toString(), investmentOfTester4[1].toString(), investmentOfTester4[2].toString());
      const totalInvestmentUnits = await PRECOGV5.totalInvestmentUnits(USDC.address, 2);
      console.log("totalInvestmentUnits:", totalInvestmentUnits.toString());

      await PRECOGV5.takeProfit(tester1, USDC.address, {from: tester1});
      await PRECOGV5.takeProfit(tester2, USDC.address, {from: tester2});
      await PRECOGV5.takeProfit(tester3, USDC.address, {from: tester3});
      await PRECOGV5.takeProfit(tester4, USDC.address, {from: tester4});
      currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());

      // later state
      const laterPCOGBalanceOfTester1 =  parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
      const laterPCOGBalanceOfTester2 =  parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
      const laterPCOGBalanceOfTester3 =  parseFloat(weiToETH(await PCOG.balanceOf(tester3)));
      const laterPCOGBalanceOfTester4 =  parseFloat(weiToETH(await PCOG.balanceOf(tester4)));

      PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
      console.log("PCOGBalanceOfContract: ", PCOGBalanceOfContract);
      console.log("laterPCOGBalanceOfTester1:", laterPCOGBalanceOfTester1);
      console.log("laterPCOGBalanceOfTester2:", laterPCOGBalanceOfTester2);
      console.log("laterPCOGBalanceOfTester3:", laterPCOGBalanceOfTester3);
      console.log("laterPCOGBalanceOfTester4:", laterPCOGBalanceOfTester4);
    });


    it("PCOG in Precog must be out of amount", async() => {
      const investmentOfTester1 = await PRECOGV5.investmentOf(USDC.address, tester1);
      const investmentOfTester2 = await PRECOGV5.investmentOf(USDC.address, tester2);
      const investmentOfTester3 = await PRECOGV5.investmentOf(USDC.address, tester3);
      const investmentOfTester4 = await PRECOGV5.investmentOf(USDC.address, tester4);

      console.log("investmentOfTester1:", investmentOfTester1[0].toString(), investmentOfTester1[1].toString(), investmentOfTester1[2].toString());
      console.log("investmentOfTester2:", investmentOfTester2[0].toString(), investmentOfTester2[1].toString(), investmentOfTester2[2].toString());
      console.log("investmentOfTester3:", investmentOfTester3[0].toString(), investmentOfTester3[1].toString(), investmentOfTester3[2].toString());
      console.log("investmentOfTester4:", investmentOfTester4[0].toString(), investmentOfTester4[1].toString(), investmentOfTester4[2].toString());

      const laterPCOGBalanceOfTester1 =  parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
      const laterPCOGBalanceOfTester2 =  parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
      const laterPCOGBalanceOfTester3 =  parseFloat(weiToETH(await PCOG.balanceOf(tester3)));
      const laterPCOGBalanceOfTester4 =  parseFloat(weiToETH(await PCOG.balanceOf(tester4)));

      let PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
      console.log("PCOGBalanceOfContract: ", PCOGBalanceOfContract);
      console.log("laterPCOGBalanceOfTester1:", laterPCOGBalanceOfTester1);
      console.log("laterPCOGBalanceOfTester2:", laterPCOGBalanceOfTester2);
      console.log("laterPCOGBalanceOfTester3:", laterPCOGBalanceOfTester3);
      console.log("laterPCOGBalanceOfTester4:", laterPCOGBalanceOfTester4);
      PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
      console.log("PCOGBalanceOfContract: ", PCOGBalanceOfContract);
      expect(PCOGBalanceOfContract).to.lessThanOrEqual(1e-15, "Users don't take all profit from Precog");
    });

  });

  describe("3-4: MIDDLEWARE SENDS PROFITS", async () => {
    it("Should have PCOG as profit in USDC pool", async () => {
      const formerProfitCycleID = await PRECOGV5.currentProfitCycleId(
        USDC.address
      );
      const formerProfitOfCurrentCycleStr = await PRECOGV5.profit(
        USDC.address,
        formerProfitCycleID
      );
      const formerPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);
      // start cycle 3
      await sleep(15000);
      await PRECOGV5.sendProfit(USDC.address, mweiToWei("10000"), {from: middleware});
      const currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      const currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());
    });

  });

  describe("4-1: 4 USERS TAKE PROFIT", async () => {
    it("Should increase PCOG balance of 4 users, take all profit from USDC pool", async () => {
      // former state
      let PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
      const formerPCOGBalanceOfTester1 = parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
      const formerPCOGBalanceOfTester2 = parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
      const formerPCOGBalanceOfTester3 = parseFloat(weiToETH(await PCOG.balanceOf(tester3)));
      const formerPCOGBalanceOfTester4 = parseFloat(weiToETH(await PCOG.balanceOf(tester4)));
      const calculateProfitTester1 = parseFloat(weiToETH(await PRECOGV5.calculateProfit(USDC.address, tester1)));
      const calculateProfitTester2 = parseFloat(weiToETH(await PRECOGV5.calculateProfit(USDC.address, tester2)));
      const calculateProfitTester3 = parseFloat(weiToETH(await PRECOGV5.calculateProfit(USDC.address, tester3)));
      const calculateProfitTester4 = parseFloat(weiToETH(await PRECOGV5.calculateProfit(USDC.address, tester4)));

      console.log("PCOGBalanceOfContract:", PCOGBalanceOfContract);
      console.log("calculateProfitTester1", calculateProfitTester1);
      console.log("calculateProfitTester2", calculateProfitTester2);
      console.log("calculateProfitTester3:", calculateProfitTester3);
      console.log("calculateProfitTester4:", calculateProfitTester4);
      console.log("formerPCOGBalanceOfTester1:", formerPCOGBalanceOfTester1);
      console.log("formerPCOGBalanceOfTester2:", formerPCOGBalanceOfTester2);
      console.log("formerPCOGBalanceOfTester3:", formerPCOGBalanceOfTester3);
      console.log("formerPCOGBalanceOfTester4:", formerPCOGBalanceOfTester4);

      await sleep(30000);
      let currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      let currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());
      const investmentOfTester1 = await PRECOGV5.investmentOf(USDC.address, tester1);
      const investmentOfTester2 = await PRECOGV5.investmentOf(USDC.address, tester2);
      const investmentOfTester3 = await PRECOGV5.investmentOf(USDC.address, tester3);
      const investmentOfTester4 = await PRECOGV5.investmentOf(USDC.address, tester4);

      console.log("investmentOfTester1:", investmentOfTester1[0].toString(), investmentOfTester1[1].toString(), investmentOfTester1[2].toString());
      console.log("investmentOfTester2:", investmentOfTester2[0].toString(), investmentOfTester2[1].toString(), investmentOfTester2[2].toString());
      console.log("investmentOfTester3:", investmentOfTester3[0].toString(), investmentOfTester3[1].toString(), investmentOfTester3[2].toString());
      console.log("investmentOfTester4:", investmentOfTester4[0].toString(), investmentOfTester4[1].toString(), investmentOfTester4[2].toString());
      const totalInvestmentUnits = await PRECOGV5.totalInvestmentUnits(USDC.address, 2);
      console.log("totalInvestmentUnits:", totalInvestmentUnits.toString());

      await PRECOGV5.takeProfit(tester1, USDC.address, {from: tester1});
      await PRECOGV5.takeProfit(tester2, USDC.address, {from: tester2});
      await PRECOGV5.takeProfit(tester3, USDC.address, {from: tester3});
      await PRECOGV5.takeProfit(tester4, USDC.address, {from: tester4});
      currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());

      // later state
      const laterPCOGBalanceOfTester1 =  parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
      const laterPCOGBalanceOfTester2 =  parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
      const laterPCOGBalanceOfTester3 =  parseFloat(weiToETH(await PCOG.balanceOf(tester3)));
      const laterPCOGBalanceOfTester4 =  parseFloat(weiToETH(await PCOG.balanceOf(tester4)));

      PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
      console.log("PCOGBalanceOfContract: ", PCOGBalanceOfContract);
      console.log("laterPCOGBalanceOfTester1:", laterPCOGBalanceOfTester1);
      console.log("laterPCOGBalanceOfTester2:", laterPCOGBalanceOfTester2);
      console.log("laterPCOGBalanceOfTester3:", laterPCOGBalanceOfTester3);
      console.log("laterPCOGBalanceOfTester4:", laterPCOGBalanceOfTester4);
    });


    it("PCOG in Precog must be out of amount", async() => {
      const investmentOfTester1 = await PRECOGV5.investmentOf(USDC.address, tester1);
      const investmentOfTester2 = await PRECOGV5.investmentOf(USDC.address, tester2);
      const investmentOfTester3 = await PRECOGV5.investmentOf(USDC.address, tester3);
      const investmentOfTester4 = await PRECOGV5.investmentOf(USDC.address, tester4);

      console.log("investmentOfTester1:", investmentOfTester1[0].toString(), investmentOfTester1[1].toString(), investmentOfTester1[2].toString());
      console.log("investmentOfTester2:", investmentOfTester2[0].toString(), investmentOfTester2[1].toString(), investmentOfTester2[2].toString());
      console.log("investmentOfTester3:", investmentOfTester3[0].toString(), investmentOfTester3[1].toString(), investmentOfTester3[2].toString());
      console.log("investmentOfTester4:", investmentOfTester4[0].toString(), investmentOfTester4[1].toString(), investmentOfTester4[2].toString());

      const laterPCOGBalanceOfTester1 =  parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
      const laterPCOGBalanceOfTester2 =  parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
      const laterPCOGBalanceOfTester3 =  parseFloat(weiToETH(await PCOG.balanceOf(tester3)));
      const laterPCOGBalanceOfTester4 =  parseFloat(weiToETH(await PCOG.balanceOf(tester4)));

      let PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
      console.log("PCOGBalanceOfContract: ", PCOGBalanceOfContract);
      console.log("laterPCOGBalanceOfTester1:", laterPCOGBalanceOfTester1);
      console.log("laterPCOGBalanceOfTester2:", laterPCOGBalanceOfTester2);
      console.log("laterPCOGBalanceOfTester3:", laterPCOGBalanceOfTester3);
      console.log("laterPCOGBalanceOfTester4:", laterPCOGBalanceOfTester4);
      PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
      console.log("PCOGBalanceOfContract: ", PCOGBalanceOfContract);
      expect(PCOGBalanceOfContract).to.lessThanOrEqual(1e-15, "Users don't take all profit from Precog");
    });

  });

  describe("3-4: MIDDLEWARE SENDS PROFITS", async () => {
    it("Should have PCOG as profit in USDC pool", async () => {
      const formerProfitCycleID = await PRECOGV5.currentProfitCycleId(
        USDC.address
      );
      const formerProfitOfCurrentCycleStr = await PRECOGV5.profit(
        USDC.address,
        formerProfitCycleID
      );
      const formerPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);
      // start cycle 3
      await sleep(15000);
      await PRECOGV5.sendProfit(USDC.address, mweiToWei("10000"), {from: middleware});
      const currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      const currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());
    });

  });

  describe("4-1: 4 USERS TAKE PROFIT", async () => {
    it("Should increase PCOG balance of 4 users, take all profit from USDC pool", async () => {
      // former state
      let PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
      const formerPCOGBalanceOfTester1 = parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
      const formerPCOGBalanceOfTester2 = parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
      const formerPCOGBalanceOfTester3 = parseFloat(weiToETH(await PCOG.balanceOf(tester3)));
      const formerPCOGBalanceOfTester4 = parseFloat(weiToETH(await PCOG.balanceOf(tester4)));
      const calculateProfitTester1 = parseFloat(weiToETH(await PRECOGV5.calculateProfit(USDC.address, tester1)));
      const calculateProfitTester2 = parseFloat(weiToETH(await PRECOGV5.calculateProfit(USDC.address, tester2)));
      const calculateProfitTester3 = parseFloat(weiToETH(await PRECOGV5.calculateProfit(USDC.address, tester3)));
      const calculateProfitTester4 = parseFloat(weiToETH(await PRECOGV5.calculateProfit(USDC.address, tester4)));

      console.log("PCOGBalanceOfContract:", PCOGBalanceOfContract);
      console.log("calculateProfitTester1", calculateProfitTester1);
      console.log("calculateProfitTester2", calculateProfitTester2);
      console.log("calculateProfitTester3:", calculateProfitTester3);
      console.log("calculateProfitTester4:", calculateProfitTester4);
      console.log("formerPCOGBalanceOfTester1:", formerPCOGBalanceOfTester1);
      console.log("formerPCOGBalanceOfTester2:", formerPCOGBalanceOfTester2);
      console.log("formerPCOGBalanceOfTester3:", formerPCOGBalanceOfTester3);
      console.log("formerPCOGBalanceOfTester4:", formerPCOGBalanceOfTester4);

      await sleep(30000);
      let currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      let currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());
      const investmentOfTester1 = await PRECOGV5.investmentOf(USDC.address, tester1);
      const investmentOfTester2 = await PRECOGV5.investmentOf(USDC.address, tester2);
      const investmentOfTester3 = await PRECOGV5.investmentOf(USDC.address, tester3);
      const investmentOfTester4 = await PRECOGV5.investmentOf(USDC.address, tester4);

      console.log("investmentOfTester1:", investmentOfTester1[0].toString(), investmentOfTester1[1].toString(), investmentOfTester1[2].toString());
      console.log("investmentOfTester2:", investmentOfTester2[0].toString(), investmentOfTester2[1].toString(), investmentOfTester2[2].toString());
      console.log("investmentOfTester3:", investmentOfTester3[0].toString(), investmentOfTester3[1].toString(), investmentOfTester3[2].toString());
      console.log("investmentOfTester4:", investmentOfTester4[0].toString(), investmentOfTester4[1].toString(), investmentOfTester4[2].toString());
      const totalInvestmentUnits = await PRECOGV5.totalInvestmentUnits(USDC.address, 2);
      console.log("totalInvestmentUnits:", totalInvestmentUnits.toString());

      await PRECOGV5.takeProfit(tester1, USDC.address, {from: tester1});
      await PRECOGV5.takeProfit(tester2, USDC.address, {from: tester2});
      await PRECOGV5.takeProfit(tester3, USDC.address, {from: tester3});
      await PRECOGV5.takeProfit(tester4, USDC.address, {from: tester4});
      currentProfitId = await PRECOGV5.currentProfitCycleId(USDC.address);
      currentProfitTrading = await PRECOGV5.getCurrentProfitCycle(USDC.address);
      console.log("currentProfitId:", currentProfitId.toString());
      console.log("currentProfitTrading:", currentProfitTrading[0].toString());

      // later state
      const laterPCOGBalanceOfTester1 =  parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
      const laterPCOGBalanceOfTester2 =  parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
      const laterPCOGBalanceOfTester3 =  parseFloat(weiToETH(await PCOG.balanceOf(tester3)));
      const laterPCOGBalanceOfTester4 =  parseFloat(weiToETH(await PCOG.balanceOf(tester4)));

      PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
      console.log("PCOGBalanceOfContract: ", PCOGBalanceOfContract);
      console.log("laterPCOGBalanceOfTester1:", laterPCOGBalanceOfTester1);
      console.log("laterPCOGBalanceOfTester2:", laterPCOGBalanceOfTester2);
      console.log("laterPCOGBalanceOfTester3:", laterPCOGBalanceOfTester3);
      console.log("laterPCOGBalanceOfTester4:", laterPCOGBalanceOfTester4);
    });


    it("PCOG in Precog must be out of amount", async() => {
      const investmentOfTester1 = await PRECOGV5.investmentOf(USDC.address, tester1);
      const investmentOfTester2 = await PRECOGV5.investmentOf(USDC.address, tester2);
      const investmentOfTester3 = await PRECOGV5.investmentOf(USDC.address, tester3);
      const investmentOfTester4 = await PRECOGV5.investmentOf(USDC.address, tester4);

      console.log("investmentOfTester1:", investmentOfTester1[0].toString(), investmentOfTester1[1].toString(), investmentOfTester1[2].toString());
      console.log("investmentOfTester2:", investmentOfTester2[0].toString(), investmentOfTester2[1].toString(), investmentOfTester2[2].toString());
      console.log("investmentOfTester3:", investmentOfTester3[0].toString(), investmentOfTester3[1].toString(), investmentOfTester3[2].toString());
      console.log("investmentOfTester4:", investmentOfTester4[0].toString(), investmentOfTester4[1].toString(), investmentOfTester4[2].toString());

      const laterPCOGBalanceOfTester1 =  parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
      const laterPCOGBalanceOfTester2 =  parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
      const laterPCOGBalanceOfTester3 =  parseFloat(weiToETH(await PCOG.balanceOf(tester3)));
      const laterPCOGBalanceOfTester4 =  parseFloat(weiToETH(await PCOG.balanceOf(tester4)));

      let PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
      console.log("PCOGBalanceOfContract: ", PCOGBalanceOfContract);
      console.log("laterPCOGBalanceOfTester1:", laterPCOGBalanceOfTester1);
      console.log("laterPCOGBalanceOfTester2:", laterPCOGBalanceOfTester2);
      console.log("laterPCOGBalanceOfTester3:", laterPCOGBalanceOfTester3);
      console.log("laterPCOGBalanceOfTester4:", laterPCOGBalanceOfTester4);
      PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
      console.log("PCOGBalanceOfContract: ", PCOGBalanceOfContract);
      expect(PCOGBalanceOfContract).to.lessThanOrEqual(1e-15, "Users don't take all profit from Precog");
    });

  });

  return; })


  // describe("4-2: MIDDLEWARE TAKES INVESTMENTS", async () => {
  //   it("Should take 90% tokens of USDC pool", async () => {
  //     await sleep(25000);
  //     await PRECOGV5.takeInvestment(USDC.address, { from: middleware });
  //     await PRECOGV5.takeInvestment(USDT.address, { from: middleware });

  //     const USDCPrecogBalanceStr = await IP1.balanceOf(
  //       USDC.address
  //     );

  //     const USDCLiquidityStr = await PRECOGV5.liquidity(USDC.address);

  //     // cast to number
  //     const USDCPrecogBalance = parseFloat(weiToMwei(USDCPrecogBalanceStr));
  //     const USDCLiquidity = parseFloat(weiToMwei(USDCLiquidityStr));

  //     assert.equal(
  //       0.1 * USDCLiquidity,
  //       USDCPrecogBalance,
  //       "Middleware does not take 90% tokens from USDC pool"
  //     );
  //   });

  //   it("Should take 90% tokens of USDT pool", async () => {
  //     const USDTPrecogBalanceStr = await IP2.balanceOf(
  //       USDT.address
  //     );

  //     const USDTLiquidityStr = await PRECOGV5.liquidity(USDT.address);

  //     // cast to number
  //     const USDTPrecogBalance = parseFloat(weiToMwei(USDTPrecogBalanceStr));
  //     const USDTLiquidity = parseFloat(weiToMwei(USDTLiquidityStr));
  //     assert.equal(
  //       0.1 * USDTLiquidity,
  //       USDTPrecogBalance,
  //       "Middleware does not take 90% tokens from USDT pool"
  //     );
      
  //   });
  // });

  // describe("4-3: MIDDLEWARE SENDS PROFITS", async () => {
  //   it("Should have PCOG as profit in USDC pool", async () => {
  //     const formerProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDC.address
  //     );
  //     const formerProfitOfCurrentCycleStr = await PRECOGV5.profit(
  //       USDC.address,
  //       formerProfitCycleID
  //     );
  //     const formerPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);
  //     await sleep(25000);
  //     await PRECOGV5.sendProfit(USDC.address, mweiToWei("10000"), {from: middleware});
      
  //     const laterProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDC.address
  //     );
  //     const laterProfitOfPreviousCycleStr = await PRECOGV5.profit(
  //       USDC.address,
  //       formerProfitCycleID
  //     );
  //     const laterPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);

  //     const formerProfit = parseFloat(weiToETH(formerProfitOfCurrentCycleStr));
  //     const laterProfit = parseFloat(weiToETH(laterProfitOfPreviousCycleStr));
  //     const formerPCOGBalance = parseFloat(weiToETH(formerPCOGPrecogBalance));
  //     const laterPCOGBalance = parseFloat(weiToETH(laterPCOGPrecogBalance));

  //     assert.equal(
  //       parseInt(formerProfitCycleID),
  //       parseInt(laterProfitCycleID) - 1,
  //       "New profit cycle was not created"
  //     );
  //     expect(laterProfit).to.greaterThan(
  //       formerProfit,
  //       "profit was not updated"
  //     );
  //     expect(laterPCOGBalance).to.greaterThan(
  //       formerPCOGBalance,
  //       "PCOG was not bought"
  //     );
  //   });

  //   it("Should have PCOG as profit in USDT pool", async () => {
  //     const formerProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDT.address
  //     );
  //     const formerProfitOfCurrentCycleStr = await PRECOGV5.profit(
  //       USDT.address,
  //       formerProfitCycleID
  //     );
  //     const formerPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);
  //     await PRECOGV5.sendProfit(USDT.address, ETHToWei("10000"),{from: middleware});

  //     const laterProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDT.address
  //     );
  //     const laterProfitOfPreviousCycleStr = await PRECOGV5.profit(
  //       USDT.address,
  //       formerProfitCycleID
  //     );
  //     const laterPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);

  //     const formerProfit = parseFloat(weiToETH(formerProfitOfCurrentCycleStr));
  //     const laterProfit = parseFloat(weiToETH(laterProfitOfPreviousCycleStr));
  //     const formerPCOGBalance = parseFloat(weiToETH(formerPCOGPrecogBalance));
  //     const laterPCOGBalance = parseFloat(weiToETH(laterPCOGPrecogBalance));

  //     assert.equal(
  //       parseInt(formerProfitCycleID),
  //       parseInt(laterProfitCycleID) - 1,
  //       "New profit cycle was not created"
  //     );
  //     expect(laterProfit).to.greaterThan(
  //       formerProfit,
  //       "profit was not updated"
  //     );
  //     expect(laterPCOGBalance).to.greaterThan(
  //       formerPCOGBalance,
  //       "PCOG was not bought"
  //     );
      
  //   });
  // });


  // describe("5-1. USER1 REQUESTS WITHDRAWAL", async () => {
  //   it("Should have enough IP1 to request withdrawal from USDC pool", async() => {
  //     const formerAmountIP1 = (await IP1.balanceOf(tester1)).toString();
  //     console.log("formerAmountIP1:", formerAmountIP1);
      
  //     await PRECOGV5.requestWithdrawal(USDC.address, formerAmountIP1, {from: tester1})
  //     await sleep(100000);
  //   });

  //   it("Should have enough IP2 to request withdrawal from USDT pool", async() => {
  //     const formerAmountIP2 = (await IP2.balanceOf(tester1)).toString();
  //     console.log("formerAmountIP2:", formerAmountIP2);
  //     await PRECOGV5.requestWithdrawal(USDT.address, formerAmountIP2, {from: tester1})
      
  //   });

  //   it("User1 could not withdraw token before middleware send reqquest withdrawal amount to Precog", async() => {
  //     let isFailed = false;
  //     await PRECOGV5.withdraw(tester1, USDC.address, await IP1.balanceOf(tester1), {from: tester1})
  //     .catch(err => {
  //       console.log(err.message);
  //       isFailed = true;
  //     })

  //     await PRECOGV5.withdraw(tester1, USDT.address, await IP2.balanceOf(tester1), {from: tester1})
  //     .catch(err => {
  //       console.log(err.message);
  //       isFailed = true;
  //     })

  //     assert.equal(isFailed, true, "User could not withdraw USDC or USDT if middleware send request withdrawal to Precog");
  //   });
  // });

  // describe("5-3. USER1 WITHDRAWS", async () => {
    
  //   it("Should approve IPCOG to contract before withdraw", async () => {
  //     await IP1.approve(PRECOGV5.address, ETHToWei("10000000000000"), {from: tester1});
  //     await IP2.approve(PRECOGV5.address, ETHToWei("10000000000000"), {from: tester1});
  //   })

  //   it("Should have enough IP1 to withdraw", async() => {
  //     await sleep(25000);
  //     await PRECOGV5.withdraw(tester1, USDC.address, await IP1.balanceOf(tester1), {from: tester1})
  //   });
  //   it("Should have enough IP2 to withdraw", async() => {
  //     await PRECOGV5.withdraw(tester1, USDT.address, await IP2.balanceOf(tester1), {from: tester1})
  //   });
    
  // });

  // describe("5-4: USER1, USER2 TAKE PROFIT", async () => {
  //   it("Should increase PCOG balance of tester1 and tester2, take all profit from USDC pool", async () => {
  //     // former state
      
  //     let PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
  //     const formerPCOGBalanceOfTester1 = parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
  //     const formerPCOGBalanceOfTester2 = parseFloat(weiToETH(await PCOG.balanceOf(tester2)));

  //     console.log("PCOGBalanceOfContract:", PCOGBalanceOfContract);
  //     console.log("formerPCOGBalanceOfTester1:", formerPCOGBalanceOfTester1);
  //     console.log("formerPCOGBalanceOfTester2:", formerPCOGBalanceOfTester2);
  //     await sleep(25000);
  //     await PRECOGV5.takeProfit(tester1, USDC.address, {from: tester1});
  //     await PRECOGV5.takeProfit(tester2, USDC.address, {from: tester2});
      
      
  //     // later state
  //     const laterPCOGBalanceOfTester1 =  parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
  //     const laterPCOGBalanceOfTester2 =  parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
  //     PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));

  //     console.log("PCOGBalanceOfContract: ", PCOGBalanceOfContract);
  //     console.log("laterPCOGBalanceOfTester1:", laterPCOGBalanceOfTester1);
  //     console.log("laterPCOGBalanceOfTester2:", laterPCOGBalanceOfTester2);
  //   });

  //   it("Should increase PCOG balance of tester1 and tester2, take all profit from USDT pool", async () => {
  //     // former state
      
  //     let PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
  //     const formerPCOGBalanceOfTester1 = parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
  //     const formerPCOGBalanceOfTester2 = parseFloat(weiToETH(await PCOG.balanceOf(tester2)));

  //     console.log("PCOGBalanceOfContract:", PCOGBalanceOfContract);
  //     console.log("formerPCOGBalanceOfTester1:", formerPCOGBalanceOfTester1);
  //     console.log("formerPCOGBalanceOfTester2:", formerPCOGBalanceOfTester2);
      
  //     try {
  //       await PRECOGV5.takeProfit(tester1, USDT.address, {from: tester1});
  //       await PRECOGV5.takeProfit(tester2, USDT.address, {from: tester2});
  //     } catch(err) {
  //       console.error(err.message);
  //     }
      
  //     // later state
  //     const laterPCOGBalanceOfTester1 =  parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
  //     const laterPCOGBalanceOfTester2 =  parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
  //     PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));

  //     console.log("PCOGBalanceOfContract: ", PCOGBalanceOfContract);
  //     console.log("laterPCOGBalanceOfTester1:", laterPCOGBalanceOfTester1);
  //     console.log("laterPCOGBalanceOfTester2:", laterPCOGBalanceOfTester2);
  //   });

  //   it("Tester1 and tester2 can not take profit again", async() => {
  //     await PRECOGV5.takeProfit(tester1, USDC.address, {from: tester1}).catch(err => console.log(err.message));
  //     await PRECOGV5.takeProfit(tester2, USDC.address, {from: tester2}).catch(err => console.log(err.message));
  //     await PRECOGV5.takeProfit(tester1, USDT.address, {from: tester1}).catch(err => console.log(err.message));
  //     await PRECOGV5.takeProfit(tester2, USDT.address, {from: tester2}).catch(err => console.log(err.message));
  //   });
  // });

  // describe("5-5: USER1 DEPOSITS TO PRECOG", async () => { 
  //   it("Should get enough IP1 and lose USDC", async () => {

  //     const formerTester1USDCBalance = ((await USDC.balanceOf(tester1)) / 2).toString();
  //     const formerTester1IP1Balance = await IP1.balanceOf(tester1);
      
      
  //     // deposit
  //     await sleep(25000);
  //     await PRECOGV5.deposit(USDC.address, formerTester1USDCBalance, { from: tester1 });
      
      

  //     const laterTester1USDCBalance = await USDC.balanceOf(tester1);
  //     const laterTester1IP1Balance = await IP1.balanceOf(tester1);
      

  //     // assert.equal(
  //     //   parseFloat(weiToMwei(formerTester3USDCBalance) - 1000),
  //     //   parseFloat(weiToMwei(laterTester3USDCBalance)),
  //     //   "All USDC from tester3 was not deposited"
  //     // );
  //     // assert.equal(
  //     //   parseFloat(weiToMwei(formerTester3IP1Balance)) + 999,
  //     //   parseFloat(weiToMwei(laterTester3IP1Balance)),
  //     //   "Tester3 didn't get enough IP"
  //     // );
  //     // assert.equal(
  //     //   parseFloat(weiToMwei(formerTester4USDCBalance) - 1000),
  //     //   parseFloat(weiToMwei(laterTester4USDCBalance)),
  //     //   "All USDC from tester4 was not deposited"
  //     // );
  //     // assert.equal(
  //     //   parseFloat(weiToMwei(formerTester4IP1Balance)) + 999,
  //     //   parseFloat(weiToMwei(laterTester4IP1Balance)),
  //     //   "Tester4 didn't get enough IP"
  //     // );
  //   });

  //   it("Should get enough IP2 and lose USDT", async () => {
  //     const formerTester1USDTBalance = ((await USDT.balanceOf(tester1)) / 2).toString();
  //     const formerTester1IP2Balance = await IP2.balanceOf(tester1);
  //     console.log("formerTester1USDTBalance:", formerTester1USDTBalance);

  //     // deposit
  //     try {
  //       await PRECOGV5.deposit(USDT.address, formerTester1USDTBalance, {from: tester1});
  //     } catch(err) {
  //       console.error(err.message);
  //     }
      
      
  //     const laterTester1USDTBalance = await USDT.balanceOf(tester1);
  //     const laterTester1IP2Balance = await IP2.balanceOf(tester1);
      


  //     // assert.equal(
  //     //   parseFloat(weiToETH(formerTester3USDTBalance) - 500),
  //     //   parseFloat(weiToETH(laterTester3USDTBalance)),
  //     //   "All USDC from tester3 was not deposited"
  //     // );
  //     // assert.equal(
  //     //   parseFloat(weiToETH(formerTester3IP2Balance)) + 499.5,
  //     //   parseFloat(weiToETH(laterTester3IP2Balance)),
  //     //   "Tester4 didn't get enough IP"
  //     // );
  //     // assert.equal(
  //     //   parseFloat(weiToETH(formerTester4USDTBalance) - 500),
  //     //   parseFloat(weiToETH(laterTester4USDTBalance)),
  //     //   "All USDC from tester4 was not deposited"
  //     // );
  //     // assert.equal(
  //     //   parseFloat(weiToETH(formerTester4IP2Balance)) + 499.5,
  //     //   parseFloat(weiToETH(laterTester4IP2Balance)),
  //     //   "Tester4 didn't get enough IP"
  //     // );
  //   });

  //   it("Should charge user investment fee", async () => {
  //     const USDCDepositFee = await USDC.balanceOf(PRECOG_CORE.address);
  //     const USDTDepositFee = await USDT.balanceOf(PRECOG_CORE.address);

  //     // assert.equal(parseFloat(weiToMwei(USDCDepositFee)), 4, "USDC deposit fee was not charged");
  //     // assert.equal(parseFloat(weiToETH(USDTDepositFee)), 2, "USDT deposit fee was not charged");
  //   });
  // });
  
  // describe("5-6: MIDDLEWARE TAKES INVESTMENTS", async () => {
  //   it("Should take 90% tokens of USDC pool", async () => {
  //     await sleep(25000);
  //     await PRECOGV5.takeInvestment(USDC.address, { from: middleware });
  //     await PRECOGV5.takeInvestment(USDT.address, { from: middleware });

  //     const USDCPrecogBalanceStr = await IP1.balanceOf(
  //       USDC.address
  //     );

  //     const USDCLiquidityStr = await PRECOGV5.liquidity(USDC.address);

  //     // cast to number
  //     const USDCPrecogBalance = parseFloat(weiToMwei(USDCPrecogBalanceStr));
  //     const USDCLiquidity = parseFloat(weiToMwei(USDCLiquidityStr));

      
  //   });

  //   it("Should take 90% tokens of USDT pool", async () => {
  //     const USDTPrecogBalanceStr = await IP2.balanceOf(
  //       USDT.address
  //     );

  //     const USDTLiquidityStr = await PRECOGV5.liquidity(USDT.address);

  //     // cast to number
  //     const USDTPrecogBalance = parseFloat(weiToMwei(USDTPrecogBalanceStr));
  //     const USDTLiquidity = parseFloat(weiToMwei(USDTLiquidityStr));
      
      
  //   });
  // });

  // describe("5-7: MIDDLEWARE SENDS PROFITS", async () => {
  //   it("Should have PCOG as profit in USDC pool", async () => {
  //     const formerProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDC.address
  //     );
  //     const formerProfitOfCurrentCycleStr = await PRECOGV5.profit(
  //       USDC.address,
  //       formerProfitCycleID
  //     );
  //     const formerPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);
  //     await sleep(25000);
  //     await PRECOGV5.sendProfit(USDC.address, mweiToWei("10000"), {from: middleware});
  //     const laterProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDC.address
  //     );
  //     const laterProfitOfPreviousCycleStr = await PRECOGV5.profit(
  //       USDC.address,
  //       formerProfitCycleID
  //     );
  //     const laterPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);

  //     const formerProfit = parseFloat(weiToETH(formerProfitOfCurrentCycleStr));
  //     const laterProfit = parseFloat(weiToETH(laterProfitOfPreviousCycleStr));
  //     const formerPCOGBalance = parseFloat(weiToETH(formerPCOGPrecogBalance));
  //     const laterPCOGBalance = parseFloat(weiToETH(laterPCOGPrecogBalance));

  //     assert.equal(
  //       parseInt(formerProfitCycleID),
  //       parseInt(laterProfitCycleID) - 1,
  //       "New profit cycle was not created"
  //     );
  //     expect(laterProfit).to.greaterThan(
  //       formerProfit,
  //       "profit was not updated"
  //     );
  //     expect(laterPCOGBalance).to.greaterThan(
  //       formerPCOGBalance,
  //       "PCOG was not bought"
  //     );
  //   });

  //   it("Should have PCOG as profit in USDT pool", async () => {
  //     const formerProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDT.address
  //     );
  //     const formerProfitOfCurrentCycleStr = await PRECOGV5.profit(
  //       USDT.address,
  //       formerProfitCycleID
  //     );
  //     const formerPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);

  //     await PRECOGV5.sendProfit(USDT.address, ETHToWei("10000"),{from: middleware});

  //     const laterProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDT.address
  //     );
  //     const laterProfitOfPreviousCycleStr = await PRECOGV5.profit(
  //       USDT.address,
  //       formerProfitCycleID
  //     );
  //     const laterPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);

  //     const formerProfit = parseFloat(weiToETH(formerProfitOfCurrentCycleStr));
  //     const laterProfit = parseFloat(weiToETH(laterProfitOfPreviousCycleStr));
  //     const formerPCOGBalance = parseFloat(weiToETH(formerPCOGPrecogBalance));
  //     const laterPCOGBalance = parseFloat(weiToETH(laterPCOGPrecogBalance));

  //     assert.equal(
  //       parseInt(formerProfitCycleID),
  //       parseInt(laterProfitCycleID) - 1,
  //       "New profit cycle was not created"
  //     );
  //     expect(laterProfit).to.greaterThan(
  //       formerProfit,
  //       "profit was not updated"
  //     );
  //     expect(laterPCOGBalance).to.greaterThan(
  //       formerPCOGBalance,
  //       "PCOG was not bought"
  //     );
      
  //   });
  // });

  // describe("6-1: USER1 DEPOSITS TO PRECOG", async () => { 
  //   it("Should get enough IP1 and lose USDC", async () => {

  //     const formerTester1USDCBalance = await USDC.balanceOf(tester1);
  //     const formerTester1IP1Balance = await IP1.balanceOf(tester1);
      
      
  //     // deposit
  //     await sleep(25000);
  //     await PRECOGV5.deposit(USDC.address, formerTester1USDCBalance, { from: tester1 });
      
      

  //     const laterTester1USDCBalance = await USDC.balanceOf(tester1);
  //     const laterTester1IP1Balance = await IP1.balanceOf(tester1);
      
  //   });

  //   it("Should get enough IP2 and lose USDT", async () => {
  //     const formerTester1USDTBalance = (await USDT.balanceOf(tester1)).toString();
  //     const formerTester1IP2Balance = await IP2.balanceOf(tester1);
  //     console.log("formerTester1USDTBalance:", formerTester1USDTBalance);

  //     // deposit
  //     try {
  //       await PRECOGV5.deposit(USDT.address, formerTester1USDTBalance, {from: tester1});
  //     } catch(err) {
  //       console.error(err.message);
  //     }
      
      
  //     const laterTester1USDTBalance = await USDT.balanceOf(tester1);
  //     const laterTester1IP2Balance = await IP2.balanceOf(tester1);
      
  //   });

  //   it("Should charge user investment fee", async () => {
  //     const USDCDepositFee = await USDC.balanceOf(PRECOG_CORE.address);
  //     const USDTDepositFee = await USDT.balanceOf(PRECOG_CORE.address);

      
  //   });
  // });

  // describe("6-2: MIDDLEWARE TAKES INVESTMENTS", async () => {
  //   it("Should take 90% tokens of USDC pool", async () => {
  //     await sleep(25000);
  //     await PRECOGV5.takeInvestment(USDC.address, { from: middleware });
  //     await PRECOGV5.takeInvestment(USDT.address, { from: middleware });

  //     const USDCPrecogBalanceStr = await IP1.balanceOf(
  //       USDC.address
  //     );

  //     const USDCLiquidityStr = await PRECOGV5.liquidity(USDC.address);

  //     // cast to number
  //     const USDCPrecogBalance = parseFloat(weiToMwei(USDCPrecogBalanceStr));
  //     const USDCLiquidity = parseFloat(weiToMwei(USDCLiquidityStr));

      
  //   });

  //   it("Should take 90% tokens of USDT pool", async () => {
  //     const USDTPrecogBalanceStr = await IP2.balanceOf(
  //       USDT.address
  //     );

  //     const USDTLiquidityStr = await PRECOGV5.liquidity(USDT.address);

  //     // cast to number
  //     const USDTPrecogBalance = parseFloat(weiToMwei(USDTPrecogBalanceStr));
  //     const USDTLiquidity = parseFloat(weiToMwei(USDTLiquidityStr));
      
      
  //   });
  // });

  // describe("6-3: 4 USERS TAKE PROFIT", async () => {
  //   it("Should increase PCOG balance of 4 users, take all profit from USDC pool", async () => {
  //     // former state
  //     let PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
  //     const formerPCOGBalanceOfTester1 = parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
  //     const formerPCOGBalanceOfTester2 = parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
  //     const formerPCOGBalanceOfTester3 = parseFloat(weiToETH(await PCOG.balanceOf(tester3)));
  //     const formerPCOGBalanceOfTester4 = parseFloat(weiToETH(await PCOG.balanceOf(tester4)));

  //     console.log("PCOGBalanceOfContract:", PCOGBalanceOfContract);
  //     console.log("formerPCOGBalanceOfTester1:", formerPCOGBalanceOfTester1);
  //     console.log("formerPCOGBalanceOfTester2:", formerPCOGBalanceOfTester2);
  //     console.log("formerPCOGBalanceOfTester3:", formerPCOGBalanceOfTester3);
  //     console.log("formerPCOGBalanceOfTester4:", formerPCOGBalanceOfTester4);

  //     await sleep(25000);
  //     await PRECOGV5.takeProfit(tester1, USDC.address, {from: tester1});
  //     await PRECOGV5.takeProfit(tester2, USDC.address, {from: tester2});
  //     await PRECOGV5.takeProfit(tester3, USDC.address, {from: tester3});
  //     await PRECOGV5.takeProfit(tester4, USDC.address, {from: tester4});
      

  //     // later state
  //     const laterPCOGBalanceOfTester1 =  parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
  //     const laterPCOGBalanceOfTester2 =  parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
  //     const laterPCOGBalanceOfTester3 =  parseFloat(weiToETH(await PCOG.balanceOf(tester3)));
  //     const laterPCOGBalanceOfTester4 =  parseFloat(weiToETH(await PCOG.balanceOf(tester4)));

  //     PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
  //     console.log("PCOGBalanceOfContract: ", PCOGBalanceOfContract);
  //     console.log("laterPCOGBalanceOfTester1:", laterPCOGBalanceOfTester1);
  //     console.log("laterPCOGBalanceOfTester2:", laterPCOGBalanceOfTester2);
  //     console.log("laterPCOGBalanceOfTester3:", laterPCOGBalanceOfTester3);
  //     console.log("laterPCOGBalanceOfTester4:", laterPCOGBalanceOfTester4);
  //   });

  //   it("Should increase PCOG balance of 4 users, take all profit from USDT pool", async () => {
  //     // former state
  //     let PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
  //     const formerPCOGBalanceOfTester1 = parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
  //     const formerPCOGBalanceOfTester2 = parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
  //     const formerPCOGBalanceOfTester3 = parseFloat(weiToETH(await PCOG.balanceOf(tester3)));
  //     const formerPCOGBalanceOfTester4 = parseFloat(weiToETH(await PCOG.balanceOf(tester4)));

  //     console.log("PCOGBalanceOfContract:", PCOGBalanceOfContract);
  //     console.log("formerPCOGBalanceOfTester1:", formerPCOGBalanceOfTester1);
  //     console.log("formerPCOGBalanceOfTester2:", formerPCOGBalanceOfTester2);
  //     console.log("formerPCOGBalanceOfTester3:", formerPCOGBalanceOfTester3);
  //     console.log("formerPCOGBalanceOfTester4:", formerPCOGBalanceOfTester4);
      
  //     await PRECOGV5.takeProfit(tester2, USDT.address, {from: tester2});
  //     await PRECOGV5.takeProfit(tester3, USDT.address, {from: tester3});
  //     await PRECOGV5.takeProfit(tester4, USDT.address, {from: tester4});
      
  //     // later state
  //     const laterPCOGBalanceOfTester1 =  parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
  //     const laterPCOGBalanceOfTester2 =  parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
  //     const laterPCOGBalanceOfTester3 =  parseFloat(weiToETH(await PCOG.balanceOf(tester3)));
  //     const laterPCOGBalanceOfTester4 =  parseFloat(weiToETH(await PCOG.balanceOf(tester4)));

      
      
  //     PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
  //     console.log("PCOGBalanceOfContract: ", PCOGBalanceOfContract);
  //     console.log("laterPCOGBalanceOfTester1:", laterPCOGBalanceOfTester1);
  //     console.log("laterPCOGBalanceOfTester2:", laterPCOGBalanceOfTester2);
  //     console.log("laterPCOGBalanceOfTester3:", laterPCOGBalanceOfTester3);
  //     console.log("laterPCOGBalanceOfTester4:", laterPCOGBalanceOfTester4);

      
  //   });

  //   it("PCOG in Precog must be out of amount", async() => {
  //     const PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
  //     console.log("PCOGBalanceOfContract: ", PCOGBalanceOfContract);
  //     expect(PCOGBalanceOfContract).to.lessThanOrEqual(1e-15, "Users don't take all profit from Precog");
  //   });

  // });

  // describe("6-4: MIDDLEWARE SENDS PROFITS", async () => {
  //   it("Should have PCOG as profit in USDC pool", async () => {
  //     const formerProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDC.address
  //     );
  //     const formerProfitOfCurrentCycleStr = await PRECOGV5.profit(
  //       USDC.address,
  //       formerProfitCycleID
  //     );
  //     const formerPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);
  //     await sleep(25000);
  //     await PRECOGV5.sendProfit(USDC.address, mweiToWei("10000"), {from: middleware});

  //     const laterProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDC.address
  //     );
  //     const laterProfitOfPreviousCycleStr = await PRECOGV5.profit(
  //       USDC.address,
  //       formerProfitCycleID
  //     );
  //     const laterPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);

  //     const formerProfit = parseFloat(weiToETH(formerProfitOfCurrentCycleStr));
  //     const laterProfit = parseFloat(weiToETH(laterProfitOfPreviousCycleStr));
  //     const formerPCOGBalance = parseFloat(weiToETH(formerPCOGPrecogBalance));
  //     const laterPCOGBalance = parseFloat(weiToETH(laterPCOGPrecogBalance));

  //     assert.equal(
  //       parseInt(formerProfitCycleID),
  //       parseInt(laterProfitCycleID) - 1,
  //       "New profit cycle was not created"
  //     );
  //     expect(laterProfit).to.greaterThan(
  //       formerProfit,
  //       "profit was not updated"
  //     );
  //     expect(laterPCOGBalance).to.greaterThan(
  //       formerPCOGBalance,
  //       "PCOG was not bought"
  //     );
  //   });

  //   it("Should have PCOG as profit in USDT pool", async () => {
  //     const formerProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDT.address
  //     );
  //     const formerProfitOfCurrentCycleStr = await PRECOGV5.profit(
  //       USDT.address,
  //       formerProfitCycleID
  //     );
  //     const formerPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);

  //     await PRECOGV5.sendProfit(USDT.address, ETHToWei("10000"),{from: middleware});

  //     const laterProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDT.address
  //     );
  //     const laterProfitOfPreviousCycleStr = await PRECOGV5.profit(
  //       USDT.address,
  //       formerProfitCycleID
  //     );
  //     const laterPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);

  //     const formerProfit = parseFloat(weiToETH(formerProfitOfCurrentCycleStr));
  //     const laterProfit = parseFloat(weiToETH(laterProfitOfPreviousCycleStr));
  //     const formerPCOGBalance = parseFloat(weiToETH(formerPCOGPrecogBalance));
  //     const laterPCOGBalance = parseFloat(weiToETH(laterPCOGPrecogBalance));

  //     assert.equal(
  //       parseInt(formerProfitCycleID),
  //       parseInt(laterProfitCycleID) - 1,
  //       "New profit cycle was not created"
  //     );
  //     expect(laterProfit).to.greaterThan(
  //       formerProfit,
  //       "profit was not updated"
  //     );
  //     expect(laterPCOGBalance).to.greaterThan(
  //       formerPCOGBalance,
  //       "PCOG was not bought"
  //     );
      
  //   });
  // });

  // describe("7-1: MIDDLEWARE TAKES INVESTMENTS", async () => {
  //   it("Should take 90% tokens of USDC pool", async () => {
  //     await sleep(25000);
  //     await PRECOGV5.takeInvestment(USDC.address, { from: middleware });
  //     await PRECOGV5.takeInvestment(USDT.address, { from: middleware });

  //     const USDCPrecogBalanceStr = await IP1.balanceOf(
  //       USDC.address
  //     );

  //     const USDCLiquidityStr = await PRECOGV5.liquidity(USDC.address);

  //     // cast to number
  //     const USDCPrecogBalance = parseFloat(weiToMwei(USDCPrecogBalanceStr));
  //     const USDCLiquidity = parseFloat(weiToMwei(USDCLiquidityStr));

      
  //   });

  //   it("Should take 90% tokens of USDT pool", async () => {
  //     const USDTPrecogBalanceStr = await IP2.balanceOf(
  //       USDT.address
  //     );

  //     const USDTLiquidityStr = await PRECOGV5.liquidity(USDT.address);

  //     // cast to number
  //     const USDTPrecogBalance = parseFloat(weiToMwei(USDTPrecogBalanceStr));
  //     const USDTLiquidity = parseFloat(weiToMwei(USDTLiquidityStr));
      
      
  //   });
  // });

  // describe("7-2: MIDDLEWARE SENDS PROFITS", async () => {
  //   it("Should have PCOG as profit in USDC pool", async () => {
  //     const formerProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDC.address
  //     );
  //     const formerProfitOfCurrentCycleStr = await PRECOGV5.profit(
  //       USDC.address,
  //       formerProfitCycleID
  //     );
  //     const formerPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);
  //     await sleep(25000);
  //     await PRECOGV5.sendProfit(USDC.address, mweiToWei("10000"), {from: middleware});

  //     const laterProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDC.address
  //     );
  //     const laterProfitOfPreviousCycleStr = await PRECOGV5.profit(
  //       USDC.address,
  //       formerProfitCycleID
  //     );
  //     const laterPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);

  //     const formerProfit = parseFloat(weiToETH(formerProfitOfCurrentCycleStr));
  //     const laterProfit = parseFloat(weiToETH(laterProfitOfPreviousCycleStr));
  //     const formerPCOGBalance = parseFloat(weiToETH(formerPCOGPrecogBalance));
  //     const laterPCOGBalance = parseFloat(weiToETH(laterPCOGPrecogBalance));

  //     assert.equal(
  //       parseInt(formerProfitCycleID),
  //       parseInt(laterProfitCycleID) - 1,
  //       "New profit cycle was not created"
  //     );
  //     expect(laterProfit).to.greaterThan(
  //       formerProfit,
  //       "profit was not updated"
  //     );
  //     expect(laterPCOGBalance).to.greaterThan(
  //       formerPCOGBalance,
  //       "PCOG was not bought"
  //     );
  //   });

  //   it("Should have PCOG as profit in USDT pool", async () => {
  //     const formerProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDT.address
  //     );
  //     const formerProfitOfCurrentCycleStr = await PRECOGV5.profit(
  //       USDT.address,
  //       formerProfitCycleID
  //     );
  //     const formerPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);

  //     await PRECOGV5.sendProfit(USDT.address, ETHToWei("10000"),{from: middleware});

  //     const laterProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDT.address
  //     );
  //     const laterProfitOfPreviousCycleStr = await PRECOGV5.profit(
  //       USDT.address,
  //       formerProfitCycleID
  //     );
  //     const laterPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);

  //     const formerProfit = parseFloat(weiToETH(formerProfitOfCurrentCycleStr));
  //     const laterProfit = parseFloat(weiToETH(laterProfitOfPreviousCycleStr));
  //     const formerPCOGBalance = parseFloat(weiToETH(formerPCOGPrecogBalance));
  //     const laterPCOGBalance = parseFloat(weiToETH(laterPCOGPrecogBalance));

  //     assert.equal(
  //       parseInt(formerProfitCycleID),
  //       parseInt(laterProfitCycleID) - 1,
  //       "New profit cycle was not created"
  //     );
  //     expect(laterProfit).to.greaterThan(
  //       formerProfit,
  //       "profit was not updated"
  //     );
  //     expect(laterPCOGBalance).to.greaterThan(
  //       formerPCOGBalance,
  //       "PCOG was not bought"
  //     );
      
  //   });
  // });

  // describe("8-1. 4 USERS REQUEST WITHDRAWAL", async () => {
  //   it("Should have enough IP1 to request withdrawal from USDC pool", async() => {
  //     const formerIP1OfTester1 = (await IP1.balanceOf(tester1)).toString();
  //     const formerIP1OfTester2 = (await IP1.balanceOf(tester2)).toString();
  //     const formerIP1OfTester3 = (await IP1.balanceOf(tester2)).toString();
  //     const formerIP1OfTester4 = (await IP1.balanceOf(tester2)).toString();

  //     console.log("formerIP1OfTester1:", formerIP1OfTester1);
  //     console.log("formerIP1OfTester2:", formerIP1OfTester2);
  //     console.log("formerIP1OfTester3:", formerIP1OfTester3);
  //     console.log("formerIP1OfTester4:", formerIP1OfTester4);
      
  //     await PRECOGV5.requestWithdrawal(USDC.address, formerIP1OfTester1, {from: tester1});
  //     await PRECOGV5.requestWithdrawal(USDC.address, formerIP1OfTester2, {from: tester2});
  //     await PRECOGV5.requestWithdrawal(USDC.address, formerIP1OfTester3, {from: tester3});
  //     await PRECOGV5.requestWithdrawal(USDC.address, formerIP1OfTester4, {from: tester4});
      
  //   });

  //   it("Should have enough IP2 to request withdrawal from USDT pool", async() => {
  //     const formerIP2OfTester1 = (await IP2.balanceOf(tester1)).toString();
  //     const formerIP2OfTester2 = (await IP2.balanceOf(tester2)).toString();
  //     const formerIP2OfTester3 = (await IP2.balanceOf(tester2)).toString();
  //     const formerIP2OfTester4 = (await IP2.balanceOf(tester2)).toString();

  //     console.log("formerIP1OfTester1:", formerIP2OfTester1);
  //     console.log("formerIP1OfTester2:", formerIP2OfTester2);
  //     console.log("formerIP1OfTester3:", formerIP2OfTester3);
  //     console.log("formerIP1OfTester4:", formerIP2OfTester4);

  //     await PRECOGV5.requestWithdrawal(USDT.address, formerIP2OfTester1, {from: tester1}).catch(err => console.error(err.message));
  //     await PRECOGV5.requestWithdrawal(USDT.address, formerIP2OfTester2, {from: tester2}).catch(err => console.error(err.message));
  //     await PRECOGV5.requestWithdrawal(USDT.address, formerIP2OfTester3, {from: tester3}).catch(err => console.error(err.message));
  //     await PRECOGV5.requestWithdrawal(USDT.address, formerIP2OfTester4, {from: tester4}).catch(err => console.error(err.message));
  //     await sleep(60000);
  //   });

  //   it("4 users could not withdraw token before middleware send reqquest withdrawal amount to Precog", async() => {
  //     let isFailed = false;

  //     await PRECOGV5.withdraw(tester1, USDC.address, await IP1.balanceOf(tester1), {from: tester1})
  //     .catch(err => {
  //       console.log(err.message);
  //       isFailed = true;
  //     })

  //     await PRECOGV5.withdraw(tester1, USDT.address, await IP2.balanceOf(tester1), {from: tester1})
  //     .catch(err => {
  //       console.log(err.message);
  //       isFailed = true;
  //     })

  //     await PRECOGV5.withdraw(tester2, USDC.address, await IP1.balanceOf(tester2), {from: tester2})
  //     .catch(err => {
  //       console.log(err.message);
  //       isFailed = true;
  //     })

  //     await PRECOGV5.withdraw(tester2, USDT.address, await IP2.balanceOf(tester2), {from: tester2})
  //     .catch(err => {
  //       console.log(err.message);
  //       isFailed = true;
  //     })

  //     await PRECOGV5.withdraw(tester3, USDC.address, await IP1.balanceOf(tester3), {from: tester3})
  //     .catch(err => {
  //       console.log(err.message);
  //       isFailed = true;
  //     })

  //     await PRECOGV5.withdraw(tester3, USDT.address, await IP1.balanceOf(tester3), {from: tester3})
  //     .catch(err => {
  //       console.log(err.message);
  //       isFailed = true;
  //     })

  //     await PRECOGV5.withdraw(tester4, USDC.address, await IP1.balanceOf(tester4), {from: tester4})
  //     .catch(err => {
  //       console.log(err.message);
  //       isFailed = true;
  //     })

  //     await PRECOGV5.withdraw(tester4, USDT.address, await IP1.balanceOf(tester4), {from: tester4})
  //     .catch(err => {
  //       console.log(err.message);
  //       isFailed = true;
  //     })

  //     assert.equal(isFailed, true, "User could not withdraw USDC or USDT if middleware send request withdrawal to Precog");
  //   });
  // });

  

  // describe("8-3. 4 USERS WITHDRAWS", async () => {

  //   it("Should approve IPCOG to contract before withdraw", async () => {
  //     await IP1.approve(PRECOGV5.address, ETHToWei("10000000000000"), {from: tester2});
  //     await IP2.approve(PRECOGV5.address, ETHToWei("10000000000000"), {from: tester2});
  //     await IP1.approve(PRECOGV5.address, ETHToWei("10000000000000"), {from: tester3});
  //     await IP2.approve(PRECOGV5.address, ETHToWei("10000000000000"), {from: tester3});
  //     await IP1.approve(PRECOGV5.address, ETHToWei("10000000000000"), {from: tester4});
  //     await IP2.approve(PRECOGV5.address, ETHToWei("10000000000000"), {from: tester4});

  //   })

  //   it("Should have enough IP1 to withdraw", async() => {
  //     await PRECOGV5.withdraw(tester1, USDC.address, await IP1.balanceOf(tester1), {from: tester1});
  //     await PRECOGV5.withdraw(tester2, USDC.address, await IP1.balanceOf(tester2), {from: tester2});
  //     await PRECOGV5.withdraw(tester3, USDC.address, await IP1.balanceOf(tester3), {from: tester3});
  //     await PRECOGV5.withdraw(tester4, USDC.address, await IP1.balanceOf(tester4), {from: tester4});

  //   });
  //   it("Should have enough IP2 to withdraw", async() => {
  //     await PRECOGV5.withdraw(tester1, USDT.address, await IP2.balanceOf(tester1), {from: tester1}).catch(err => console.error(err.message));
  //     await PRECOGV5.withdraw(tester2, USDT.address, await IP2.balanceOf(tester2), {from: tester2}).catch(err => console.error(err.message));
  //     await PRECOGV5.withdraw(tester3, USDT.address, await IP2.balanceOf(tester3), {from: tester3}).catch(err => console.error(err.message));
  //     await PRECOGV5.withdraw(tester4, USDT.address, await IP2.balanceOf(tester4), {from: tester4}).catch(err => console.error(err.message));
  //   });
  // });

  // describe("8-4: 4 USERS TAKE PROFIT", async () => {
  //   it("Should increase PCOG balance of 4 users, take all profit from USDC pool", async () => {
  //     // former state
  //     let PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
  //     const formerPCOGBalanceOfTester1 = parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
  //     const formerPCOGBalanceOfTester2 = parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
  //     const formerPCOGBalanceOfTester3 = parseFloat(weiToETH(await PCOG.balanceOf(tester3)));
  //     const formerPCOGBalanceOfTester4 = parseFloat(weiToETH(await PCOG.balanceOf(tester4)));

  //     console.log("PCOGBalanceOfContract:", PCOGBalanceOfContract);
  //     console.log("formerPCOGBalanceOfTester1:", formerPCOGBalanceOfTester1);
  //     console.log("formerPCOGBalanceOfTester2:", formerPCOGBalanceOfTester2);
  //     console.log("formerPCOGBalanceOfTester3:", formerPCOGBalanceOfTester3);
  //     console.log("formerPCOGBalanceOfTester4:", formerPCOGBalanceOfTester4);

  //     await sleep(25000);
  //     await PRECOGV5.takeProfit(tester1, USDC.address, {from: tester1});
  //     await PRECOGV5.takeProfit(tester2, USDC.address, {from: tester2});
  //     await PRECOGV5.takeProfit(tester3, USDC.address, {from: tester3});
  //     await PRECOGV5.takeProfit(tester4, USDC.address, {from: tester4});
      

  //     // later state
  //     const laterPCOGBalanceOfTester1 =  parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
  //     const laterPCOGBalanceOfTester2 =  parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
  //     const laterPCOGBalanceOfTester3 =  parseFloat(weiToETH(await PCOG.balanceOf(tester3)));
  //     const laterPCOGBalanceOfTester4 =  parseFloat(weiToETH(await PCOG.balanceOf(tester4)));

  //     PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
  //     console.log("PCOGBalanceOfContract: ", PCOGBalanceOfContract);
  //     console.log("laterPCOGBalanceOfTester1:", laterPCOGBalanceOfTester1);
  //     console.log("laterPCOGBalanceOfTester2:", laterPCOGBalanceOfTester2);
  //     console.log("laterPCOGBalanceOfTester3:", laterPCOGBalanceOfTester3);
  //     console.log("laterPCOGBalanceOfTester4:", laterPCOGBalanceOfTester4);
  //   });

  //   it("Should increase PCOG balance of 4 users, take all profit from USDT pool", async () => {
  //     // former state
  //     let PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
  //     const formerPCOGBalanceOfTester1 = parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
  //     const formerPCOGBalanceOfTester2 = parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
  //     const formerPCOGBalanceOfTester3 = parseFloat(weiToETH(await PCOG.balanceOf(tester3)));
  //     const formerPCOGBalanceOfTester4 = parseFloat(weiToETH(await PCOG.balanceOf(tester4)));

  //     console.log("PCOGBalanceOfContract:", PCOGBalanceOfContract);
  //     console.log("formerPCOGBalanceOfTester1:", formerPCOGBalanceOfTester1);
  //     console.log("formerPCOGBalanceOfTester2:", formerPCOGBalanceOfTester2);
  //     console.log("formerPCOGBalanceOfTester3:", formerPCOGBalanceOfTester3);
  //     console.log("formerPCOGBalanceOfTester4:", formerPCOGBalanceOfTester4);
      
  //     await PRECOGV5.takeProfit(tester1, USDT.address, {from: tester1}).catch(err => console.error(err.message));
  //     await PRECOGV5.takeProfit(tester2, USDT.address, {from: tester2}).catch(err => console.error(err.message));
  //     await PRECOGV5.takeProfit(tester3, USDT.address, {from: tester3}).catch(err => console.error(err.message));
  //     await PRECOGV5.takeProfit(tester4, USDT.address, {from: tester4}).catch(err => console.error(err.message));
      
  //     // later state
  //     const laterPCOGBalanceOfTester1 =  parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
  //     const laterPCOGBalanceOfTester2 =  parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
  //     const laterPCOGBalanceOfTester3 =  parseFloat(weiToETH(await PCOG.balanceOf(tester3)));
  //     const laterPCOGBalanceOfTester4 =  parseFloat(weiToETH(await PCOG.balanceOf(tester4)));

      
      
  //     PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
  //     console.log("PCOGBalanceOfContract: ", PCOGBalanceOfContract);
  //     console.log("laterPCOGBalanceOfTester1:", laterPCOGBalanceOfTester1);
  //     console.log("laterPCOGBalanceOfTester2:", laterPCOGBalanceOfTester2);
  //     console.log("laterPCOGBalanceOfTester3:", laterPCOGBalanceOfTester3);
  //     console.log("laterPCOGBalanceOfTester4:", laterPCOGBalanceOfTester4);

      
  //   });

  //   it("PCOG in Precog must be out of amount", async() => {
  //     const PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
  //     console.log("PCOGBalanceOfContract: ", PCOGBalanceOfContract);
  //     expect(PCOGBalanceOfContract).to.lessThanOrEqual(1e-15, "Users don't take all profit from Precog");
  //   });

  // });

  // describe("8-5: MIDDLEWARE TAKES INVESTMENTS", async () => {
  //   it("Should take 90% tokens of USDC pool", async () => {
  //     await sleep(25000);
  //     await PRECOGV5.takeInvestment(USDC.address, { from: middleware })
  //     .catch(err => {
  //       console.log("EXPECTED ERROR");
  //       console.log(err.message);
  //     });
      

  //     const USDCPrecogBalanceStr = await IP1.balanceOf(
  //       USDC.address
  //     );

  //     const USDCLiquidityStr = await PRECOGV5.liquidity(USDC.address);

  //     // cast to number
  //     const USDCPrecogBalance = parseFloat(weiToMwei(USDCPrecogBalanceStr));
  //     const USDCLiquidity = parseFloat(weiToMwei(USDCLiquidityStr));

      
  //   });

  //   it("Should take 90% tokens of USDT pool", async () => {
  //     await PRECOGV5.takeInvestment(USDT.address, { from: middleware })
  //     .catch(err => {
  //       console.log("EXPECTED ERROR");
  //       console.log(err.message);
  //     });
  //     const USDTPrecogBalanceStr = await IP2.balanceOf(
  //       USDT.address
  //     );

  //     const USDTLiquidityStr = await PRECOGV5.liquidity(USDT.address);

  //     // cast to number
  //     const USDTPrecogBalance = parseFloat(weiToMwei(USDTPrecogBalanceStr));
  //     const USDTLiquidity = parseFloat(weiToMwei(USDTLiquidityStr));
      
      
  //   });
  // });

  // describe("8-6: 4 USERS DEPOSIT TO PRECOG", async () => { 
  //   it("Should get enough IP1 and lose USDC", async () => {

  //     const formerTester1USDCBalance = await USDC.balanceOf(tester1);
  //     const formerTester2USDCBalance = await USDC.balanceOf(tester2);
  //     const formerTester3USDCBalance = await USDC.balanceOf(tester3);
  //     const formerTester4USDCBalance = await USDC.balanceOf(tester4);

  //     const formerTester1IP1Balance = await IP1.balanceOf(tester1);
  //     const formerTester2IP1Balance = await IP1.balanceOf(tester2);
  //     const formerTester3IP1Balance = await IP1.balanceOf(tester3);
  //     const formerTester4IP1Balance = await IP1.balanceOf(tester4);

  //     // deposit
  //     await sleep(25000);
  //     await PRECOGV5.deposit(USDC.address, formerTester1USDCBalance, {from: tester1});
  //     await PRECOGV5.deposit(USDC.address, formerTester2USDCBalance, {from: tester2});
  //     await PRECOGV5.deposit(USDC.address, formerTester3USDCBalance, {from: tester3});
  //     await PRECOGV5.deposit(USDC.address, formerTester4USDCBalance, {from: tester4});


  //     const laterTester1USDCBalance = await USDC.balanceOf(tester1);
  //     const laterTester2USDCBalance = await USDC.balanceOf(tester2);
  //     const laterTester3USDCBalance = await USDC.balanceOf(tester3);
  //     const laterTester4USDCBalance = await USDC.balanceOf(tester4);

  //     const laterTester1IP1Balance = await IP1.balanceOf(tester1);
  //     const laterTester2IP1Balance = await IP1.balanceOf(tester2);
  //     const laterTester3IP1Balance = await IP1.balanceOf(tester3);
  //     const laterTester4IP1Balance = await IP1.balanceOf(tester4);
      
  //   });

  //   it("Should get enough IP2 and lose USDT", async () => {
  //     const formerTester1USDTBalance = await USDT.balanceOf(tester1);
  //     const formerTester2USDTBalance = await USDT.balanceOf(tester2);
  //     const formerTester3USDTBalance = await USDT.balanceOf(tester3);
  //     const formerTester4USDTBalance = await USDT.balanceOf(tester4);

  //     const formerTester1IP2Balance = await IP2.balanceOf(tester1);
  //     const formerTester2IP2Balance = await IP2.balanceOf(tester2);
  //     const formerTester3IP2Balance = await IP2.balanceOf(tester3);
  //     const formerTester4IP2Balance = await IP2.balanceOf(tester4);

  //     // deposit
      
  //     await PRECOGV5.deposit(USDT.address, formerTester1USDTBalance, {from: tester1}).catch(err => console.error(err.message));
  //     await PRECOGV5.deposit(USDT.address, formerTester2USDTBalance, {from: tester2}).catch(err => console.error(err.message));
  //     await PRECOGV5.deposit(USDT.address, formerTester3USDTBalance, {from: tester3}).catch(err => console.error(err.message));
  //     await PRECOGV5.deposit(USDT.address, formerTester4USDTBalance, {from: tester4}).catch(err => console.error(err.message));


  //     const laterTester1USDTBalance = await USDT.balanceOf(tester1);
  //     const laterTester2USDTBalance = await USDT.balanceOf(tester2);
  //     const laterTester3USDTBalance = await USDT.balanceOf(tester3);
  //     const laterTester4USDTBalance = await USDT.balanceOf(tester4);

  //     const laterTester1IP2Balance = await IP2.balanceOf(tester1);
  //     const laterTester2IP2Balance = await IP2.balanceOf(tester2);
  //     const laterTester3IP2Balance = await IP2.balanceOf(tester3);
  //     const laterTester4IP2Balance = await IP2.balanceOf(tester4);
    
  //   });

  //   it("Should charge user investment fee", async () => {
  //     const USDCDepositFee = await USDC.balanceOf(PRECOG_CORE.address);
  //     const USDTDepositFee = await USDT.balanceOf(PRECOG_CORE.address);

  //     // assert.equal(parseFloat(weiToMwei(USDCDepositFee)), 4, "USDC deposit fee was not charged");
  //     // assert.equal(parseFloat(weiToETH(USDTDepositFee)), 2, "USDT deposit fee was not charged");
  //   });
  // });

  // describe("8-7: MIDDLEWARE SENDS PROFITS", async () => {
  //   it("Should have PCOG as profit in USDC pool", async () => {
  //     const formerProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDC.address
  //     );
  //     const formerProfitOfCurrentCycleStr = await PRECOGV5.profit(
  //       USDC.address,
  //       formerProfitCycleID
  //     );
  //     const formerPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);
  //     await sleep(25000);
  //     await PRECOGV5.sendProfit(USDC.address, mweiToWei("10000"), {from: middleware});

  //     const laterProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDC.address
  //     );
  //     const laterProfitOfPreviousCycleStr = await PRECOGV5.profit(
  //       USDC.address,
  //       formerProfitCycleID
  //     );
  //     const laterPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);

  //     const formerProfit = parseFloat(weiToETH(formerProfitOfCurrentCycleStr));
  //     const laterProfit = parseFloat(weiToETH(laterProfitOfPreviousCycleStr));
  //     const formerPCOGBalance = parseFloat(weiToETH(formerPCOGPrecogBalance));
  //     const laterPCOGBalance = parseFloat(weiToETH(laterPCOGPrecogBalance));

  //     assert.equal(
  //       parseInt(formerProfitCycleID),
  //       parseInt(laterProfitCycleID) - 1,
  //       "New profit cycle was not created"
  //     );
  //     expect(laterProfit).to.greaterThan(
  //       formerProfit,
  //       "profit was not updated"
  //     );
  //     expect(laterPCOGBalance).to.greaterThan(
  //       formerPCOGBalance,
  //       "PCOG was not bought"
  //     );
  //   });

  //   it("Should have PCOG as profit in USDT pool", async () => {
  //     const formerProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDT.address
  //     );
  //     const formerProfitOfCurrentCycleStr = await PRECOGV5.profit(
  //       USDT.address,
  //       formerProfitCycleID
  //     );
  //     const formerPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);

  //     await PRECOGV5.sendProfit(USDT.address, ETHToWei("10000"),{from: middleware});

  //     const laterProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDT.address
  //     );
  //     const laterProfitOfPreviousCycleStr = await PRECOGV5.profit(
  //       USDT.address,
  //       formerProfitCycleID
  //     );
  //     const laterPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);

  //     const formerProfit = parseFloat(weiToETH(formerProfitOfCurrentCycleStr));
  //     const laterProfit = parseFloat(weiToETH(laterProfitOfPreviousCycleStr));
  //     const formerPCOGBalance = parseFloat(weiToETH(formerPCOGPrecogBalance));
  //     const laterPCOGBalance = parseFloat(weiToETH(laterPCOGPrecogBalance));

  //     assert.equal(
  //       parseInt(formerProfitCycleID),
  //       parseInt(laterProfitCycleID) - 1,
  //       "New profit cycle was not created"
  //     );
  //     expect(laterProfit).to.greaterThan(
  //       formerProfit,
  //       "profit was not updated"
  //     );
  //     expect(laterPCOGBalance).to.greaterThan(
  //       formerPCOGBalance,
  //       "PCOG was not bought"
  //     );
      
  //   });
  // });

  // describe("9-1: MIDDLEWARE TAKES INVESTMENTS", async () => {
  //   it("Should take 90% tokens of USDC pool", async () => {
  //     await sleep(25000);
  //     await PRECOGV5.takeInvestment(USDC.address, { from: middleware });
  //     await PRECOGV5.takeInvestment(USDT.address, { from: middleware });

  //     const USDCPrecogBalanceStr = await IP1.balanceOf(
  //       USDC.address
  //     );

  //     const USDCLiquidityStr = await PRECOGV5.liquidity(USDC.address);

  //     // cast to number
  //     const USDCPrecogBalance = parseFloat(weiToMwei(USDCPrecogBalanceStr));
  //     const USDCLiquidity = parseFloat(weiToMwei(USDCLiquidityStr));

      
  //   });

  //   it("Should take 90% tokens of USDT pool", async () => {
  //     const USDTPrecogBalanceStr = await IP2.balanceOf(
  //       USDT.address
  //     );

  //     const USDTLiquidityStr = await PRECOGV5.liquidity(USDT.address);

  //     // cast to number
  //     const USDTPrecogBalance = parseFloat(weiToMwei(USDTPrecogBalanceStr));
  //     const USDTLiquidity = parseFloat(weiToMwei(USDTLiquidityStr));
      
      
  //   });
  // });
  
  // describe("9-2: MIDDLEWARE SENDS PROFITS", async () => {
  //   it("Should have PCOG as profit in USDC pool", async () => {
  //     const formerProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDC.address
  //     );
  //     const formerProfitOfCurrentCycleStr = await PRECOGV5.profit(
  //       USDC.address,
  //       formerProfitCycleID
  //     );
  //     const formerPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);
  //     await sleep(25000);
  //     await PRECOGV5.sendProfit(USDC.address, mweiToWei("10000"), {from: middleware});

  //     const laterProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDC.address
  //     );
  //     const laterProfitOfPreviousCycleStr = await PRECOGV5.profit(
  //       USDC.address,
  //       formerProfitCycleID
  //     );
  //     const laterPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);

  //     const formerProfit = parseFloat(weiToETH(formerProfitOfCurrentCycleStr));
  //     const laterProfit = parseFloat(weiToETH(laterProfitOfPreviousCycleStr));
  //     const formerPCOGBalance = parseFloat(weiToETH(formerPCOGPrecogBalance));
  //     const laterPCOGBalance = parseFloat(weiToETH(laterPCOGPrecogBalance));

  //     assert.equal(
  //       parseInt(formerProfitCycleID),
  //       parseInt(laterProfitCycleID) - 1,
  //       "New profit cycle was not created"
  //     );
  //     expect(laterProfit).to.greaterThan(
  //       formerProfit,
  //       "profit was not updated"
  //     );
  //     expect(laterPCOGBalance).to.greaterThan(
  //       formerPCOGBalance,
  //       "PCOG was not bought"
  //     );
  //   });

  //   it("Should have PCOG as profit in USDT pool", async () => {
  //     const formerProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDT.address
  //     );
  //     const formerProfitOfCurrentCycleStr = await PRECOGV5.profit(
  //       USDT.address,
  //       formerProfitCycleID
  //     );
  //     const formerPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);

  //     await PRECOGV5.sendProfit(USDT.address, ETHToWei("10000"),{from: middleware});

  //     const laterProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDT.address
  //     );
  //     const laterProfitOfPreviousCycleStr = await PRECOGV5.profit(
  //       USDT.address,
  //       formerProfitCycleID
  //     );
  //     const laterPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);

  //     const formerProfit = parseFloat(weiToETH(formerProfitOfCurrentCycleStr));
  //     const laterProfit = parseFloat(weiToETH(laterProfitOfPreviousCycleStr));
  //     const formerPCOGBalance = parseFloat(weiToETH(formerPCOGPrecogBalance));
  //     const laterPCOGBalance = parseFloat(weiToETH(laterPCOGPrecogBalance));

  //     assert.equal(
  //       parseInt(formerProfitCycleID),
  //       parseInt(laterProfitCycleID) - 1,
  //       "New profit cycle was not created"
  //     );
  //     expect(laterProfit).to.greaterThan(
  //       formerProfit,
  //       "profit was not updated"
  //     );
  //     expect(laterPCOGBalance).to.greaterThan(
  //       formerPCOGBalance,
  //       "PCOG was not bought"
  //     );
      
  //   });
  // });

  // describe("10-1: MIDDLEWARE TAKES INVESTMENTS", async () => {
  //   it("Should take 90% tokens of USDC pool", async () => {
  //     await sleep(25000);
  //     await PRECOGV5.takeInvestment(USDC.address, { from: middleware });
  //     await PRECOGV5.takeInvestment(USDT.address, { from: middleware });

  //     const USDCPrecogBalanceStr = await IP1.balanceOf(
  //       USDC.address
  //     );

  //     const USDCLiquidityStr = await PRECOGV5.liquidity(USDC.address);

  //     // cast to number
  //     const USDCPrecogBalance = parseFloat(weiToMwei(USDCPrecogBalanceStr));
  //     const USDCLiquidity = parseFloat(weiToMwei(USDCLiquidityStr));

      
  //   });

  //   it("Should take 90% tokens of USDT pool", async () => {
  //     const USDTPrecogBalanceStr = await IP2.balanceOf(
  //       USDT.address
  //     );

  //     const USDTLiquidityStr = await PRECOGV5.liquidity(USDT.address);

  //     // cast to number
  //     const USDTPrecogBalance = parseFloat(weiToMwei(USDTPrecogBalanceStr));
  //     const USDTLiquidity = parseFloat(weiToMwei(USDTLiquidityStr));
      
      
  //   });
  // });
  
  // describe("10-2: MIDDLEWARE SENDS PROFITS", async () => {
  //   it("Should have PCOG as profit in USDC pool", async () => {
  //     const formerProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDC.address
  //     );
  //     const formerProfitOfCurrentCycleStr = await PRECOGV5.profit(
  //       USDC.address,
  //       formerProfitCycleID
  //     );
  //     const formerPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);
  //     await sleep(25000);
  //     await PRECOGV5.sendProfit(USDC.address, mweiToWei("10000"), {from: middleware});

  //     const laterProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDC.address
  //     );
  //     const laterProfitOfPreviousCycleStr = await PRECOGV5.profit(
  //       USDC.address,
  //       formerProfitCycleID
  //     );
  //     const laterPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);

  //     const formerProfit = parseFloat(weiToETH(formerProfitOfCurrentCycleStr));
  //     const laterProfit = parseFloat(weiToETH(laterProfitOfPreviousCycleStr));
  //     const formerPCOGBalance = parseFloat(weiToETH(formerPCOGPrecogBalance));
  //     const laterPCOGBalance = parseFloat(weiToETH(laterPCOGPrecogBalance));

  //     assert.equal(
  //       parseInt(formerProfitCycleID),
  //       parseInt(laterProfitCycleID) - 1,
  //       "New profit cycle was not created"
  //     );
  //     expect(laterProfit).to.greaterThan(
  //       formerProfit,
  //       "profit was not updated"
  //     );
  //     expect(laterPCOGBalance).to.greaterThan(
  //       formerPCOGBalance,
  //       "PCOG was not bought"
  //     );
  //   });

  //   it("Should have PCOG as profit in USDT pool", async () => {
  //     const formerProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDT.address
  //     );
  //     const formerProfitOfCurrentCycleStr = await PRECOGV5.profit(
  //       USDT.address,
  //       formerProfitCycleID
  //     );
  //     const formerPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);

  //     await PRECOGV5.sendProfit(USDT.address, ETHToWei("10000"),{from: middleware});

  //     const laterProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDT.address
  //     );
  //     const laterProfitOfPreviousCycleStr = await PRECOGV5.profit(
  //       USDT.address,
  //       formerProfitCycleID
  //     );
  //     const laterPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);

  //     const formerProfit = parseFloat(weiToETH(formerProfitOfCurrentCycleStr));
  //     const laterProfit = parseFloat(weiToETH(laterProfitOfPreviousCycleStr));
  //     const formerPCOGBalance = parseFloat(weiToETH(formerPCOGPrecogBalance));
  //     const laterPCOGBalance = parseFloat(weiToETH(laterPCOGPrecogBalance));

  //     assert.equal(
  //       parseInt(formerProfitCycleID),
  //       parseInt(laterProfitCycleID) - 1,
  //       "New profit cycle was not created"
  //     );
  //     expect(laterProfit).to.greaterThan(
  //       formerProfit,
  //       "profit was not updated"
  //     );
  //     expect(laterPCOGBalance).to.greaterThan(
  //       formerPCOGBalance,
  //       "PCOG was not bought"
  //     );
      
  //   });
  // });

  // describe("11-1. USER2, USER3 REQUEST WITHDRAWAL", async () => {
  //   it("Should have enough IP1 to request withdrawal from USDC pool", async() => {
  //     const formerIP1OfTester2 = (await IP1.balanceOf(tester2)).toString();
  //     const formerIP1OfTester3 = (await IP1.balanceOf(tester2)).toString();

  //     console.log("formerIP1OfTester2:", formerIP1OfTester2);
  //     console.log("formerIP1OfTester3:", formerIP1OfTester3);

      
  //     await PRECOGV5.requestWithdrawal(USDC.address, formerIP1OfTester2, {from: tester2});
  //     await PRECOGV5.requestWithdrawal(USDC.address, formerIP1OfTester3, {from: tester3});
      

  //     console.log("requestWithdrawalOfTester2 USDC:", requestWithdrawalOfTester2);
  //     console.log("requestWithdrawalOfTester3 USDC:", requestWithdrawalOfTester3);
  //   });

  //   it("Should have enough IP2 to request withdrawal from USDT pool", async() => {
      
  //     const formerIP2OfTester2 = (await IP2.balanceOf(tester2)).toString();
  //     const formerIP2OfTester3 = (await IP2.balanceOf(tester2)).toString();
      
  //     console.log("formerIP1OfTester2:", formerIP2OfTester2);
  //     console.log("formerIP1OfTester3:", formerIP2OfTester3);
      
  //     await PRECOGV5.requestWithdrawal(USDT.address, formerIP2OfTester2, {from: tester2}).catch(err => console.error(err.message));
  //     await PRECOGV5.requestWithdrawal(USDT.address, formerIP2OfTester3, {from: tester3}).catch(err => console.error(err.message));
  //     await sleep(30000);
      
  //   });

  //   it("2 users could not withdraw token before middleware send reqquest withdrawal amount to Precog", async() => {
  //     let isFailed = false;

  //     await PRECOGV5.withdraw(tester2, USDC.address, await IP1.balanceOf(tester2), {from: tester2})
  //     .catch(err => {
  //       console.log(err.message);
  //       isFailed = true;
  //     })

  //     await PRECOGV5.withdraw(tester2, USDT.address, await IP2.balanceOf(tester2), {from: tester2})
  //     .catch(err => {
  //       console.log(err.message);
  //       isFailed = true;
  //     })

  //     await PRECOGV5.withdraw(tester3, USDC.address, await IP1.balanceOf(tester3), {from: tester3})
  //     .catch(err => {
  //       console.log(err.message);
  //       isFailed = true;
  //     })

  //     await PRECOGV5.withdraw(tester3, USDT.address, await IP1.balanceOf(tester3), {from: tester3})
  //     .catch(err => {
  //       console.log(err.message);
  //       isFailed = true;
  //     })

  //     assert.equal(isFailed, true, "User could not withdraw USDC or USDT if middleware send request withdrawal to Precog");
  //   });
  // });

  // describe("11-3. USER2 WITHDRAWS", async () => {
  //   it("Should have enough IP1 to withdraw", async() => {
  //     await sleep(25000);
  //     await PRECOGV5.withdraw(tester2, USDC.address, await IP1.balanceOf(tester2), {from: tester2});
  //   });
  //   it("Should have enough IP2 to withdraw", async() => {
  //     await PRECOGV5.withdraw(tester2, USDT.address, await IP2.balanceOf(tester2), {from: tester2}).catch(err => console.error(err.message));
  //   });
  // });

  // describe("11-4: USER2 DEPOSITS TO PRECOG", async () => { 
  //   it("Should get enough IP1 and lose USDC", async () => {

      
  //     const formerTester2USDCBalance = await USDC.balanceOf(tester2);
    
  //     const formerTester2IP1Balance = await IP1.balanceOf(tester2);

  //     // deposit
  //     await sleep(25000);
  //     await PRECOGV5.deposit(USDC.address, formerTester2USDCBalance, {from: tester2});
      
      
  //     const laterTester2USDCBalance = await USDC.balanceOf(tester2);
      
  //   });

  //   it("Should get enough IP2 and lose USDT", async () => {
      
  //     const formerTester2USDTBalance = await USDT.balanceOf(tester2);
  //     const formerTester2IP2Balance = await IP2.balanceOf(tester2);
      
  //     // deposit
      
  //     await PRECOGV5.deposit(USDT.address, formerTester2USDTBalance, {from: tester2}).catch(err => console.error(err.message));
      
  //     const laterTester2USDTBalance = await USDT.balanceOf(tester2);
  //     const laterTester2IP2Balance = await IP2.balanceOf(tester2);
  //   });

  //   it("Should charge user investment fee", async () => {
  //     const USDCDepositFee = await USDC.balanceOf(PRECOG_CORE.address);
  //     const USDTDepositFee = await USDT.balanceOf(PRECOG_CORE.address);

  //     // assert.equal(parseFloat(weiToMwei(USDCDepositFee)), 4, "USDC deposit fee was not charged");
  //     // assert.equal(parseFloat(weiToETH(USDTDepositFee)), 2, "USDT deposit fee was not charged");
  //   });
  // });

  // describe("11-5: MIDDLEWARE TAKES INVESTMENTS", async () => {
  //   it("Should take 90% tokens of USDC pool", async () => {
  //     await sleep(25000);
  //     await PRECOGV5.takeInvestment(USDC.address, { from: middleware });
  //     await PRECOGV5.takeInvestment(USDT.address, { from: middleware });

  //     const USDCPrecogBalanceStr = await IP1.balanceOf(
  //       USDC.address
  //     );

  //     const USDCLiquidityStr = await PRECOGV5.liquidity(USDC.address);

  //     // cast to number
  //     const USDCPrecogBalance = parseFloat(weiToMwei(USDCPrecogBalanceStr));
  //     const USDCLiquidity = parseFloat(weiToMwei(USDCLiquidityStr));

      
  //   });

  //   it("Should take 90% tokens of USDT pool", async () => {
  //     const USDTPrecogBalanceStr = await PRECOGV5.getActualBalance(
  //       USDT.address
  //     );

  //     const USDTLiquidityStr = await PRECOGV5.liquidity(USDT.address);

  //     // cast to number
  //     const USDTPrecogBalance = parseFloat(weiToMwei(USDTPrecogBalanceStr));
  //     const USDTLiquidity = parseFloat(weiToMwei(USDTLiquidityStr));
      
      
  //   });
  // });

  // describe("11-6. USER3 WITHDRAWS", async () => {
  //   it("Should have enough IP1 to withdraw", async() => {
  //     await sleep(25000);
  //     await PRECOGV5.withdraw(tester3, USDC.address, await IP1.balanceOf(tester3), {from: tester3});
  //   });
  //   it("Should have enough IP2 to withdraw", async() => {
  //     await PRECOGV5.withdraw(tester3, USDT.address, await IP2.balanceOf(tester3), {from: tester3}).catch(err => console.error(err.message));
  //   });
  // });

  // describe("11-7: USER2, 3 TAKE PROFIT", async () => {
  //   it("Should increase PCOG balance of 4 users, take all profit from USDC pool", async () => {
  //     // former state
  //     let PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
      
  //     const formerPCOGBalanceOfTester2 = parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
  //     const formerPCOGBalanceOfTester3 = parseFloat(weiToETH(await PCOG.balanceOf(tester3)));

  //     console.log("PCOGBalanceOfContract:", PCOGBalanceOfContract);
  //     console.log("formerPCOGBalanceOfTester2:", formerPCOGBalanceOfTester2);
  //     console.log("formerPCOGBalanceOfTester3:", formerPCOGBalanceOfTester3);
  //     await sleep(25000);
  //     await PRECOGV5.takeProfit(tester2, USDC.address, {from: tester2});
  //     await PRECOGV5.takeProfit(tester3, USDC.address, {from: tester3});

  //     // later state
  //     const laterPCOGBalanceOfTester2 =  parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
  //     const laterPCOGBalanceOfTester3 =  parseFloat(weiToETH(await PCOG.balanceOf(tester3)));

  //     PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
  //     console.log("PCOGBalanceOfContract: ", PCOGBalanceOfContract);
  //     console.log("laterPCOGBalanceOfTester2:", laterPCOGBalanceOfTester2);
  //     console.log("laterPCOGBalanceOfTester3:", laterPCOGBalanceOfTester3);
  //   });

  //   it("Should increase PCOG balance of 4 users, take all profit from USDT pool", async () => {
  //     // former state
  //     let PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
  //     const formerPCOGBalanceOfTester2 = parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
  //     const formerPCOGBalanceOfTester3 = parseFloat(weiToETH(await PCOG.balanceOf(tester3)));

  //     console.log("PCOGBalanceOfContract:", PCOGBalanceOfContract);
  //     console.log("formerPCOGBalanceOfTester2:", formerPCOGBalanceOfTester2);
  //     console.log("formerPCOGBalanceOfTester3:", formerPCOGBalanceOfTester3);
      
  //     await PRECOGV5.takeProfit(tester2, USDT.address, {from: tester2}).catch(err => console.error(err.message));
  //     await PRECOGV5.takeProfit(tester3, USDT.address, {from: tester3}).catch(err => console.error(err.message));
      
  //     // later state
      
  //     const laterPCOGBalanceOfTester2 =  parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
  //     const laterPCOGBalanceOfTester3 =  parseFloat(weiToETH(await PCOG.balanceOf(tester3)));

  //     PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
  //     console.log("PCOGBalanceOfContract: ", PCOGBalanceOfContract);
  //     console.log("laterPCOGBalanceOfTester2:", laterPCOGBalanceOfTester2);
  //     console.log("laterPCOGBalanceOfTester3:", laterPCOGBalanceOfTester3);
  //   });

    

  // });
  
  // describe("11-8: USER2 DEPOSITS TO PRECOG", async () => { 
  //   it("Should get enough IP1 and lose USDC", async () => {
  //     const formerTester3USDCBalance = await USDC.balanceOf(tester3);
  //     const formerTester3IP1Balance = await IP1.balanceOf(tester3);

  //     // deposit
  //     await sleep(25000);
  //     await PRECOGV5.deposit(USDC.address, formerTester3USDCBalance, {from: tester3});
      
      
  //     const laterTester2USDCBalance = await USDC.balanceOf(tester3);
      
  //   });

  //   it("Should get enough IP2 and lose USDT", async () => {
      
  //     const formerTester3USDTBalance = await USDT.balanceOf(tester3);
  //     const formerTester3IP2Balance = await IP2.balanceOf(tester3);
      
  //     // deposit
      
  //     await PRECOGV5.deposit(USDT.address, formerTester3USDTBalance, {from: tester3}).catch(err => console.error(err.message));
      
  //     const laterTester3USDTBalance = await USDT.balanceOf(tester3);
  //     const laterTester3IP2Balance = await IP2.balanceOf(tester3);
  //   });

  //   it("Should charge user investment fee", async () => {
  //     const USDCDepositFee = await USDC.balanceOf(PRECOG_CORE.address);
  //     const USDTDepositFee = await USDT.balanceOf(PRECOG_CORE.address);

  //     // assert.equal(parseFloat(weiToMwei(USDCDepositFee)), 4, "USDC deposit fee was not charged");
  //     // assert.equal(parseFloat(weiToETH(USDTDepositFee)), 2, "USDT deposit fee was not charged");
  //   });
  // });

  // describe("11-9: MIDDLEWARE SENDS PROFITS", async () => {
  //   it("Should have PCOG as profit in USDC pool", async () => {
  //     const formerProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDC.address
  //     );
  //     const formerProfitOfCurrentCycleStr = await PRECOGV5.profit(
  //       USDC.address,
  //       formerProfitCycleID
  //     );
  //     const formerPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);
      
  //     await sleep(25000);
  //     await PRECOGV5.sendProfit(USDC.address, mweiToWei("10000"), {from: middleware});

  //     const laterProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDC.address
  //     );
  //     const laterProfitOfPreviousCycleStr = await PRECOGV5.profit(
  //       USDC.address,
  //       formerProfitCycleID
  //     );
  //     const laterPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);

  //     const formerProfit = parseFloat(weiToETH(formerProfitOfCurrentCycleStr));
  //     const laterProfit = parseFloat(weiToETH(laterProfitOfPreviousCycleStr));
  //     const formerPCOGBalance = parseFloat(weiToETH(formerPCOGPrecogBalance));
  //     const laterPCOGBalance = parseFloat(weiToETH(laterPCOGPrecogBalance));

  //     assert.equal(
  //       parseInt(formerProfitCycleID),
  //       parseInt(laterProfitCycleID) - 1,
  //       "New profit cycle was not created"
  //     );
  //     expect(laterProfit).to.greaterThan(
  //       formerProfit,
  //       "profit was not updated"
  //     );
  //     expect(laterPCOGBalance).to.greaterThan(
  //       formerPCOGBalance,
  //       "PCOG was not bought"
  //     );
  //   });

  //   it("Should have PCOG as profit in USDT pool", async () => {
  //     const formerProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDT.address
  //     );
  //     const formerProfitOfCurrentCycleStr = await PRECOGV5.profit(
  //       USDT.address,
  //       formerProfitCycleID
  //     );
  //     const formerPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);

  //     await PRECOGV5.sendProfit(USDT.address, ETHToWei("10000"),{from: middleware});

  //     const laterProfitCycleID = await PRECOGV5.currentProfitCycleId(
  //       USDT.address
  //     );
  //     const laterProfitOfPreviousCycleStr = await PRECOGV5.profit(
  //       USDT.address,
  //       formerProfitCycleID
  //     );
  //     const laterPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);

  //     const formerProfit = parseFloat(weiToETH(formerProfitOfCurrentCycleStr));
  //     const laterProfit = parseFloat(weiToETH(laterProfitOfPreviousCycleStr));
  //     const formerPCOGBalance = parseFloat(weiToETH(formerPCOGPrecogBalance));
  //     const laterPCOGBalance = parseFloat(weiToETH(laterPCOGPrecogBalance));

  //     assert.equal(
  //       parseInt(formerProfitCycleID),
  //       parseInt(laterProfitCycleID) - 1,
  //       "New profit cycle was not created"
  //     );
  //     expect(laterProfit).to.greaterThan(
  //       formerProfit,
  //       "profit was not updated"
  //     );
  //     expect(laterPCOGBalance).to.greaterThan(
  //       formerPCOGBalance,
  //       "PCOG was not bought"
  //     );
      
  //   });
  // });
});