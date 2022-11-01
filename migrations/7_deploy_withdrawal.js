const Precog = artifacts.require("PrecogV5");
const WithdrawalRegister = artifacts.require("WithdrawalRegister");
const fs = require("fs");
const path = require("path");

module.exports = async function (deployer, network, accounts) {
  console.log("step 5")
  sleep(20000);
  const configPath = `../configs/config.${network}.json`;

  console.log(configPath);

  const configs = require(configPath);
  console.log(configs);
  const { PRECOG_ADDRESS, WITHDRAWAL_REGISTER_ADDRESS, PRECOG_CORE_ADDRESS } = configs;

  if (!WITHDRAWAL_REGISTER_ADDRESS && PRECOG_ADDRESS && PRECOG_CORE_ADDRESS) {
    console.log(WITHDRAWAL_REGISTER_ADDRESS, PRECOG_ADDRESS, PRECOG_CORE_ADDRESS)
    await deployer.deploy(
      WithdrawalRegister,
      PRECOG_ADDRESS,
      PRECOG_CORE_ADDRESS
    );

    const PrecogContract = await Precog.at(PRECOG_ADDRESS);
    const instance = await WithdrawalRegister.deployed();

    await PrecogContract.setWithdrawalRegister(WithdrawalRegister.address);
    fs.writeFileSync(
      path.join(__dirname, configPath),
      JSON.stringify({
        ...configs,
        WITHDRAWAL_REGISTER_ADDRESS: instance.address,
      }, null, 4)
    );
    sleep(10000);
  }
};
const sleep = (time) => new Promise((resolve, reject) => {
  setTimeout(resolve, time);
});
