var HDWalletProvider = require("@truffle/hdwallet-provider");
const { MNEMONIC, ETHERSCAN, BSCSCAN, POLYGONSCAN, AVALANCHE } = require('./configs/config.matic.json');
const DEV_NODE = "http://127.0.0.1:8545";
const MAINNET_NODE = "wss://mainnet.infura.io/ws/v3/d9c7dc35d6a3442ab74338c9632800cb";
const ROPSTEN_NODE = "wss://ropsten.infura.io/ws/v3/d9c7dc35d6a3442ab74338c9632800cb";
const RINKEBY_NODE = "wss://rinkeby.infura.io/ws/v3/d9c7dc35d6a3442ab74338c9632800cb";
const GOERLI_NODE = "wss://goerli.infura.io/ws/v3/d9c7dc35d6a3442ab74338c9632800cb";
const KOVAN_NODE = "wss://kovan.infura.io/ws/v3/fa2c933405b54431977fb3261340dca4";
const BSCTEST_NODE = "https://bsc-testnet.nodereal.io/v1/883058b76e9a4f1e904bf05b0f37767d";
const BSCMAIN_NODE = "https://bsc-dataseed1.binance.org";
const MATIC_NODE = "https://speedy-nodes-nyc.moralis.io/55a7b0b40e32436d43f49550/polygon/mumbai";
const AVALANCHE_FUJI_NODE = "wss://speedy-nodes-nyc.moralis.io/da60e7a5af633eb47f8bf585/avalanche/testnet/ws";

module.exports =
{
    plugins: [
        'truffle-plugin-verify',
        'truffle-contract-size'
    ],
    api_keys: {
        etherscan: ETHERSCAN,
        bscscan: BSCSCAN,
        polygonscan: POLYGONSCAN,
        snowtrace: AVALANCHE
    },
    networks: {
        development: {
            host: "localhost",
            port: 7545,
            network_id: "*", 		// Match any network id,
            gasPrice: 8000000000, 	// 8 Gwei
        },
        localhost: {
            provider: () => new HDWalletProvider(MNEMONIC, DEV_NODE),
            network_id: "7777",
            gas: 7700000,
            gasPrice: 20000000000, // 8 Gwei
            skipDryRun: true,
        },
        mainnet: {
            provider: () => new HDWalletProvider(MNEMONIC, MAINNET_NODE),
            network_id: '1',
            gasPrice: 8000000000, // 8 Gwei
        },
        ropsten: {
            provider: () => new HDWalletProvider(MNEMONIC, ROPSTEN_NODE),
            network_id: '3',
            gasPrice: 8000000000, // 8 Gwei
            skipDryRun: true
        },
        rinkeby: {
            provider: () => new HDWalletProvider(MNEMONIC, RINKEBY_NODE),
            network_id: '4',
            gasPrice: 8000000000, // 8 Gwei
        },
        goerli: {
            provider: () => new HDWalletProvider(MNEMONIC, GOERLI_NODE),
            network_id: '5',
            gasPrice: 2000000000, // 8 Gwei
            confirmations: 1,
            networkCheckTimeout: 1000000,
            timeoutBlocks: 200,
            skipDryRun: true,
        },
        kovan: {
            provider: () => new HDWalletProvider(MNEMONIC, KOVAN_NODE),
            network_id: '42',
            gasPrice: 3100000000, // 30 Gwei
            confirmations: 1,
            networkCheckTimeout: 1000000,
            timeoutBlocks: 200,
            skipDryRun: true,
        },
        bsc_test: {
            provider: () => new HDWalletProvider(MNEMONIC, BSCTEST_NODE),
            network_id: '97',
            gasPrice: 2100000000, // 30 Gwei
            confirmations: 1,
            skipDryRun: true,
        },
        bsc_main: {
            provider: () => new HDWalletProvider(MNEMONIC, BSCMAIN_NODE),
            network_id: '56',
            confirmations: 1,
            skipDryRun: true,
        },
        matic: {
            provider: () => new HDWalletProvider(MNEMONIC, MATIC_NODE),
            network_id: '80001',
            gasPrice: 3100000000, // 30 Gwei
            confirmations: 1,
            networkCheckTimeout: 1000000,
            timeoutBlocks: 200,
            skipDryRun: true,
        },
        avalanche_fuji: {
            provider: () => new HDWalletProvider(MNEMONIC, AVALANCHE_FUJI_NODE),
            network_id: '43113',
            gas: 8000000,
            gasPrice: 31000000000, // 30 Gwei
            confirmations: 1,
            networkCheckTimeout: 1000000,
            timeoutBlocks: 200,
            skipDryRun: true,
        },

    },
    compilers: {
        solc: {
            version: "0.8.2",
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200
                }
            }
        }
    },
    mocha: {
        enableTimeouts: false
    }
};
