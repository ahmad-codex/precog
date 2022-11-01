import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import "@openzeppelin/hardhat-upgrades";
import { BigNumberish } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { ethers, upgrades } from "hardhat";
import {
  APRRewardController,
  APRRewardController__factory,
  BasicPriceFeed,
  BasicPriceFeed__factory,
  BeaconProxyModel__factory,
  FlexibleRewardController,
  FlexibleRewardController__factory,
  HumanResource,
  HumanResource__factory,
  MockExchange,
  MockExchange__factory,
  PCOG,
  PCOG__factory,
  StakingFactory,
  StakingFactory__factory,
  StakingPool,
  StakingPool__factory,
  WBTC,
  WBTC__factory,
} from "../../typechain";
import { CreatePoolEvent } from "../../typechain/StakingFactory";
import { UINT_MAX } from "../util/constant";

export let hr: HumanResource,
  pcog: PCOG,
  wbtc: WBTC,
  factory: StakingFactory,
  pool: StakingPool,
  rewardAPR: APRRewardController,
  rewardFlexible: FlexibleRewardController,
  exchange: MockExchange,
  priceFeed: BasicPriceFeed;

export let deployer: SignerWithAddress,
  user1: SignerWithAddress,
  user2: SignerWithAddress,
  treasury: SignerWithAddress;

export let isWbtcFixedReward = false;
export function setIsWbtcFixedReward(input: boolean) {
  isWbtcFixedReward = input;
}

let Pool: StakingPool__factory,
  Proxy: BeaconProxyModel__factory,
  RewardAPR: APRRewardController__factory,
  RewardFlexible: FlexibleRewardController__factory;

export async function deployCore() {
  // get accounts
  [deployer, user1, user2, treasury] = await ethers.getSigners();

  // get factories
  const [HR, PCOG, WBTC, Factory, Exchange, PriceFeed] = (await Promise.all([
    ethers.getContractFactory("HumanResource"),
    ethers.getContractFactory("PCOG"),
    ethers.getContractFactory("WBTC"),
    ethers.getContractFactory("StakingFactory"),
    ethers.getContractFactory("MockExchange"),
    ethers.getContractFactory("BasicPriceFeed"),
  ])) as [
    HumanResource__factory,
    PCOG__factory,
    WBTC__factory,
    StakingFactory__factory,
    MockExchange__factory,
    BasicPriceFeed__factory
  ];

  [Pool, Proxy, RewardAPR, RewardFlexible] = (await Promise.all([
    ethers.getContractFactory("StakingPool"),
    ethers.getContractFactory("BeaconProxyModel"),
    ethers.getContractFactory("APRRewardController"),
    ethers.getContractFactory("FlexibleRewardController"),
  ])) as [
    StakingPool__factory,
    BeaconProxyModel__factory,
    APRRewardController__factory,
    FlexibleRewardController__factory
  ];

  // Deploy HR, WBTC, PCOG, beacons
  [hr, pcog, wbtc] = await Promise.all([HR.deploy(), PCOG.deploy(), WBTC.deploy()]);

  const [beaconPool, beaconRewardAPR, beaconRewardFlexible] = await Promise.all([
    upgrades.deployBeacon(Pool),
    upgrades.deployBeacon(RewardAPR),
    upgrades.deployBeacon(RewardFlexible),
  ]);

  // Distribute WBTC, Init PCOG
  await Promise.all([
    wbtc.mint(user1.address, parseUnits("1000", 8)),
    wbtc.mint(user2.address, parseUnits("1000", 8)),
    pcog.initialize(),
  ]);

  // Setup Reward Controller Models
  const rewardModelAPR = await deployModelRewardAPR(beaconRewardAPR.address, 100); // 1%
  const rewardModelFlexible = await deployModelRewardFlexible(beaconRewardFlexible.address);

  // Deploy Exchange & Price feed
  exchange = await Exchange.deploy();
  priceFeed = await PriceFeed.deploy(exchange.address);

  // Deploy factory + grant role
  factory = await Factory.deploy(
    hr.address,
    pcog.address,
    treasury.address,
    beaconPool.address,
    priceFeed.address,
    [rewardModelAPR.address, rewardModelFlexible.address]
  );
  const factoryRole = await hr.FACTORY_ROLE();
  await hr.grantRole(factoryRole, factory.address);
}

export async function createPool(
  poolInfo: {
    stakingPeriod: number;
    quota: BigNumberish;
    stakeFeeRate: number;
    unstakeFeeRate: number;
    penaltyRate: number;
  },
  rewardIds: number[]
) {
  const tx = await factory.createPool(
    {
      ...poolInfo,
      rewardControllers: [],
    },
    rewardIds
  );
  const transaction = await tx.wait();
  const event = transaction.events?.find((e) => e.event === "CreatePool") as CreatePoolEvent;
  pool = Pool.attach(event.args.pool);

  const day = new Date();
  day.setHours(0, 0, 0, 0);
  const midNightTime = Math.floor(day.getTime() / 1000.0);

  for (let i = 0; i < rewardIds.length; i++) {
    const rewardId = rewardIds[i];
    const rewardController = event.args.poolInfo.rewardControllers[i];
    if (rewardId == 0) {
      rewardAPR = RewardAPR.attach(rewardController);
      await pcog.transfer(rewardAPR.address, parseUnits("500000000", 18));
    }
    if (rewardId == 1) {
      rewardFlexible = RewardFlexible.attach(rewardController);
      await rewardFlexible.setDailyCheckPoint(midNightTime);
    }
  }

  await Promise.all([
    pcog.connect(deployer).approve(pool.address, UINT_MAX),
    pcog.connect(user1).approve(pool.address, UINT_MAX),
    pcog.connect(user2).approve(pool.address, UINT_MAX),
  ]);
}

async function deployModelRewardFlexible(beacon: string) {
  const data = FlexibleRewardController__factory.createInterface().encodeFunctionData("initialize", [
    wbtc.address,
    hr.address,
  ]);
  const proxy = await Proxy.deploy(beacon, data);
  await proxy.deployed();
  return proxy;
}

async function deployModelRewardAPR(beacon: string, interestRate: number) {
  const data = APRRewardController__factory.createInterface().encodeFunctionData("initialize", [
    isWbtcFixedReward ? wbtc.address : pcog.address,
    hr.address,
    interestRate,
  ]);
  const proxy = await Proxy.deploy(beacon, data);
  await proxy.deployed();
  return proxy;
}
