const IPCOGFactory = artifacts.require("IPCOGFactory");
const fs = require("fs");
const path = require("path");

module.exports = async function (deployer, network, accounts) {
  console.log("step 3")
  sleep(20000);
  const configPath = `../configs/config.${network}.json`;

  console.log(configPath);

  const configs = require(configPath);
  console.log(configs);
  const { IPCOG_FACTORY_ADDRESS } = configs;

  console.log("IPCOG_FACTORY_ADDRESS:", IPCOG_FACTORY_ADDRESS)
  if (!IPCOG_FACTORY_ADDRESS) {
    
    await deployer.deploy(IPCOGFactory);
    const instance = await IPCOGFactory.deployed();
    fs.writeFileSync(
      path.join(__dirname, configPath),
      JSON.stringify({
        ...configs,
        IPCOG_FACTORY_ADDRESS: instance.address,
      }, null, 4)
    );
    sleep(10000);
  }
};
const sleep = (time) => new Promise((resolve, reject) => {
  setTimeout(resolve, time);
});
