//last compiled with soljson-v0.3.6-2016-08-29-b8060c5.js

contract SafeMath {
  //internals

  function safeMul(uint a, uint b) internal returns (uint) {
    uint c = a * b;
    assert(a == 0 || c / a == b);
    return c;
  }

  function safeSub(uint a, uint b) internal returns (uint) {
    assert(b <= a);
    return a - b;
  }

  function safeAdd(uint a, uint b) internal returns (uint) {
    uint c = a + b;
    assert(c>=a && c>=b);
    return c;
  }

  function safeMuli(int a, int b) internal returns (int) {
    int c = a * b;
    assert(a == 0 || c / a == b);
    return c;
  }

  function safeSubi(int a, int b) internal returns (int) {
    int negB = safeNegi(b);
    int c = a + negB;
    if (b<0 && c<=a) throw;
    if (a>0 && b<0 && c<=0) throw;
    if (a<0 && b>0 && c>=0) throw;
    return c;
  }

  function safeAddi(int a, int b) internal returns (int) {
    int c = a + b;
    if (a>0 && b>0 && c<=0) throw;
    if (a<0 && b<0 && c>=0) throw;
    return c;
  }

  function safeNegi(int a) internal returns (int) {
    int c = -a;
    if (a<0 && -a<=0) throw;
    return c;
  }

  function safeIntToUint(int a) internal returns(uint) {
    uint c = uint(a);
    assert(a>=0);
    return c;
  }

  function safeUintToInt(uint a) internal returns(int) {
    int c = int(a);
    assert(c>=0);
    return c;
  }

  function assert(bool assertion) internal {
    if (!assertion) throw;
  }
}

contract Etheropt is SafeMath {

  uint public version = 2;
  struct Position {
    mapping(uint => int) positions;
    int cash;
    bool expired;
    bool hasPosition;
  }
  uint public expiration;
  string public underlying;
  uint public margin;
  int public unit = 1000000000000000000;
  uint public realityID;
  bytes32 public factHash;
  address public ethAddr;
  mapping(uint => int) options;
  uint public numOptions;
  bool public expired;
  mapping(address => Position) positions;
  uint public numPositions;
  uint public numPositionsExpired;
  struct Account {
    address user;
    int capital;
  }
  mapping(bytes32 => int) orderFills; //keeps track of cumulative order fills
  mapping(uint => Account) accounts;
  uint public numAccounts;
  mapping(address => uint) accountIDs; //starts at 1

  //events
  event Deposit(address indexed user, uint amount, int balance); //balance is balance after deposit
  event Withdraw(address indexed user, uint amount, int balance); //balance is balance after withdraw
  event Expire(address indexed caller, address indexed user); //user is the account that was expired
  event OrderMatch(address indexed matchUser, int matchSize, address indexed orderUser, int orderSize, uint optionID, uint price);
  event Order(address contractAddr, uint optionID, uint price, int size, uint orderID, uint blockExpires, address addr, uint8 v, bytes32 r, bytes32 s);
  event Cancel(address contractAddr, uint optionID, uint price, int size, uint orderID, uint blockExpires, address addr, uint8 v, bytes32 r, bytes32 s);

  function Etheropt(uint expiration_, string underlying_, uint margin_, uint realityID_, bytes32 factHash_, address ethAddr_, int[] strikes_) {
    expiration = expiration_;
    underlying = underlying_;
    margin = margin_;
    realityID = realityID_;
    factHash = factHash_;
    ethAddr = ethAddr_;
    for (uint i=0; i < strikes_.length; i++) {
      if (numOptions<20) {
        uint optionID = numOptions++;
        options[optionID] = strikes_[i];
      }
    }
  }

  function getAccountID(address user) constant returns(uint) {
    return accountIDs[user];
  }

  function getAccount(uint accountID) constant returns(address) {
    return accounts[accountID].user;
  }

  function addFunds() {
    if (accountIDs[msg.sender]>0) {
      accounts[accountIDs[msg.sender]].capital = safeAddi(accounts[accountIDs[msg.sender]].capital, safeUintToInt(msg.value));
    } else {
      uint accountID = ++numAccounts;
      accountIDs[msg.sender] = accountID;
      accounts[accountID].user = msg.sender;
      accounts[accountID].capital = safeAddi(accounts[accountID].capital, safeUintToInt(msg.value));
    }
    Deposit(msg.sender, msg.value, accounts[accountIDs[msg.sender]].capital);
  }

  function withdrawFunds(uint amount) {
    if (accountIDs[msg.sender]<=0) throw;
    int amountInt = safeUintToInt(amount);
    if (amountInt>getFunds(msg.sender, true) || amountInt<=0) throw;
    accounts[accountIDs[msg.sender]].capital = safeSubi(accounts[accountIDs[msg.sender]].capital, amountInt);
    if (!msg.sender.call.value(amount)()) throw;
    Withdraw(msg.sender, amount, accounts[accountIDs[msg.sender]].capital);
  }

  function getFunds(address user, bool onlyAvailable) constant returns(int) {
    if (accountIDs[user]<=0) return 0;
    if (onlyAvailable == false) {
      return accounts[accountIDs[user]].capital;
    } else {
      return safeAddi(accounts[accountIDs[user]].capital, getMaxLossAfterTrade(user, 0, 0, 0));
    }
  }

  function order(address contractAddr, uint optionID, uint price, int size, uint orderID, uint blockExpires, uint8 v, bytes32 r, bytes32 s) {
    if (msg.value>0) throw;
    Order(contractAddr, optionID, price, size, orderID, blockExpires, msg.sender, v, r, s);
  }

  function cancelOrder(address contractAddr, uint optionID, uint price, int size, uint orderID, uint blockExpires, uint8 v, bytes32 r, bytes32 s) {
    if (msg.value>0) throw;
    bytes32 hash = sha256(contractAddr, optionID, price, size, orderID, blockExpires);
    if (ecrecover(hash,v,r,s) != msg.sender) throw;
    if (contractAddr != address(this)) throw;
    orderFills[hash] = size;
    Cancel(contractAddr, optionID, price, size, orderID, blockExpires, msg.sender, v, r, s);
  }

  function getFundsAndAvailable(address user) constant returns(int, int) {
    return (getFunds(user, false), getFunds(user, true));
  }

  function getOptionChain() constant returns (uint, string, uint, uint, bytes32, address) {
    return (expiration, underlying, margin, realityID, factHash, ethAddr);
  }

  function getMarket(address user) constant returns(uint[], int[], int[], int[]) {
    uint[] memory optionIDs = new uint[](20);
    int[] memory strikes_ = new int[](20);
    int[] memory positions_ = new int[](20);
    int[] memory cashes = new int[](20);
    uint z = 0;
    if (expired == false) {
      for (uint optionID=0; optionID<numOptions; optionID++) {
        optionIDs[z] = optionID;
        strikes_[z] = options[optionID];
        positions_[z] = positions[user].positions[optionID];
        cashes[z] = positions[user].cash;
        z++;
      }
    }
    return (optionIDs, strikes_, positions_, cashes);
  }

  function expire(uint accountID, uint8 v, bytes32 r, bytes32 s, bytes32 value) {
    if (expired == true || ecrecover(sha3(factHash, value), v, r, s) != ethAddr) throw;
    uint lastAccount = numAccounts;
    if (accountID==0) {
      accountID = 1;
    } else {
      lastAccount = accountID;
    }
    for (accountID=accountID; accountID<=lastAccount; accountID++) {
      if (positions[accounts[accountID].user].expired == false) {
        int result = positions[accounts[accountID].user].cash / unit;
        for (uint optionID=0; optionID<numOptions; optionID++) {
          int moneyness = getMoneyness(options[optionID], uint(value), margin);
          result += moneyness * positions[accounts[accountID].user].positions[optionID] / unit;
        }
        positions[accounts[accountID].user].expired = true;
        uint amountToSend = safeIntToUint(safeAddi(accounts[accountID].capital, result));
        accounts[accountID].capital = 0;
        if (positions[accounts[accountID].user].hasPosition==true) {
          numPositionsExpired++;
        }
        accounts[accountID].user.call.value(amountToSend)();
        Expire(msg.sender, accounts[accountID].user);
      }
    }
    if (numPositionsExpired == numPositions) {
      expired = true;
    }
  }

  function getMoneyness(int strike, uint settlement, uint margin) constant returns(int) {
    if (strike>=0) { //call
      if (settlement>safeIntToUint(strike)) {
        if (safeSub(settlement,safeIntToUint(strike))<margin) {
          return safeUintToInt(safeSub(settlement,safeIntToUint(strike)));
        } else {
          return safeUintToInt(margin);
        }
      } else {
        return 0;
      }
    } else { //put
      if (settlement<safeIntToUint(safeNegi(strike))) {
        if (safeSub(safeIntToUint(safeNegi(strike)),settlement)<margin) {
          return safeUintToInt(safeSub(safeIntToUint(safeNegi(strike)),settlement));
        } else {
          return safeUintToInt(margin);
        }
      } else {
        return 0;
      }
    }
  }

  function orderMatchTest(address contractAddr, uint optionID, uint price, int size, uint orderID, uint blockExpires, address addr, address sender, uint value, int matchSize) constant returns(bool) {
    if (contractAddr != address(this)) return false;
    if (block.number>blockExpires) return false;
    if (size>0 && matchSize>0) return false;
    if (size<0 && matchSize<0) return false;
    if (size>0 && matchSize<0 && orderFills[sha256(contractAddr, optionID, price, size, orderID, blockExpires)]>safeAddi(size,matchSize)) return false;
    if (size<0 && matchSize>0 && orderFills[sha256(contractAddr, optionID, price, size, orderID, blockExpires)]<safeAddi(size,matchSize)) return false;
    if (getFunds(addr, false)+getMaxLossAfterTrade(addr, optionID, -matchSize, matchSize * safeUintToInt(price))<=0) return false;
    if (getFunds(sender, false)+int(value)+getMaxLossAfterTrade(sender, optionID, matchSize, -matchSize * safeUintToInt(price))<=0) return false;
    return true;
  }

  function getOrderFill(address contractAddr, uint optionID, uint price, int size, uint orderID, uint blockExpires) constant returns(int) {
    return size-orderFills[sha256(contractAddr, optionID, price, size, orderID, blockExpires)];
  }

  function orderMatch(address contractAddr, uint optionID, uint price, int size, uint orderID, uint blockExpires, address addr, uint8 v, bytes32 r, bytes32 s, int matchSize) {
    addFunds();
    bytes32 hash = sha256(contractAddr, optionID, price, size, orderID, blockExpires);
    if (ecrecover(hash, v, r, s) != addr) throw;
    if (contractAddr != address(this)) throw;
    if (block.number>blockExpires) throw;
    if (size>0 && matchSize>0) throw;
    if (size<0 && matchSize<0) throw;
    if (size>0 && matchSize<0 && orderFills[hash]>safeAddi(size,matchSize)) throw;
    if (size<0 && matchSize>0 && orderFills[hash]<safeAddi(size,matchSize)) throw;
    if (getFunds(addr, false)+getMaxLossAfterTrade(addr, optionID, -matchSize, matchSize * safeUintToInt(price))<=0) throw;
    if (getFunds(msg.sender, false)+getMaxLossAfterTrade(msg.sender, optionID, matchSize, -matchSize * safeUintToInt(price))<=0) throw;
    if (positions[msg.sender].hasPosition == false) {
      positions[msg.sender].hasPosition = true;
      numPositions++;
    }
    if (positions[addr].hasPosition == false) {
      positions[addr].hasPosition = true;
      numPositions++;
    }
    positions[msg.sender].positions[optionID] = safeAddi(positions[msg.sender].positions[optionID], matchSize);
    positions[msg.sender].cash = safeSubi(positions[msg.sender].cash, safeMuli(matchSize, safeUintToInt(price)));
    positions[addr].positions[optionID] = safeSubi(positions[addr].positions[optionID], matchSize);
    positions[addr].cash = safeAddi(positions[addr].cash, safeMuli(matchSize, safeUintToInt(price)));
    orderFills[hash] = safeSubi(orderFills[hash], matchSize);
    OrderMatch(msg.sender, matchSize, addr, size, optionID, price);
  }

  function getMaxLossAfterTrade(address user, uint optionID, int positionChange, int cashChange) constant returns(int) {
    bool maxLossInitialized = false;
    int maxLoss = 0;
    if (positions[user].expired == true || numOptions<=0) return 0;
    for (uint s=0; s<numOptions; s++) {
      int pnl = positions[user].cash / unit;
      pnl = safeAddi(pnl, cashChange / unit);
      uint settlement = 0;
      if (options[s]<0) {
        settlement = safeIntToUint(safeNegi(options[s]));
      } else {
        settlement = safeIntToUint(options[s]);
      }
      pnl = safeAddi(pnl, moneySumAtSettlement(user, optionID, positionChange, settlement));
      if (pnl<maxLoss || maxLossInitialized==false) {
        maxLossInitialized = true;
        maxLoss = pnl;
      }
      pnl = positions[user].cash / unit;
      pnl = safeAddi(pnl, cashChange / unit);
      settlement = 0;
      if (options[s]<0) {
        if (safeIntToUint(safeNegi(options[s]))>margin) {
          settlement = safeSub(safeIntToUint(safeNegi(options[s])), margin);
        } else {
          settlement = 0;
        }
      } else {
        settlement = safeAdd(safeIntToUint(options[s]), margin);
      }
      pnl = safeAddi(pnl, moneySumAtSettlement(user, optionID, positionChange, settlement));
      if (pnl<maxLoss) {
        maxLoss = pnl;
      }
    }
    return maxLoss;
  }

  function moneySumAtSettlement(address user, uint optionID, int positionChange, uint settlement) internal returns(int) {
    int pnl = 0;
    for (uint j=0; j<numOptions; j++) {
      pnl = safeAddi(pnl, safeMuli(positions[user].positions[j], getMoneyness(options[j], settlement, margin)) / unit);
      if (j==optionID) {
        pnl = safeAddi(pnl, safeMuli(positionChange, getMoneyness(options[j], settlement, margin)) / unit);
      }
    }
    return pnl;
  }

  function min(uint a, uint b) constant returns(uint) {
    if (a<b) {
      return a;
    } else {
      return b;
    }
  }
}
