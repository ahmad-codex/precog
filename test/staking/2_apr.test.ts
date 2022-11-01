import { assert, expect } from "chai";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import { UINT_MAX } from "../util/constant";
import {
  createPool,
  deployCore,
  deployer,
  exchange,
  factory,
  hr,
  pcog,
  pool,
  priceFeed,
  rewardAPR,
  setIsWbtcFixedReward,
  user1,
  user2,
  wbtc
} from "./staking_init";

describe("APR reward test with flexible staking", () => {
  before(async () => {
    await deployCore();
    await createPool(
      {
        stakingPeriod: 0,
        quota: parseUnits("1000", 18),
        stakeFeeRate: 0,
        unstakeFeeRate: 0,
        penaltyRate: 5000,
      },
      [0]
    );
    pcog.transfer(rewardAPR.address, parseEther("1000000"));
    pcog.approve(pool.address, UINT_MAX);
    pcog.connect(user1).approve(pool.address, UINT_MAX);
    pcog.connect(user2).approve(pool.address, UINT_MAX);
    pcog.transfer(user1.address, parseEther("1000000"));
    pcog.transfer(user2.address, parseEther("1000000"));
  });

  describe("Check deployment and config", async () => {
    it("Should deploy successfully", async () => {
      const [factoryAddr, hrAddr, rewardToken] = await Promise.all([
        pool.factory(),
        pool.hr(),
        rewardAPR.rewardToken(),
      ]);
      expect(factoryAddr).equal(factory.address, "initialize failed");
      expect(hrAddr).equal(hr.address, "initialize failed");
      expect(rewardToken).equal(pcog.address, "initialize failed");
    });

    it("Assign middlware", async () => {
      const middlewareRole = await hr.MIDDLEWARE_ROLE();
      const tx = await hr.grantRole(middlewareRole, deployer.address);
      await tx.wait();
      const hasRole = await hr.hasRole(middlewareRole, deployer.address);
      expect(hasRole, "grant role failed");
    });

    it("Non-middleware could not update reward info", async () => {
      await expect(rewardAPR.connect(user1).updateRewardInfo(parseUnits("1", 11))).to.be.revertedWith(
        "Pool: Unauthorized"
      );
    });

    it("Middleware could update reward info", async () => {
      await rewardAPR.updateRewardInfo(parseUnits("1", 11));
    });
  });

  describe("Stake", async () => {
    it("Deployer stakes 100 PCOG", async () => {
      const formerBalance = await pcog.balanceOf(deployer.address);
      const formerUserInfo = await rewardAPR.users(deployer.address);

      const stakedAmount = parseEther("100");
      const tx = await pool.stake(stakedAmount);
      const transaction = await tx.wait();
      const { timestamp } = await ethers.provider.getBlock(transaction.blockNumber);

      const laterBalance = await pcog.balanceOf(deployer.address);
      const laterUserInfo = await rewardAPR.users(deployer.address);

      assert(formerBalance.sub(stakedAmount).eq(laterBalance));
      assert(formerUserInfo.amount.add(stakedAmount).eq(laterUserInfo.amount));
      assert(laterUserInfo.lastRewardTime.eq(timestamp));
    });

    it("User1 stakes 150 PCOG", async () => {
      const formerBalance = await pcog.balanceOf(user1.address);
      const formerUserInfo = await rewardAPR.users(user1.address);
      await network.provider.send("evm_increaseTime", [1000]);
      await network.provider.send("evm_mine");
      const stakedAmount = parseEther("150");
      const tx = await pool.connect(user1).stake(stakedAmount);
      const transaction = await tx.wait();
      const { timestamp } = await ethers.provider.getBlock(transaction.blockNumber);

      const laterBalance = await pcog.balanceOf(user1.address);
      const laterUserInfo = await rewardAPR.users(user1.address);

      assert(formerBalance.sub(stakedAmount).eq(laterBalance));
      assert(formerUserInfo.amount.add(stakedAmount).eq(laterUserInfo.amount));
      assert(laterUserInfo.lastRewardTime.eq(timestamp));
    });
  });

  describe("Claim reward", async () => {
    it("Deployer claims reward", async () => {
      await network.provider.send("evm_increaseTime", [105]);
      await network.provider.send("evm_mine");

      const formerBalance = await pcog.balanceOf(deployer.address);
      const formerUserInfo = await rewardAPR.users(deployer.address);
      const reward = await rewardAPR.getRewards(deployer.address);

      const tx = await pool.claimReward(0, reward);
      const transaction = await tx.wait();
      const { timestamp } = await ethers.provider.getBlock(transaction.blockNumber);

      const laterBalance = await pcog.balanceOf(deployer.address);
      const laterUserInfo = await rewardAPR.users(deployer.address);

      // Check actutal and expected data
      assert(laterBalance.sub(formerBalance).eq(reward));
      assert(laterUserInfo.lastRewardTime.eq(timestamp));
      assert(formerUserInfo.storedReward.eq(laterUserInfo.storedReward));
      assert(!formerUserInfo.lastRewardTime.eq(laterUserInfo.lastRewardTime));
    });

    it("User1 claims reward", async () => {
      await network.provider.send("evm_increaseTime", [210]);
      await network.provider.send("evm_mine");

      const formerBalance = await pcog.balanceOf(user1.address);
      const formerUserInfo = await rewardAPR.users(user1.address);
      const reward = await rewardAPR.getRewards(user1.address);

      const tx = await pool.connect(user1).claimReward(0, reward);
      const transaction = await tx.wait();
      const { timestamp } = await ethers.provider.getBlock(transaction.blockNumber);

      const laterBalance = await pcog.balanceOf(user1.address);
      const laterUserInfo = await rewardAPR.users(user1.address);

      assert(laterBalance.sub(formerBalance).eq(reward));
      assert(laterUserInfo.lastRewardTime.eq(timestamp));
      assert(formerUserInfo.storedReward.eq(laterUserInfo.storedReward));
      assert(!formerUserInfo.lastRewardTime.eq(laterUserInfo.lastRewardTime));
    });
  });

  describe("Unstake a half of amount", async () => {
    it("Deployer unstakes a half of amount", async () => {
      await network.provider.send("evm_increaseTime", [105]);
      await network.provider.send("evm_mine");
      const formerBalance = await pcog.balanceOf(deployer.address);
      const formerUserInfo = await rewardAPR.users(deployer.address);
      const unstakedAmount = formerUserInfo.amount.div(2);

      const reward = await rewardAPR.getRewards(deployer.address);
      const tx = await pool.unstake(unstakedAmount);
      const transaction = await tx.wait();
      const { timestamp } = await ethers.provider.getBlock(transaction.blockNumber);

      const laterBalance = await pcog.balanceOf(deployer.address);
      const laterUserInfo = await rewardAPR.users(deployer.address);

      assert(formerBalance.add(unstakedAmount).eq(laterBalance));
      assert(formerUserInfo.amount.div(2).eq(laterUserInfo.amount));
      assert(laterUserInfo.lastRewardTime.eq(timestamp));
    });

    it("User1 unstakes a half of amount", async () => {
      await network.provider.send("evm_increaseTime", [105]);
      await network.provider.send("evm_mine");
      const formerBalance = await pcog.balanceOf(user1.address);
      const formerUserInfo = await rewardAPR.users(user1.address);
      const unstakedAmount = formerUserInfo.amount.div(2);

      const tx = await pool.connect(user1).unstake(unstakedAmount);
      const transaction = await tx.wait();
      const { timestamp } = await ethers.provider.getBlock(transaction.blockNumber);

      const laterBalance = await pcog.balanceOf(user1.address);
      const laterUserInfo = await rewardAPR.users(user1.address);

      assert(formerBalance.add(unstakedAmount).eq(laterBalance));
      assert(formerUserInfo.amount.div(2).eq(laterUserInfo.amount));
      assert(laterUserInfo.lastRewardTime.eq(timestamp));
    });
  });

  describe("Unstake all amount", async () => {
    it("Deployer unstakes all amount", async () => {
      await network.provider.send("evm_increaseTime", [105]);
      await network.provider.send("evm_mine");
      const formerBalance = await pcog.balanceOf(deployer.address);
      const formerUserInfo = await rewardAPR.users(deployer.address);
      const unstakedAmount = formerUserInfo.amount;

      const reward = await rewardAPR.getRewards(deployer.address);
      const tx = await pool.unstake(unstakedAmount);
      const transaction = await tx.wait();
      const { timestamp } = await ethers.provider.getBlock(transaction.blockNumber);

      const laterBalance = await pcog.balanceOf(deployer.address);
      const laterUserInfo = await rewardAPR.users(deployer.address);

      assert(formerBalance.add(unstakedAmount).eq(laterBalance));
      assert(laterUserInfo.amount.eq(0));
      assert(laterUserInfo.lastRewardTime.eq(timestamp));
    });

    it("User1 unstakes all amount", async () => {
      await network.provider.send("evm_increaseTime", [105]);
      await network.provider.send("evm_mine");
      const formerBalance = await pcog.balanceOf(user1.address);
      const formerUserInfo = await rewardAPR.users(user1.address);
      const unstakedAmount = formerUserInfo.amount;

      const tx = await pool.connect(user1).unstake(unstakedAmount);
      const transaction = await tx.wait();
      const { timestamp } = await ethers.provider.getBlock(transaction.blockNumber);

      const laterBalance = await pcog.balanceOf(user1.address);
      const laterUserInfo = await rewardAPR.users(user1.address);

      assert(formerBalance.add(unstakedAmount).eq(laterBalance));
      assert(laterUserInfo.amount.eq(0));
      assert(laterUserInfo.lastRewardTime.eq(timestamp));
    });
  });
});

describe("APR reward test with staking token differ from reward token", () => {
  before(async () => {
    setIsWbtcFixedReward(true);
    await deployCore();
    await createPool(
      {
        stakingPeriod: 0,
        quota: parseUnits("1000", 18),
        stakeFeeRate: 0,
        unstakeFeeRate: 0,
        penaltyRate: 5000,
      },
      [0]
    );
    exchange.setLiquidity(wbtc.address, pcog.address, parseUnits("1", 8), parseEther("1000"));
    wbtc.connect(user1).transfer(rewardAPR.address, parseUnits("100", 8));
    pcog.connect(deployer).approve(pool.address, UINT_MAX);
    pcog.connect(user1).approve(pool.address, UINT_MAX);
    pcog.connect(user2).approve(pool.address, UINT_MAX);
    pcog.transfer(user1.address, parseEther("1000000"));
    pcog.transfer(user2.address, parseEther("1000000"));
    setIsWbtcFixedReward(false);
  });

  it("Should deploy successfully", async () => {
    const [factoryAddr, hrAddr, rewardToken] = await Promise.all([
      pool.factory(),
      pool.hr(),
      rewardAPR.rewardToken(),
    ]);
    expect(factoryAddr).equal(factory.address, "initialize failed");
    expect(hrAddr).equal(hr.address, "initialize failed");
    expect(rewardToken).equal(wbtc.address, "initialize failed");
  });

  it("User1 stakes 200 PCOG", async () => {
    const formerPcogBalance = await pcog.balanceOf(user1.address);
    const formerWbtcBalance = await wbtc.balanceOf(user1.address);
    const formerUserInfo = await rewardAPR.users(user1.address);
    const stakedAmount = parseEther("200");
    const stakedAmountWbtc = await priceFeed.getAmountOut(stakedAmount, pcog.address, wbtc.address);

    const tx = await pool.connect(user1).stake(stakedAmount);
    const transaction = await tx.wait();
    const { timestamp } = await ethers.provider.getBlock(transaction.blockNumber);

    const laterPcogBalance = await pcog.balanceOf(user1.address);
    const laterWbtcBalance = await wbtc.balanceOf(user1.address);
    const laterUserInfo = await rewardAPR.users(user1.address);

    expect(laterPcogBalance.add(stakedAmount)).eq(formerPcogBalance);
    expect(laterWbtcBalance).eq(formerWbtcBalance);
    expect(laterUserInfo.amount.sub(stakedAmountWbtc)).eq(formerUserInfo.amount);
    expect(laterUserInfo.lastRewardTime).eq(timestamp);
  });

  it("User1 check reward", async () => {
    const stakedAmount = parseEther("200");
    const stakedAmountWbtc = await priceFeed.getAmountOut(stakedAmount, pcog.address, wbtc.address);
    const interest = await rewardAPR.interestRate();
    const rewardCalculated = stakedAmountWbtc.mul(interest).div(1e4);

    const yearTime = 31536000 / 2;
    await network.provider.send("evm_increaseTime", [yearTime]);
    await network.provider.send("evm_mine");

    const rewardTotal = await pool.rewardTotal(user1.address, 0);
    expect(rewardTotal).eq(rewardCalculated);
  });

  it("User1 unstakes 100 PCOG", async () => {
    const formerPcogBalance = await pcog.balanceOf(user1.address);
    const formerWbtcBalance = await wbtc.balanceOf(user1.address);
    const formerUserInfo = await rewardAPR.users(user1.address);
    const unstakedAmount = parseEther("100");
    const unstakedAmountWbtc = await priceFeed.getAmountOut(unstakedAmount, pcog.address, wbtc.address);

    const tx = await pool.connect(user1).unstake(unstakedAmount);
    const transaction = await tx.wait();
    const { timestamp } = await ethers.provider.getBlock(transaction.blockNumber);

    const laterPcogBalance = await pcog.balanceOf(user1.address);
    const laterWbtcBalance = await wbtc.balanceOf(user1.address);
    const laterUserInfo = await rewardAPR.users(user1.address);

    expect(laterPcogBalance.sub(unstakedAmount)).eq(formerPcogBalance);
    expect(laterWbtcBalance).eq(formerWbtcBalance);
    expect(laterUserInfo.amount.add(unstakedAmountWbtc)).eq(formerUserInfo.amount);
    expect(laterUserInfo.lastRewardTime).eq(timestamp);
  });

  it("User1 unstakes 100 PCOG again", async () => {
    const formerPcogBalance = await pcog.balanceOf(user1.address);
    const formerWbtcBalance = await wbtc.balanceOf(user1.address);
    const formerUserInfo = await rewardAPR.users(user1.address);
    const unstakedAmount = parseEther("100");
    const unstakedAmountWbtc = await priceFeed.getAmountOut(unstakedAmount, pcog.address, wbtc.address);

    const tx = await pool.connect(user1).unstake(unstakedAmount);
    const transaction = await tx.wait();
    const { timestamp } = await ethers.provider.getBlock(transaction.blockNumber);

    const laterPcogBalance = await pcog.balanceOf(user1.address);
    const laterWbtcBalance = await wbtc.balanceOf(user1.address);
    const laterUserInfo = await rewardAPR.users(user1.address);

    expect(laterPcogBalance.sub(unstakedAmount)).eq(formerPcogBalance);
    expect(laterWbtcBalance).eq(formerWbtcBalance);
    expect(laterUserInfo.amount.add(unstakedAmountWbtc)).eq(formerUserInfo.amount);
    expect(laterUserInfo.lastRewardTime).eq(timestamp);
  });

  it("User1 claim reward", async () => {
    const stakedAmount = parseEther("200");
    const stakedAmountWbtc = await priceFeed.getAmountOut(stakedAmount, pcog.address, wbtc.address);
    const interest = await rewardAPR.interestRate();
    const rewardTotal = stakedAmountWbtc.mul(interest).div(1e4);
    const formerPcogBalance = await pcog.balanceOf(user1.address);
    const formerWbtcBalance = await wbtc.balanceOf(user1.address);

    await pool.connect(user1).claimReward(0, rewardTotal.add(1));

    const laterPcogBalance = await pcog.balanceOf(user1.address);
    const laterWbtcBalance = await wbtc.balanceOf(user1.address);
    expect(laterPcogBalance).eq(formerPcogBalance);
    expect(laterWbtcBalance.sub(rewardTotal)).eq(formerWbtcBalance);
  });
});
