import { expect } from "chai";
import { network } from "hardhat";

describe("BEP20USDT - Modo Espelho (Blacklist & Pausa)", function () {
  let token: any;
  let owner: any;
  let user1: any;
  let user2: any;
  let ethers: any;

  before(async function () {
    const connection = await network.connect();
    ethers = connection.ethers;
  });

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("BEP20USDT");
    token = await Token.deploy("BEP20USDT", "USDT", 1000000, 18);
    await token.waitForDeployment();
  });

  describe("Blacklist", function () {
    it("Deve bloquear transferências de um endereço na blacklist", async function () {
      // Envia tokens antes de bloquear
      await token.transfer(user1.address, ethers.parseUnits("100", 18));
      
      await token.addBlackList(user1.address);
      
      // user1 tenta transferir para user2, mas está na blacklist
      await expect(
        token.connect(user1).transfer(user2.address, ethers.parseUnits("50", 18))
      ).to.be.revertedWith("Sender is blacklisted");
    });

    it("Deve bloquear recebimento de tokens para endereço na blacklist", async function () {
      await token.addBlackList(user2.address);
      
      // owner tenta transferir para user2 (bloqueado)
      await expect(
        token.transfer(user2.address, ethers.parseUnits("100", 18))
      ).to.be.revertedWith("Recipient is blacklisted");
    });

    it("Deve permitir destruir fundos de uma conta na blacklist (Seize)", async function () {
      const amount = ethers.parseUnits("500", 18);
      await token.transfer(user1.address, amount);
      
      await token.addBlackList(user1.address);
      
      const initialSupply = await token.totalSupply();
      await token.destroyBlackFunds(user1.address);
      
      expect(await token.balanceOf(user1.address)).to.equal(0n);
      expect(await token.totalSupply()).to.equal(initialSupply - amount);
    });
  });

  describe("Pausa", function () {
    it("Deve impedir transferências quando o contrato estiver pausado", async function () {
      await token.pause();
      
      await expect(
        token.transfer(user1.address, ethers.parseUnits("100", 18))
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
      
      await token.unpause();
      
      const tx = await token.transfer(user1.address, ethers.parseUnits("100", 18));
      expect(tx.hash).to.be.a('string');
    });
  });

  describe("Mint & Burn", function () {
    it("Deve permitir que apenas o dono gere novos tokens (Mint)", async function () {
      const amount = ethers.parseUnits("1000", 18);
      await token.mint(user1.address, amount);
      expect(await token.balanceOf(user1.address)).to.equal(amount);
      
      await expect(
        token.connect(user1).mint(user1.address, amount)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });

  describe("Funcionalidades de Clone (Taxas & Depreciação)", function () {
    it("Deve aplicar taxas de transferência corretamente", async function () {
      const amount = ethers.parseUnits("1000", 18);
      await token.transfer(user1.address, amount);
      
      // 0.2% de taxa (20 basis points)
      // Max fee em units reais para o teste (50 * 10^18)
      // Ajustando o contrato para permitir taxas maiores se necessário, 
      // mas mantendo o limite do USDT original para o clone.
      await token.setParams(20, 1000); 
      
      const transferAmount = 100000n; // Valor pequeno para não bater no max fee de 1000 units
      const expectedFee = (transferAmount * 20n) / 10000n; // 200 units
      
      const initialOwnerBalance = await token.balanceOf(owner.address);
      await token.connect(user1).transfer(user2.address, transferAmount);
      
      expect(await token.balanceOf(user2.address)).to.equal(transferAmount - expectedFee);
      expect(await token.balanceOf(owner.address)).to.equal(initialOwnerBalance + expectedFee);
    });

    it("Deve respeitar a taxa máxima (Maximum Fee)", async function () {
      await token.transfer(user1.address, ethers.parseUnits("10000", 18));
      
      // 0.2% de taxa, mas máximo de 10 units
      await token.setParams(20, 10);
      
      const transferAmount = ethers.parseUnits("10000", 18);
      // 0.2% de 10000 seria 20, mas o máximo é 10
      const expectedFee = 10n;
      
      const initialOwnerBalance = await token.balanceOf(owner.address);
      await token.connect(user1).transfer(user2.address, transferAmount);
      
      expect(await token.balanceOf(user2.address)).to.equal(transferAmount - expectedFee);
      expect(await token.balanceOf(owner.address)).to.equal(initialOwnerBalance + expectedFee);
    });

    it("Deve permitir emitir e resgatar tokens (Issue/Redeem)", async function () {
      const amount = ethers.parseUnits("500", 18);
      await token.issue(amount);
      const balanceAfterIssue = await token.balanceOf(owner.address);
      
      await token.redeem(amount);
      expect(await token.balanceOf(owner.address)).to.equal(balanceAfterIssue - amount);
    });
  });
});
