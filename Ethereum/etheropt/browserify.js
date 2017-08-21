var Web3 = require('web3');
var utility = require('./common/utility.js');
var request = require('request');
var sha256 = require('js-sha256').sha256;
var BigNumber = require('bignumber.js');
require('datejs');
var async = (typeof(window) === 'undefined') ? require('async') : require('async/dist/async.min.js');

function Main() {
}
Main.alertInfo = function(message) {
  console.log(message);
  alertify.message(message);
}
Main.alertDialog = function(message) {
  console.log(message);
  alertify.alert('Alert', message, function(){});
}
Main.alertWarning = function(message) {
  console.log(message);
  alertify.warning(message);
}
Main.alertError = function(message) {
  console.log(message);
  alertify.error(message);
}
Main.alertSuccess = function(message) {
  console.log(message);
  alertify.success(message);
}
Main.alertTxResult = function(err, result) {
  if (result.txHash) {
    Main.alertDialog('You just created an Ethereum transaction. Track its progress here: <a href="http://'+(config.ethTestnet ? 'testnet.' : '')+'etherscan.io/tx/'+result.txHash+'" target="_blank">'+result.txHash+'</a>.');
  } else {
    Main.alertError('You tried to send an Ethereum transaction but there was an error: '+err);
  }
}
Main.tooltip = function(message) {
  return '<a href="#" data-toggle="tooltip" data-placement="bottom" title="'+message+'"><i class="fa fa-question-circle fa-lg"></i></a>';
}
Main.tooltips = function() {
  $(function () {
    $('[data-toggle="tooltip"]').tooltip()
  });
}
Main.popovers = function() {
  $(function () {
    $('[data-toggle="popover"]').popover()
  });
}
Main.createCookie = function(name,value,days) {
  if (localStorage) {
    localStorage.setItem(name, value);
  } else {
    if (days) {
      var date = new Date();
      date.setTime(date.getTime()+(days*24*60*60*1000));
      var expires = "; expires="+date.toGMTString();
    }
    else var expires = "";
    document.cookie = name+"="+value+expires+"; path=/";
  }
}
Main.readCookie = function(name) {
  if (localStorage) {
    return localStorage.getItem(name);
  } else {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
      var c = ca[i];
      while (c.charAt(0)==' ') c = c.substring(1,c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
  }
}
Main.eraseCookie = function(name) {
  if (localStorage) {
    localStorage.removeItem(name);
  } else {
    createCookie(name,"",-1);
  }
}
Main.logout = function() {
  addrs = [config.ethAddr];
  pks = [config.ethAddrPrivateKey];
  selectedAccount = 0;
  nonce = undefined;
  browserOrders = [];
  Main.refresh(function(){}, true);
}
Main.createAccount = function() {
  var newAccount = utility.createAccount();
  var addr = newAccount.address;
  var pk = newAccount.privateKey;
  Main.addAccount(addr, pk);
  Main.alertDialog('You just created an Ethereum account: '+addr+'.');
}
Main.deleteAccount = function() {
  addrs.splice(selectedAccount, 1);
  pks.splice(selectedAccount, 1);
  selectedAccount = 0;
  nonce = undefined;
  browserOrders = [];
  Main.refresh(function(){}, true);
}
Main.selectAccount = function(i) {
  selectedAccount = i;
  nonce = undefined;
  browserOrders = [];
  Main.refresh(function(){}, true);
}
Main.addAccount = function(addr, pk) {
  if (addr.slice(0,2)!='0x') addr = '0x'+addr;
  if (pk.slice(0,2)=='0x') pk = pk.slice(2);
  addr = utility.toChecksumAddress(addr);
  if (pk!=undefined && pk!='' && !utility.verifyPrivateKey(addr, pk)) {
    Main.alertDialog('For account '+addr+', the private key is invalid.');
  } else if (!web3.isAddress(addr)) {
    Main.alertDialog('The specified account, '+addr+', is invalid.');
  } else {
    addrs.push(addr);
    pks.push(pk);
    selectedAccount = addrs.length-1;
    nonce = undefined;
    browserOrders = [];
    Main.refresh(function(){}, true);
  }
}
Main.showPrivateKey = function() {
  var addr = addrs[selectedAccount];
  var pk = pks[selectedAccount];
  if (pk==undefined || pk=='') {
    Main.alertDialog('For account '+addr+', there is no private key available. You can still transact if you are connected to Ethereum and the account is unlocked.');
  } else {
    Main.alertDialog('For account '+addr+', the private key is '+pk+'.');
  }
}
Main.shapeshift_click = function(a,e) {
  e.preventDefault();
  var link=a.href;
  window.open(link,'1418115287605','width=700,height=500,toolbar=0,menubar=0,location=0,status=1,scrollbars=1,resizable=0,left=0,top=0');
  return false;
}
Main.displayMyOrders = function(callback) {
  utility.blockNumber(web3, function(err, blockNumber) {
    var orders = [];
    async.each(optionsCache,
      function(option, callbackEach) {
        option.buyOrders.forEach(function(x){
          if (x.order.addr.toLowerCase()==addrs[selectedAccount].toLowerCase()) {
            orders.push({order: x.order, size: x.size, remainingSize: x.remainingSize, price: x.price, option: option});
          }
        });
        option.sellOrders.forEach(function(x){
          if (x.order.addr.toLowerCase()==addrs[selectedAccount].toLowerCase()) {
            orders.push({order: x.order, size: x.size, remainingSize: x.remainingSize, price: x.price, option: option});
          }
        });
        callbackEach(null);
      },
      function(err) {
        new EJS({url: config.homeURL+'/templates/'+'orders_table.ejs'}).update('orders', {orders: orders, utility: utility, blockNumber: blockNumber});
        callback();
      }
    );
  });
}
Main.cancelOrder = function(orderID) {
  var orderToCancel = undefined;
  optionsCache.forEach(function(option){
    option.buyOrders.forEach(function(order){
      if (order.order.orderID==orderID && order.order.addr.toLowerCase()==addrs[selectedAccount].toLowerCase()) {
        orderToCancel = order.order;
      }
    });
    option.sellOrders.forEach(function(order){
      if (order.order.orderID==orderID && order.order.addr.toLowerCase()==addrs[selectedAccount].toLowerCase()) {
        orderToCancel = order.order;
      }
    });
  });
  if (orderToCancel) {
    utility.send(web3, contractMarket, orderToCancel.contractAddr, 'cancelOrder', [orderToCancel.contractAddr, orderToCancel.optionID, orderToCancel.price, orderToCancel.size, orderToCancel.orderID, orderToCancel.blockExpires, orderToCancel.v, orderToCancel.r, orderToCancel.s, {gas: 150000, value: 0}], addrs[selectedAccount], pks[selectedAccount], nonce, function(err, result) {
      txHash = result.txHash;
      nonce = result.nonce;
      Main.alertTxResult(err, result);
    });
  }
}
Main.processOrder = function(browserOrder, callback) {
  utility.blockNumber(web3, function(err, blockNumber) {
    //update option
    browserOrder.option = optionsCache.filter(function(option){return option.contractAddr == browserOrder.option.contractAddr && option.optionID == browserOrder.option.optionID})[0];
    //send the remainder of the order to rest on the order book
    function sendToOrderBook(cumulativeMatchSize) {
      if (Math.abs(browserOrder.size)-Math.abs(cumulativeMatchSize)>0) {
        utility.blockNumber(web3, function(err, blockNumber) {
          var orderID = utility.getRandomInt(0,Math.pow(2,32));
          var blockExpires = blockNumber + browserOrder.expires;
          var condensed = utility.pack([browserOrder.option.contractAddr, browserOrder.option.optionID, browserOrder.price, browserOrder.size-cumulativeMatchSize, orderID, blockExpires], [160, 256, 256, 256, 256, 256]);
          var hash = sha256(new Buffer(condensed,'hex'));
          utility.sign(web3, addrs[selectedAccount], hash, pks[selectedAccount], function(err, sig) {
            if (sig) {
              var order = {contractAddr: browserOrder.option.contractAddr, optionID: browserOrder.option.optionID, price: browserOrder.price, size: browserOrder.size-cumulativeMatchSize, orderID: orderID, blockExpires: blockExpires, addr: addrs[selectedAccount], v: sig.v, r: sig.r, s: sig.s, hash: '0x'+hash};
              condensed = utility.pack([order.contractAddr, order.optionID, order.price, order.size, order.orderID, order.blockExpires], [160, 256, 256, 256, 256, 256]);
              hash = '0x'+sha256(new Buffer(condensed,'hex'));
              var verified = utility.verify(web3, order.addr, order.v, order.r, order.s, order.hash);
              utility.call(web3, contractMarket, browserOrder.option.contractAddr, 'getFunds', [order.addr, false], function(err, result) {
                var balance = result.toNumber();
                utility.call(web3, contractMarket, browserOrder.option.contractAddr, 'getMaxLossAfterTrade', [order.addr, order.optionID, order.size, -order.size*order.price], function(err, result) {
                  balance = balance + result.toNumber();
                  if (!verified) {
                    Main.alertError('You tried sending an order to the order book, but signature verification failed.');
                    callback();
                  } else if (balance<=0) {
                    Main.alertError('You tried sending an order to the order book, but you do not have enough funds to place your order. You need to add '+(utility.weiToEth(-balance))+' eth to your account to cover this trade. ');
                    callback();
                  } else if (blockNumber<=order.blockExpires && verified && hash==order.hash && balance>=0) {
                    utility.postGitterMessage(JSON.stringify(order), function(err, result){
                      if (!err) {
                        Main.alertInfo('You sent an order to the order book!');
                      } else {
                        Main.alertError('You tried sending an order to the order book but there was an error.');
                      }
                      callback();
                    });
                  } else {
                    callback();
                  }
                });
              });
            } else {
              Main.alertError('You tried sending an order to the order book, but it could not be signed.');
              console.log(err);
              callback();
            }
          });
        });
      } else {
        callback();
      }
    }
    //match against existing orders
    var cumulativeMatchSize = 0;
    if (browserOrder.postOnly==false) { //as long as postOnly isn't set
      var matchOrders = browserOrder.size>0 ? browserOrder.option.sellOrders : browserOrder.option.buyOrders;
      async.eachSeries(matchOrders,
        function(matchOrder, callbackMatchOrder) {
          if ((browserOrder.size>0 && browserOrder.price>=matchOrder.order.price) || (browserOrder.size<0 && browserOrder.price<=matchOrder.order.price)) {
            var matchSize = 0;
            if (Math.abs(cumulativeMatchSize)>=Math.abs(browserOrder.size)) {
              //we've attempted to match enough size already
            } else if (Math.abs(browserOrder.size-cumulativeMatchSize)>=Math.abs(matchOrder.size)) { //the order is bigger than the match order
              matchSize = -matchOrder.order.size;
            } else { //the match order covers the order
              matchSize = browserOrder.size-cumulativeMatchSize;
            }
            if (matchSize!=0) {
              cumulativeMatchSize += matchSize; //let's assume the order will go through
              var deposit = utility.ethToWei(0);
              utility.call(web3, contractMarket, browserOrder.option.contractAddr, 'orderMatchTest', [matchOrder.order.contractAddr, matchOrder.order.optionID, matchOrder.order.price, matchOrder.order.size, matchOrder.order.orderID, matchOrder.order.blockExpires, matchOrder.order.addr, addrs[selectedAccount], deposit, matchSize], function(err, result) {
                if (result && blockNumber<matchOrder.order.blockExpires-1) {
                  utility.send(web3, contractMarket, browserOrder.option.contractAddr, 'orderMatch', [matchOrder.order.contractAddr, matchOrder.order.optionID, matchOrder.order.price, matchOrder.order.size, matchOrder.order.orderID, matchOrder.order.blockExpires, matchOrder.order.addr, matchOrder.order.v, matchOrder.order.r, matchOrder.order.s, matchSize, {gas: 1000000, value: deposit}], addrs[selectedAccount], pks[selectedAccount], nonce, function(err, result) {
                    txHash = result.txHash;
                    nonce = result.nonce;
                    Main.alertInfo('Some of your order ('+utility.weiToEth(Math.abs(matchSize))+' eth) was sent to the blockchain to match against a resting order.');
                    Main.alertTxResult(err, result);
                    callbackMatchOrder();
                  });
                } else {
                  Main.alertError('You tried to match against a resting order but the order match failed. This can be because the order expired or traded already, or either you or the counterparty do not have enough funds to cover the trade.');
                  callbackMatchOrder();
                }
              });
            } else {
              callbackMatchOrder();
            }
          } else {
            callbackMatchOrder();
          }
        },
        function(err) {
          sendToOrderBook(cumulativeMatchSize);
        }
      );
    } else {
      sendToOrderBook(cumulativeMatchSize);
    }
  });
}
Main.order = function(option, price, size, expires, postOnly) {
  option = JSON.parse(option);
  size = utility.ethToWei(size);
  price = price * 1000000000000000000;
  expires = Number(expires);
  postOnly = postOnly=='true' ? true : false;
  var order = {option: option, price: price, size: size, expires: expires, postOnly: postOnly};
  var contract = Main.getContract(option.contractAddr);
  if (contract && contract.version>=2) {
    Main.processOrder(order, function(){
      Main.refresh(function(){}, true);
    });
  } else {
    Main.alertDialog("This contract is out of date. You can no longer place orders, but existing funds and positions are safe, and you are free to withdraw from your available balance. This contract will settle as usual when it expires.");
  }
}
Main.getContract = function(contractAddr) {
  var matchingContracts = contractsCache.filter(function(x){return x.contractAddr==contractAddr});
  if (matchingContracts.length>=1) {
    return matchingContracts[0];
  } else {
    return undefined;
  }
}
Main.fund = function(amount, contractAddr) {
  amount = utility.ethToWei(amount);
  utility.send(web3, contractMarket, contractAddr, 'addFunds', [{gas: 200000, value: amount}], addrs[selectedAccount], pks[selectedAccount], nonce, function(err, result) {
    txHash = result.txHash;
    nonce = result.nonce;
    Main.alertTxResult(err, result);
  });
}
Main.withdraw = function(amount, contractAddr) {
  amount = utility.ethToWei(amount);
  utility.call(web3, contractMarket, contractAddr, 'getFundsAndAvailable', [addrs[selectedAccount]], function(err, result) {
    if (!err) {
      var fundsAvailable = result[1].toNumber();
      if (amount>fundsAvailable) amount = fundsAvailable;
    }
    if (amount>0) {
      utility.send(web3, contractMarket, contractAddr, 'withdrawFunds', [amount, {gas: 400000, value: 0}], addrs[selectedAccount], pks[selectedAccount], nonce, function(err, result) {
        txHash = result.txHash;
        nonce = result.nonce;
        Main.alertTxResult(err, result);
      });
    }
  });
}
Main.expireCheck = function(contractAddr, callback) {
  var firstOption = optionsCache.filter(function(x){return x.contractAddr==contractAddr})[0]
  var realityID = firstOption.realityID;
  request.get('https://www.realitykeys.com/api/v1/exchange/'+realityID+'?accept_terms_of_service=current', function(err, httpResponse, body){
    if (!err) {
      result = JSON.parse(body);
      var signedHash = '0x'+result.signature_v2.signed_hash;
      var value = '0x'+result.signature_v2.signed_value;
      var factHash = '0x'+result.signature_v2.fact_hash;
      var sigR = '0x'+result.signature_v2.sig_r;
      var sigS = '0x'+result.signature_v2.sig_s;
      var sigV = result.signature_v2.sig_v;
      var settlement = result.winner_value;
      var machineSettlement = result.machine_resolution_value;
      if (sigR && sigS && sigV && value) {
        callback([true, settlement]);
      } else if (machineSettlement) {
        callback([false, machineSettlement]);
      } else if (settlement) {
        callback([false, settlement]);
      } else {
        callback([false, undefined]);
      }
    }
  });
}
Main.expire = function(contractAddr) {
  var firstOption = optionsCache.filter(function(x){return x.contractAddr==contractAddr})[0]
  var realityID = firstOption.realityID;
  request.get('https://www.realitykeys.com/api/v1/exchange/'+realityID+'?accept_terms_of_service=current', function(err, httpResponse, body){
    if (!err) {
      result = JSON.parse(body);
      var signedHash = '0x'+result.signature_v2.signed_hash;
      var value = '0x'+result.signature_v2.signed_value;
      var factHash = '0x'+result.signature_v2.fact_hash;
      var sigR = '0x'+result.signature_v2.sig_r;
      var sigS = '0x'+result.signature_v2.sig_s;
      var sigV = result.signature_v2.sig_v;
      var settlement = result.winner_value;
      if (sigR && sigS && sigV && value) {
        Main.alertInfo("Expiring "+firstOption.expiration+" using settlement price: "+settlement);
        utility.send(web3, contractMarket, contractAddr, 'expire', [0, sigV, sigR, sigS, value, {gas: 1000000, value: 0}], addrs[selectedAccount], pks[selectedAccount], nonce, function(err, result) {
          txHash = result.txHash;
          nonce = result.nonce;
          Main.alertTxResult(err, result);
        });
      }
    }
  });
}
Main.publishExpiration = function(address) {
  utility.send(web3, contractContracts, config.contractContractsAddr, 'newContract', [address, {gas: 300000, value: 0}], addrs[selectedAccount], pks[selectedAccount], nonce, function(err, esult) {
    txHash = result.txHash;
    nonce = result.nonce;
    Main.alertTxResult(err, result);
  });
}
Main.disableExpiration = function(address) {
  utility.send(web3, contractContracts, config.contractContractsAddr, 'disableContract', [address, {gas: 300000, value: 0}], addrs[selectedAccount], pks[selectedAccount], nonce, function(err, result) {
    txHash = result.txHash;
    nonce = result.nonce;
    Main.alertTxResult(err, result);
  });
}
Main.newExpiration = function(fromcur, tocur, date, calls, puts, margin) {
  margin = Number(margin);
  var expiration = date;
  var expirationTimestamp = Date.parse(expiration+" 00:00:00 +0000").getTime()/1000;
  var strikes = calls.split(",").map(function(x){return Number(x)}).slice(0,5).concat(puts.split(",").map(function(x){return -Number(x)}).slice(0,5));
  strikes.sort(function(a,b){ return Math.abs(a)-Math.abs(b) || a-b });
  request.post('https://www.realitykeys.com/api/v1/exchange/new', {form: {fromcur: fromcur, tocur: tocur, settlement_date: expiration, objection_period_secs: '86400', accept_terms_of_service: 'current', use_existing: '1'}}, function(err, httpResponse, body){
    console.log(err, body);
    if (!err) {
      result = JSON.parse(body);
      var realityID = result.id;
      var factHash = '0x'+result.signature_v2.fact_hash;
      var ethAddr = '0x'+result.signature_v2.ethereum_address;
      var originalStrikes = strikes;
      var scaledStrikes = strikes.map(function(strike) { return strike*1000000000000000000 });
      var scaledMargin = margin*1000000000000000000;
      Main.alertDialog("You are creating a new contract. This will involve two transactions. After the first one is confirmed, the second one will be sent. Please be patient.");
      utility.readFile(config.contractMarket+'.bytecode', function(err, bytecode){
        bytecode = JSON.parse(bytecode);
        utility.send(web3, contractMarket, undefined, 'constructor', [expirationTimestamp, fromcur+"/"+tocur, scaledMargin, realityID, factHash, ethAddr, scaledStrikes, {from: addrs[selectedAccount], data: bytecode, gas: 4712388, gasPrice: config.ethGasPrice}], addrs[selectedAccount], pks[selectedAccount], nonce, function(err, result) {
          if(result) {
            txHash = result.txHash;
            nonce = result.nonce;
            Main.alertTxResult(err, result);
            var address = undefined;
            async.whilst(
                function () { return address==undefined; },
                function (callbackWhilst) {
                    setTimeout(function () {
                      utility.txReceipt(web3, txHash, function(err, receipt) {
                        if (receipt) {
                          address = receipt.contractAddress;
                        }
                        console.log("Waiting for contract creation to complete.");
                        callbackWhilst(null);
                      });
                    }, 10*1000);
                },
                function (err) {
                  Main.alertDialog("Here is the new contract address: "+address+". We will now send a transaction to the contract that keeps track of expirations so that the new expiration will show up on Etheropt.");
                  //notify contracts contract of new contract
                  utility.send(web3, contractContracts, config.contractContractsAddr, 'newContract', [address, {gas: 300000, value: 0}], addrs[selectedAccount], pks[selectedAccount], nonce, function(err, result) {
                    txHash = result.txHash;
                    nonce = result.nonce;
                    Main.alertTxResult(err, result);
                  });
                }
            );
          }
        });
      });
    }
  });
}
Main.connectionTest = function() {
  if (connection) return connection;
  connection = {connection: 'Proxy', provider: 'http://'+(config.ethTestnet ? 'testnet.' : '')+'etherscan.io', testnet: config.ethTestnet};
  try {
    if (web3.currentProvider) {
      web3.eth.coinbase;
      connection = {connection: 'RPC', provider: config.ethProvider, testnet: config.ethTestnet};
    }
  } catch(err) {
    web3.setProvider(undefined);
  }
  new EJS({url: config.homeURL+'/templates/'+'connection_description.ejs'}).update('connection', {connection: connection});
  Main.popovers();
  return connection;
}
Main.displayAccounts = function(callback) {
  if (Main.connectionTest().connection=='RPC') {
    $('#pk_div').hide();
  }
  if (addrs.length<=0 || addrs.length!=pks.length) {
    addrs = [config.ethAddr];
    pks = [config.ethAddrPrivateKey];
    selectedAccount = 0;
  }
  async.map(addrs,
    function(addr, callback) {
      utility.getBalance(web3, addr, function(err, balance) {
        callback(null, {addr: addr, balance: balance});
      });
    },
    function(err, addresses) {
      new EJS({url: config.homeURL+'/templates/'+'addresses.ejs'}).update('addresses', {addresses: addresses, selectedAccount: selectedAccount});
      callback();
    }
  );
}
Main.loadPrices = function(callback) {
  utility.blockNumber(web3, function(err, blockNumber) {
    var orders = [];
    var expectedKeys = JSON.stringify(['addr','blockExpires','contractAddr','hash','optionID','orderID','price','r','s','size','v']);
    Object.keys(gitterMessagesCache).forEach(function(id) {
      var message = JSON.parse(JSON.stringify(gitterMessagesCache[id]));
      if (typeof(message)=='object' && JSON.stringify(Object.keys(message).sort())==expectedKeys) {
        message.id = id;
        if (!deadOrders[id]) {
          orders.push(message);
        }
      }
    });
    async.map(optionsCache,
      function(option, callbackMap){
        var ordersFiltered = orders.filter(function(x){return x.contractAddr==option.contractAddr && x.optionID==option.optionID});
        ordersFiltered = ordersFiltered.map(function(x){return {size: Math.abs(x.size), price: x.price/1000000000000000000, order: x}});
        var newBuyOrders = [];
        var newSellOrders = [];
        async.filter(ordersFiltered,
          function(order, callbackFilter) {
            order = order.order;
            if (blockNumber<order.blockExpires) {
              var condensed = utility.pack([order.contractAddr, order.optionID, order.price, order.size, order.orderID, order.blockExpires], [160, 256, 256, 256, 256, 256]);
              var hash = '0x'+sha256(new Buffer(condensed,'hex'));
              var verified = false;
              try {
                var verified = utility.verify(web3, order.addr, order.v, order.r, order.s, order.hash);
              } catch(err) {
                console.log(err);
              }
              utility.call(web3, contractMarket, order.contractAddr, 'getFunds', [order.addr, false], function(err, result) {
                var balance = result.toNumber();
                utility.call(web3, contractMarket, order.contractAddr, 'getMaxLossAfterTrade', [order.addr, order.optionID, order.size, -order.size*order.price], function(err, result) {
                  balance = balance + result.toNumber();
                  if (verified && hash==order.hash && balance>=0) {
                    callbackFilter(true);
                  } else {
                    deadOrders[order.id] = true;
                    callbackFilter(false);
                  }
                });
              });
            } else {
              deadOrders[order.id] = true;
              callbackFilter(false);
            }
          },
          function(ordersValid) {
            Main.createCookie(config.deadOrdersCookie, JSON.stringify(deadOrders), 999);
            async.each(ordersValid,
              function(order, callbackEach) {
                utility.call(web3, contractMarket, order.order.contractAddr, 'getOrderFill', [order.order.contractAddr, order.order.optionID, order.order.price, order.order.size, order.order.orderID, order.order.blockExpires], function(err, result) {
                  if (!err && result!=0) {
                    order.remainingSize = Math.abs(result.toNumber());
                    if (order.order.size>0) newBuyOrders.push(order);
                    if (order.order.size<0) newSellOrders.push(order);
                  } else {
                    deadOrders[order.id] = true;
                  }
                  callbackEach(null);
                });
              },
              function(err) {
                option.buyOrders = newBuyOrders;
                option.sellOrders = newSellOrders;
                option.buyOrders.sort(function(a,b){return b.price - a.price || b.remainingSize - a.remainingSize || a.id - b.id});
                option.sellOrders.sort(function(a,b){return a.price - b.price || b.remainingSize - a.remainingSize || a.id - b.id});
                callbackMap(null, option);
              }
            );
          }
        );
      },
      function(err, options){
        //update cache
        optionsCache = options;
        callback();
      }
    );
  });
}
Main.loadPositions = function(callback) {
  async.map(config.contractAddrs,
    function(contractAddr, callback) {
      utility.call(web3, contractMarket, contractAddr, 'getMarket', [addrs[selectedAccount]], function(err, result) {
        if (result) {
          var optionIDs = result[0];
          var strikes = result[1];
          var positions = result[2];
          var cashes = result[3];
          var is = [];
          for (var i=0; i<optionIDs.length; i++) {
            if (strikes[i].toNumber()!=0) is.push(i);
          }
          async.map(is,
            function(i, callbackMap) {
              var cash = cashes[i].toNumber() / 1000000000000000000;
              var position = positions[i].toNumber();
              var option = {cash: cash, position: position, optionID: optionIDs[i], contractAddr: contractAddr};
              callbackMap(null, option);
            },
            function(err, options) {
              callback(null, options);
            }
          );
        } else {
          callback(null, []);
        }
      });
    },
    function(err, options) {
      options = options.reduce(function(a, b) {return a.concat(b);}, []);
      async.map(optionsCache,
        function(option, callbackMap) {
          for (var i=0; i<options.length; i++) {
            if (options[i].contractAddr==option.contractAddr && options[i].optionID==option.optionID) {
              option.position = options[i].position;
              option.cash = options[i].cash;
              return callbackMap(null, option);
            }
          }
          callbackMap(null, option);
        },
        function(err, options) {
          optionsCache = options;
          callback();
        }
      );
    }
  );
}
Main.loadEvents = function(callback) {
  utility.blockNumber(web3, function(err, blockNumber) {
    var startBlock = 0;
    // startBlock = blockNumber-15000;
    for (id in eventsCache) {
      var event = eventsCache[id];
      if (event.blockNumber>startBlock) {
        startBlock = event.blockNumber;
      }
      for (arg in event.args) {
        if (typeof(event.args[arg])=='string' && event.args[arg].slice(0,2)!='0x' && /^(\d|\-)+$/.test(event.args[arg])) {
          event.args[arg] = new BigNumber(event.args[arg]);
        }
      }
    }
    async.map(config.contractAddrs,
      function(contractAddr, callbackMap){
        utility.logsOnce(web3, contractMarket, contractAddr, startBlock, 'latest', function(err, events) {
          if (!err) {
            var newEvents = 0;
            events.forEach(function(event){
              if (event && !eventsCache[event.transactionHash+event.logIndex]) {
                newEvents++;
                event.txLink = 'http://'+(config.ethTestnet ? 'testnet.' : '')+'etherscan.io/tx/'+event.transactionHash;
                eventsCache[event.transactionHash+event.logIndex] = event;
              }
            });
            callbackMap(null, newEvents);
          } else {
            callbackMap(null, 0);
          }
        });
      },
      function (err, newEventsArray) {
        var newEvents = newEventsArray.reduce(function(a,b){return a+b}, 0);
        Main.createCookie(config.eventsCacheCookie, JSON.stringify(eventsCache), 999);
        callback(newEvents);
      }
    );
  });
}
Main.loadContractsFunds = function(callback) {
  async.map(config.contractAddrs,
    function(contractAddr, callback) {
      utility.call(web3, contractMarket, contractAddr, 'getFundsAndAvailable', [addrs[selectedAccount]], function(err, result) {
        if (result) {
          var funds = result[0].toString();
          var fundsAvailable = result[1].toString();
          var contractLink = 'http://'+(config.ethTestnet ? 'testnet.' : '')+'etherscan.io/address/'+contractAddr;
          utility.call(web3, contractMarket, contractAddr, 'version', [], function(err, result) {
            var version = -1;
            if (!err) {
              version = result;
            }
            callback(null, {contractAddr: contractAddr, contractLink: contractLink, funds: funds, fundsAvailable: fundsAvailable, version: version});
          });
        } else {
          callback(null, undefined);
        }
      });
    },
    function(err, contracts) {
      contractsCache = contracts.filter(function(x){return x!=undefined});
      callback();
    }
  );
}
Main.loadOptions = function(callback) {
  //Note: loadOptions loads everything it can about options and should be called less frequently. loadPositions loads just positions.
  async.mapSeries(config.contractAddrs,
    function(contractAddr, callback) {
      utility.call(web3, contractMarket, contractAddr, 'getOptionChain', [], function(err, result) {
        if (result) {
          var expiration = (new Date(result[0].toNumber()*1000)).toISOString().substring(0,10);
          var fromcur = result[1].split("/")[0];
          var tocur = result[1].split("/")[1];
          var margin = result[2].toNumber() / 1000000000000000000.0;
          var realityID = result[3].toNumber();
          utility.call(web3, contractMarket, contractAddr, 'getMarket', [addrs[selectedAccount]], function(err, result) {
            if (result) {
              var optionIDs = result[0];
              var strikes = result[1];
              var positions = result[2];
              var cashes = result[3];
              var is = [];
              for (var i=0; i<optionIDs.length; i++) {
                if (strikes[i].toNumber()!=0) is.push(i);
              }
              var optionChainDescription = {expiration: expiration, fromcur: fromcur, tocur: tocur, margin: margin, realityID: realityID};
              async.map(is,
                function(i, callbackMap) {
                  var optionID = optionIDs[i].toNumber();
                  var strike = strikes[i].toNumber() / 1000000000000000000;
                  var cash = cashes[i].toNumber() / 1000000000000000000;
                  var position = positions[i].toNumber();
                  var option = Object();
                  if (strike>0) {
                    option.kind = 'Call';
                  } else {
                    option.kind = 'Put';
                  }
                  option.strike = Math.abs(strike);
                  option.optionID = optionID;
                  option.cash = cash;
                  option.position = position;
                  option.contractAddr = contractAddr;
                  option.expiration = optionChainDescription.expiration;
                  option.fromcur = optionChainDescription.fromcur;
                  option.tocur = optionChainDescription.tocur;
                  option.margin = optionChainDescription.margin;
                  option.realityID = realityID;
                  option.buyOrders = [];
                  option.sellOrders = [];
                  callbackMap(null, option);
                },
                function(err, options) {
                  callback(null, options);
                }
              );
            } else {
              callback(null, []);
            }
          });
        } else {
          callback(null, []);
        }
      });
    },
    function(err, options) {
      options = options.reduce(function(a, b) {return a.concat(b);}, []);
      options.sort(function(a,b){ return a.expiration-b.expiration || a.strike-b.strike || a.kind-b.kind});
      optionsCache = options;
      callback();
    }
  );
}
Main.drawChart = function(element, title, dataRows, xLabel, yLabel, columns) {
  var data = new google.visualization.DataTable();
  data.addColumn('number', xLabel);
  columns.forEach(function(column){
    data.addColumn(column);
  });
  data.addRows(dataRows);
  var options = {
    hAxis: {title: xLabel},
    vAxis: {title: yLabel},
    legend: {position: 'none'},
    enableInteractivity: true,
    title: title
  };
  var chart = new google.visualization.LineChart(document.getElementById(element));
  chart.draw(data, options);
}
Main.drawOptionChart = function(element, option, price, size) {
  if (option.kind=='Call') {
    var data = [];
    data.push([Math.max(option.strike-option.margin*1,0),size*(-price),null,null]);
    var label = size>0 ? 'Max loss' : 'Max profit';
    data.push([option.strike,size*(-price),label,label]);
    for (var x = option.strike; x<option.strike+option.margin; x+=option.margin/20.0) {
      data.push([x,size*(-price+(x-option.strike)),null,null]);
    }
    label = size<0 ? 'Max loss' : 'Max profit';
    data.push([option.strike+option.margin,size*(-price+option.margin),label,label]);
    data.push([option.strike+2*option.margin,size*(-price+option.margin),null,null]);
    var action = size>0 ? 'Buy' : 'Sell';
    Main.drawChart(element, action+" "+Math.abs(size)+" eth of the "+option.strike+" Call "+" for "+price, data, "ETH/USD price", "Net profit (eth)", [{type: 'number', role: null}, {type: 'string', role: 'annotation'}, {type: 'string', role: 'annotationText'}]);
  } else if (option.kind=='Put') {
    var data = [];
    data.push([Math.max(option.strike-option.margin*2,0),size*(-price+option.margin),null,null]);
    var label = size<0 ? 'Max loss' : 'Max profit';
    data.push([option.strike-option.margin,size*(-price+option.margin),label,label]);
    for (var x = option.strike-option.margin; x<option.strike; x+=option.margin/20.0) {
      data.push([x,size*(-price+(option.strike-x)),null,null]);
    }
    label = size>0 ? 'Max loss' : 'Max profit';
    data.push([option.strike,size*(-price),label,label]);
    data.push([option.strike+1*option.margin,size*(-price),null,null]);
    var action = size>0 ? 'Buy' : 'Sell';
    Main.drawChart(element, action+" "+Math.abs(size)+" eth of the "+option.strike+" Put "+" for "+price, data, "ETH/USD price", "Net profit (eth)", [{type: 'number', role: null}, {type: 'string', role: 'annotation'}, {type: 'string', role: 'annotationText'}]);
  }
}
Main.updatePrice = function(callback) {
  $.getJSON('https://poloniex.com/public?command=returnTicker', function(result) {
    var ethBTC = result.BTC_ETH.last;
    $.getJSON('https://api.coindesk.com/v1/bpi/currentprice/USD.json', function(result) {
      var btcUSD = result.bpi.USD.rate;
      price = Number(ethBTC * btcUSD);
      priceUpdated = Date.now();
      callback();
    });
  });
}
Main.getPrice = function() {
  return price;
}
Main.getGitterMessages = function(callback) {
  console.log('Getting Gitter');
  utility.getGitterMessages(gitterMessagesCache, function(err, result){
    if (!err) {
      gitterMessagesCache = result.gitterMessages;
      Main.createCookie(config.gitterCacheCookie, JSON.stringify(gitterMessagesCache), 999);
      console.log('Done getting Gitter');
    }
    callback();
  });
}
Main.displayEvents = function(callback) {
  var events = Object.values(eventsCache);
  events.sort(function(a,b){ return b.blockNumber-a.blockNumber || b.transactionIndex-a.transactionIndex });
  new EJS({url: config.homeURL+'/templates/'+'events_table.ejs'}).update('events', {events: events, options: optionsCache});
  callback();
}
Main.displayContent = function(callback) {
  new EJS({url: config.homeURL+'/templates/'+'family.ejs'}).update('family', {});
  callback();
}
Main.displayPricesUpdatedTimer = function(callback) {
  if (pricesUpdatedTimer) clearInterval(pricesUpdatedTimer);
  pricesUpdated = Date.now();
  pricesUpdatedTimer = setInterval(function () {
    function pad(val) {return val > 9 ? val : "0" + val;}
    var sec = Math.ceil((Date.now() - pricesUpdated) / 1000);
    if ($('#updated').length) {
      $('#updated')[0].innerHTML = (pad(parseInt(sec / 60, 10)))+":"+(pad(++sec % 60));
    }
  }, 1000);
  callback();
}
Main.selectContract = function(contractAddr) {
  selectedContract = contractAddr;
  Main.refresh(function(){}, true);
}
Main.displayMarket = function(callback) {
  var optionExpirations = contractsCache.map(function(contract){
    var options = optionsCache.filter(function(x){return x.contractAddr==contract.contractAddr});
    if (options.length>0) {
      return {
        expiration: options[0].expiration,
        contractAddr: contract.contractAddr,
        fromcur: options[0].fromcur,
        tocur: options[0].tocur,
      };
    } else {
      return {
        expiration: "Expired",
        contractAddr: contract.contractAddr,
        fromcur: '',
        tocur: '',
      };
    }
  });
  optionExpirations.sort(function(a,b){return a.expiration > b.expiration ? 1 : -1});
  if (!selectedContract) selectedContract = optionExpirations[0].contractAddr;
  var matchingContracts = contractsCache.filter(function(x){return x.contractAddr==selectedContract});
  if (matchingContracts.length>=1) {
    var contract = matchingContracts[0];
    new EJS({url: config.homeURL+'/templates/'+'market_nav.ejs'}).update('market_nav', {contract: contract, options: optionsCache, optionExpirations: optionExpirations});
    new EJS({url: config.homeURL+'/templates/'+'market_prices.ejs'}).update('market_prices', {contract: contract, options: optionsCache, addr: addrs[selectedAccount]});
  }
  callback();
}
Main.resetCaches = function() {
  Main.eraseCookie(config.eventsCacheCookie);
  Main.eraseCookie(config.gitterCacheCookie);
  Main.eraseCookie(config.deadOrdersCookie);
  location.reload();
}
Main.refresh = function(callback, force) {
  if (!lastRefresh || Date.now()-lastRefresh>15*1000 || force) {
    console.log('Refreshing');
    if (!lastRefresh) force = true;
    lastRefresh = Date.now();
    Main.createCookie(config.userCookie, JSON.stringify({"addrs": addrs, "pks": pks, "selectedAccount": selectedAccount}), 999);
    Main.connectionTest();
    Main.updatePrice(function(){});
    Main.loadEvents(function(newEvents){
      if (newEvents>0 || force) {
        Main.loadContractsFunds(function(){
          Main.loadPositions(function(){
            Main.displayMarket(function(){});
          });
        });
        Main.displayAccounts(function(){});
        Main.displayEvents(function(){});
      }
    });
    Main.getGitterMessages(function(){
      Main.loadPrices(function(){
        Main.displayMarket(function(){
          Main.displayMyOrders(function(){});
          $('#loading').hide();
        });
      });
      Main.displayPricesUpdatedTimer(function(){});
    });
  }
  callback();
}
Main.init = function(callback) {
  Main.createCookie(config.userCookie, JSON.stringify({"addrs": addrs, "pks": pks, "selectedAccount": selectedAccount}), 999);
  Main.connectionTest();
  Main.displayContent(function(){});
  Main.loadContractsFunds(function(){
    Main.loadOptions(function(){
      callback();
    });
  });
}

//globals
var contractContracts = undefined;
var contractMarket = undefined;
var addrs;
var pks;
var selectedAccount = 0;
var connection = undefined;
var nonce = undefined;
var eventsCache = {};
var contractsCache = undefined;
var optionsCache = undefined;
var browserOrders = [];
var deadOrders = {};
var refreshing = 0;
var lastRefresh = undefined;
var price = undefined;
var priceUpdated = Date.now();
var gitterMessagesCache = {};
var selectedContract = undefined;
var pricesUpdated = Date.now();
var pricesUpdatedTimer = undefined;
//web3
if(typeof web3 !== 'undefined' && typeof Web3 !== 'undefined') {
    web3 = new Web3(web3.currentProvider);
} else if (typeof Web3 !== 'undefined') {
    web3 = new Web3(new Web3.providers.HttpProvider(config.ethProvider));
} else if(typeof web3 == 'undefined' && typeof Web3 == 'undefined') {
}

web3.version.getNetwork(function(error, version){
  //check mainnet vs testnet
  if (version in configs) config = configs[version];
  //default addr, pk
  addrs = [config.ethAddr];
  pks = [config.ethAddrPrivateKey];
  //get cookie
  var cookie = Main.readCookie(config.userCookie);
  if (cookie) {
    cookie = JSON.parse(cookie);
    addrs = cookie["addrs"];
    pks = cookie["pks"];
    if (cookie["selectedAccount"]) selectedAccount = cookie["selectedAccount"];
  }
  //gitter messages cache cookie
  var gitterCookie = Main.readCookie(config.gitterCacheCookie);
  if (gitterCookie) {
    gitterMessagesCache = JSON.parse(gitterCookie);
  }
  //events cache cookie
  var eventsCacheCookie = Main.readCookie(config.eventsCacheCookie);
  if (eventsCacheCookie) eventsCache = JSON.parse(eventsCacheCookie);
  //dead orders cookie
  var deadOrdersCookie = Main.readCookie(config.deadOrdersCookie);
  if (deadOrdersCookie) {
    deadOrders = JSON.parse(deadOrdersCookie);
  }
  //get accounts
  web3.eth.defaultAccount = config.ethAddr;
  web3.eth.getAccounts(function(e,accounts){
    if (!e) {
      accounts.forEach(function(addr){
        if(addrs.indexOf(addr)<0) {
          addrs.push(addr);
          pks.push(undefined);
        }
      });
    }
  });
  //load contract
  utility.loadContract(web3, config.contractContracts, config.contractContractsAddr, function(err, contract){
    contractContracts = contract;
    utility.call(web3, contractContracts, config.contractContractsAddr, 'getContracts', [], function(err, result) {
      if (result) {
        config.contractAddrs = result.filter(function(x){return x!='0x0000000000000000000000000000000000000000'}).getUnique();
        utility.loadContract(web3, config.contractMarket, undefined, function(err, contract){
          contractMarket = contract;
          Main.init(function(){
            function mainLoop() {
              Main.refresh(function(){
                setTimeout(mainLoop, 15*1000);
              });
            }
            mainLoop();
          });
        });
      }
    });
  });
});


module.exports = {Main: Main, utility: utility};
