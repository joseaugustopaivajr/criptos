# UsdtFlash Pro - Painel de Gestão Multi-Chain

Este projeto é uma plataforma profissional para criação e gestão de tokens (USDT Flash) em múltiplas blockchains, incluindo Ethereum, BNB Smart Chain e Tron.

## 🚀 Como Iniciar

1. **Instale as dependências:**
   ```shell
   npm install
   ```

2. **Inicie o Painel de Controle:**
   ```shell
   npm run ui
   ```
   Acesse `http://localhost:3000` no seu navegador.

3. **Ambiente de Testes (Opcional):**
   Se quiser testar localmente antes de ir para a rede real, use:
   ```shell
   npm run dev
   ```
   Isso inicia o nó Hardhat e faz o deploy automático. No painel, selecione a rede **Localhost (Hardhat)**.

---

## 🛠️ Funcionalidades Principais

### 1. Dashboard de Gestão
*   **Consulta de Saldo:** Visualize seu saldo em tempo real em qualquer rede.
*   **Transferências:** Envie tokens para qualquer carteira com facilidade.
*   **Multi-Rede:** Alterne entre Ethereum (ERC20), BNB (BEP20) e Tron (TRC20).

### 2. Gerador de Tokens Profissional
*   **Criação Instantânea:** Crie sua própria criptomoeda informando apenas Nome, Símbolo e Quantidade.
*   **Modo Espelho Original:** Os contratos gerados incluem funções de controle idênticas ao USDT (Tether):
    *   **Blacklist:** Bloqueie endereços de enviar ou receber tokens.
    *   **Pausa:** Interrompa todas as transações em caso de emergência.
    *   **Queima (Burn):** Reduza o suprimento total removendo tokens.
*   **Deploy com um Clique:** Publique o contrato diretamente pela interface (requer MetaMask ou TronLink).
*   **Kit de Importação:** Gere automaticamente os dados para que o destinatário adicione o token na carteira.

---

## 🛠️ Funções de Admin (Painel Visual)

Ao realizar o deploy do seu token, você se torna o **Owner** (Dono). O Dashboard detectará isso automaticamente e habilitará a aba **Admin Panel** na barra lateral.

### Recursos Disponíveis:
*   **Pausa de Emergência:** Interrompa instantaneamente todas as transferências do seu token em toda a rede. Útil em caso de detecção de bugs ou ataques.
*   **Gestão de Blacklist:** Bloqueie endereços específicos de enviar ou receber seus tokens.
*   **Recuperação de Fundos (Seize):** Como dono, você pode destruir os tokens que estão em uma carteira na blacklist, removendo-os de circulação (idêntico ao funcionamento da Tether).

---

## 🌐 Redes Suportadas

#### Ethereum (ERC20)
*   **Rede:** Ethereum Mainnet ou Sepolia Testnet.
*   **Moeda para Gás:** ETH.

#### BNB Smart Chain (BEP20)
*   **Rede:** BNB Smart Chain Mainnet.
*   **Moeda para Gás:** BNB.

#### Tron (TRC20)
*   **Rede:** Tron Mainnet ou Shasta Testnet.
*   **Moeda para Gás:** TRX.
*   **Carteira Recomendada:** TronLink.

---

## 🦊 Guia: Usando o TronLink (TRC20)

Como a rede Tron não é compatível com o MetaMask, você precisará da carteira **TronLink** para interagir com o UsdtFlash na Tron:

1.  **Instalação:**
    *   Vá até a [TronLink.org](https://www.tronlink.org/) e instale a extensão para Chrome ou o aplicativo para celular.
2.  **Configuração:**
    *   Crie uma nova carteira e guarde suas 12 palavras de recuperação com segurança.
3.  **No Dashboard:**
    *   No seletor de rede (canto superior direito), escolha **Tron Mainnet**.
    *   Clique em **Conectar Carteira**. O TronLink abrirá uma janela pedindo autorização.
4.  **Taxas (Energia/Banda):**
    *   Para enviar tokens na Tron, você precisa de um pouco de **TRX** na carteira para pagar o gás (Energy).

---

## ❓ Perguntas Frequentes (FAQ)

### 1. Por que preciso fazer o deploy em cada rede separadamente?
Cada blockchain é um ecossistema isolado. Para que seu token exista em todas as redes, você deve realizar o deploy individualmente em cada uma usando o **Gerador de Tokens**.

### 2. O endereço do meu token será o mesmo em todas as redes?
Não. Cada deploy gera um endereço único de contrato na blockchain específica.

### 3. "Erro de conexão com a rede"?
Se você vir esta mensagem:
1. Verifique sua conexão com a internet.
2. Certifique-se de que o MetaMask está na rede correta.
3. O painel agora usa RPCs públicos estáveis (Binance, LlamaRPC). Se o erro persistir, pode ser um bloqueio temporário da rede na sua região.
4. Para uso profissional, você pode editar o arquivo `frontend/app.js` e substituir o campo `rpc` da rede desejada por um link do **Infura** ou **Alchemy**.

### 4. O token não aparece no MetaMask após o envio?
1. Verifique se o MetaMask está na rede correta.
2. Use o botão **"Adicionar ao MetaMask"** no dashboard ou importe manualmente usando o **Kit de Importação**.
3. Use a ferramenta **"Consultar Saldo Externo"** para confirmar se os tokens foram processados pela rede.

### 5. Por que o MetaMask diz que o token é "Suspeito"?
Isso acontece porque você está usando o símbolo **USDT**, que pertence ao Tether oficial. O MetaMask alerta o usuário para evitar golpes.
Para remover esse aviso:
1. **Verifique o Contrato:** No BscScan/Etherscan, use a aba "Contract" para verificar o código-fonte.
2. **Adicione Liquidez:** Tokens com liquidez em DEXs (Uniswap/PancakeSwap) ganham confiança.
3. **Mude o Símbolo:** Se usar `USDTF` ou `FLASH`, o aviso costuma desaparecer.
 
### 6. Erro "Request rate exceeded" na rede Tron?
A rede Tron (via TronGrid) tem um limite de 3 requisições por segundo para usuários sem API Key.
Para resolver:
1. **Aguarde 5 segundos:** O sistema tenta automaticamente mitigar o problema com atrasos entre as chamadas.
2. **Use uma API Key:** Vá para a aba **Configurações** no Dashboard e insira sua API Key da TronGrid. Você pode obter uma gratuitamente em [trongrid.io](https://www.trongrid.io/).

### 7. Requisitos de Gás na rede Tron (TRX)
Diferente das redes EVM, a criação de contratos na Tron consome **Energy**. Se você não tiver Energy "congelada" na carteira:
- O sistema consumirá **TRX** automaticamente.
- Um deploy típico de token consome entre **50 a 100 TRX**.
- Certifique-se de ter pelo menos 150 TRX na carteira para garantir que o deploy não falhe por falta de recursos.

### 8. Saldo zero no MetaMask após importar o token?
Se o Dashboard mostra saldo mas o MetaMask mostra 0:
1. **Verifique os Decimais:** Certifique-se de que informou os decimais corretos ao importar. O padrão do projeto agora é **18**.
2. **Conflito de Cache:** O MetaMask às vezes armazena dados antigos. Tente remover o token e adicioná-lo novamente usando o botão **"Adicionar ao MetaMask"** do painel de resultados.
3. **Rede Incorreta:** Verifique se o MetaMask está na mesma rede onde o token foi gerado (ex: BNB Smart Chain).
4. **Console de Depuração:** Abra o console do navegador (F12) e verifique o log **"Saldo Bruto"**. Se lá aparecer um valor maior que zero, o token foi criado corretamente e o problema é apenas visual na carteira.

### 10. Como dar valor monetário ao token?
O valor de um token é definido pelo mercado (Liquidez). No Dashboard, use a aba **"Liquidez"** para:
1. **Simular o Preço:** Calcule quanto de USDT/BNB você precisa depositar para que cada token valha $1.00, por exemplo.
2. **Criar o Pool:** Siga o link para a PancakeSwap ou Uniswap, deposite seu token e um par (ex: USDC) para iniciar a comercialização real.
3. **Confiança do Clone:** Como seu contrato é um **Clone 1:1** do USDT original, ele possui as mesmas travas e funções que investidores profissionais buscam, facilitando a aceitação do projeto.

---

## 💻 Desenvolvimento

### Testes de Contrato
Para validar a lógica do contrato localmente:
```shell
npx hardhat test
```
