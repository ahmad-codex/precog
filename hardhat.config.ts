import "@nomicfoundation/hardhat-chai-matchers";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@openzeppelin/hardhat-upgrades";
import "@typechain/hardhat";
import dotenv from "dotenv";
import { HardhatUserConfig, task } from "hardhat/config";
import "solidity-coverage";

dotenv.config();

const alchemyKey = process.env.ALCHEMY_KEY || "JeJeC1gysWFNWnSyXKxPgFGWEHah66ej";
const mnemonic =
  process.env.MNEMONIC || "toy humor uniform perfect estate wealth maze oil delay pupil stock emotion";
const etherscanAPI = process.env.ETHERSCAN_API || "abcdefghijklmnopqrstuvwxyz12345678";
const bscscanAPI = process.env.BSCSCAN_API || "abcdefghijklmnopqrstuvwxyz12345678";
const polygonscanAPI = process.env.POLYGONSCAN_API || "abcdefghijklmnopqrstuvwxyz12345678";
/**
 * @type import('hardhat/config').HardhatUserConfig
 */

const config: HardhatUserConfig = {
  etherscan: {
    apiKey: {
      mainnet: etherscanAPI,
      ropsten: etherscanAPI,
      rinkeby: etherscanAPI,
      goerli: etherscanAPI,
      kovan: etherscanAPI,
      // binance smart chain
      bsc: bscscanAPI,
      bscTestnet: bscscanAPI,
      // polygon
      polygon: polygonscanAPI,
      polygonMumbai: polygonscanAPI,
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.10",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.4.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
  mocha: {
    timeout: 60000,
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    hardhat: {
      chainId: 4,
      forking: {
        url: `https://eth-mainnet.alchemyapi.io/v2/${alchemyKey}`,
      },
      gasPrice: "auto",
      accounts: {
        mnemonic,
        count: 10,
        accountsBalance: "100000000000000000000",
      },
    },
    mainnet: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${alchemyKey}`,
      chainId: 1,
      gasPrice: 20000000000,
      accounts: { mnemonic },
    },
    kovan: {
      url: `https://kovan.infura.io/v3/5de468e6d1484fd9b683578243a7b569`,
      chainId: 42,
      gasPrice: "auto",
      accounts: { mnemonic },
    },
    goerli: {
      url: `https://eth-goerli.g.alchemy.com/v2/${alchemyKey}`,
      chainId: 5,
      gasPrice: "auto",
      accounts: { mnemonic },
    },
    mumbai: {
      url: `https://polygon-mumbai.g.alchemy.com/v2/${alchemyKey}`,
      chainId: 80001,
      gasPrice: "auto",
      accounts: { mnemonic },
    },
    matic: {
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: { mnemonic },
    },
  },
};
module.exports = config;

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});
