const PCOG = artifacts.require("PCOG");
const IPCOGFactory = artifacts.require("IPCOGFactory");
const PrecogCore = artifacts.require("PrecogCore");
const MiddlewareExchange = artifacts.require("MiddlewareExchange");
const Precog = artifacts.require("PrecogV5");
const Test = artifacts.require("Test");

module.exports = async function (deployer, network, accounts) {
  await deployer.deploy(PCOG);
  await deployer.deploy(Test);
  const PCContract = await PCOG.deployed();

  await deployer.deploy(
    PrecogCore,
    accounts[0],
    accounts[5],
    PCContract.address,
    accounts[8]
  );

  await deployer.deploy(MiddlewareExchange, accounts[8], PCContract.address);

  await deployer.deploy(IPCOGFactory);

  await deployer.deploy(Precog, PrecogCore.address, MiddlewareExchange.address, IPCOGFactory.address);

  
  
};
