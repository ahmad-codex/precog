const { assert, expect } = require("chai");

const ERC20 = artifacts.require("ERC20");
const _PCOG = artifacts.require("PCOG");
const IPToken = artifacts.require("IPCOG");
const PrecogCore = artifacts.require("PrecogCore");
const MiddlewareExchange = artifacts.require("MiddlewareExchange");
const IPCOGFactory = artifacts.require("IPCOGFactory");
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

const sleep = (time) =>
  new Promise((resolve, reject) => {
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
};

const epsilon = 5;

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

      USDC.mint(deployer, mweiToWei("100000000000")),
      USDT.mint(deployer, ETHToWei("300000000")),
      //PCOG.mint(deployer, ETHToWei("500000000")),
      PCOG.transfer(MIDDLEWARE_EXCHANGE.address, ETHToWei("500000000")),
    ]);


    // create uniswapv2 liquidity pool
    await Promise.all([
      ROUTER.addLiquidity(
        USDC.address,
        PCOG.address,
        mweiToWei("10000000"),
        ETHToWei("10000000"),
        mweiToWei("10000000"),
        ETHToWei("10000000"),
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

  describe("User 1 deposits 1000 USDC", async () => {
    it("Should get enough IPCOG", async () => {
      await sleep(60000);
      await PRECOGV5.deposit(USDC.address, mweiToWei("1000"), {from: tester1});
    });
  });

  describe("Middleware sends profit with 0 USDC", async () => {
    it("Nothing happen", async () => {
      await sleep(60000);
      await PRECOGV5.sendProfit({token: USDC.address, amount: "0"}, deadline(), { from: middleware });
    });
  });

  describe("User 2 deposits 1000 USDC", async () => {
    it("Should get enough IPCOG", async () => {
      await sleep(60000);
      await PRECOGV5.deposit(USDC.address, mweiToWei("1000"), { from: tester2 });
    });
  });

  describe("User 3 deposits 500 USDC", async () => {
    it("Should get enough IPCOG", async () => {
      await sleep(60000);
      await PRECOGV5.deposit(USDC.address, mweiToWei("500"), { from: tester3 });
    });
  });

  describe("Middleware sends profit with 1000 USDC", async () => {
    it("Should update total unit", async () => {
      await sleep(60000);
      await PRECOGV5.sendProfit({token: USDC.address, amount: mweiToWei("1000")}, deadline(), { from: middleware });
    });
  });

  describe("User1 takes profit", async () => {
    it("Should get enough PCOG", async () => {
      await sleep(60000);
      const formerPCOGBalance = await PCOG.balanceOf(tester1);
      await PRECOGV5.takeProfit(tester1, USDC.address, { from: tester1 });
      const laterPCOGBalance = await PCOG.balanceOf(tester1);
      await PCOG.burn(laterPCOGBalance, { from: tester1 });

      console.log("total profit: ", formerPCOGBalance.toString(), laterPCOGBalance.toString());
    });
  });

  describe("User2 takes profit", async () => {
    it("Should get enough PCOG", async () => {
      const formerPCOGBalance = await PCOG.balanceOf(tester2);
      await PRECOGV5.takeProfit(tester2, USDC.address, { from: tester2 });
      const laterPCOGBalance = await PCOG.balanceOf(tester2);
      await PCOG.burn(laterPCOGBalance, { from: tester2 });

      console.log("total profit: ", formerPCOGBalance.toString(), laterPCOGBalance.toString());
    });
  });

  describe("User3 takes profit", async () => {
    it("Should get enough PCOG", async () => {
      const formerPCOGBalance = await PCOG.balanceOf(tester3);
      await PRECOGV5.takeProfit(tester3, USDC.address, { from: tester3 });
      const laterPCOGBalance = await PCOG.balanceOf(tester3);
      await PCOG.burn(laterPCOGBalance, {from: tester3});

      console.log("total profit: ", formerPCOGBalance.toString(), laterPCOGBalance.toString());
    });
  });

  describe("Middleware sends profit with 1000 USDC", async () => {
    it("Should update total unit", async () => {
      await sleep(60000);
      await PRECOGV5.sendProfit({token: USDC.address, amount: mweiToWei("1000")}, deadline(), { from: middleware });
    });
  });

  describe("User1 takes profit", async () => {
    it("Should get enough PCOG", async () => {
      await sleep(60000);
      const formerPCOGBalance = await PCOG.balanceOf(tester1);
      await PRECOGV5.takeProfit(tester1, USDC.address, { from: tester1 });
      const laterPCOGBalance = await PCOG.balanceOf(tester1);
      await PCOG.burn(laterPCOGBalance, { from: tester1 });

      console.log("total profit: ", formerPCOGBalance.toString(), laterPCOGBalance.toString());
    });
  });

  describe("User2 takes profit", async () => {
    it("Should get enough PCOG", async () => {
      const formerPCOGBalance = await PCOG.balanceOf(tester2);
      await PRECOGV5.takeProfit(tester2, USDC.address, { from: tester2 });
      const laterPCOGBalance = await PCOG.balanceOf(tester2);
      await PCOG.burn(laterPCOGBalance, { from: tester2 });

      console.log("total profit: ", formerPCOGBalance.toString(), laterPCOGBalance.toString());
    });
  });

  describe("User3 takes profit", async () => {
    it("Should get enough PCOG", async () => {
      const formerPCOGBalance = await PCOG.balanceOf(tester3);
      await PRECOGV5.takeProfit(tester3, USDC.address, { from: tester3 });
      const laterPCOGBalance = await PCOG.balanceOf(tester3);
      await PCOG.burn(laterPCOGBalance, {from: tester3});

      console.log("total profit: ", formerPCOGBalance.toString(), laterPCOGBalance.toString());
    });
  });

  describe("User1 request 500", async () => {
    it("Should update total unit", async () => {
      await sleep(60000);
      await PRECOGV5.requestWithdrawal(USDC.address, mweiToWei("500"), {from: tester1});
    });
  });

  describe("Middleware sends profit with 1000 USDC", async () => {
    it("Should update total unit", async () => {
      await sleep(60000);
      await PRECOGV5.sendProfit({token: USDC.address, amount: mweiToWei("1000")}, deadline(), { from: middleware });
    });
  });

  describe("User1 takes profit", async () => {
    it("Should get enough PCOG", async () => {
      await sleep(60000);
      const formerPCOGBalance = await PCOG.balanceOf(tester1);
      await PRECOGV5.takeProfit(tester1, USDC.address, { from: tester1 });
      const laterPCOGBalance = await PCOG.balanceOf(tester1);
      await PCOG.burn(laterPCOGBalance, { from: tester1 });

      console.log("total profit: ", formerPCOGBalance.toString(), laterPCOGBalance.toString());
    });
  });

  describe("User2 takes profit", async () => {
    it("Should get enough PCOG", async () => {
      const formerPCOGBalance = await PCOG.balanceOf(tester2);
      await PRECOGV5.takeProfit(tester2, USDC.address, { from: tester2 });
      const laterPCOGBalance = await PCOG.balanceOf(tester2);
      await PCOG.burn(laterPCOGBalance, { from: tester2 });

      console.log("total profit: ", formerPCOGBalance.toString(), laterPCOGBalance.toString());
    });
  });

  describe("User3 takes profit", async () => {
    it("Should get enough PCOG", async () => {
      const formerPCOGBalance = await PCOG.balanceOf(tester3);
      await PRECOGV5.takeProfit(tester3, USDC.address, { from: tester3 });
      const laterPCOGBalance = await PCOG.balanceOf(tester3);
      await PCOG.burn(laterPCOGBalance, {from: tester3});

      console.log("total profit: ", formerPCOGBalance.toString(), laterPCOGBalance.toString());
    });
  });

  describe("Middleware sends profit with 1000 USDC", async () => {
    it("Should update total unit", async () => {
      await sleep(60000);
      await PRECOGV5.sendProfit({token: USDC.address, amount: mweiToWei("1000")}, deadline(), { from: middleware });
    });
  });

  describe("User1 takes profit", async () => {
    it("Should get enough PCOG", async () => {
      await sleep(60000);
      const formerPCOGBalance = await PCOG.balanceOf(tester1);
      await PRECOGV5.takeProfit(tester1, USDC.address, { from: tester1 });
      const laterPCOGBalance = await PCOG.balanceOf(tester1);
      await PCOG.burn(laterPCOGBalance, { from: tester1 });

      console.log("total profit: ", formerPCOGBalance.toString(), laterPCOGBalance.toString());
    });
  });

  describe("User2 takes profit", async () => {
    it("Should get enough PCOG", async () => {
      const formerPCOGBalance = await PCOG.balanceOf(tester2);
      await PRECOGV5.takeProfit(tester2, USDC.address, { from: tester2 });
      const laterPCOGBalance = await PCOG.balanceOf(tester2);
      await PCOG.burn(laterPCOGBalance, { from: tester2 });

      console.log("total profit: ", formerPCOGBalance.toString(), laterPCOGBalance.toString());
    });
  });

  describe("User3 takes profit", async () => {
    it("Should get enough PCOG", async () => {
      const formerPCOGBalance = await PCOG.balanceOf(tester3);
      await PRECOGV5.takeProfit(tester3, USDC.address, { from: tester3 });
      const laterPCOGBalance = await PCOG.balanceOf(tester3);
      await PCOG.burn(laterPCOGBalance, {from: tester3});

      console.log("total profit: ", formerPCOGBalance.toString(), laterPCOGBalance.toString());
    });
  });
})
