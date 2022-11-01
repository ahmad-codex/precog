const {
  BEACON_POOL,
  REWARD_FLEXIBLE,
  REWARD_APR,
  HR,
  PCOG,
  PRICE_FEED,
  TREASURY,
} = require("./config_staking.json");
module.exports = [HR, PCOG, TREASURY, BEACON_POOL, PRICE_FEED, [REWARD_APR, REWARD_FLEXIBLE]];
