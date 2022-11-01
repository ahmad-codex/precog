const Precog = artifacts.require("PrecogV5");
const fs = require("fs");
const path = require("path");

module.exports = async function (deployer, network, accounts) {
  console.log("step4")
  sleep(20000);
  const configPath = `../configs/config.${network}.json`;

  console.log(configPath);

  const configs = require(configPath);
  console.log(configs);
  const {
    PRECOG_ADDRESS,
    IPCOG_FACTORY_ADDRESS,
    PRECOG_CORE_ADDRESS,
    EXCHANGE_MIDDLEWARE_ADDRESS,
  } = configs;

  console.log("PRECOG_ADDRESS:", PRECOG_ADDRESS);
  console.log("PRECOG_CORE_ADDRESS:", PRECOG_CORE_ADDRESS);
  console.log("EXCHANGE_MIDDLEWARE_ADDRESS:", EXCHANGE_MIDDLEWARE_ADDRESS);
  console.log("IPCOG_FACTORY_ADDRESS:", IPCOG_FACTORY_ADDRESS);

  if (!PRECOG_ADDRESS && PRECOG_CORE_ADDRESS && EXCHANGE_MIDDLEWARE_ADDRESS && IPCOG_FACTORY_ADDRESS) {
    
    
    await deployer.deploy(
      Precog,
      PRECOG_CORE_ADDRESS,
      EXCHANGE_MIDDLEWARE_ADDRESS,
      IPCOG_FACTORY_ADDRESS
    );
    const instance = await Precog.deployed();
    fs.writeFileSync(
      path.join(__dirname, configPath),
      JSON.stringify({
        ...configs,
        PRECOG_ADDRESS: instance.address,
      }, null, 4)
    );
    sleep(10000);
  }
};
const sleep = (time) => new Promise((resolve, reject) => {
  setTimeout(resolve, time);
});