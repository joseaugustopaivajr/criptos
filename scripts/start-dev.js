import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RPC_PORT = 8545;
const RPC_HOST = '127.0.0.1';

console.log("🚀 Iniciando ambiente BEP20USDT...");

// 1. Iniciar o Nó Hardhat
const node = spawn('npx', ['hardhat', 'node'], { 
    shell: true, 
    stdio: 'inherit' 
});

node.on('exit', (code) => {
    if (code !== 0 && code !== null) {
        console.error(`❌ O nó do Hardhat fechou inesperadamente com código ${code}.`);
        console.error("Dica: Verifique se a porta 8545 já está em uso por outro processo.");
        process.exit(1);
    }
});

// Função para verificar se a porta está aberta
function checkPort(port, host) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(1000);
        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });
        socket.on('error', () => {
            socket.destroy();
            resolve(false);
        });
        socket.connect(port, host);
    });
}

// Função para aguardar o nó subir
async function waitForNode(attempts = 30) {
    console.log(`⏳ Aguardando nó inicializar na porta ${RPC_PORT}...`);
    for (let i = 0; i < attempts; i++) {
        const isUp = await checkPort(RPC_PORT, RPC_HOST);
        if (isUp) {
            console.log("✅ Nó detectado e pronto!");
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return false;
}

async function start() {
    const nodeReady = await waitForNode();

    if (!nodeReady) {
        console.error("❌ O nó do Hardhat demorou muito para iniciar. Tente rodar 'npx hardhat node' manualmente em outro terminal.");
        process.exit(1);
    }

    console.log("📦 Fazendo deploy do contrato BEP20USDT...");
    
    const deploy = spawn('npx', ['hardhat', 'run', 'scripts/deploy.ts', '--network', 'localhost'], { 
        shell: true, 
        stdio: 'inherit' 
    });

    deploy.on('close', (code) => {
        if (code === 0) {
            console.log("✅ Deploy concluído com sucesso!");
            console.log("🌐 Iniciando Interface Web...");
            
            // 3. Iniciar a UI na porta 3000
            const ui = spawn('npx', ['serve', '-l', '3000', 'frontend'], { 
                shell: true, 
                stdio: 'inherit' 
            });
            
            ui.on('error', (err) => {
                console.error("❌ Falha ao iniciar o servidor da interface:", err.message);
            });

            console.log("\n" + "=".repeat(50));
            console.log("🚀 TUDO PRONTO!");
            console.log("👉 Dashboard: http://127.0.0.1:3000");
            console.log("👉 Nó RPC:    http://127.0.0.1:8545");
            console.log("=".repeat(50) + "\n");
            console.log("DICAS DE CONEXÃO:");
            console.log("1. MetaMask: Use RPC http://127.0.0.1:8545 e Chain ID 31337.");
            console.log("2. Se o Dashboard não carregar o saldo, verifique se a carteira está conectada na rede local.");
            console.log("3. Para parar tudo, pressione Ctrl+C neste terminal.\n");
        } else {
            console.error("❌ Erro no deploy. Verifique os logs acima.");
        }
    });
}

start();

// Garante que os processos filhos morram se o script principal for parado
process.on('SIGINT', () => {
    node.kill();
    process.exit();
});
