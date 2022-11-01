const ProxyAdmin = artifacts.require("ProxyAdmin");
const TransparentUpgradeableProxy = artifacts.require("TransparentUpgradeableProxy");
const PCOG = artifacts.require("PCOG");
const fs = require("fs");
const path = require("path");

module.exports = async function (deployer, network, accounts) {
  const configPath = `../configs/config.${network}.json`;

  console.log(configPath);

  const configs = require(configPath);
  console.log(configs);
  let {
    PCOG_ADDRESS,
    PROXY_ADMIN_ADDRESS,
    TRANSPARENT_PROXY_ADDRESS
  } = configs;

  console.log('PCOG_ADDRESS: ', configs.PCOG_ADDRESS);

  if (!PCOG_ADDRESS) {
    await deployer.deploy(PCOG);
    const instance = await PCOG.deployed();
    PCOG_ADDRESS = instance.address;
    console.log("2_deploy_PCOG: ", instance?.address);
    fs.writeFileSync(
      path.join(__dirname, configPath),
      JSON.stringify({ ...configs, PCOG_ADDRESS }, null, 4)
    );
  }

  console.log("PROXY_ADMIN_ADDRESS: ", PROXY_ADMIN_ADDRESS);
  if (!PROXY_ADMIN_ADDRESS) {
    await deployer.deploy(ProxyAdmin);
    const admin = await ProxyAdmin.deployed();
    PROXY_ADMIN_ADDRESS = admin.address;
    fs.writeFileSync(
      path.join(__dirname, configPath),
      JSON.stringify({ ...configs, PROXY_ADMIN_ADDRESS}, null, 4)
    );
  }

  console.log("TRANSPARENT_PROXY_ADDRESS: ", TRANSPARENT_PROXY_ADDRESS);
  if (!TRANSPARENT_PROXY_ADDRESS) {
    await deployer.deploy(TransparentUpgradeableProxy, PCOG_ADDRESS, PROXY_ADMIN_ADDRESS, []);
    const proxy = await TransparentUpgradeableProxy.deployed();
    TRANSPARENT_PROXY_ADDRESS = proxy.address;
    const PCOGAsProxy = await PCOG.at(TRANSPARENT_PROXY_ADDRESS);
    await PCOGAsProxy.initialize();
    fs.writeFileSync(
      path.join(__dirname, configPath),
      JSON.stringify({ ...configs, TRANSPARENT_PROXY_ADDRESS }, null, 4)
    );
  }
  console.log("step 0");
};

const sleep = (time) => new Promise((resolve, reject) => {
  setTimeout(resolve, time);
});