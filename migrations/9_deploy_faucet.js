const Faucet = artifacts.require("Faucet");

module.exports = async function (deployer, network, accounts) {
  await deployer.deploy(Faucet);
  const instance = await Faucet.deployed();
};
const sleep = (time) => new Promise((resolve, reject) => {
  setTimeout(resolve, time);
});
