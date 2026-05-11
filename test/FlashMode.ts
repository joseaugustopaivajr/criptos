import { expect } from "chai";
import { network } from "hardhat";

describe("UsdtFlash - Modo Flash (Expiração)", function () {
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
    const Token = await ethers.getContractFactory("UsdtFlash");
    token = await Token.deploy("Tether USD", "USDT", 1000000, 18);
    await token.waitForDeployment();
  });

  it("Deve bloquear transferência após expiração", async function () {
    const amount = ethers.parseUnits("100", 18);
    // Mint com 1 minuto de expiração
    await token.mintWithExpiry(user1.address, amount, 1);
    
    // Transferência imediata deve funcionar
    await token.connect(user1).transfer(user2.address, ethers.parseUnits("10", 18));
    expect(await token.balanceOf(user2.address)).to.equal(ethers.parseUnits("10", 18));

    // Avança o tempo em 2 minutos (120 segundos)
    await ethers.provider.send("evm_increaseTime", [120]);
    await ethers.provider.send("evm_mine", []);

    // Transferência após expiração deve falhar
    await expect(
      token.connect(user1).transfer(user2.address, ethers.parseUnits("10", 18))
    ).to.be.revertedWith("Tokens expirados (Modo Flash)");
  });

  it("Deve permitir definir expiração manualmente via Admin", async function () {
    const amount = ethers.parseUnits("100", 18);
    await token.transfer(user1.address, amount);
    
    // Define expiração de 1 minuto
    await token.setExpirationTime(user1.address, 1);

    // Avança o tempo
    await ethers.provider.send("evm_increaseTime", [120]);
    await ethers.provider.send("evm_mine", []);

    await expect(
      token.connect(user1).transfer(user2.address, amount)
    ).to.be.revertedWith("Tokens expirados (Modo Flash)");
  });

  it("Deve remover expiração ao definir para 0", async function () {
    const amount = ethers.parseUnits("100", 18);
    await token.mintWithExpiry(user1.address, amount, 1);

    // Remove expiração
    await token.setExpirationTime(user1.address, 0);

    // Avança o tempo
    await ethers.provider.send("evm_increaseTime", [120]);
    await ethers.provider.send("evm_mine", []);

    // Deve funcionar pois a expiração foi removida
    await token.connect(user1).transfer(user2.address, amount);
    expect(await token.balanceOf(user2.address)).to.equal(amount);
  });
});
