import { network } from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const { ethers } = await network.connect();

    const signers = await ethers.getSigners();
    const deployer = signers[0];

    console.log("Deploy realizado por:", deployer.address);
    console.log(`Total de carteiras detectadas: ${signers.length}`);

    const Token =
        await ethers.getContractFactory("BEP20USDT");

    const token =
        await Token.deploy("BEP20USDT", "USDT", 1000000, 18);

    await token.waitForDeployment();

    const contractAddress =
        await token.getAddress();

    console.log("Contrato:", contractAddress);

    // Salva o endereço, as contas e o artefato para o frontend ler automaticamente
    const frontendDir = path.join(__dirname, "../frontend");
    const artifactPath = path.join(__dirname, "../artifacts/contracts/BEP20USDT.sol/BEP20USDT.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    fs.writeFileSync(
        path.join(frontendDir, "config.json"),
        JSON.stringify({ 
            address: contractAddress,
            accounts: signers.map(s => s.address),
            abi: artifact.abi,
            bytecode: artifact.bytecode
        }, null, 2)
    );

    const amount =
        ethers.parseUnits("10000", await token.decimals());

    console.log("Iniciando distribuição automática...");

    // Envia para todas as outras contas do nó (exceto o deployer)
    for (let i = 1; i < signers.length; i++) {
        const tx = await token.transfer(signers[i].address, amount);
        await tx.wait();
        console.log(`✅ 10.000 USDT enviados para: ${signers[i].address}`);
    }

    console.log("--- Distribuição Concluída ---");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});