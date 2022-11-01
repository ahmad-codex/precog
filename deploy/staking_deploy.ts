import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import "@openzeppelin/hardhat-upgrades";
import { parseUnits } from "ethers/lib/utils";
import fs from "fs";
import { ethers, upgrades } from "hardhat";
import path from "path";
import {
  APRRewardController__factory,
  BasicPriceFeed__factory,
  BeaconProxyModel__factory,
  FlexibleRewardController__factory,
  HumanResource,
  HumanResource__factory,
  MockExchange__factory,
  PCOG__factory,
  StakingFactory,
  StakingFactory__factory,
  StakingPool__factory,
  UpgradeableBeacon,
  WBTC__factory,
} from "../typechain";
import config from "./config_staking.json";
const configPath = path.resolve(__dirname, "./config_staking.json");
let {
  HR,
  WBTC: WBTC_ADDRESS,
  PCOG: PCOG_ADDRESS,
  BEACON_POOL,
  BEACON_REWARD_FLEXIBLE,
  BEACON_REWARD_APR,
  REWARD_FLEXIBLE,
  REWARD_APR,
  TREASURY,
  PRICE_FEED,
  FACTORY,
} = config;

let deployer: SignerWithAddress;
let hr: HumanResource;
let factory: StakingFactory;

export async function deploy() {
  [deployer] = await ethers.getSigners();
  await deployHR();
  await deployWBTC();
  await deployPCOG();
  await deployBeaconPool();
  await deployBeaconRewardFlexible();
  await deployBeaconRewardAPR();
  await deployModelRewardAPR(100); // 1%
  await deployModelRewardFlexible();
  await deployPriceFeed();
  await deployFactory([REWARD_APR, REWARD_FLEXIBLE]);
  await createPool();
}

async function deployHR() {
  const HumanResource = (await ethers.getContractFactory("HumanResource")) as HumanResource__factory;
  if (!HR) {
    process.stdout.write("Deploying HR... ");
    hr = await HumanResource.deploy();
    await hr.deployed();
    config.HR = HR = hr.address;
    saveConfig();
    console.log("at:", HR);
  } else {
    hr = HumanResource.attach(HR);
  }
}

async function deployWBTC() {
  if (!WBTC_ADDRESS) {
    process.stdout.write("Deploying WBTC... ");
    const WBTC = (await ethers.getContractFactory("WBTC")) as WBTC__factory;
    const wbtc = await WBTC.deploy();
    await wbtc.deployed();
    await wbtc.mint(deployer.address, parseUnits("1000", 8));
    config.WBTC = WBTC_ADDRESS = wbtc.address;
    saveConfig();
    console.log("at:", WBTC_ADDRESS);
  }
}

async function deployPCOG() {
  if (!PCOG_ADDRESS) {
    process.stdout.write("Deploying PCOG... ");
    const PCOG = (await ethers.getContractFactory("PCOG")) as PCOG__factory;
    const pcog = await PCOG.deploy();
    await pcog.deployed();
    await pcog.initialize();
    config.PCOG = PCOG_ADDRESS = pcog.address;
    saveConfig();
    console.log("at:", PCOG_ADDRESS);
  }
}

async function deployBeaconPool() {
  if (!BEACON_POOL) {
    process.stdout.write("Deploying Beacon Pool... ");
    const Pool = (await ethers.getContractFactory("StakingPool")) as StakingPool__factory;
    const beacon = await upgrades.deployBeacon(Pool);
    await beacon.deployed();
    config.BEACON_POOL = BEACON_POOL = beacon.address;
    saveConfig();
    console.log("at:", BEACON_POOL);
  }
}

async function deployBeaconRewardFlexible() {
  if (!BEACON_REWARD_FLEXIBLE) {
    process.stdout.write("Deploying Beacon Reward Flexible... ");
    const RewardFlexible = (await ethers.getContractFactory(
      "FlexibleRewardController"
    )) as FlexibleRewardController__factory;
    const beacon = (await upgrades.deployBeacon(RewardFlexible)) as UpgradeableBeacon;
    await beacon.deployed();
    config.BEACON_REWARD_FLEXIBLE = BEACON_REWARD_FLEXIBLE = beacon.address;
    saveConfig();
    console.log("at:", BEACON_REWARD_FLEXIBLE);
  }
}

async function deployBeaconRewardAPR() {
  if (!BEACON_REWARD_APR) {
    process.stdout.write("Deploying Beacon Reward APR... ");
    const RewardAPR = (await ethers.getContractFactory(
      "APRRewardController"
    )) as APRRewardController__factory;
    const beacon = (await upgrades.deployBeacon(RewardAPR)) as UpgradeableBeacon;
    await beacon.deployed();
    config.BEACON_REWARD_APR = BEACON_REWARD_APR = beacon.address;
    console.log("at:", BEACON_REWARD_APR);
    saveConfig();
  }
}
async function deployModelRewardFlexible() {
  if (!REWARD_FLEXIBLE) {
    process.stdout.write("Deploying Model Reward Flexible... ");
    const Proxy = (await ethers.getContractFactory("BeaconProxyModel")) as BeaconProxyModel__factory;
    const rewardController = FlexibleRewardController__factory.createInterface();
    const data = rewardController.encodeFunctionData("initialize", [WBTC_ADDRESS, HR]);
    const proxy = await Proxy.deploy(config.BEACON_REWARD_FLEXIBLE, data);
    await proxy.deployed();
    config.REWARD_FLEXIBLE = REWARD_FLEXIBLE = proxy.address;
    console.log("at:", REWARD_FLEXIBLE);
    saveConfig();
  }
}

async function deployModelRewardAPR(interestRate: number) {
  if (!REWARD_APR) {
    process.stdout.write("Deploying Model Reward APR... ");
    const Proxy = (await ethers.getContractFactory("BeaconProxyModel")) as BeaconProxyModel__factory;
    const rewardController = APRRewardController__factory.createInterface();
    const data = rewardController.encodeFunctionData("initialize", [PCOG_ADDRESS, HR, interestRate]);
    const proxy = await Proxy.deploy(config.BEACON_REWARD_APR, data);
    await proxy.deployed();
    config.REWARD_APR = REWARD_APR = proxy.address;
    console.log("at:", REWARD_APR);
    saveConfig();
  }
}

async function deployPriceFeed() {
  if (!PRICE_FEED) {
    process.stdout.write("Deploying Price Feed... ");
    const Exchange = (await ethers.getContractFactory("MockExchange")) as MockExchange__factory;
    const exchange = await Exchange.deploy();
    await exchange.deployed();
    const PriceFeed = (await ethers.getContractFactory("BasicPriceFeed")) as BasicPriceFeed__factory;
    const priceFeed = await PriceFeed.deploy(exchange.address);
    await priceFeed.deployed();
    config.PRICE_FEED = PRICE_FEED = priceFeed.address;
    console.log("at:", PRICE_FEED);
    saveConfig();
  }
}

async function deployFactory(models: string[]) {
  const Factory = (await ethers.getContractFactory("StakingFactory")) as StakingFactory__factory;
  if (!FACTORY) {
    process.stdout.write("Deploying Factory... ");
    factory = await Factory.deploy(HR, PCOG_ADDRESS, TREASURY, BEACON_POOL, PRICE_FEED, models);
    await factory.deployed();
    const factoryRole = await hr.FACTORY_ROLE();
    await hr.grantRole(factoryRole, factory.address);
    config.FACTORY = FACTORY = factory.address;
    console.log("at:", FACTORY);
    saveConfig();
  } else {
    factory = Factory.attach(FACTORY);
  }
}

async function createPool() {
  console.log("Create pools");
  const poolInfo1 = {
    quota: parseUnits("1000", 18),
    stakingPeriod: 3600,
    stakeFeeRate: 100,
    unstakeFeeRate: 200,
    penaltyRate: 5000,
  };
  const poolInfo2 = {
    quota: parseUnits("1000", 18),
    stakingPeriod: 0,
    stakeFeeRate: 0,
    unstakeFeeRate: 0,
    penaltyRate: 5000,
  };
  const tx1 = await factory.createPool({ ...poolInfo1, rewardControllers: [] }, [0, 1]);
  await tx1.wait();
  const tx2 = await factory.createPool({ ...poolInfo2, rewardControllers: [] }, [0, 1]);
  await tx2.wait();
}

function saveConfig() {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
}

deploy().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
