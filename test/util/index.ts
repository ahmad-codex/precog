import { network } from "hardhat";

export async function timeForward(timespan: number) {
  await network.provider.send("evm_increaseTime", [timespan]);
  await network.provider.send("evm_mine");
}
