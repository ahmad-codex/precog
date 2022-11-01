import { expect } from "chai";
import { parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";
import "mocha";
import { timeForward } from "../util";
import { YEAR_TIME_SPAN } from "../util/constant";
import { createPool, deployCore, pcog, pool, user1, user2 } from "./staking_init";

describe.only("APR Staking bad cases test", () => {
  const stake1_1 = parseUnits("1000", 18).div(3);
  const stake1_2 = parseUnits("1000", 18).div(6);
  const stake2_1 = parseUnits("1000", 18).div(7);
  const unstake1_1 = stake1_1.div(7);
  const unstake1_2 = stake1_1.div(3);
  const unstake2_1 = stake2_1.div(6);

  const interestRate = 1;
  let poolInfo = {
    stakingPeriod: 3600,
    stakeFeeRate: 100,
    unstakeFeeRate: 200,
    quota: parseUnits("1000", 18),
    penaltyRate: 5000,
  };

  before(async () => {
    await deployCore();
    await createPool(poolInfo, [0]);
    pcog.transfer(user1.address, parseUnits("50000000", 18));
    pcog.transfer(user2.address, parseUnits("50000000", 18));
  });

  it("User 1 stake then wait for 1 year", async () => {
    await pool.connect(user1).stake(stake1_1);
    const { timestamp: blockTimeBefore } = await ethers.provider.getBlock("latest");

    await timeForward(YEAR_TIME_SPAN);

    const { timestamp: blockTimeAfter } = await ethers.provider.getBlock("latest");
    const stakeTime1 = blockTimeAfter - blockTimeBefore;

    const reward1 = stake1_1.mul(interestRate).mul(stakeTime1).div(YEAR_TIME_SPAN).div(100);
    const reward1Tracked = await pool.rewardTotal(user1.address, 0);
    expect(reward1).eq(reward1Tracked);
  });

  it("User 1 & 2 stake then waiting for 2 years each", async () => {
    const reward1_1 = await pool.rewardTotal(user1.address, 0);
    const { timestamp: blockTime1Init } = await ethers.provider.getBlock("latest");

    await pool.connect(user1).stake(stake1_2);
    const { timestamp: blockTime1Before } = await ethers.provider.getBlock("latest");

    await timeForward(YEAR_TIME_SPAN * 2);

    await pool.connect(user2).stake(stake2_1);
    const { timestamp: blockTime2Before } = await ethers.provider.getBlock("latest");

    await timeForward(YEAR_TIME_SPAN * 2);

    const { timestamp: blockTimeAfter } = await ethers.provider.getBlock("latest");
    const stakeTime1_Init = blockTime1Before - blockTime1Init;
    const stakeTime1 = blockTimeAfter - blockTime1Before;
    const stakeTime2 = blockTimeAfter - blockTime2Before;
    const stake1 = stake1_1.add(stake1_2);

    const reward1_2_Init = stake1_1.mul(interestRate).mul(stakeTime1_Init).div(YEAR_TIME_SPAN).div(100);
    const reward1_2 = stake1.mul(interestRate).mul(stakeTime1).div(YEAR_TIME_SPAN).div(100);
    const reward1 = reward1_1.add(reward1_2_Init).add(reward1_2);
    const reward1Tracked = await pool.rewardTotal(user1.address, 0);
    expect(reward1.sub(reward1Tracked).abs()).lte(10);

    const reward2 = stake2_1.mul(interestRate).mul(stakeTime2).div(YEAR_TIME_SPAN).div(100);
    const reward2Tracked = await pool.rewardTotal(user2.address, 0);
    expect(reward2).eq(reward2Tracked);
  });

  it("User 1 unstake then waiting for 1 year", async () => {
    const reward1_2 = await pool.rewardTotal(user1.address, 0);
    const { timestamp: blockTime1Init } = await ethers.provider.getBlock("latest");

    await pool.connect(user1).unstake(unstake1_1);
    const { timestamp: blockTimeBefore } = await ethers.provider.getBlock("latest");

    await timeForward(YEAR_TIME_SPAN);

    const { timestamp: blockTimeAfter } = await ethers.provider.getBlock("latest");
    const stakeTime_Init = blockTimeBefore - blockTime1Init;
    const stakeTime = blockTimeAfter - blockTimeBefore;
    const stake1_Init = stake1_1.add(stake1_2);
    const stake1 = stake1_Init.sub(unstake1_1);

    const reward1_3 = stake1.mul(interestRate).mul(stakeTime).div(YEAR_TIME_SPAN).div(100);
    const reward1_3_Init = stake1_Init.mul(interestRate).mul(stakeTime_Init).div(YEAR_TIME_SPAN).div(100);
    const reward1 = reward1_2.add(reward1_3).add(reward1_3_Init);
    const reward1Tracked = await pool.rewardTotal(user1.address, 0);
    expect(reward1.sub(reward1Tracked).abs()).lte(10);
  });

  it("User 1 & 2 unstake then waiting for 2 years each", async () => {
    const reward1_2 = await pool.rewardTotal(user1.address, 0);
    const reward2_2 = await pool.rewardTotal(user2.address, 0);
    const { timestamp: blockTime1Init } = await ethers.provider.getBlock("latest");

    await pool.connect(user2).unstake(unstake2_1);
    const { timestamp: blockTime2Before } = await ethers.provider.getBlock("latest");

    await timeForward(YEAR_TIME_SPAN * 2);

    await pool.connect(user1).unstake(unstake1_2);
    const { timestamp: blockTime1Before } = await ethers.provider.getBlock("latest");

    await timeForward(YEAR_TIME_SPAN * 2);

    const { timestamp: blockTimeAfter } = await ethers.provider.getBlock("latest");
    const stakeTime1_Init = blockTime1Before - blockTime1Init;
    const stakeTime1 = blockTimeAfter - blockTime1Before;
    const stakeTime2_Init = blockTime2Before - blockTime1Init;
    const stakeTime2 = blockTimeAfter - blockTime2Before;
    const stake1_Init = stake1_1.add(stake1_2).sub(unstake1_1);
    const stake2_Init = stake2_1;
    const stake1 = stake1_Init.sub(unstake1_2);
    const stake2 = stake2_Init.sub(unstake2_1);

    const reward1_3_Init = stake1_Init.mul(interestRate).mul(stakeTime1_Init).div(YEAR_TIME_SPAN).div(100);
    const reward1_3 = stake1.mul(interestRate).mul(stakeTime1).div(YEAR_TIME_SPAN).div(100);
    const reward1 = reward1_2.add(reward1_3_Init).add(reward1_3);
    const reward1Tracked = await pool.rewardTotal(user1.address, 0);
    expect(reward1.sub(reward1Tracked).abs()).lte(10);

    const reward2_3_Init = stake2_Init.mul(interestRate).mul(stakeTime2_Init).div(YEAR_TIME_SPAN).div(100);
    const reward2_3 = stake2.mul(interestRate).mul(stakeTime2).div(YEAR_TIME_SPAN).div(100);
    const reward2 = reward2_2.add(reward2_3_Init).add(reward2_3);
    const reward2Tracked = await pool.rewardTotal(user2.address, 0);
    expect(reward2.sub(reward2Tracked).abs()).lte(10);
  });
});
