import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { HumanResource, HumanResource__factory } from "../../typechain";

describe("HR test", async () => {
  let hr: HumanResource, superAdmin: SignerWithAddress, middleware: SignerWithAddress;
  let defaultRole: string, middlewareRole: string;

  before(async () => {
    [superAdmin, middleware] = await ethers.getSigners();

    const HumanResource = (await ethers.getContractFactory("HumanResource")) as HumanResource__factory;
    hr = await HumanResource.deploy();

    [defaultRole, middlewareRole] = await Promise.all([hr.DEFAULT_ADMIN_ROLE(), hr.MIDDLEWARE_ROLE()]);
  });

  it("deployer should be supper admin", async () => {
    const hasRole = await hr.hasRole(defaultRole, superAdmin.address);
    expect(hasRole, "deployer is not a super admin");
  });

  it("could not set without create role", async () => {
    await hr.grantRole(middlewareRole, middleware.address);
    const hasRole = await hr.hasRole(middlewareRole, middleware.address);
    expect(hasRole, "failed to assign a middleware");
  });
});
