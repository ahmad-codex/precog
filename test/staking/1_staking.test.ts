import { expect } from "chai";
import { parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";
import "mocha";
import { createPool, deployCore, deployer, factory, hr, pcog, pool, user1, user2 } from "./staking_init";

describe("Staking test", () => {
  let poolInfo = {
    stakingPeriod: 3600,
    stakeFeeRate: 100,
    unstakeFeeRate: 200,
    quota: parseUnits("1000", 18),
    penaltyRate: 5000,
  };
  let { stakingPeriod, stakeFeeRate, unstakeFeeRate, quota, penaltyRate } = poolInfo;

  before(async () => {
    await deployCore();
    await createPool(poolInfo, []);
    pcog.transfer(user1.address, parseUnits("50000000", 18));
    pcog.transfer(user2.address, parseUnits("50000000", 18));
    await createPool(poolInfo, [0]);
  });

  it("Should deploy successfully", async () => {
    const [factoryAddr, hrAddr] = await Promise.all([pool.factory(), pool.hr()]);
    expect(factoryAddr).equal(factory.address, "initialize failed");
    expect(hrAddr).equal(hr.address, "initialize failed");
  });

  it("Assign middlware", async () => {
    const middlewareRole = await hr.MIDDLEWARE_ROLE();

    await hr.grantRole(middlewareRole, deployer.address);

    const hasRole = await hr.hasRole(middlewareRole, deployer.address);
    expect(hasRole, "grant role failed");
  });

  it("User 1 stake 0", async () => {
    const stakeAmount = 0;

    await expect(pool.connect(user1).stake(stakeAmount)).to.be.revertedWith("Stake amount invalid");
  });

  it("User 1 stake over quota", async () => {
    const stakeAmount = quota.add(1);

    await expect(pool.connect(user1).stake(stakeAmount)).to.be.revertedWith("Cannot stake over quota");
  });

  it("User 1 stake success", async () => {
    const stakeAmount = parseUnits("100", 18);
    const fee = stakeAmount.mul(stakeFeeRate).div(10000);
    const balanceBefore = await pcog.balanceOf(user1.address);

    await pool.connect(user1).stake(stakeAmount);

    const userInfo = await pool.userStaking(user1.address);
    const balanceAfter = await pcog.balanceOf(user1.address);
    const currentTime = await blockTime();

    expect(userInfo.amount).to.be.eq(stakeAmount);
    expect(balanceBefore.sub(stakeAmount).sub(fee)).to.be.eq(balanceAfter);
    expect(userInfo.deadline.sub(stakingPeriod)).to.be.eq(currentTime);
  });

  it("User 1 stake over quota after success", async () => {
    const stakeAmount = parseUnits("900", 18).add(1);

    await expect(pool.connect(user1).stake(stakeAmount)).to.be.revertedWith("Cannot stake over quota");
  });

  it("User 1 stake success multiple times", async () => {
    const stakeAmount0 = parseUnits("100", 18); // 1st stake success
    const stakeAmount1 = parseUnits("400", 18);
    const stakeAmount2 = parseUnits("500", 18);
    const fee = stakeAmount1.add(stakeAmount2).mul(stakeFeeRate).div(10000);
    const balanceBefore = await pcog.balanceOf(user1.address);

    await pool.connect(user1).stake(stakeAmount1);
    await pool.connect(user1).stake(stakeAmount2);

    const userInfo = await pool.userStaking(user1.address);
    const balanceAfter = await pcog.balanceOf(user1.address);
    const currentTime = await blockTime();

    expect(userInfo.amount).to.be.eq(stakeAmount0.add(stakeAmount1).add(stakeAmount2));
    expect(balanceBefore.sub(stakeAmount1).sub(stakeAmount2).sub(fee)).to.be.eq(balanceAfter);
    expect(userInfo.deadline.sub(stakingPeriod)).to.be.eq(currentTime);
  });

  it("User 1 unstake 0", async () => {
    const unstakeAmount = 0;

    await expect(pool.connect(user1).unstake(unstakeAmount)).to.be.revertedWith("Unstake amount invalid");
  });

  it("User 1 unstake more than staked", async () => {
    const unstakeAmount = parseUnits("1000", 18).add(1);

    await expect(pool.connect(user1).unstake(unstakeAmount)).to.be.revertedWith(
      "Cannot unstake more than staked"
    );
  });

  it("User 1 unstake success", async () => {
    const stakeAmount = parseUnits("1000", 18);
    const unstakeAmount = parseUnits("200", 18);
    const fee = unstakeAmount.mul(unstakeFeeRate).div(10000);
    const balanceBefore = await pcog.balanceOf(user1.address);

    await pool.connect(user1).unstake(unstakeAmount);

    const userInfo = await pool.userStaking(user1.address);
    const balanceAfter = await pcog.balanceOf(user1.address);

    expect(userInfo.amount).to.be.eq(stakeAmount.sub(unstakeAmount));
    expect(balanceBefore.add(unstakeAmount).sub(fee)).to.be.eq(balanceAfter);
  });

  it("User 1 unstake more than staked after stake success", async () => {
    const unstakeAmount = parseUnits("800", 18).add(1);

    await expect(pool.connect(user1).unstake(unstakeAmount)).to.be.revertedWith(
      "Cannot unstake more than staked"
    );
  });

  it("User 1 stake more than quota after unstake success", async () => {
    const stakeAmount = parseUnits("200", 18).add(1);

    await expect(pool.connect(user1).stake(stakeAmount)).to.be.revertedWith("Cannot stake over quota");
  });

  it("User 1 stake success after unstake success", async () => {
    const stakeAmount0 = parseUnits("800", 18); // current stake remainning
    const stakeAmount = parseUnits("200", 18);
    const fee = stakeAmount.mul(stakeFeeRate).div(10000);
    const balanceBefore = await pcog.balanceOf(user1.address);

    await pool.connect(user1).stake(stakeAmount);

    const userInfo = await pool.userStaking(user1.address);
    const balanceAfter = await pcog.balanceOf(user1.address);
    const currentTime = await blockTime();

    expect(userInfo.amount).to.be.eq(stakeAmount.add(stakeAmount0));
    expect(balanceBefore.sub(stakeAmount).sub(fee)).to.be.eq(balanceAfter);
    expect(userInfo.deadline.sub(stakingPeriod)).to.be.eq(currentTime);
  });

  it("User 1 unstake all success multiple times", async () => {
    const stakeAmount = parseUnits("1000", 18);
    const unstakeAmount1 = parseUnits("400", 18);
    const unstakeAmount2 = parseUnits("600", 18);
    const fee = unstakeAmount1.add(unstakeAmount2).mul(unstakeFeeRate).div(10000);
    const balanceBefore = await pcog.balanceOf(user1.address);

    await pool.connect(user1).unstake(unstakeAmount1);
    await pool.connect(user1).unstake(unstakeAmount2);

    const userInfo = await pool.userStaking(user1.address);
    const balanceAfter = await pcog.balanceOf(user1.address);

    expect(userInfo.amount).to.be.eq(stakeAmount.sub(unstakeAmount1).sub(unstakeAmount2));
    expect(balanceBefore.add(unstakeAmount1).add(unstakeAmount2).sub(fee)).to.be.eq(balanceAfter);
  });

  it("User 1 stake success after unstake all", async () => {
    const stakeAmount = parseUnits("100", 18);
    const fee = stakeAmount.mul(stakeFeeRate).div(10000);
    const balanceBefore = await pcog.balanceOf(user1.address);

    await pool.connect(user1).stake(stakeAmount);

    const userInfo = await pool.userStaking(user1.address);
    const balanceAfter = await pcog.balanceOf(user1.address);
    const currentTime = await blockTime();

    expect(userInfo.amount).to.be.eq(stakeAmount);
    expect(balanceBefore.sub(stakeAmount).sub(fee)).to.be.eq(balanceAfter);
    expect(userInfo.deadline.sub(stakingPeriod)).to.be.eq(currentTime);
  });

  it("User 2 stake success", async () => {
    const stakeAmount = parseUnits("500", 18);
    const fee = stakeAmount.mul(stakeFeeRate).div(10000);
    const balanceBefore = await pcog.balanceOf(user2.address);

    await pool.connect(user2).stake(stakeAmount);

    const userInfo = await pool.userStaking(user2.address);
    const balanceAfter = await pcog.balanceOf(user2.address);
    const currentTime = await blockTime();

    expect(userInfo.amount).to.be.eq(stakeAmount);
    expect(balanceBefore.sub(stakeAmount).sub(fee)).to.be.eq(balanceAfter);
    expect(userInfo.deadline.sub(stakingPeriod)).to.be.eq(currentTime);
  });

  it("User 2 unstake all success", async () => {
    const unstakeAmount = parseUnits("500", 18);
    const fee = unstakeAmount.mul(unstakeFeeRate).div(10000);
    const balanceBefore = await pcog.balanceOf(user2.address);

    await pool.connect(user2).unstake(unstakeAmount);

    const userInfo = await pool.userStaking(user2.address);
    const balanceAfter = await pcog.balanceOf(user2.address);

    expect(userInfo.amount).to.be.eq(0);
    expect(balanceBefore.add(unstakeAmount).sub(fee)).to.be.eq(balanceAfter);
  });

  it("User 2 stake success after unstake all", async () => {
    const stakeAmount = parseUnits("500", 18);
    const fee = stakeAmount.mul(stakeFeeRate).div(10000);
    const balanceBefore = await pcog.balanceOf(user2.address);

    await pool.connect(user2).stake(stakeAmount);

    const userInfo = await pool.userStaking(user2.address);
    const balanceAfter = await pcog.balanceOf(user2.address);
    const currentTime = await blockTime();

    expect(userInfo.amount).to.be.eq(stakeAmount);
    expect(balanceBefore.sub(stakeAmount).sub(fee)).to.be.eq(balanceAfter);
    expect(userInfo.deadline.sub(stakingPeriod)).to.be.eq(currentTime);
  });

  async function blockTime() {
    const blockNo = ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNo);
    return block.timestamp;
  }
});
