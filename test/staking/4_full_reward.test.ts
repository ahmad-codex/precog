import { assert, expect } from "chai";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import { UINT_MAX } from "../util/constant";
import {
  createPool,
  deployCore,
  deployer,
  hr,
  pcog,
  pool,
  rewardAPR,
  rewardFlexible,
  user1,
  user2,
  wbtc,
} from "./staking_init";

describe("Full reward controllers test", () => {
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
      [0, 1]
    );
    wbtc.mint(rewardFlexible.address, parseUnits("1000000", 8));
    pcog.transfer(rewardAPR.address, parseEther("1000000"));
    pcog.approve(pool.address, UINT_MAX);
    pcog.connect(user1).approve(pool.address, UINT_MAX);
    pcog.connect(user2).approve(pool.address, UINT_MAX);
    pcog.transfer(user1.address, parseEther("1000000"));
    pcog.transfer(user2.address, parseEther("1000000"));
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
    });
  });

  describe("Stake", async () => {
    it("Deployer stake 62 PCOG", async () => {
      const stakedAmount = parseEther("62");
      const tx = await pool.stake(stakedAmount);
      const transaction = await tx.wait();
    });

    it("user1 stake 84 PCOG", async () => {
      await network.provider.send("evm_increaseTime", [840]);
      await network.provider.send("evm_mine");
      const stakedAmount = parseEther("84");
      const tx = await pool.connect(user1).stake(stakedAmount);
      const transaction = await tx.wait();
    });
  });

  describe("Stake", async () => {
    it("Deployer stake 62 PCOG", async () => {
      const stakedAmount = parseEther("62");
      const tx = await pool.stake(stakedAmount);
      const transaction = await tx.wait();
    });

    it("user1 stake 84 PCOG", async () => {
      await network.provider.send("evm_increaseTime", [840]);
      await network.provider.send("evm_mine");
      const stakedAmount = parseEther("84");
      const tx = await pool.connect(user1).stake(stakedAmount);
      const transaction = await tx.wait();
    });
  });

  describe("Unstake a half of amount", async () => {
    it("Deployer unstakes a half of amount", async () => {
      await network.provider.send("evm_increaseTime", [105]);
      await network.provider.send("evm_mine");
      const unstakedAmount = parseEther("31");
      const tx = await pool.unstake(unstakedAmount);
      const transaction = await tx.wait();
    });

    it("Deployer unstakes a half of amount", async () => {
      await network.provider.send("evm_increaseTime", [105]);
      await network.provider.send("evm_mine");
      const unstakedAmount = parseEther("42");
      const tx = await pool.connect(user1).unstake(unstakedAmount);
      const transaction = await tx.wait();
    });
  });

  describe("Stake", async () => {
    it("Deployer stake 62 PCOG", async () => {
      const stakedAmount = parseEther("62");
      const tx = await pool.stake(stakedAmount);
      const transaction = await tx.wait();
    });

    it("user1 stake 84 PCOG", async () => {
      await network.provider.send("evm_increaseTime", [840]);
      await network.provider.send("evm_mine");
      const stakedAmount = parseEther("84");
      const tx = await pool.connect(user1).stake(stakedAmount);
      const transaction = await tx.wait();
    });
  });

  describe("Unstake all amount", async () => {
    it("Deployer unstakes all amount", async () => {
      await network.provider.send("evm_increaseTime", [3600]);
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

  describe("Claim reward", async () => {
    it("Deployer claims reward", async () => {
      await network.provider.send("evm_increaseTime", [105]);
      await network.provider.send("evm_mine");
      const tx = await pool.claimReward(0, UINT_MAX);
      const transaction = await tx.wait();
    });

    it("Deployer claims reward", async () => {
      await network.provider.send("evm_increaseTime", [105]);
      await network.provider.send("evm_mine");
      const tx = await pool.connect(user1).claimReward(0, UINT_MAX);
      const transaction = await tx.wait();
    });
  });

  describe("Restart distribution", async () => {
    it("non-middleware could not distribute reward", async () => {
      await expect(
        rewardFlexible.connect(user1).updateRewardInfo(parseUnits("5", 8), 3600)
      ).to.be.revertedWith("Pool: Unauthorized");
    });

    it("middleware could distribute reward", async () => {
      const tx = await rewardFlexible.updateRewardInfo(parseUnits("5", 8), 3600);
      const transaction = await tx.wait();
    });
  });

  describe("Stake", async () => {
    it("Deployer stake 62 PCOG", async () => {
      const stakedAmount = parseEther("62");
      const tx = await pool.stake(stakedAmount);
      const transaction = await tx.wait();
    });

    it("user1 stake 84 PCOG", async () => {
      await network.provider.send("evm_increaseTime", [840]);
      await network.provider.send("evm_mine");
      const stakedAmount = parseEther("84");
      const tx = await pool.connect(user1).stake(stakedAmount);
      const transaction = await tx.wait();
    });
  });

  describe("Stake", async () => {
    it("Deployer stake 62 PCOG", async () => {
      const stakedAmount = parseEther("62");
      const tx = await pool.stake(stakedAmount);
      const transaction = await tx.wait();
    });

    it("user1 stake 84 PCOG", async () => {
      await network.provider.send("evm_increaseTime", [840]);
      await network.provider.send("evm_mine");
      const stakedAmount = parseEther("84");
      const tx = await pool.connect(user1).stake(stakedAmount);
      const transaction = await tx.wait();
    });
  });

  describe("Unstake a half of amount", async () => {
    it("Deployer unstakes a half of amount", async () => {
      await network.provider.send("evm_increaseTime", [105]);
      await network.provider.send("evm_mine");
      const unstakedAmount = parseEther("31");
      const tx = await pool.unstake(unstakedAmount);
      const transaction = await tx.wait();
    });

    it("Deployer unstakes a half of amount", async () => {
      await network.provider.send("evm_increaseTime", [105]);
      await network.provider.send("evm_mine");
      const unstakedAmount = parseEther("42");
      const tx = await pool.connect(user1).unstake(unstakedAmount);
      const transaction = await tx.wait();
    });
  });

  describe("Stake", async () => {
    it("Deployer stake 62 PCOG", async () => {
      const stakedAmount = parseEther("62");
      const tx = await pool.stake(stakedAmount);
      const transaction = await tx.wait();
    });

    it("user1 stake 84 PCOG", async () => {
      await network.provider.send("evm_increaseTime", [840]);
      await network.provider.send("evm_mine");
      const stakedAmount = parseEther("84");
      const tx = await pool.connect(user1).stake(stakedAmount);
      const transaction = await tx.wait();
    });
  });

  describe("Unstake all amount", async () => {
    it("Deployer unstakes all amount", async () => {
      await network.provider.send("evm_increaseTime", [100]);
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

  describe("Claim reward", async () => {
    it("Deployer claims reward", async () => {
      await network.provider.send("evm_increaseTime", [105]);
      await network.provider.send("evm_mine");
      const tx = await pool.claimReward(0, UINT_MAX);
      const transaction = await tx.wait();
    });

    it("Deployer claims reward", async () => {
      await network.provider.send("evm_increaseTime", [105]);
      await network.provider.send("evm_mine");
      const tx = await pool.connect(user1).claimReward(0, UINT_MAX);
      const transaction = await tx.wait();
    });
  });

  describe("Restart distribution", async () => {
    it("non-middleware could not distribute reward", async () => {
      await expect(
        rewardFlexible.connect(user1).updateRewardInfo(parseUnits("5", 8), 3600)
      ).to.be.revertedWith("Pool: Unauthorized");
    });

    it("middleware could distribute reward", async () => {
      const tx = await rewardFlexible.updateRewardInfo(parseUnits("5", 8), 3600);
      const transaction = await tx.wait();
    });
  });

  describe("Stake", async () => {
    it("Deployer stake 62 PCOG", async () => {
      const stakedAmount = parseEther("62");
      const tx = await pool.stake(stakedAmount);
      const transaction = await tx.wait();
    });

    it("user1 stake 84 PCOG", async () => {
      await network.provider.send("evm_increaseTime", [840]);
      await network.provider.send("evm_mine");
      const stakedAmount = parseEther("84");
      const tx = await pool.connect(user1).stake(stakedAmount);
      const transaction = await tx.wait();
    });
  });

  describe("Stake", async () => {
    it("Deployer stake 62 PCOG", async () => {
      const stakedAmount = parseEther("62");
      const tx = await pool.stake(stakedAmount);
      const transaction = await tx.wait();
    });

    it("user1 stake 84 PCOG", async () => {
      await network.provider.send("evm_increaseTime", [840]);
      await network.provider.send("evm_mine");
      const stakedAmount = parseEther("84");
      const tx = await pool.connect(user1).stake(stakedAmount);
      const transaction = await tx.wait();
    });
  });

  describe("Unstake a half of amount", async () => {
    it("Deployer unstakes a half of amount", async () => {
      await network.provider.send("evm_increaseTime", [105]);
      await network.provider.send("evm_mine");
      const unstakedAmount = parseEther("31");
      const tx = await pool.unstake(unstakedAmount);
      const transaction = await tx.wait();
    });

    it("Deployer unstakes a half of amount", async () => {
      await network.provider.send("evm_increaseTime", [105]);
      await network.provider.send("evm_mine");
      const unstakedAmount = parseEther("42");
      const tx = await pool.connect(user1).unstake(unstakedAmount);
      const transaction = await tx.wait();
    });
  });

  describe("Stake", async () => {
    it("Deployer stake 62 PCOG", async () => {
      const stakedAmount = parseEther("62");
      const tx = await pool.stake(stakedAmount);
      const transaction = await tx.wait();
    });

    it("user1 stake 84 PCOG", async () => {
      await network.provider.send("evm_increaseTime", [840]);
      await network.provider.send("evm_mine");
      const stakedAmount = parseEther("84");
      const tx = await pool.connect(user1).stake(stakedAmount);
      const transaction = await tx.wait();
    });
  });

  describe("Unstake all amount", async () => {
    it("Deployer unstakes all amount", async () => {
      await network.provider.send("evm_increaseTime", [100]);
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

  describe("Claim reward", async () => {
    it("Deployer claims reward", async () => {
      await network.provider.send("evm_increaseTime", [105]);
      await network.provider.send("evm_mine");
      const tx = await pool.claimReward(0, UINT_MAX);
      const transaction = await tx.wait();
    });

    it("Deployer claims reward", async () => {
      await network.provider.send("evm_increaseTime", [105]);
      await network.provider.send("evm_mine");
      const tx = await pool.connect(user1).claimReward(0, UINT_MAX);
      const transaction = await tx.wait();
    });
  });
});
