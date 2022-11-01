import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { BigNumber } from "ethers";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import {
  createPool,
  deployCore,
  deployer,
  factory,
  hr,
  pcog,
  pool,
  rewardFlexible,
  user1,
  user2,
  wbtc,
} from "./staking_init";

chai.use(chaiAsPromised);

const { MaxUint256, Zero } = ethers.constants;
const epsilon = BigNumber.from(100);

const compareMoney = async (num1: BigNumber, num2: BigNumber, message?: string) => {
  const delta = num1.gt(num2) ? num1.sub(num2) : num2.sub(num1);
  expect(delta.lte(epsilon)).to.be.equal(true, message);
};

describe("Flexible reward test", () => {
  let lastUpdate: number,
    endTime: number,
    rewardPerSec: BigNumber = Zero,
    user1Profit: BigNumber = Zero,
    user2Profit: BigNumber = Zero,
    deployerProfit: BigNumber = Zero,
    user1Staked: BigNumber = Zero,
    user2Staked: BigNumber = Zero,
    deployerStaked: BigNumber = Zero;

  const totalStaked = () => {
    return user1Staked.add(user2Staked).add(deployerStaked);
  };

  const getDeltaTime = (timestamp: number) => {
    return timestamp < endTime ? timestamp - lastUpdate : endTime - lastUpdate;
  };

  const updateProfit = (timestamp: number) => {
    const deltaTime = getDeltaTime(timestamp);
    const reward = rewardPerSec.mul(deltaTime);
    const totalShares = totalStaked();

    if (totalShares.gt(Zero)) {
      {
        const profitPending = user1Staked.mul(reward).div(totalShares);
        user1Profit = user1Profit.add(profitPending);
      }

      {
        const profitPending = user2Staked.mul(reward).div(totalShares);
        user2Profit = user2Profit.add(profitPending);
      }

      {
        const profitPending = deployerStaked.mul(reward).div(totalShares);
        deployerProfit = deployerProfit.add(profitPending);
      }
    }

    lastUpdate += deltaTime;
  };

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
      [1]
    );

    wbtc.mint(rewardFlexible.address, parseUnits("1000000", 8));
    pcog.approve(pool.address, MaxUint256);
    pcog.connect(user1).approve(pool.address, MaxUint256);
    pcog.connect(user2).approve(pool.address, MaxUint256);
    pcog.transfer(user1.address, parseEther("1000000"));
    pcog.transfer(user2.address, parseEther("1000000"));

    lastUpdate = 0;
  });

  it("Should deploy successfully", async () => {
    const [factoryAddr, hrAddr, rewardToken] = await Promise.all([
      pool.factory(),
      pool.hr(),
      rewardFlexible.rewardToken(),
    ]);
    expect(factoryAddr).equal(factory.address, "initialize failed");
    expect(hrAddr).equal(hr.address, "initialize failed");
    expect(rewardToken).equal(wbtc.address, "initialize failed");
  });

  it("Assign middlware", async () => {
    const middlewareRole = await hr.MIDDLEWARE_ROLE();
    const tx = await hr.grantRole(middlewareRole, deployer.address);
    await tx.wait();
    const hasRole = await hr.hasRole(middlewareRole, deployer.address);
    expect(hasRole, "grant role failed");
  });

  describe("Start distribution", async () => {
    it("non-middleware could not distribute reward", async () => {
      await expect(
        rewardFlexible.connect(user1).updateRewardInfo(parseUnits("5", 8), 3600)
      ).to.be.revertedWith("Pool: Unauthorized");
    });

    it("middleware could distribute reward", async () => {
      const tx = await rewardFlexible.updateRewardInfo(parseUnits("5", 8), 3600);
      const transaction = await tx.wait();
      const { timestamp } = await ethers.provider.getBlock(transaction.blockNumber);

      endTime = timestamp + 3600;

      const [actualEndTime, actualRewardPerSec] = await Promise.all([
        rewardFlexible.endTime(),
        rewardFlexible.rewardPerSec(),
      ]);

      expect(actualEndTime.eq(endTime)).equal(true, "wrong endTime");
      expect(actualRewardPerSec.eq(parseUnits("5", 8))).equal(true, "wrong rewardPerSec");

      rewardPerSec = actualRewardPerSec;
    });
  });

  describe("Staking progress", async () => {
    it("deployer stake 62 PCOG", async () => {
      const stakedAmount = parseEther("62");
      const tx = await pool.stake(stakedAmount);
      const transaction = await tx.wait();
      const { timestamp } = await ethers.provider._getBlock(transaction.blockNumber);

      updateProfit(timestamp);

      const [userInfo, totalShares] = await Promise.all([
        rewardFlexible.users(deployer.address),
        rewardFlexible.totalStaked(),
      ]);

      deployerStaked = deployerStaked.add(stakedAmount);

      expect(userInfo.amount.eq(deployerStaked)).equal(true, "failed to update info");
      expect(totalShares.eq(totalStaked())).equal(true, "failed to update totalStaked");
    });

    it("user1 stake 84 PCOG", async () => {
      await network.provider.send("evm_increaseTime", [840]);
      await network.provider.send("evm_mine");
      const stakedAmount = parseEther("84");
      const tx = await pool.connect(user1).stake(stakedAmount);
      const transaction = await tx.wait();
      const { timestamp } = await ethers.provider._getBlock(transaction.blockNumber);

      updateProfit(timestamp);

      const [userInfo, totalShares] = await Promise.all([
        rewardFlexible.users(user1.address),
        rewardFlexible.totalStaked(),
      ]);

      user1Staked = user1Staked.add(stakedAmount);

      expect(userInfo.amount.eq(user1Staked)).equal(true, "failed to update info");
      expect(totalShares.eq(totalStaked())).equal(true, "failed to update totalStaked");
    });
  });

  describe("Unstaking process", async () => {
    it("deployer unstake", async () => {
      await network.provider.send("evm_increaseTime", [760]);
      await network.provider.send("evm_mine");
      const formerPCOGBalance = await pcog.balanceOf(deployer.address);

      const tx = await pool.unstake(deployerStaked);
      const transaction = await tx.wait();

      const { timestamp } = await ethers.provider._getBlock(transaction.blockNumber);

      updateProfit(timestamp);

      const [userInfo, laterPCOGBalance, totalShares] = await Promise.all([
        rewardFlexible.users(deployer.address),
        pcog.balanceOf(deployer.address),
        rewardFlexible.totalStaked(),
      ]);

      const formerStaked = deployerStaked;
      deployerStaked = Zero;

      expect(userInfo.amount.eq(Zero)).equal(true, "failed to update info");
      expect(laterPCOGBalance.sub(formerPCOGBalance).eq(formerStaked)).equal(
        true,
        "deployer could not receive enough staked tokens"
      );
      expect(totalShares.eq(totalStaked())).equal(true, "failed to update totalStaked");
    });
  });

  describe("Stake process", async () => {
    it("user2 stake 84 PCOG", async () => {
      await network.provider.send("evm_increaseTime", [350]);
      await network.provider.send("evm_mine");
      const stakedAmount = parseEther("84");
      const tx = await pool.connect(user2).stake(stakedAmount);
      const transaction = await tx.wait();
      const { timestamp } = await ethers.provider._getBlock(transaction.blockNumber);

      updateProfit(timestamp);

      const [userInfo, lastRewardTime, totalShares] = await Promise.all([
        rewardFlexible.users(user2.address),
        rewardFlexible.lastRewardTime(),
        rewardFlexible.totalStaked(),
      ]);

      user2Staked = user2Staked.add(stakedAmount);

      expect(userInfo.amount.eq(user2Staked)).equal(true, "failed to update info");
      expect(lastRewardTime.eq(timestamp)).equal(true, "Wrong last updated");
      expect(totalShares.eq(totalStaked())).equal(true, "failed to update totalStaked");
    });
  });

  describe("Profit claiming process", async () => {
    it("user1 should claim enough profit", async () => {
      await network.provider.send("evm_increaseTime", [420]);
      await network.provider.send("evm_mine");
      const tx = await pool.connect(user1).claimReward(0, MaxUint256);
      const transaction = await tx.wait();
      const { timestamp } = await ethers.provider.getBlock(transaction.blockNumber);

      updateProfit(timestamp);

      const received = await wbtc.balanceOf(user1.address);

      compareMoney(received, user1Profit, "could not receive enough profit");
    });
  });

  describe("Stake process", async () => {
    it("deployer stake 59 PCOG", async () => {
      await network.provider.send("evm_increaseTime", [530]);
      await network.provider.send("evm_mine");
      const stakedAmount = parseEther("59");
      const tx = await pool.stake(stakedAmount);
      const transaction = await tx.wait();
      const { timestamp } = await ethers.provider._getBlock(transaction.blockNumber);

      updateProfit(timestamp);

      const [userInfo, lastRewardTime, totalShares] = await Promise.all([
        rewardFlexible.users(deployer.address),
        rewardFlexible.lastRewardTime(),
        rewardFlexible.totalStaked(),
      ]);

      deployerStaked = deployerStaked.add(stakedAmount);

      expect(userInfo.amount.eq(deployerStaked)).equal(true, "failed to update info");
      expect(lastRewardTime.eq(timestamp)).equal(true, "Wrong last updated");
      expect(totalShares.eq(totalStaked())).equal(true, "failed to update totalStaked");
    });

    it("user2 stake 100 PCOG when reward controller is ended", async () => {
      await network.provider.send("evm_increaseTime", [3000]);
      await network.provider.send("evm_mine");
      const stakedAmount = parseEther("100");
      const tx = await pool.connect(user2).stake(stakedAmount);
      const transaction = await tx.wait();
      const { timestamp } = await ethers.provider._getBlock(transaction.blockNumber);

      updateProfit(timestamp);

      const [userInfo, lastRewardTime, totalShares] = await Promise.all([
        rewardFlexible.users(user2.address),
        rewardFlexible.lastRewardTime(),
        rewardFlexible.totalStaked(),
      ]);

      user2Staked = user2Staked.add(stakedAmount);

      expect(userInfo.amount.eq(user2Staked)).equal(true, "failed to update info");
      expect(lastRewardTime.eq(endTime)).equal(true, "Wrong last updated");
      expect(totalShares.eq(totalStaked())).equal(true, "failed to update totalStaked");
    });
  });

  describe("Profit claiming process", async () => {
    it("deployer should claim enough profit", async () => {
      await network.provider.send("evm_increaseTime", [300]);
      await network.provider.send("evm_mine");
      const tx = await pool.claimReward(0, MaxUint256);
      const transaction = await tx.wait();
      const { timestamp } = await ethers.provider.getBlock(transaction.blockNumber);

      updateProfit(timestamp);

      const received = await wbtc.balanceOf(deployer.address);
      compareMoney(received, deployerProfit, "could not receive enough profit");
    });

    it("user1 should claim enough profit", async () => {
      await network.provider.send("evm_increaseTime", [420]);
      await network.provider.send("evm_mine");
      const tx = await pool.connect(user1).claimReward(0, MaxUint256);
      const transaction = await tx.wait();
      const { timestamp } = await ethers.provider.getBlock(transaction.blockNumber);

      updateProfit(timestamp);

      const received = await wbtc.balanceOf(user1.address);

      compareMoney(received, user1Profit, "could not receive enough profit");
    });

    it("user2 should claim enough profit", async () => {
      await network.provider.send("evm_increaseTime", [300]);
      await network.provider.send("evm_mine");
      const tx = await pool.connect(user2).claimReward(0, MaxUint256);
      const transaction = await tx.wait();
      const { timestamp } = await ethers.provider.getBlock(transaction.blockNumber);

      updateProfit(timestamp);

      const received = await wbtc.balanceOf(user2.address);

      compareMoney(received, user2Profit, "could not receive enough profit");
    });
  });
});
