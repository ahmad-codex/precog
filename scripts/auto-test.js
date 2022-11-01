const Web3 = require("web3");
const Tx = require('ethereumjs-tx').Transaction;
const axios = require('axios');
require("dotenv").config({path: "./test/Kovan/.env"});
const { BigNumber } = require('bignumber.js');
const config = require("..\\..\\configs\\config.kovan.json");

// Create provider
const web3 = new Web3(new Web3.providers.WebsocketProvider("wss://speedy-nodes-nyc.moralis.io/da60e7a5af633eb47f8bf585/eth/kovan/ws"));


// Contract ABI
const precogABI = require("..\\..\\build\\contracts\\PrecogV5.json");
const precogCoreABI = require("..\\..\\build\\contracts\\PrecogCore.json");
const withdrawalRegisterABI = require("..\\..\\build\\contracts\\WithdrawalRegister.json");
const pcogABI= require("..\\..\\build\\contracts\\PCOG.json");

const ERC20 = require("..\\..\\build\\contracts\\ERC20.json");
const IExchangeRouter = require("..\\..\\build\\contracts\\IExchangeRouter.json");

// Contract address
const exchangeAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

const precogAddress = config.PRECOG_ADDRESS;
const precogCoreAddress = config.PRECOG_CORE_ADDRESS;
const pcogAddress = config.PCOG_ADDRESS;
const withdrawalRegisterAddress = config.WITHDRAWAL_REGISTER_ADDRESS;

// Get contract instance
const PRECOG = new web3.eth.Contract(precogABI.abi, precogAddress);
const PRECOG_CORE = new web3.eth.Contract(precogCoreABI.abi, precogCoreAddress);
const WITHDRAWAL_REGISTER = new web3.eth.Contract(withdrawalRegisterABI.abi, withdrawalRegisterAddress);

// Token address
const USDC = "0xb7a4f3e9097c08da09517b5ab877f7a917224ede";
const USDT = "0x45134411cC3e9B66250CD3714e2290105171671f";
const WBTC = "0xd3A691C852CDB01E281545A27064741F0B7f6825";

// Private key of account
const ADMIN_KEY = process.env.PRIVATE_KEY_ADMIN;
const MIDDLEWARE_KEY = process.env.PRIVATE_KEY_MIDDLEWARE;
const USER1_KEY = process.env.PRIVATE_KEY_USER1;
const USER2_KEY = process.env.PRIVATE_KEY_USER2;
const USER3_KEY = process.env.PRIVATE_KEY_USER3;

// Account address

const admin = web3.eth.accounts.privateKeyToAccount(ADMIN_KEY).address;
const middleware = web3.eth.accounts.privateKeyToAccount(MIDDLEWARE_KEY).address;
const user1 = web3.eth.accounts.privateKeyToAccount(USER1_KEY).address;
const user2 = web3.eth.accounts.privateKeyToAccount(USER2_KEY).address;
const user3 = web3.eth.accounts.privateKeyToAccount(USER3_KEY).address;



//Utils functions
const sleep = (time) => new Promise((resolve, reject) => {
    setTimeout(resolve, time);
});

const createTransaction = async (from, to, value, privateKey, data) => {
    const nonce = await web3.eth.getTransactionCount(from);
    value = Number(web3.utils.toWei(value.toString()))
    const price = await axios.get('https://ethgasstation.info/json/ethgasAPI.json');
    const gasPrice = price.data.average * 1e8;
    const rawTx = {
        from,
        to,
        value: value,
        gas: 0,
        gasPrice,
        nonce,
        data
    }
    rawTx.gas = await web3.eth.estimateGas(rawTx);
    const signedTx = await web3.eth.accounts.signTransaction(rawTx, privateKey);
    return signedTx.rawTransaction;
}

//ERC20
const balanceOf = async (token, account) => {
    const tokenContract = new web3.eth.Contract(ERC20.abi, token);
    const result = await tokenContract.methods.balanceOf(account).call();
    return result;
}

const approve = async (token, account, spender, amount, privateKey) => {
    const tokenContract = new web3.eth.Contract(ERC20.abi, token);
    const symbol = (await tokenContract.methods.symbol().call()).toString();
    const method = await tokenContract.methods.approve(spender, amount);
    let transaction = await createTransaction(account, token, 0, privateKey, method.encodeABI());
    const txDetail = await web3.eth.sendSignedTransaction(transaction).catch(err => {
        console.log(err)
        return;
    });
    console.log(`Account ${account} approve ${symbol} to spender ${spender} successfully`);
}

const transfer = async (token, account, to, amount, privateKey) => {
    const tokenContract = new web3.eth.Contract(ERC20.abi, token);
    const symbol = (await tokenContract.methods.symbol().call()).toString();
    const method = await tokenContract.methods.transfer(to, amount);
    let transaction = await createTransaction(account, token, 0, privateKey, method.encodeABI());
    const txDetail = await web3.eth.sendSignedTransaction(transaction).catch(err => {
        console.log(err)
        return;
    });
    console.log(`Account ${account} transfer ${amount}${symbol} to ${spender} successfully`);
}

//Uniswap
const addLiquidityExchange = async (tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin, to, deadline, account, privateKey) => {
    
    const exchangeContract = new web3.eth.Contract(IExchangeRouter.abi, exchangeAddress);
    const method = await exchangeContract.methods.addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin, to, deadline);
    
    let transaction = await createTransaction(account, exchangeAddress, 0, privateKey, method.encodeABI());
    
    const txDetail = await web3.eth.sendSignedTransaction(transaction).catch(err => {
        console.log(err.message);
        return;
    });
    console.log(`Account ${account} add liquidity of ${tokenA} & ${tokenB} successfully`);
}

//View functions
//Precog Core
const getCoreConfiguration = async () => {
    const result = await PRECOG_CORE.methods.getCoreConfiguration().call();
    return result;
}

const getCycleConfiguration = async () => {
    const result = await PRECOG_CORE.methods.getCycleConfiguration().call();
    return result;
}

const getFeeConfiguration = async () => {
    const result = await PRECOG_CORE.methods.getFeeConfiguration().call();
    return result;
}

const feeDecimalBase = async () => {
    const result = await PRECOG_CORE.methods.feeDecimalBase().call();
    return result;
}
//Precog
const calculateProfit = async (token, account) => {
    const result = await PRECOG.methods.calculateProfit(token, account).call();
    return result;
}

const claimedProfitOf = async (token, account) => {
    const result = await PRECOG.methods.claimedProfitOf(token, account).call();
    return result;
}

const currentInvestmentCycleId = async (token) => {
    const result = await PRECOG.methods.currentInvestmentCycleId(token).call();
    return result;
}

const currentProfitCycleId = async (token) => {
    const result = await PRECOG.methods.currentProfitCycleId(token).call();
    return result;
}

const getCurrentProfitCycle = async (token) => {
    const result = await PRECOG.methods.getCurrentProfitCycle(token).call();
    return result;
}

const getExistingTokenByIndex = async (index) => {
    const result = await PRECOG.methods.getExistingTokenByIndex(index).call();
    return result;
}

const getExistingTokens = async (index) => {
    const result = await PRECOG.methods.getExistingTokens().call();
    return result;
}

const investmentOf = async (token, account) => {
    const result = await PRECOG.methods.investmentOf(token, account).call();
    return result;
}

const lastProfitCycleId = async (token, account) => {
    const result = await PRECOG.methods.lastProfitCycleId(token, account).call();
    return result;
}

const liquidity = async (token) => {
    const result = await PRECOG.methods.liquidity(token).call();
    return result;
}

const profit = async (token, index) => {
    const result = await PRECOG.methods.profit(token, index).call();
    return result;
}

const profitCycles = async (token, index) => {
    const result = await PRECOG.methods.profitCycles(token, index).call();
    return result;
}

const profitOf = async (token, account) => {
    const result = await PRECOG.methods.profitOf(token, account).call();
    return result;
}

const tokenConvert = async (token) => {
    const result = await PRECOG.methods.tokenConvert(token).call();
    return result;
}

const totalInvestmentsUnits = async (token, profitCycleId) => {
    const result = await PRECOG.methods.totalInvestmentUnits(USDC, profitCycleId).call();
    return result;
}

//WithdrawalRegister
const register = async (token, account) => {
    const result = await WITHDRAWAL_REGISTER.methods.register(token, account).call();
    return result;
}

const isInDeadline = async (token, account) => {
    const result = await WITHDRAWAL_REGISTER.methods.isInDeadline(token, account).call();
    return result;
}

//Admin functions
//PrecogCore
const setCoreConfiguration = async (config, account, privateKey) => {
    let method = await PRECOG_CORE.methods.setCoreConfiguration(config);
    let transaction = await createTransaction(account, precogCoreAddress, 0, privateKey, method.encodeABI());
    const txDetail = await web3.eth.sendSignedTransaction(transaction).catch(err => {
        console.log(err)
        return;
    });
    console.log(`Set cycle configuration for Precog Core successfully`);
}

const setCycleConfiguration = async (config, account, privateKey) => {
    let method = await PRECOG_CORE.methods.setCycleConfiguration(config);
    let transaction = await createTransaction(account, precogCoreAddress, 0, privateKey, method.encodeABI());
    const txDetail = await web3.eth.sendSignedTransaction(transaction).catch(err => {
        console.log(err)
        return;
    });
    console.log(`Set cycle configuration for Precog Core successfully`);
}

const setFeeConfiguration = async () => {
    let method = await PRECOG_CORE.methods.setFeeConfiguration(config);
    let transaction = await createTransaction(account, precogCoreAddress, 0, privateKey, method.encodeABI());
    const txDetail = await web3.eth.sendSignedTransaction(transaction).catch(err => {
        console.log(err)
        return;
    });
    console.log(`Set cycle configuration for Precog Core successfully`);
}

//Precog
const addLiquidityPool = async (token, account, privateKey) => {
    let method = await PRECOG.methods.addLiquidityPool(token);
    let transaction = await createTransaction(account, precogAddress, 0, privateKey, method.encodeABI());
    const txDetail = await web3.eth.sendSignedTransaction(transaction).catch(err => {
        console.log(err)
        return;
    });
    console.log(`Account ${account} add liquidity in Precog successfully`);
}

const removeLiquidity = async (token, account, privateKey) => {
    let method = await PRECOG.methods.removeLiquidity(token);
    let transaction = await createTransaction(account, precogAddress, 0, privateKey, method.encodeABI());
    const txDetail = await web3.eth.sendSignedTransaction(transaction).catch(err => {
        console.log(err)
        return;
    });
    console.log(`Account ${account} remove liquidity from Precog successfully`);
}


//Middleware functions
const takeInvestment = async (token, account, privateKey) => {
    let method = await PRECOG.methods.takeInvestment(token);
    let transaction = await createTransaction(account, precogAddress, 0, privateKey, method.encodeABI());
    const txDetail = await web3.eth.sendSignedTransaction(transaction).catch(err => {
        console.log(err)
        return;
    });
    console.log(`Account ${account} take investment to Precog successfully`);
}

const sendProfit = async (token, amount, account, privateKey) => {
    let method = await PRECOG.methods.sendProfit(token, amount);
    let transaction = await createTransaction(account, precogAddress, 0, privateKey, method.encodeABI());
    const txDetail = await web3.eth.sendSignedTransaction(transaction).catch(err => {
        console.log(err)
        return;
    });
    console.log(`Account ${account} send profit to Precog successfully`);
}

// User functions
const deposit = async (token, amount, account, privateKey) => {
    let method = await PRECOG.methods.deposit(token, amount);
    let transaction = await createTransaction(account, precogAddress, 0, privateKey, method.encodeABI());
    const txDetail = await web3.eth.sendSignedTransaction(transaction).catch(err => {
        console.log(err)
        return;
    });
    console.log(`Account ${account} deposit to Precog successfully`);
}

const takeProfit = async (token, to, account, privateKey) => {
    let method = await PRECOG.methods.takeProfit(to, token);
    let transaction = await createTransaction(account, precogAddress, 0, privateKey, method.encodeABI());
    const txDetail = await web3.eth.sendSignedTransaction(transaction).catch(err => {
        console.log(err)
        return;
    });
    console.log(`Account ${account} take profit from Precog successfully`);
}

const requestWithdrawal = async (token, amount, account, privateKey) => {
    let method = await PRECOG.methods.requestWithdrawal(token, amount);
    let transaction = await createTransaction(account, precogAddress, 0, privateKey, method.encodeABI());
    const txDetail = await web3.eth.sendSignedTransaction(transaction).catch(err => {
        console.log(err)
        return;
    });
    console.log(`Account ${account} request withdrawal token from Precog successfully`);
}

const withdraw = async (token, to, amount, account, privateKey) => {
    let method = await PRECOG.methods.withdraw(to, token, amount);
    let transaction = await createTransaction(account, precogAddress, 0, privateKey, method.encodeABI());
    const txDetail = await web3.eth.sendSignedTransaction(transaction).catch(err => {
        console.log(err)
        return;
    });
    console.log(`Account ${account} withdraw token from Precog successfully`);
}


//Test case
const approveToContract = async (token) => {
    await approve(token, admin, exchangeAddress, "0xfffffffffffffffffffffffffffffff", ADMIN_KEY);
    await approve(token, admin, precogAddress, "0xfffffffffffffffffffffffffffffff", ADMIN_KEY);
    await approve(token, user1, precogAddress, "0xfffffffffffffffffffffffffffffff", USER1_KEY);
    await approve(token, user2, precogAddress, "0xfffffffffffffffffffffffffffffff", USER2_KEY);
    await approve(token, user3, precogAddress, "0xfffffffffffffffffffffffffffffff", USER3_KEY);
}

const configContract = async () => {
    let currentTimestamp = Math.floor(new Date().getTime()/1000.0);
    console.log("currentTimestamp:", currentTimestamp);
    const nextTimestamp = currentTimestamp + 2592000;

    // await approve(pcogAddress, admin, exchangeAddress, "0xfffffffffffffffffffffffffffffff", ADMIN_KEY);
    //await approveToContract(USDC);
    // //await approveToContract(USDT);
    // //await approveToContract(WBTC);
    // await addLiquidityExchange(USDC, pcogAddress, BigNumber(6e6).times(1e6), BigNumber(1e7).times(1e18), BigNumber(6e6).times(1e6), BigNumber(1e7).times(1e18), admin, nextTimestamp, admin, ADMIN_KEY);
    // //await addLiquidityExchange(USDT, pcogAddress, BigNumber(6e6).times(1e6), BigNumber(1e7).times(1e18), BigNumber(6e6).times(1e6), BigNumber(1e7).times(1e18), admin, nextTimestamp, admin, ADMIN_KEY);
    // //await addLiquidityExchange(WBTC, pcogAddress, BigNumber(100).times(1e8), BigNumber(67e5).times(1e18), BigNumber(100).times(1e8), BigNumber(67e5).times(1e18), admin, nextTimestamp, admin, ADMIN_KEY);

    await setCycleConfiguration([259200, 86400, 86400, 604800], admin, ADMIN_KEY);
    //await setCycleConfiguration([900, 600, 450, 300, 600], admin, ADMIN_KEY);
    await addLiquidityPool(USDC, admin, ADMIN_KEY);
    await addLiquidityPool(USDT, admin, ADMIN_KEY);
    await addLiquidityPool(WBTC, admin, ADMIN_KEY);

    //const tokenConvertOfUSDC = await tokenConvert(USDC);
    //const tokenConvertOfUSDT = (await tokenConvert(USDT)).toString();
    //const tokenConvertOfWBTC = await tokenConvert(WBTC);

    //await approveToContract(tokenConvertOfUSDC);
    //await approveToContract(tokenConvertOfUSDT);
    //await approveToContract(tokenConvertOfWBTC);

    // currentTimestamp = Math.floor(new Date().getTime()/1000.0);
    // console.log("currentTimestamp:", currentTimestamp);
    // const cycleConfiguration = await getCycleConfiguration();
    // const profitCycleOfUSDC = await getCurrentProfitCycle(USDC);
    // //const profitCycleOfUSDT = await getCurrentProfitCycle(USDT);
    // const profitCycleOfWBTC = await getCurrentProfitCycle(WBTC);

    // assert.equal(USDC, (await getExistingTokenByIndex(0)).toString(), "USDC was not added to pool");
    // //assert.equal(USDT, (await getExistingTokenByIndex(1)).toString(), "USDT was not added to pool");
    // assert.equal(WBTC, (await getExistingTokenByIndex(2)).toString(), "WBTC was not added to pool");
    // assert.equal(profitCycleOfUSDC.endTime - profitCycleOfUSDC.startTime, cycleConfiguration.firstInvestmentCycle, "USDC pool was not applied the cycle config");
    // //assert.equal(profitCycleOfUSDT.endTime - profitCycleOfUSDT.startTime, cycleConfiguration.firstInvestmentCycle, "USDT pool was not applied the cycle config");
    // assert.equal(profitCycleOfWBTC.endTime - profitCycleOfWBTC.startTime, cycleConfiguration.firstInvestmentCycle, "WBTC pool was not applied the cycle config");
}

const runCycle0 = async () => {
    const currentProfitCycle = await getCurrentProfitCycle(USDC);
    const feeConfig = await getFeeConfiguration();
    const feeDecimalBase = await feeDecimalBase();
    const IPCOGOfUSDC = (await tokenConvert(USDC)).toString();
    const formerLiquidityUSDC = await liquidity(USDC);
    const formerUSDCBalanceOfPrecog = await balanceOf(USDC, precogAddress);
    const formerUSDCBalanceOfPrecogCore = await balanceOf(USDC, precogCoreAddress);
    const formerUSDCBalanceOfUser1 = await balanceOf(USDC, user1);
    const formerIPCOGBalanceOfUser1 = await balanceOf(IPCOGOfUSDC, user1);

    const depositAmount = BigNumber(1e3).times(1e6);
    const feeAmount = depositAmount.sub(depositAmount.mul(feeConfig.depositFee).div(feeDecimalBase.toString()));
    const actualDepositAmount = depositAmount.sub(feeAmount);

    await deposit(USDC, depositAmount, user1, USER1_KEY);
    const laterLiquidityUSDC = await liquidity(USDC);
    const laterUSDCBalanceOfPrecog = await balanceOf(USDC, precogAddress);
    const laterUSDCBalanceOfPrecogCore = await balanceOf(USDC, precogCoreAddress);
    const laterUSDCBalanceOfUser1 = await balanceOf(USDC, user1);
    const laterIPCOGBalanceOfUser1 = await balanceOf(IPCOGOfUSDC, user1);

    const currentTimestamp = Math.floor(new Date().getTime()/1000.0);
    assert.equal(currentProfitCycle.id, 0, "Profit cycle id must equal 0");
    assert.equal(Number(formerUSDCBalanceOfPrecog) + Number(actualDepositAmount), Number(laterUSDCBalanceOfPrecog), "USDC was charged from Precog wrong fee");
    assert.equal(Number(formerUSDCBalanceOfPrecogCore) + Number(feeAmount), Number(laterUSDCBalanceOfPrecogCore), "USDC was charged to PrecogCore wrong fee");
    assert.equal(
        Number(laterIPCOGBalanceOfUser1) - Number(formerIPCOGBalanceOfUser1), 
        Number(formerUSDCBalanceOfUser1) - Number(laterUSDCBalanceOfUser1) - Number(feeAmount), 
        "USDC was charged for PrecogCore wrong fee"
    );
    assert.equal(Number(formerLiquidityUSDC) + Number(actualDepositAmount), laterLiquidityUSDC, "Liquidity of USDC increase wrong value");
    if(currentTimestamp < currentProfitCycle.endTime) {
        sleep(currentProfitCycle.endTime - currentTimestamp);
    }
}

const runCycle1 = async () => {
    const currentProfitCycle = await getCurrentProfitCycle(USDC);
    const feeConfig = await getFeeConfiguration();
    const feeDecimalBase = await feeDecimalBase();
    const IPCOGOfUSDC = (await tokenConvert(USDC)).toString();

    const formerLiquidityUSDC = await liquidity(USDC);

    const formerUSDCBalanceOfPrecog = await balanceOf(USDC, precogAddress);
    const formerUSDCBalanceOfPrecogCore = await balanceOf(USDC, precogCoreAddress);
    const formerUSDCBalanceOfUser2 = await balanceOf(USDC, user2);
    const formerIPCOGBalanceOfUser2 = await balanceOf(IPCOGOfUSDC, user2);

    const depositAmount = BigNumber(1e3).times(1e6);
    const feeAmount = depositAmount.sub(depositAmount.mul(feeConfig.depositFee).div(feeDecimalBase.toString()));
    const actualDepositAmount = depositAmount.sub(feeAmount);

    await deposit(USDC, depositAmount, user2, USER2_KEY);

    const laterLiquidityUSDC = await liquidity(USDC);

    const laterUSDCBalanceOfPrecog = await balanceOf(USDC, precogAddress);
    const laterUSDCBalanceOfPrecogCore = await balanceOf(USDC, precogCoreAddress);
    const laterUSDCBalanceOfUser2 = await balanceOf(USDC, user2);
    const laterIPCOGBalanceOfUser2 = await balanceOf(IPCOGOfUSDC, user2);

    const currentTimestamp = Math.floor(new Date().getTime()/1000.0);
    assert.equal(currentProfitCycle.id, 1, "Profit cycle id must equal 1");
    assert.equal(Number(formerUSDCBalanceOfPrecog) + Number(actualDepositAmount), Number(laterUSDCBalanceOfPrecog), "USDC was charged from Precog wrong fee");
    assert.equal(Number(formerUSDCBalanceOfPrecogCore) + Number(feeAmount), Number(laterUSDCBalanceOfPrecogCore), "USDC was charged to PrecogCore wrong fee");
    assert.equal(
        Number(laterIPCOGBalanceOfUser2) - Number(formerIPCOGBalanceOfUser2), 
        Number(formerUSDCBalanceOfUser2) - Number(laterUSDCBalanceOfUser2) - Number(feeAmount), 
        "USDC was charged for PrecogCore wrong fee"
    );
    assert.equal(Number(formerLiquidityUSDC) + Number(actualDepositAmount), laterLiquidityUSDC, "Liquidity of USDC increase wrong value");
    if(currentTimestamp < currentProfitCycle.endTime) {
        sleep(currentProfitCycle.endTime - currentTimestamp);
    }
}

const runCycle2 = async () => {
    await setCycleConfiguration([100, 100, 200, 200, 200], admin, ADMIN_KEY);
    const currentProfitCycle = await getCurrentProfitCycle(USDC);
    const feeConfig = await getFeeConfiguration();
    const feeDecimalBase = await feeDecimalBase();
    const IPCOGOfUSDC = (await tokenConvert(USDC)).toString();
    const formerLiquidityUSDC = await liquidity(USDC);
    const formerUSDCBalanceOfPrecog = await balanceOf(USDC, precogAddress);
    const formerUSDCBalanceOfPrecogCore = await balanceOf(USDC, precogCoreAddress);
    const formerUSDCBalanceOfUser2 = await balanceOf(USDC, user2);
    const formerIPCOGBalanceOfUser2 = await balanceOf(IPCOGOfUSDC, user2);

    const depositAmount = BigNumber(1e3).times(1e6);
    const feeAmount = depositAmount.sub(depositAmount.mul(feeConfig.depositFee).div(feeDecimalBase.toString()));
    const actualDepositAmount = depositAmount.sub(feeAmount);

    await deposit(USDC, depositAmount, user2, USER2_KEY);
    const laterLiquidityUSDC = await liquidity(USDC);
    const laterUSDCBalanceOfPrecog = await balanceOf(USDC, precogAddress);
    const laterUSDCBalanceOfPrecogCore = await balanceOf(USDC, precogCoreAddress);
    const laterUSDCBalanceOfUser2 = await balanceOf(USDC, user2);
    const laterIPCOGBalanceOfUser2 = await balanceOf(IPCOGOfUSDC, user2);

    const currentTimestamp = Math.floor(new Date().getTime()/1000.0);
    assert.equal(currentProfitCycle.id, 1, "Profit cycle id must equal 1");
    assert.equal(Number(formerUSDCBalanceOfPrecog) + Number(actualDepositAmount), Number(laterUSDCBalanceOfPrecog), "USDC was charged from Precog wrong fee");
    assert.equal(Number(formerUSDCBalanceOfPrecogCore) + Number(feeAmount), Number(laterUSDCBalanceOfPrecogCore), "USDC was charged to PrecogCore wrong fee");
    assert.equal(
        Number(laterIPCOGBalanceOfUser2) - Number(formerIPCOGBalanceOfUser2), 
        Number(formerUSDCBalanceOfUser2) - Number(laterUSDCBalanceOfUser2) - Number(feeAmount), 
        "USDC was charged for PrecogCore wrong fee"
    );
    assert.equal(Number(formerLiquidityUSDC) + Number(actualDepositAmount), laterLiquidityUSDC, "Liquidity of USDC increase wrong value");
    if(currentTimestamp < currentProfitCycle.endTime) {
        sleep(currentProfitCycle.endTime - currentTimestamp);
    }
}

const runCycle3 = async () => {
    const currentProfitCycle = await getCurrentProfitCycle(USDC);
    const IPCOGOfUSDC = (await tokenConvert(USDC)).toString();
    const balanceIPCOGUser1 = await balanceOf(IPCOGOfUSDC, user1);
    const balanceIPCOGUser2 = await balanceOf(IPCOGOfUSDC, user2);
    const balanceIPCOGUser3 = await balanceOf(IPCOGOfUSDC, user3);
    const totalRequestedWithdrawal = Number(balanceIPCOGUser1) + Number(balanceIPCOGUser2) + Number(balanceIPCOGUser3);
    const formerLiquidityUSDC = await liquidity(USDC);

    await requestWithdrawal(USDC, balanceIPCOGUser1.toString(), user1, USER1_KEY);
    await requestWithdrawal(USDC, balanceIPCOGUser2.toString(), user2, USER2_KEY);
    await requestWithdrawal(USDC, balanceIPCOGUser3.toString(), user3, USER3_KEY);
    await transfer(USDC, middleware, withdrawalRegisterAddress, totalRequestedWithdrawal, MIDDLEWARE_KEY);

    const laterLiquidityUSDC = await liquidity(USDC);
    const laterBalanceUSDCWithdrawalRegister = await balanceOf(USDC, withdrawalRegisterAddress);
    
    assert.equal(Number(formerLiquidityUSDC), totalRequestedWithdrawal, "Total requested withdrawal must be equal USDC liquidity");
    assert.equal(laterLiquidityUSDC, 0, "Users did not request all USDC liquidity pool");
    assert.equal(Number(laterBalanceUSDCWithdrawalRegister), totalRequestedWithdrawal, "Middleware did not send ");
    const currentTimestamp = Math.floor(new Date().getTime()/1000.0);
    if(currentTimestamp < currentProfitCycle.endTime) {
        sleep(currentProfitCycle.endTime - currentTimestamp);
    }
}

const runCycle4 = async () => {
    const currentProfitCycle = await getCurrentProfitCycle(USDC);
    const IPCOGOfUSDC = (await tokenConvert(USDC)).toString();
    const formerBalanceIPCOGUser1 = await balanceOf(IPCOGOfUSDC, user1);
    const formerBalanceIPCOGUser2 = await balanceOf(IPCOGOfUSDC, user2);
    const formerBalanceIPCOGUser3 = await balanceOf(IPCOGOfUSDC, user3);
    const formerBalanceUSDCUser1 = await balanceOf(USDC, user1);
    const formerBalanceUSDCUser2 = await balanceOf(USDC, user2);
    const formerBalanceUSDCUser3 = await balanceOf(USDC, user3);

    await withdraw(USDC, formerBalanceIPCOGUser1.toString(), user1, USER1_KEY);
    await withdraw(USDC, formerBalanceIPCOGUser2.toString(), user2, USER2_KEY);
    await withdraw(USDC, formerBalanceIPCOGUser3.toString(), user3, USER3_KEY);

    const laterBalanceIPCOGUser1 = await balanceOf(IPCOGOfUSDC, user1);
    const laterBalanceIPCOGUser2 = await balanceOf(IPCOGOfUSDC, user2);
    const laterBalanceIPCOGUser3 = await balanceOf(IPCOGOfUSDC, user3);
    const laterBalanceUSDCUser1 = await balanceOf(USDC, user1);
    const laterBalanceUSDCUser2 = await balanceOf(USDC, user2);
    const laterBalanceUSDCUser3 = await balanceOf(USDC, user3);
    const currentTimestamp = Math.floor(new Date().getTime()/1000.0);
    if(currentTimestamp < currentProfitCycle.endTime) {
        sleep(currentProfitCycle.endTime - currentTimestamp);
    }
}

const runCycle5 = async () => {
    const currentProfitCycle = await getCurrentProfitCycle(USDC);
    const profitAmount = BigNumber(1e4).times(1e6);
    await sendProfit(USDC, profitAmount, admin, ADMIN_KEY);
    await sendProfit(USDC, profitAmount, admin, ADMIN_KEY);
    await sendProfit(USDC, profitAmount, admin, ADMIN_KEY);
    await takeProfit(USDC, user1, user1, USER1_KEY);
    await takeProfit(USDC, user2, user2, USER2_KEY);
    await takeProfit(USDC, user3, user3, USER3_KEY);
    const currentTimestamp = Math.floor(new Date().getTime()/1000.0);
    if(currentTimestamp < currentProfitCycle.endTime) {
        sleep(currentProfitCycle.endTime - currentTimestamp);
    }

}

const runCycle6 = async () => {
    const currentProfitCycle = await getCurrentProfitCycle(USDC);
    const profitAmount = BigNumber(1e4).times(1e6);
    await sendProfit(USDC, profitAmount, admin, ADMIN_KEY);
    const currentTimestamp = Math.floor(new Date().getTime()/1000.0);
    if(currentTimestamp < currentProfitCycle.endTime) {
        sleep(currentProfitCycle.endTime - currentTimestamp);
    }
}

const runCycle7 = async () => {
    await takeProfit();
    await takeProfit();
    await takeProfit();
}

const runCycle8 = async () => {
    await deposit(USDC, BigNumber(1e3).times(1e6), user1, USER1_KEY);
    await deposit(USDC, BigNumber(1e3).times(1e6), user2, USER2_KEY);
    await deposit(USDC, BigNumber(1e3).times(1e6), user3, USER3_KEY);
}

const runCycle9 = async () => {
    await sendProfit();
    await sendProfit();
    await sendProfit();
    await sendProfit();
}

const runCycle10 = async () => {

}

const runCycle11 = async () => {

}

const runCycle12 = async () => {

}

const runCycle13 = async () => {

}

const runCycle14 = async () => {

}

const runCycle15 = async () => {

}

const runCycle16 = async () => {

}

const main = async () => {
    await configContract();
    // await runCycle0();
    // await runCycle1();
    // await runCycle2();
    // await runCycle3();
    // await runCycle4();
    // await runCycle5();
    // await runCycle6();
}




main()