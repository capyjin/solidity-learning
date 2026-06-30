import hre from "hardhat";
import { expect } from "chai";
import { MyToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const decimals = 18;
const mintingAmount = 100n;

describe("My token", () => {
  let myTokenC: MyToken;
  let signers: HardhatEthersSigner[];

  beforeEach("should deploy", async () => {
    signers = await hre.ethers.getSigners();

    myTokenC = await hre.ethers.deployContract("MyToken", [
      "MyToken",
      "MT",
      decimals,
      mintingAmount,
    ]);
  });

  describe("Basic state value check", () => {
    it("should return name", async () => {
      expect(await myTokenC.name()).equal("MyToken");
    });

    it("should return symbol", async () => {
      expect(await myTokenC.symbol()).equal("MT");
    });

    it("should return decimals", async () => {
      expect(await myTokenC.decimals()).equal(decimals);
    });

    it("should return 100 totalSupply", async () => {
      expect(await myTokenC.totalSupply()).equal(
        mintingAmount * 10n ** BigInt(decimals)
      );
    });
  });

  describe("Mint", () => {
    it("should have 100MT balance for signer0", async () => {
      const signer0 = signers[0];

      expect(await myTokenC.balanceOf(signer0.address)).equal(
        mintingAmount * 10n ** BigInt(decimals)
      );
    });

    it("should be reverted when non-manager tries to mint", async () => {
      const hacker = signers[2];
      const mintingAgainAmount = hre.ethers.parseUnits("10000", decimals);

      await expect(
        myTokenC.connect(hacker).mint(mintingAgainAmount, hacker.address)
      ).to.be.revertedWith("You are not authorized to manage this contract");
    });
  });

  describe("Transfer", () => {
    it("should have 0.5MT", async () => {
      const signer0 = signers[0];
      const signer1 = signers[1];
      const amount = hre.ethers.parseUnits("0.5", decimals);

      await expect(myTokenC.transfer(amount, signer1.address))
        .to.emit(myTokenC, "Transfer")
        .withArgs(signer0.address, signer1.address, amount);

      expect(await myTokenC.balanceOf(signer1.address)).equal(amount);
    });

    it("should be reverted when trying to transfer more than 100 MT", async () => {
      const signer1 = signers[1];

      await expect(
        myTokenC.transfer(
          hre.ethers.parseUnits((mintingAmount + 1n).toString(), decimals),
          signer1.address
        )
      ).to.be.revertedWith("insufficient balance");
    });
  });

  describe("TransferFrom", () => {
    it("should emit Approval event", async () => {
      const signer1 = signers[1];
      const amount = hre.ethers.parseUnits("10", decimals);

      await expect(myTokenC.approve(signer1.address, amount))
        .to.emit(myTokenC, "Approval")
        .withArgs(signer1.address, amount);
    });

    it("should be reverted with insufficient allowance error", async () => {
      const signer0 = signers[0];
      const signer1 = signers[1];

      await expect(
        myTokenC
          .connect(signer1)
          .transferFrom(
            signer0.address,
            signer1.address,
            hre.ethers.parseUnits("1", decimals)
          )
      ).to.be.revertedWith("insufficient allowance");
    });

    it("should successfully transfer tokens from owner after approval", async () => {
      const signer0 = signers[0];
      const signer1 = signers[1];
      const amountToTransfer = hre.ethers.parseUnits("10", decimals);

      const initialOwnerBalance = await myTokenC.balanceOf(signer0.address);

      await myTokenC.connect(signer0).approve(signer1.address, amountToTransfer);

      await myTokenC
        .connect(signer1)
        .transferFrom(signer0.address, signer1.address, amountToTransfer);

      expect(await myTokenC.balanceOf(signer0.address)).to.equal(
        initialOwnerBalance - amountToTransfer
      );

      expect(await myTokenC.balanceOf(signer1.address)).to.equal(
        amountToTransfer
      );
    });
  });
});
