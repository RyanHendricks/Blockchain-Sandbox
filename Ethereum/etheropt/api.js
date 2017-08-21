var config = require('./config.js');
var utility = require('./common/utility.js');
var Web3 = require('web3');
var request = require('request');
var async = require('async');
var BigNumber = require('bignumber.js');
var sha256 = require('js-sha256').sha256;

function API(){
}

API.init = function(callback, path) {
  var self = this;

  //self.config, utility
  self.config = config;
  self.utility = utility;

  if (path) {
    self.config.contractMarket = path + self.config.contractMarket;
    self.config.contractContracts = path + self.config.contractContracts;
  }

  //web3
  self.web3 = new Web3();
  self.web3.eth.defaultAccount = self.config.ethAddr;
  self.web3.setProvider(new self.web3.providers.HttpProvider(self.config.ethProvider));

  //check mainnet vs testnet
  self.web3.version.getNetwork(function(error, version){
    if (version in configs) self.config = configs[version];
    try {
      if (self.web3.currentProvider) {
        self.web3.eth.coinbase;
      }
    } catch(err) {
      self.web3.setProvider(undefined);
    }

    //contracts
    self.contractContracts;
    self.contractContractsAddr = self.config.contractContractsAddr;
    self.contractAddrs;
    self.contractMarket;

    //other variables
    self.gitterMessagesCache = {};
    self.eventsCache = {};
    self.deadOrders = {};
    self.workingOrders = [];

    //prices
    self.prices = undefined;

    async.parallel(
      [
        function(callback){
          utility.loadContract(self.web3, self.config.contractContracts, self.config.contractContractsAddr, function(err, contract){
            self.contractContracts = contract;
            utility.call(self.web3, self.contractContracts, self.config.contractContractsAddr, 'getContracts', [], function(err, result) {
              if (result) {
                self.contractAddrs = result.filter(function(x){return x!='0x0000000000000000000000000000000000000000'}).getUnique();
                utility.loadContract(self.web3, self.config.contractMarket, undefined, function(err, contract){
                  self.contractMarket = contract;
                  callback(null, true);
                });
              }
            });
          });
        },
        function(callback){
          utility.readFile('storage_gitterMessagesCache', function(err, result){
            if (!err) {
              try {
                self.gitterMessagesCache = JSON.parse(result);
              } catch (err) {
                self.gitterMessagesCache = {};
              }
            }
            callback(null, true);
          });
        },
        function(callback){
          utility.readFile('storage_eventsCache', function(err, result){
            if (!err) {
              try {
                self.eventsCache = JSON.parse(result);
              } catch (err) {
                self.eventsCache = {};
              }
            }
            callback(null, true);
          });
        },
        function(callback){
          utility.readFile('storage_deadOrders', function(err, result){
            if (!err) {
              try {
                self.deadOrders = JSON.parse(result);
              } catch(err) {
                self.deadOrders = {};
              }
            }
            callback(null, true);
          });
        }
      ],
      function(err, results){
        API.getPrices(function(err, result){
          callback(null, {contractMarket: self.contractMarket, contractAddrs: self.contractAddrs});
        });
      }
    );
  });
}

API.logs = function(callback) {
  var self = this;
  utility.blockNumber(self.web3, function(err, blockNumber) {
    var startBlock = 0;
    for (id in self.eventsCache) {
      var event = self.eventsCache[id];
      if (event.blockNumber>startBlock && event.address==self.contractEtherDeltaAddr) {
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
        utility.logsOnce(self.web3, self.contractMarket, contractAddr, startBlock, 'latest', function(err, events) {
          var newEvents = 0;
          events.forEach(function(event){
            if (!self.eventsCache[event.transactionHash+event.logIndex]) {
              newEvents++;
              event.txLink = 'http://'+(config.ethTestnet ? 'testnet.' : '')+'etherscan.io/tx/'+event.transactionHash;
              self.eventsCache[event.transactionHash+event.logIndex] = event;
            }
          });
          callbackMap(null, newEvents);
        });
      },
      function (err, newEventsArray) {
        var newEvents = newEventsArray.reduce(function(a,b){return a+b}, 0);
        utility.writeFile('storage_eventsCache', JSON.stringify(self.eventsCache), function(err, result){});
        callback(null, newEvents);
      }
    );
  });
}

API.getPrices = function(callback) {
  var self = this;
  if (!self.prices || !self.prices.updated || new Date()-self.prices.updated>30*1000) {
    var ethBTC = undefined;
    var btcUSD = undefined;
    request.get('https://poloniex.com/public?command=returnTicker', function(err, httpResponse, body) {
      try {
        ethBTC = JSON.parse(body).BTC_ETH.last;
      } catch (err) {
      }
      request.get('http://api.coindesk.com/v1/bpi/currentprice/USD.json', function(err, httpResponse, body) {
        try {
          btcUSD = JSON.parse(body).bpi.USD.rate;
          var price = ethBTC * btcUSD;
          self.prices = {"ETHBTC": ethBTC, "BTCUSD": btcUSD, "ETHUSD": price, updated: Date.now()};
        } catch (err) {
        }
        if (!self.prices || new Date()-self.prices.updated>60*1000) {
          throw new Error("Prices out of date");
        }
        callback(null, self.prices);
      });
    });
  } else {
    callback(null, self.prices);
  }
}

API.getBalance = function(addr, callback) {
  var self = this;
  utility.getBalance(this.web3, addr, function(err, balance){
    if (!err) {
      callback(null, balance);
    } else {
      callback(null, 0);
    }
  })
}

API.getEtheroptBalanceTotal = function(addr, callback) {
  var self = this;
  async.map(self.contractAddrs,
    function(contractAddr, callbackMap) {
      utility.call(self.web3, self.contractMarket, contractAddr, 'getFundsAndAvailable', [addr], function(err, result) {
        if (!err) {
          callbackMap(null, result[0].toNumber());
        } else {
          callbackMap(null, 0);
        }
      });
    },
    function(err, etheroptBalances) {
      var balance = etheroptBalances.reduce(function(a,b){return a+b}, 0);
      callback(null, balance);
    }
  );
}

API.getEtheroptBalance = function(addr, contractAddr, callback) {
  var self = this;
  utility.call(self.web3, self.contractMarket, contractAddr, 'getFundsAndAvailable', [addr], function(err, result) {
    if (!err) {
      callback(null, result[0].toNumber());
    } else {
      callback(null, 0);
    }
  });
}

API.getEtheroptAvailableBalance = function(addr, contractAddr, callback) {
  var self = this;
  utility.call(self.web3, self.contractMarket, contractAddr, 'getFundsAndAvailable', [addr], function(err, result) {
    if (!err) {
      callback(null, result[1].toNumber());
    } else {
      callback(null, 0);
    }
  });
}

API.getEtheroptBalances = function(addr, callback) {
  var self = this;
  async.map(self.contractAddrs,
    function(contractAddr, callbackMap) {
      API.getEtheroptBalance(addr, contractAddr, function(err, result){
        var balance = result;
        API.getEtheroptAvailableBalance(addr, contractAddr, function(err, result){
          var availableBalance = result;
          callbackMap(null, {balance: balance, availableBalance: availableBalance});
        });
      });
    },
    function(err, result) {
      var balances = {};
      for (var i=0; i<self.contractAddrs.length; i++) {
        balances[self.contractAddrs[i]] = result[i];
      }
      callback(null, balances);
    }
  )
}

API.getUSDBalance = function(addr, callback) {
  var self = this;
  API.getPrices(function(err, prices){
    async.parallel(
      [
        function(callback){
          API.getBalance(addr, callback);
        },
        function(callback){
          API.getEtheroptBalanceTotal(addr, callback);
        }
      ],
      function(err, results){
        var balances = {'Balance': results[0], 'EtherOpt Balance': results[1]};
        var total = 0;
        for (var dapp in balances) {
          var balance = balances[dapp];
          balances[dapp] = Number(utility.weiToEth(balance));
          total += balances[dapp];
        }
        var ethValue = total;
        var usdValue = total*prices.ETHUSD;
        var result = {ethValue: ethValue, usdValue: usdValue, balances: balances, prices: prices};
        callback(null, result);
      }
    );
  });
}

API.getGitterMessages = function(callback) {
  var self = this;
  utility.getGitterMessages(self.gitterMessagesCache, function(err, result){
    self.gitterMessagesCache = result.gitterMessages;
    var newMessagesFound = result.newMessagesFound;
    utility.writeFile('storage_gitterMessagesCache', JSON.stringify(self.gitterMessagesCache), function(err, result){});
    callback(null, newMessagesFound);
  });
}

API.getOptions = function(addr, callback) {
  var self = this;
  async.map(self.contractAddrs,
    function(contractAddr, callbackMap1) {
      utility.call(self.web3, self.contractMarket, contractAddr, 'getOptionChain', [], function(err, result) {
        if (result) {
          var expiration = (new Date(result[0].toNumber()*1000)).toISOString().substring(0,10);
          var fromcur = result[1].split("/")[0];
          var tocur = result[1].split("/")[1];
          var margin = result[2].toNumber() / 1000000000000000000;
          var realityID = result[3].toNumber();
          var optionChainDescription = {expiration: expiration, fromcur: fromcur, tocur: tocur, margin: margin, realityID: realityID};
          utility.call(self.web3, self.contractMarket, contractAddr, 'getMarket', [addr], function(err, result) {
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
                function(i, callbackMap2) {
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
                  async.whilst(
                    function () { return optionChainDescription==undefined },
                    function (callbackWhilst) {
                        setTimeout(function () {
                            callbackWhilst(null);
                        }, 1000);
                    },
                    function (err) {
                      option.expiration = optionChainDescription.expiration;
                      option.fromcur = optionChainDescription.fromcur;
                      option.tocur = optionChainDescription.tocur;
                      option.margin = optionChainDescription.margin;
                      callbackMap2(null, option);
                    }
                  );
                },
                function(err, options) {
                  callbackMap1(null, options);
                }
              );
            } else {
              callbackMap1(null, []);
            }
          });
        } else {
          callbackMap1(null, []);
        }
      });
    },
    function(err, options){
      options = options.reduce(function(a, b) {return a.concat(b);}, []);
      options.sort(function(a,b){ return a.expiration+(a.strike+10000000).toFixed(3).toString()+(a.kind=='Put' ? '0' : '1')<b.expiration+(b.strike+10000000).toFixed(3).toString()+(b.kind=='Put' ? '0' : '1') ? -1 : 1 });
      callback(null, options);
    }
  );
}

API.getEvents = function(callback) {
  var self = this;
  var events = Object.values(self.eventsHash);
  events.sort(function(a,b){ return b.blockNumber-a.blockNumber || b.transactionIndex-a.transactionIndex });
  callback(null, events);
}

API.sendOrder = function(addr, balance, option, volume, price, blockExpires, armed, callback) {
  var self = this;
  volume = new BigNumber(volume).times(new BigNumber(1000000000000000000)).toNumber();
  price = new BigNumber(price).times(new BigNumber(1000000000000000000)).toNumber();
  var orderID = utility.getRandomInt(0,Math.pow(2,32));
  var condensedBuy = utility.pack([option.contractAddr, option.optionID, price, volume, orderID, blockExpires], [160, 256, 256, 256, 256, 256]);
  var hashBuy = sha256(new Buffer(condensedBuy,'hex'));
  var order = {contractAddr: option.contractAddr, optionID: option.optionID, price: price, size: volume, orderID: orderID, blockExpires: blockExpires, addr: addr, hash: '0x'+hashBuy};
  utility.call(self.web3, self.contractMarket, order.contractAddr, 'getMaxLossAfterTrade', [order.addr, order.optionID, order.size, -order.size*order.price], function(err, result) {
    if (result && Number(balance) + Number(result.toString())>=0) {
      if (armed) {
        utility.sign(self.web3, addr, hashBuy, undefined, function(err, sig){
          if (!err) {
            order.v = sig.v;
            order.r = sig.r;
            order.s = sig.s;
            utility.postGitterMessage(JSON.stringify(order), function(err, result){
              console.log(option.expiration, option.kind, option.strike, utility.weiToEth(volume),"@",utility.weiToEth(price), "(sent)");
              callback(null, true);
            });
          } else {
            console.log(option.expiration, option.kind, option.strike, utility.weiToEth(volume),"@",utility.weiToEth(price), "(failed to sign)");
            callback("failed to sign", false);
          }
        });
      } else {
        console.log(option.expiration, option.kind, option.strike, utility.weiToEth(volume),"@",utility.weiToEth(price), "(not armed)");
        callback(null, true);
      }
    } else {
      console.log(option.expiration, option.kind, option.strike, utility.weiToEth(volume),"@",utility.weiToEth(price), "(not enough funds)");
      callback("not enough funds", false);
    }
  });
}

API.marketMake = function(addr, armed, expires, pricerFn, sizeAndWidthFn) {
  var self = this;
  function loop() {
    utility.blockNumber(self.web3, function(err, blockNumber){
      var blockExpires = blockNumber + expires;
      API.getPortfolioGreeks(addr, pricerFn, function(err, greeks){
        API.getEtheroptBalances(addr, function(err, balances){
          API.getOptions(addr, function(err, options){
            API.getPrices(function(err, prices){
              async.eachSeries(options,
                function(option, callbackEach) {
                  var balance = balances[option.contractAddr].balance;
                  var expiration = Date.parse(option.expiration+" 00:00:00 UTC");
                  var tDays = (expiration - Date.now())/86400000.0;
                  var t = tDays / 365.0;
                  var cp = option.kind=='Call' ? 1 : -1;
                  var k = option.strike;
                  var s = undefined;
                  var pair = option.fromcur+"/"+option.tocur;
                  if (pair=="ETH/USD") {
                    s = prices.ETHUSD;
                  } else if (pair=="XBT/USD") {
                    s = prices.BTCUSD;
                  }
                  var margin = option.margin;
                  var price = pricerFn(option, greeks, cp, margin, s, k, t);
                  var size = sizeAndWidthFn(price, option, greeks, cp, margin, s, k, t);
                  if (price && size) {
                    API.sendOrder(addr, balance, option, -size.sellSize, size.sellPrice, blockExpires, armed, function(err, result){
                      API.sendOrder(addr, balance, option, size.buySize, size.buyPrice, blockExpires, armed, function(err, result){
                        callbackEach(null);
                      });
                    });
                  } else {
                    callbackEach(null);
                  }
                },
                function(err) {
                  var currentBlockNumber = 0;
                  async.whilst(
                    function() {return blockExpires>=currentBlockNumber},
                    function(callbackWhilst) {
                      utility.blockNumber(self.web3, function(err, blockNumber){
                        currentBlockNumber = blockNumber;
                        setTimeout(function(){
                          callbackWhilst(null)
                        }, 10*1000);
                      });
                    },
                    function(err) {
                      loop();
                    }
                  );
                }
              )
            });
          });
        });
      });
    });
  }
  loop();
}

API.getGreeks = function(option, pricerFn, callback) {
  var self = this;
  var expiration = Date.parse(option.expiration+" 00:00:00 UTC");
  var tDays = (expiration - Date.now())/86400000.0;
  var t = tDays / 365.0;
  var cp = option.kind=='Call' ? 1 : -1;
  var k = option.strike;
  API.getPrices(function(err, prices){
    var s = undefined;
    var pair = option.fromcur+"/"+option.tocur;
    if (pair=="ETH/USD") {
      s = prices.ETHUSD;
    } else if (pair=="XBT/USD") {
      s = prices.BTCUSD;
    }
    var margin = option.margin;
    var greeks = {};
    var price = pricerFn(option, greeks, cp, margin, s, k, t);
    var delta = (pricerFn(option, greeks, cp, margin, s*1.005, k, t) - pricerFn(option, greeks, cp, margin, s*(1-0.005), k, t))/0.01/s;
    var thetaExpiration = pricerFn(option, greeks, cp, margin, s, k, 0) - pricerFn(option, greeks, cp, margin, s, k, t);
    var theta = t>1./365. ? pricerFn(option, greeks, cp, margin, s, k, t-1./365.) - pricerFn(option, greeks, cp, margin, s, k, t) : thetaExpiration;
    var greeks = {price: price, delta: delta, theta: theta, thetaExpiration: thetaExpiration};
    callback(null, greeks);
  });
}

API.getPortfolioGreeks = function(addr, pricerFn, callback) {
  var self = this;
  var unit = utility.ethToWei(1);
  var portfolios = {};
  API.getOptions(addr, function(err, options){
    async.map(self.contractAddrs,
      function(contractAddr, callbackMap1) {
        async.map(options.filter(function(option){return option.contractAddr==contractAddr}),
          function(option, callbackMap2) {
            API.getGreeks(option, pricerFn, function(err, greeks){
              Object.keys(greeks).forEach(function(greek){
                greeks[greek] = {greek: greeks[greek], position: option.position, option: option};
              });
              callbackMap2(null, greeks);
            });
          },
          function(err, results) {
            var greeks = {};
            Object.keys(results[0]).forEach(function(greek) {
              greeks[greek] = 0;
              if (greek=='price') greeks[greek] += results[0].price.option.cash / unit;
              results.forEach(function(result){
                greeks[greek] += result[greek].greek * result[greek].position / unit;
              });
              if (greek=='price') {
                greeks.pnl = greeks.price;
                delete greeks.price;
              }
            });
            callbackMap1(null, greeks);
          }
        );
      },
      function(err, result) {
        var portfolio = {};
        for (var i=0; i<self.contractAddrs.length; i++) {
          var expiration = options.filter(function(option){return option.contractAddr==self.contractAddrs[i]})[0].expiration;
          portfolio[self.contractAddrs[i]] = result[i];
        }
        callback(null, portfolio);
      }
    );
  });
}

module.exports = API;
