const { deployProxy } = require("@openzeppelin/truffle-upgrades");
const PCOG = artifacts.require("PCOG");
const IPCOGFactory = artifacts.require("IPCOGFactory");
const MiddlewareExchange = artifacts.require("MiddlewareExchange");
const PrecogStorage = artifacts.require("PrecogStorage");
const PrecogInternal = artifacts.require("PrecogInternal");
const PrecogCore = artifacts.require("PrecogCore");
const PrecogFactory = artifacts.require("PrecogFactory");
const PrecogVault = artifacts.require("PrecogVault");
const PrecogProfit = artifacts.require("PrecogProfit");
const Precog = artifacts.require("PrecogV5");
const WithdrawalRegister = artifacts.require("WithdrawalRegister");
const fs = require("fs");
const path = require("path");

const sleep = (time) => new Promise((resolve, reject) => {
  setTimeout(resolve, time);
});

module.exports = async function (deployer, network, accounts) {
  const configPath = `../configs/config.${network}.json`;

  console.log(configPath);

  const configs = require(configPath);
  let newConfig;
  console.log(configs);
  let {
    EXCHANGES,
    PCOG_ADDRESS,
    EXCHANGE_MIDDLEWARE_ADDRESS,
    IPCOG_FACTORY_ADDRESS,
    PRECOG_STORAGE_ADDRESS,
    PRECOG_INTERNAL_ADDRESS,
    PRECOG_CORE_ADDRESS,
    PRECOG_FACTORY_ADDRESS,
    PRECOG_VAULT_ADDRESS,
    PRECOG_PROFIT_ADDRESS,
    PRECOG_ADDRESS,
    WITHDRAWAL_REGISTER_ADDRESS
  } = configs;

  if (!PCOG_ADDRESS) {
    await deployProxy(PCOG, [], { deployer })
    PCOG_ADDRESS = (await PCOG.deployed()).address;
    fs.writeFileSync(
      path.join(__dirname, configPath),
      JSON.stringify({
        ...configs,
        PCOG_ADDRESS
      }, null, 4)
    );
  }

  if (!EXCHANGE_MIDDLEWARE_ADDRESS) {
    await deployer.deploy(MiddlewareExchange, EXCHANGES[0]);
    EXCHANGE_MIDDLEWARE_ADDRESS = (await MiddlewareExchange.deployed()).address;
    newConfig = {
      ...newConfig,
      EXCHANGE_MIDDLEWARE_ADDRESS
    };
    fs.writeFileSync(
      path.join(__dirname, configPath),
      JSON.stringify({
        ...configs,
        ...newConfig
      }, null, 4)
    );
  }

  if (!IPCOG_FACTORY_ADDRESS) {
    await deployer.deploy(IPCOGFactory);
    IPCOG_FACTORY_ADDRESS = (await IPCOGFactory.deployed()).address;
    newConfig = {
      ...newConfig,
      IPCOG_FACTORY_ADDRESS
    };
    fs.writeFileSync(
      path.join(__dirname, configPath),
      JSON.stringify({
        ...configs,
        ...newConfig
      }, null, 4)
    );
  }

  if(!PRECOG_STORAGE_ADDRESS) {
    await deployer.deploy(PrecogStorage, "0x6c5c265cbd5921716754ca42369a7dc5bb05f42a");
    PRECOG_STORAGE_ADDRESS = (await PrecogStorage.deployed()).address;
    newConfig = {
      ...newConfig,
      PRECOG_STORAGE_ADDRESS
    };
    fs.writeFileSync(
      path.join(__dirname, configPath),
      JSON.stringify({
        ...configs,
        ...newConfig
      }, null, 4)
    );
  }

  if(!PRECOG_INTERNAL_ADDRESS) {
    await deployer.deploy(PrecogInternal, PRECOG_STORAGE_ADDRESS);
    PRECOG_INTERNAL_ADDRESS = (await PrecogInternal.deployed()).address;
    newConfig = {
      ...newConfig,
      PRECOG_INTERNAL_ADDRESS
    };
    fs.writeFileSync(
      path.join(__dirname, configPath),
      JSON.stringify({
        ...configs,
        ...newConfig
      }, null, 4)
    );
  }

  if(!PRECOG_CORE_ADDRESS) {
    await deployer.deploy(
      PrecogCore,
      PRECOG_STORAGE_ADDRESS,
      PRECOG_INTERNAL_ADDRESS
    );
    PRECOG_CORE_ADDRESS = (await PrecogCore.deployed()).address;
    newConfig = {
      ...newConfig,
      PRECOG_CORE_ADDRESS
    };
    fs.writeFileSync(
      path.join(__dirname, configPath),
      JSON.stringify({
        ...configs,
        ...newConfig
      }, null, 4)
    );
  }

  if(!PRECOG_FACTORY_ADDRESS) {
    await deployer.deploy(
      PrecogFactory,
      PRECOG_STORAGE_ADDRESS,
      PRECOG_INTERNAL_ADDRESS,
      IPCOG_FACTORY_ADDRESS
    );
    PRECOG_FACTORY_ADDRESS = (await PrecogFactory.deployed()).address;
    newConfig = {
      ...newConfig,
      PRECOG_FACTORY_ADDRESS
    };
    fs.writeFileSync(
      path.join(__dirname, configPath),
      JSON.stringify({
        ...configs,
        ...newConfig
      }, null, 4)
    );
  }
  
  if(!PRECOG_VAULT_ADDRESS) {
    await deployer.deploy(
      PrecogVault,
      PRECOG_STORAGE_ADDRESS,
      PRECOG_INTERNAL_ADDRESS
    );
    PRECOG_VAULT_ADDRESS = (await PrecogVault.deployed()).address;
    newConfig = {
      ...newConfig,
      PRECOG_VAULT_ADDRESS
    };
    fs.writeFileSync(
      path.join(__dirname, configPath),
      JSON.stringify({
        ...configs,
        ...newConfig
      }, null, 4)
    );
  }

  if(!PRECOG_PROFIT_ADDRESS) {
    await deployer.deploy(
      PrecogProfit,
      PRECOG_STORAGE_ADDRESS,
      PRECOG_INTERNAL_ADDRESS
    );
    PRECOG_PROFIT_ADDRESS = (await PrecogProfit.deployed()).address;
    newConfig = {
      ...newConfig,
      PRECOG_PROFIT_ADDRESS
    };
    fs.writeFileSync(
      path.join(__dirname, configPath),
      JSON.stringify({
        ...configs,
        ...newConfig
      }, null, 4)
    );
  }
  

  if(!PRECOG_ADDRESS) {
    await deployer.deploy(
      Precog,
      PRECOG_STORAGE_ADDRESS,
      PRECOG_INTERNAL_ADDRESS
    );
    PRECOG_ADDRESS = (await Precog.deployed()).address;
    newConfig = {
      ...newConfig,
      PRECOG_ADDRESS
    };
    fs.writeFileSync(
      path.join(__dirname, configPath),
      JSON.stringify({
        ...configs,
        ...newConfig
      }, null, 4)
    );
  }
  
  if(!WITHDRAWAL_REGISTER_ADDRESS) {
    await deployer.deploy(
      WithdrawalRegister,
      PRECOG_ADDRESS,
      PRECOG_CORE_ADDRESS
    );
    WITHDRAWAL_REGISTER_ADDRESS = (await WithdrawalRegister.deployed()).address;
    newConfig = {
      ...newConfig,
      WITHDRAWAL_REGISTER_ADDRESS
    };
    fs.writeFileSync(
      path.join(__dirname, configPath),
      JSON.stringify({
        ...configs,
        ...newConfig
      }, null, 4)
    );
  }

  const PrecogStorageContract = await PrecogStorage.at(PRECOG_STORAGE_ADDRESS);

  await PrecogStorageContract.setMiddlewareService("0x6c5c265cbd5921716754ca42369a7dc5bb05f42a");
  console.log("setMiddlewareService sucessfully");
  await sleep(5000);
  await PrecogStorageContract.setMiddlewareExchange(EXCHANGE_MIDDLEWARE_ADDRESS);
  console.log("setMiddlewareExchange sucessfully");
  await sleep(5000);
  await PrecogStorageContract.setPCOG(PCOG_ADDRESS);
  console.log("setPCOG sucessfully");
  await sleep(5000);
  await PrecogStorageContract.setPrecogInternal(PRECOG_INTERNAL_ADDRESS);
  console.log("setPrecogInternal sucessfully");
  await sleep(5000);
  await PrecogStorageContract.setPrecogCore(PRECOG_CORE_ADDRESS);
  console.log("setCore sucessfully");
  await sleep(5000);
  await PrecogStorageContract.setPrecogFactory(PRECOG_FACTORY_ADDRESS);
  console.log("setFactory sucessfully");
  await sleep(5000);
  await PrecogStorageContract.setPrecogVault(PRECOG_VAULT_ADDRESS);
  console.log("setVault sucessfully");
  await sleep(5000);
  await PrecogStorageContract.setPrecogProfit(PRECOG_PROFIT_ADDRESS);
  console.log("setProfit sucessfully");
  await sleep(5000);
  await PrecogStorageContract.setPrecog(PRECOG_ADDRESS);
  console.log("setPrecog sucessfully");
  await sleep(5000);
  await PrecogStorageContract.setWithdrawalRegister(WITHDRAWAL_REGISTER_ADDRESS);
  console.log("setWithdrawalRegister sucessfully");
};