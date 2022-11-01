const { assert, expect } = require("chai");

const ERC20 = artifacts.require("ERC20");
const _PCOG = artifacts.require("PCOG")
const IPToken = artifacts.require("IPCOG");
const PrecogCore = artifacts.require("PrecogCore");
const MiddlewareExchange = artifacts.require("MiddlewareExchange");
const IPCOGFactory = artifacts.require("IPCOGFactory")
const Precog = artifacts.require("PrecogV5");

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
  let USDC, USDT, IP1, IP2, PCOG, FACTORY, PRECOG_CORE, MIDDLEWARE_EXCHANGE, PRECOGV5, ROUTER;
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

    await PCOG.initialize();

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
      USDC.mint(tester1, mweiToWei("10000")),
      USDC.mint(tester2, mweiToWei("10000")),
      USDC.mint(tester3, mweiToWei("10000")),
      USDC.mint(tester4, mweiToWei("10000")),
      USDC.mint(middleware, mweiToWei("100000000000")),

      USDT.mint(tester1, ETHToWei("10000")),
      USDT.mint(tester2, ETHToWei("10000")),
      USDT.mint(tester3, ETHToWei("10000")),
      USDT.mint(tester4, ETHToWei("10000")),
      USDT.mint(middleware, ETHToWei("1000000000000")),

      USDC.mint(deployer, mweiToWei("100000000")),
      USDT.mint(deployer, ETHToWei("300000000")),
      //PCOG.mint(deployer, ETHToWei("500000000")),
      PCOG.transfer(MIDDLEWARE_EXCHANGE.address, ETHToWei("500000000")),
    ]);


    // create uniswapv2 liquidity pool

    await Promise.all([
      ROUTER.addLiquidity(
        USDC.address,
        PCOG.address,
        mweiToWei("1000"),
        ETHToWei("1000000"),
        mweiToWei("1000"),
        ETHToWei("1000000"),
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
    await Promise.all([
      PRECOG_CORE.setCycleConfiguration(["60", "60", "60", "60", "60"]),
    ])

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

  describe("USER1 DEPOSITS 1000USDC", async () => {
    it("Should lose USDC and receive IP1 and charge fee exactly", async () => {
        const formerTester1USDCBalance = await USDC.balanceOf(tester1);
        const formerTester1IP1Balance = await IP1.balanceOf(tester1);
        const formerFeeInPrecogCore = await USDC.balanceOf(PRECOG_CORE.address);

        console.log("formerTester1USDCBalance:", formerTester1USDCBalance.toString());
        console.log("formerTester1IP1Balance:", formerTester1IP1Balance.toString());

        const amountDeposit1 = mweiToWei("1000");

        const res = await PRECOGV5.deposit(USDC.address, amountDeposit1, { from: tester1 }).catch(err => console.error("REAL:", err.message));

        const laterTester1USDCBalance = await USDC.balanceOf(tester1);
        const laterTester1IP1Balance = await IP1.balanceOf(tester1);
        const laterFeeInPrecogCore = await USDC.balanceOf(PRECOG_CORE.address);


        console.log("laterTester1USDCBalance:", laterTester1USDCBalance.toString());
        console.log("laterTester1IP1Balance:", laterTester1IP1Balance.toString());

        console.log(res)
        
        assert.equal(
            laterTester1IP1Balance.toString(), 
            (Number(amountDeposit1) - Number(amountDeposit1 / 1000)).toString(),
            "Charge wrong fee"
        );

        assert.equal(
            (Number(amountDeposit1 / 1000)).toString(), 
            (Number(laterFeeInPrecogCore) - Number(formerFeeInPrecogCore)).toString(), 
            "Precog did not receive deposit fee"
        );

    });
  });

  describe("MIDDLEWARE SENDS PROFITS 1000USDC", async () => {
    it("Should have PCOG as profit in USDC pool", async () => {
        const amountProfit = mweiToWei("1000");
    
        const formerProfitCycleID = await PRECOGV5.currentProfitCycleId(USDC.address);
        const formerProfitOfCurrentCycleStr = await PRECOGV5.profit(USDC.address, formerProfitCycleID);
        const formerPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);
        const formerFeeInPrecogCore = await USDC.balanceOf(PRECOG_CORE.address);
        
        await sleep(65000);
        await PRECOGV5.sendProfit({token: USDC.address, amount: amountProfit}, deadline(), {from: middleware});

        
        const laterProfitCycleID = await PRECOGV5.currentProfitCycleId(USDC.address);
        const laterProfitOfPreviousCycleStr = await PRECOGV5.profit(USDC.address, formerProfitCycleID);
        const laterPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);
        const laterFeeInPrecogCore = await USDC.balanceOf(PRECOG_CORE.address);

        const formerProfit = parseFloat(weiToETH(formerProfitOfCurrentCycleStr));
        const laterProfit = parseFloat(weiToETH(laterProfitOfPreviousCycleStr));
        const formerPCOGBalance = parseFloat(weiToETH(formerPCOGPrecogBalance));
        const laterPCOGBalance = parseFloat(weiToETH(laterPCOGPrecogBalance));

        assert.equal(parseInt(formerProfitCycleID), parseInt(laterProfitCycleID) - 1, "New profit cycle was not created");
        assert.equal(
            (Number(amountProfit / 1000)).toString(), 
            (Number(laterFeeInPrecogCore) - Number(formerFeeInPrecogCore)).toString(),
            "Precog did not receive trading fee" 
        );
        expect(laterProfit).to.greaterThan(formerProfit, "profit was not updated");
        expect(laterPCOGBalance).to.greaterThan(formerPCOGBalance, "PCOG was not bought");
    });
  });


  describe("USER2 DEPOSITS 500USDC", async () => {
    it("Should lose USDC and receive IP1 and charge fee exactly", async () => {
        const formerTester2USDCBalance = await USDC.balanceOf(tester2);
        const formerTester2IP1Balance = await IP1.balanceOf(tester2);
        const formerFeeInPrecogCore = await USDC.balanceOf(PRECOG_CORE.address);

        console.log("formerTester2USDCBalance:", formerTester2USDCBalance.toString());
        console.log("formerTester2IP1Balance:", formerTester2IP1Balance.toString());

        const amountDeposit2 = mweiToWei("500");

        await sleep(65000);
        await PRECOGV5.deposit(USDC.address, amountDeposit2, { from: tester2 }).catch(err => console.error("REAL:", err.message));

        const laterTester2USDCBalance = await USDC.balanceOf(tester2);
        const laterTester2IP1Balance = await IP1.balanceOf(tester2);
        const laterFeeInPrecogCore = await USDC.balanceOf(PRECOG_CORE.address);


        console.log("laterTester2USDCBalance:", laterTester2USDCBalance.toString());
        console.log("laterTester2IP1Balance:", laterTester2IP1Balance.toString());

        
        assert.equal(
            laterTester2IP1Balance.toString(), 
            (Number(amountDeposit2) - Number(amountDeposit2 / 1000)).toString(),
            "Charge wrong fee"
        );

        assert.equal(
            (Number(amountDeposit2 / 1000)).toString(),
            (Number(laterFeeInPrecogCore) - Number(formerFeeInPrecogCore)).toString(),  
            "Precog did not receive deposit fee"
        );
    });
  });

  describe("MIDDLEWARE TAKES INVESTMENT", async () => {
    it("Should take 90% tokens of USDC pool", async() => {
        await sleep(65000);
      
      await PRECOGV5.takeInvestment(USDC.address, { from: middleware });
      const USDCPrecogBalanceStr = await PRECOGV5.getActualBalance(USDC.address);
      const USDCLiquidityStr = await PRECOGV5.liquidity(USDC.address);

      // cast to number
      const USDCPrecogBalance = parseFloat(weiToMwei(USDCPrecogBalanceStr));
      const USDCLiquidity = parseFloat(weiToMwei(USDCLiquidityStr));

      assert.equal(0.1 * USDCLiquidity, USDCPrecogBalance, "Middleware does not take 90% tokens from USDC pool");
    });
  });

  describe("USER1 TAKES PROFIT", async () => {
    it("Should increase PCOG balance of tester1, take all profit from USDC pool", async () => {
      // former state
      
      let PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
      const formerPCOGBalanceOfTester1 = parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
      

      console.log("PCOGBalanceOfContract:", PCOGBalanceOfContract.toString());
      console.log("formerPCOGBalanceOfTester1:", formerPCOGBalanceOfTester1.toString());
      await sleep(65000);
        await PRECOGV5.takeProfit(tester1, USDC.address, {from: tester1}).catch(err => console.error("REAL",err.message));
        
      // later state
      const laterPCOGBalanceOfTester1 =  parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
      PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));

      console.log("PCOGBalanceOfContract: ", PCOGBalanceOfContract.toString());
      console.log("laterPCOGBalanceOfTester1:", laterPCOGBalanceOfTester1.toString());
    });
  });

  describe("MIDDLEWARE TAKES INVESTMENT", async () => {
    it("Should take 90% tokens of USDC pool", async() => {
        await sleep(65000);
      await PRECOGV5.takeInvestment(USDC.address, { from: middleware });
      const USDCPrecogBalanceStr = await PRECOGV5.getActualBalance(USDC.address);
      const USDCLiquidityStr = await PRECOGV5.liquidity(USDC.address);

      // cast to number
      const USDCPrecogBalance = parseFloat(weiToMwei(USDCPrecogBalanceStr));
      const USDCLiquidity = parseFloat(weiToMwei(USDCLiquidityStr));

      assert.equal(0.1 * USDCLiquidity, USDCPrecogBalance, "Middleware does not take 90% tokens from USDC pool");
    });
  });

  describe("MIDDLEWARE SENDS PROFITS 100USDC", async () => {
    it("Should have PCOG as profit in USDC pool", async () => {
        const amountProfit = mweiToWei("100");
    
        const formerProfitCycleID = await PRECOGV5.currentProfitCycleId(USDC.address);
        const formerProfitOfCurrentCycleStr = await PRECOGV5.profit(USDC.address, formerProfitCycleID);
        const formerPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);
        const formerFeeInPrecogCore = await USDC.balanceOf(PRECOG_CORE.address);
        await sleep(65000);
        await PRECOGV5.sendProfit({token: USDC.address, amount: amountProfit}, deadline(), {from: middleware});

        const laterProfitCycleID = await PRECOGV5.currentProfitCycleId(USDC.address);
        const laterProfitOfPreviousCycleStr = await PRECOGV5.profit(USDC.address, formerProfitCycleID);
        const laterPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);
        const laterFeeInPrecogCore = await USDC.balanceOf(PRECOG_CORE.address);

        const formerProfit = parseFloat(weiToETH(formerProfitOfCurrentCycleStr));
        const laterProfit = parseFloat(weiToETH(laterProfitOfPreviousCycleStr));
        const formerPCOGBalance = parseFloat(weiToETH(formerPCOGPrecogBalance));
        const laterPCOGBalance = parseFloat(weiToETH(laterPCOGPrecogBalance));

        assert.equal(parseInt(formerProfitCycleID), parseInt(laterProfitCycleID) - 1, "New profit cycle was not created");
        assert.equal(
            (Number(amountProfit / 1000)).toString(), 
            (Number(laterFeeInPrecogCore) - Number(formerFeeInPrecogCore)).toString(),
            "Precog did not receive trading fee" 
        );
        expect(laterProfit).to.greaterThan(formerProfit, "profit was not updated");
        expect(laterPCOGBalance).to.greaterThan(formerPCOGBalance, "PCOG was not bought");
    });
  });

  describe("USER2 REQUESTS WITHDRAWAL", async () => {
    it("Should have enough IP1 to request withdrawal from USDC pool", async() => {
      const requestAmount2 = mweiToWei("200");
      await sleep(61000);
      await PRECOGV5.requestWithdrawal(USDC.address, requestAmount2, {from: tester2}).catch(err => console.error("REAL", err.message));
      const requestWithdrawal = parseFloat(mweiToWei(await PRECOGV5.requestedWithdrawals(USDC.address, tester2)));
      console.log("requestedWithdrawal USDC:", requestWithdrawal);
    });


    it("User2 could not withdraw token before middleware send reqquest withdrawal amount to Precog", async() => {
        const requestAmount2 = mweiToWei("200");
      let isFailed = false;
      await PRECOGV5.withdraw(tester2, USDC.address, requestAmount2, {from: tester1})
      .catch(err => {
        console.log(err.message);
        isFailed = true;
      })

      assert.equal(isFailed, true, "User could not withdraw USDC or USDT if middleware send request withdrawal to Precog");
    });
  });

  describe("USER1 DEPOSITS EXTRA 500USDC", async () => {
    it("Should lose USDC and receive IP1 and charge fee exactly", async () => {
        const formerTester1USDCBalance = await USDC.balanceOf(tester1);
        const formerTester1IP1Balance = await IP1.balanceOf(tester1);
        const formerFeeInPrecogCore = await USDC.balanceOf(PRECOG_CORE.address);

        console.log("formerTester1USDCBalance:", formerTester1USDCBalance.toString());
        console.log("formerTester1IP1Balance:", formerTester1IP1Balance.toString());

        const amountDeposit1 = mweiToWei("500");

        await sleep(65000);
        await PRECOGV5.deposit(USDC.address, amountDeposit1, { from: tester1 }).catch(err => console.error("REAL:", err.message));

        const laterTester1USDCBalance = await USDC.balanceOf(tester1);
        const laterTester1IP1Balance = await IP1.balanceOf(tester1);
        const laterFeeInPrecogCore = await USDC.balanceOf(PRECOG_CORE.address);


        console.log("laterTester1USDCBalance:", laterTester1USDCBalance.toString());
        console.log("laterTester1IP1Balance:", laterTester1IP1Balance.toString());

        
        assert.equal(
            (laterTester1IP1Balance - formerTester1IP1Balance).toString(), 
            (Number(amountDeposit1) - Number(amountDeposit1 / 1000)).toString(),
            "Charge wrong fee"
        );

        console.log("SDFS", (Number(amountDeposit1 / 1000)).toString());
        console.log("DFDF", (Number(laterFeeInPrecogCore) - Number(formerFeeInPrecogCore)).toString())

        assert.equal(
            (Number(amountDeposit1 / 1000)).toString(), 
            (Number(laterFeeInPrecogCore) - Number(formerFeeInPrecogCore)).toString(), 
            "Precog did not receive deposit fee"
        );

    });
  });

  describe("MIDDLEWARE SENDS PROFITS 0USDC", async () => {
    it("Should have PCOG as profit in USDC pool", async () => {
        const amountProfit = mweiToWei("0");
    
        const formerProfitCycleID = await PRECOGV5.currentProfitCycleId(USDC.address);
        const formerProfitOfCurrentCycleStr = await PRECOGV5.profit(USDC.address, formerProfitCycleID);
        const formerPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);
        const formerFeeInPrecogCore = await USDC.balanceOf(PRECOG_CORE.address);

        await sleep(65000);
        await PRECOGV5.sendProfit({token: USDC.address, amount: amountProfit}, deadline(), {from: middleware});

        const laterProfitCycleID = await PRECOGV5.currentProfitCycleId(USDC.address);
        const laterProfitOfPreviousCycleStr = await PRECOGV5.profit(USDC.address, formerProfitCycleID);
        const laterPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);
        const laterFeeInPrecogCore = await USDC.balanceOf(PRECOG_CORE.address);

        const formerProfit = parseFloat(weiToETH(formerProfitOfCurrentCycleStr));
        const laterProfit = parseFloat(weiToETH(laterProfitOfPreviousCycleStr));
        const formerPCOGBalance = parseFloat(weiToETH(formerPCOGPrecogBalance));
        const laterPCOGBalance = parseFloat(weiToETH(laterPCOGPrecogBalance));

        assert.equal(parseInt(formerProfitCycleID), parseInt(laterProfitCycleID) - 1, "New profit cycle was not created");
        assert.equal(
            (Number(amountProfit / 1000)).toString(), 
            (Number(laterFeeInPrecogCore) - Number(formerFeeInPrecogCore)).toString(),
            "Precog did not receive trading fee" 
        );
    });
  });

  describe("MIDDLEWARE TAKES INVESTMENT", async () => {
    it("Should take 90% tokens of USDC pool", async() => {
      await sleep(65000);
      await PRECOGV5.takeInvestment(USDC.address, { from: middleware });
      const USDCPrecogBalanceStr = await PRECOGV5.getActualBalance(USDC.address);
      const USDCLiquidityStr = await PRECOGV5.liquidity(USDC.address);

      // cast to number
      const USDCPrecogBalance = parseFloat(weiToMwei(USDCPrecogBalanceStr));
      const USDCLiquidity = parseFloat(weiToMwei(USDCLiquidityStr));

      assert.equal(0.1 * USDCLiquidity, USDCPrecogBalance, "Middleware does not take 90% tokens from USDC pool");
    });
  });

  describe("MIDDLEWARE SENDS PROFITS 0.001USDC", async () => {
    it("Should have PCOG as profit in USDC pool", async () => {
        const amountProfit = mweiToWei("0.001");
    
        const formerProfitCycleID = await PRECOGV5.currentProfitCycleId(USDC.address);
        const formerProfitOfCurrentCycleStr = await PRECOGV5.profit(USDC.address, formerProfitCycleID);
        const formerPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);
        const formerFeeInPrecogCore = await USDC.balanceOf(PRECOG_CORE.address);
        await sleep(65000);
        await PRECOGV5.sendProfit({token: USDC.address, amount: amountProfit}, deadline(), {from: middleware});

        const laterProfitCycleID = await PRECOGV5.currentProfitCycleId(USDC.address);
        const laterProfitOfPreviousCycleStr = await PRECOGV5.profit(USDC.address, formerProfitCycleID);
        const laterPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);
        const laterFeeInPrecogCore = await USDC.balanceOf(PRECOG_CORE.address);

        const formerProfit = parseFloat(weiToETH(formerProfitOfCurrentCycleStr));
        const laterProfit = parseFloat(weiToETH(laterProfitOfPreviousCycleStr));
        const formerPCOGBalance = parseFloat(weiToETH(formerPCOGPrecogBalance));
        const laterPCOGBalance = parseFloat(weiToETH(laterPCOGPrecogBalance));

        assert.equal(parseInt(formerProfitCycleID), parseInt(laterProfitCycleID) - 1, "New profit cycle was not created");
        assert.equal(
            (Number(amountProfit / 1000)).toString(), 
            (Number(laterFeeInPrecogCore) - Number(formerFeeInPrecogCore)).toString(),
            "Precog did not receive trading fee" 
        );
        expect(laterProfit).to.greaterThan(formerProfit, "profit was not updated");
        expect(laterPCOGBalance).to.greaterThan(formerPCOGBalance, "PCOG was not bought");
    });
  });

  describe("MIDDLEWARE SENDS PROFITS 999.999USDC", async () => {
    it("Should have PCOG as profit in USDC pool", async () => {
        const amountProfit = mweiToWei("999.999");
    
        const formerProfitCycleID = await PRECOGV5.currentProfitCycleId(USDC.address);
        const formerProfitOfCurrentCycleStr = await PRECOGV5.profit(USDC.address, formerProfitCycleID);
        const formerPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);
        const formerFeeInPrecogCore = await USDC.balanceOf(PRECOG_CORE.address);
        await sleep(65000);
        await PRECOGV5.sendProfit({token: USDC.address, amount: amountProfit}, deadline(), {from: middleware});

        const laterProfitCycleID = await PRECOGV5.currentProfitCycleId(USDC.address);
        const laterProfitOfPreviousCycleStr = await PRECOGV5.profit(USDC.address, formerProfitCycleID);
        const laterPCOGPrecogBalance = await PCOG.balanceOf(PRECOGV5.address);
        const laterFeeInPrecogCore = await USDC.balanceOf(PRECOG_CORE.address);

        const formerProfit = parseFloat(weiToETH(formerProfitOfCurrentCycleStr));
        const laterProfit = parseFloat(weiToETH(laterProfitOfPreviousCycleStr));
        const formerPCOGBalance = parseFloat(weiToETH(formerPCOGPrecogBalance));
        const laterPCOGBalance = parseFloat(weiToETH(laterPCOGPrecogBalance));

        assert.equal(parseInt(formerProfitCycleID), parseInt(laterProfitCycleID) - 1, "New profit cycle was not created");
        assert.equal(
            (Number(amountProfit / 1000)).toString(), 
            (Number(laterFeeInPrecogCore) - Number(formerFeeInPrecogCore)).toString(),
            "Precog did not receive trading fee" 
        );
        expect(laterProfit).to.greaterThan(formerProfit, "profit was not updated");
        expect(laterPCOGBalance).to.greaterThan(formerPCOGBalance, "PCOG was not bought");
    });
  });

  describe("USER2 TAKES PROFIT", async () => {
    it("Should increase PCOG balance of tester2, take all profit from USDC pool", async () => {
      // former state

      const formerInvestmentCycleId = await PRECOGV5.currentInvestmentCycleId(USDC.address);
      const formerProfitCycleId = await PRECOGV5.currentProfitCycleId(USDC.address);
      
      let PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
      const formerPCOGBalanceOfTester2 = parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
      const formerInvestmentOfTester2 = await PRECOGV5.investmentOf(USDC.address, tester2);
      const formerProfitOfTester2 = await PRECOGV5.profitOf(USDC.address, tester2);
      const formerClaimedProfitOfTester2 = await PRECOGV5.claimedProfitOf(USDC.address, tester2);


      console.log("formerInvestmentCycleId:", formerInvestmentCycleId.toString());
      console.log("formerProfitCycleId", formerProfitCycleId.toString());

      console.log("PCOGBalanceOfContract:", PCOGBalanceOfContract.toString());
      console.log("formerPCOGBalanceOfTester2:", formerPCOGBalanceOfTester2.toString());
      console.log("formerInvestmentOfTester2:", formerInvestmentOfTester2.toString());
      console.log("formerProfitOfTester2:", formerProfitOfTester2.toString());
      console.log("formerClaimedProfitOfTester2:", formerClaimedProfitOfTester2.toString());
      await sleep(65000);
        await PRECOGV5.takeProfit(tester2, USDC.address, {from: tester2}).catch(err => console.error("REAL",err.message));
        
      // later state
      const laterInvestmentCycleId = await PRECOGV5.currentInvestmentCycleId(USDC.address);
      const laterProfitCycleId = await PRECOGV5.currentProfitCycleId(USDC.address);
      const laterPCOGBalanceOfTester2 =  parseFloat(weiToETH(await PCOG.balanceOf(tester2)));
      const laterInvestmentOfTester2 = await PRECOGV5.investmentOf(USDC.address, tester2);
      const laterProfitOfTester2 = await PRECOGV5.profitOf(USDC.address, tester2);
      const laterClaimedProfitOfTester2 = await PRECOGV5.claimedProfitOf(USDC.address, tester2);
      PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));

      console.log("laterInvestmentCycleId:", laterInvestmentCycleId.toString());
      console.log("laterProfitCycleId", laterProfitCycleId.toString());

      console.log("PCOGBalanceOfContract: ", PCOGBalanceOfContract.toString());
      console.log("laterPCOGBalanceOfTester2:", laterPCOGBalanceOfTester2.toString());
      console.log("laterInvestmentOfTester2:", laterInvestmentOfTester2.toString());
      console.log("laterProfitOfTester2:", laterProfitOfTester2.toString());
      console.log("laterClaimedProfitOfTester2:", laterClaimedProfitOfTester2.toString());
    });
  });

  describe("USER1 TAKES PROFIT", async () => {
    it("Should increase PCOG balance of tester1, take all profit from USDC pool", async () => {
      // former state

      const formerInvestmentCycleId = await PRECOGV5.currentInvestmentCycleId(USDC.address);
      const formerProfitCycleId = await PRECOGV5.currentProfitCycleId(USDC.address);
      
      let PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));
      const formerPCOGBalanceOfTester1 = parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
      const formerInvestmentOfTester1 = await PRECOGV5.investmentOf(USDC.address, tester1);
      const formerProfitOfTester1 = await PRECOGV5.profitOf(USDC.address, tester1);
      const formerClaimedProfitOfTester1 = await PRECOGV5.claimedProfitOf(USDC.address, tester1);

      console.log("formerInvestmentCycleId:", formerInvestmentCycleId.toString());
      console.log("formerProfitCycleId", formerProfitCycleId.toString());
      console.log("PCOGBalanceOfContract:", PCOGBalanceOfContract.toString());
      console.log("formerPCOGBalanceOfTester1:", formerPCOGBalanceOfTester1.toString());
      console.log("formerInvestmentOfTester1:", formerInvestmentOfTester1.toString());
      console.log("formerProfitOfTester1:", formerProfitOfTester1.toString());
      console.log("formerClaimedProfitOfTester1:", formerClaimedProfitOfTester1.toString());
      await sleep(65000);
        await PRECOGV5.takeProfit(tester1, USDC.address, {from: tester1}).catch(err => console.error("REAL",err.message));
        
      // later state
      const laterInvestmentCycleId = await PRECOGV5.currentInvestmentCycleId(USDC.address);
      const laterProfitCycleId = await PRECOGV5.currentProfitCycleId(USDC.address);
      const laterPCOGBalanceOfTester1 =  parseFloat(weiToETH(await PCOG.balanceOf(tester1)));
      const laterInvestmentOfTester1 = await PRECOGV5.investmentOf(USDC.address, tester1);
      const laterProfitOfTester1 = await PRECOGV5.profitOf(USDC.address, tester1);
      const laterClaimedProfitOfTester1 = await PRECOGV5.claimedProfitOf(USDC.address, tester1);
      PCOGBalanceOfContract = parseFloat(weiToETH(await PCOG.balanceOf(PRECOGV5.address)));

      console.log("laterInvestmentCycleId:", laterInvestmentCycleId.toString());
      console.log("laterProfitCycleId", laterProfitCycleId.toString());
      console.log("PCOGBalanceOfContract: ", PCOGBalanceOfContract.toString());
      console.log("laterPCOGBalanceOfTester1:", laterPCOGBalanceOfTester1.toString());
      console.log("laterInvestmentOfTester1:", laterInvestmentOfTester1.toString());
      console.log("laterProfitOfTester1:", laterProfitOfTester1.toString());
      console.log("laterClaimedProfitOfTester1:", laterClaimedProfitOfTester1.toString());
    });
  });

});