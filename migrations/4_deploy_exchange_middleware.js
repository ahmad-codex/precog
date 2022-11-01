const MiddlewareExchange = artifacts.require("MiddlewareExchange");
const fs = require("fs");
const path = require("path");

module.exports = async function (deployer, network, accounts) {
  console.log("step2");
  sleep(10000);
  const configPath = `../configs/config.${network}.json`;

  console.log(configPath);

  const configs = require(configPath);
  console.log(configs);
  const { EXCHANGES, PCOG_ADDRESS, EXCHANGE_MIDDLEWARE_ADDRESS } = configs;

  console.log("PCOG_ADDRESS:", PCOG_ADDRESS);
  console.log("EXCHANGE_MIDDLEWARE_ADDRESS:", EXCHANGE_MIDDLEWARE_ADDRESS);

  if (PCOG_ADDRESS && !EXCHANGE_MIDDLEWARE_ADDRESS) {
    
    await deployer.deploy(MiddlewareExchange, EXCHANGES[0], PCOG_ADDRESS);
    const instance = await MiddlewareExchange.deployed();
    fs.writeFileSync(
      path.join(__dirname, configPath),
      JSON.stringify({ ...configs, EXCHANGE_MIDDLEWARE_ADDRESS: instance.address }, null, 4)
    );
    sleep(10000);
  }
};
const sleep = (time) => new Promise((resolve, reject) => {
  setTimeout(resolve, time);
});