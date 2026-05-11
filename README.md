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
*   **Modo Clone 1:1 Extreme (Legacy 0.5.16):** Os contratos gerados são clones idênticos (BEP20USDT) ao original da Tether, utilizando o compilador **Solidity 0.5.16** para paridade máxima com a rede real. Inclui:
    *   **Controle de Blacklist:** Bloqueie carteiras suspeitas de transacionar.
    *   **Pausa de Emergência:** Interrompa todas as transações globalmente.
    *   **Funções Issue/Redeem/Issue/Mint/Burn:** Lógica profissional idêntica aos contratos BSC e Tron.
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
O valor de um token é definido pelo mercado (Liquidez). No Dashboard, a plataforma agora oferece:
1. **Simulador de Valor Real:** O painel busca o preço real do USDT em tempo real (via CoinGecko) e exibe quanto seu saldo valeria em dólares.
2. **Simulador de Liquidez:** Calcule quanto de USDT/BNB você precisa depositar para que cada token valha $1.00, por exemplo.
3. **Modo Flash (Expiração):** Você pode criar tokens que "expiram" em alguns minutos. Após o tempo definido, as transações são bloqueadas, ideal para demonstrações temporárias.
4. **Confiança do Clone:** Como seu contrato é o **BEP20USDT (Clone 1:1)**, ele possui as mesmas travas e funções que investidores profissionais buscam.

### 11. Como tornar a transação idêntica à original no BscScan?
Para que sua transação no explorador de blocos tenha o visual profissional e idêntico ao link de referência:
1. **Configuração do Token:** Use o botão "Clone 1:1" no Gerador. Ele preencherá automaticamente o nome `Binance-Peg BSC-USD`, símbolo `BSC-USD` e 18 decimais (padrão oficial da BSC).
2. **Criação vs Transferência:** Se você olhar para a transação que aparece logo após clicar em "Gerar Token", ela mostrará que o contrato foi **Criado**. Isso é normal.
3. **Fluxo para o Visual "Transfer":** 
   - Gere o token.
   - Clique em **"Usar no Dashboard"**.
   - Na aba Dashboard, realize uma **Transferência** para outra carteira (pode ser outra conta sua).
   - O BscScan desta nova transação mostrará o rótulo **Transfer** e listará os tokens de forma idêntica à transação de referência da Binance.
4. **Exibição de Valor ($):** O valor em dólares que aparece no BscScan (ex: $11.99) é puxado de exchanges reais. Como seu token é um clone novo, ele aparecerá sem valor no explorador até que você adicione liquidez na aba **Liquidez**. No entanto, o **Dashboard Pro** já exibe o valor simulado para sua conveniência.

### 12. Por que o explorador de blocos mostra "0 BNB" na transação?
No BscScan/Etherscan, o campo **"Value"** no topo da transação refere-se à moeda nativa da rede (BNB ou ETH). Como você está enviando tokens, o valor em BNB é zero. 
O valor em tokens e em USD ($) aparece na seção **"Tokens Transferred"**.

### 13. Por que a imagem do meu token não aparece no BscScan?
Diferente do MetaMask ou do Dashboard (onde você pode anexar uma imagem), os exploradores de blocos (BscScan, Etherscan, TronScan) não puxam a imagem automaticamente do contrato. Eles são serviços de terceiros e exigem um registro manual para evitar fraudes.
Para que o logo apareça lá:
1. **Verificar o Código-Fonte:** O contrato deve ser verificado na aba "Contract" -> "Verify and Publish".
2. **Crie uma Conta:** Registre-se no [BscScan](https://bscscan.com/register).
3. **Reivindique o Token:** Vá em [Token Update](https://bscscan.com/tokenupdate) e insira o endereço do seu contrato.
4. **Envie os Ativos:** Você precisará enviar o arquivo do ícone (32x32px ou 128x128px), links oficiais e site. A equipe do explorador revisará e aprovará em alguns dias.
*Dica: O Dashboard Pro fornece um link direto para essa página logo após você gerar o token.*

---

## 💻 Desenvolvimento

### Testes de Contrato
Para validar a lógica do contrato localmente:
```shell
npx hardhat test
```
