const PrecogCore = artifacts.require("PrecogCore");
const fs = require("fs");
const path = require("path");


module.exports = async function (deployer, network, accounts) {
  sleep(10000);
  const configPath = `../configs/config.${network}.json`;

  console.log(configPath);

  const configs = require(configPath);
  console.log(configs);
  const {
    EXCHANGES,
    PCOG_ADDRESS,
    PRECOG_CORE_ADDRESS,
  } = configs;

  console.log("PCOG_ADDRESS:", PCOG_ADDRESS);
  console.log("PRECOG_CORE_ADDRESS:", PRECOG_CORE_ADDRESS);

  if (PCOG_ADDRESS && !PRECOG_CORE_ADDRESS) {
    
    await deployer.deploy(
      PrecogCore,
      "0x6c5c265cbd5921716754ca42369a7dc5bb05f42a",
      "0x6c5c265cbd5921716754ca42369a7dc5bb05f42a",
      PCOG_ADDRESS,
      EXCHANGES[0]
    );
    const instance = await PrecogCore.deployed();
    fs.writeFileSync(
      path.join(__dirname, configPath),
      JSON.stringify({ ...configs, PRECOG_CORE_ADDRESS: instance.address }, null, 4)
    );
    
  }
  console.log("step 1")
};
const sleep = (time) => new Promise((resolve, reject) => {
  setTimeout(resolve, time);
});