var config = require('./config.js');
var utility = require('./common/utility.js');
var Web3 = require('web3');
var assert = require('assert');
var TestRPC = require('ethereumjs-testrpc');
var fs = require('fs');
var sha256 = require('js-sha256').sha256;
var async = require('async');
var BigNumber = require('bignumber.js');
var utils = require('web3/lib/utils/utils.js');
var coder = require('web3/lib/solidity/coder.js');

var logger = {
  log: function(message) {
    // console.log(message);
  }
};

function max(a,b) {
  if (a.gt(b)) return a;
  return b;
}

function min(a,b) {
  if (a.lt(b)) return a;
  return b;
}

function deploy(web3, sourceFile, contractName, constructorParams, address, callback) {
  utility.readFile(sourceFile+'.bytecode', function(err, bytecode){
    utility.readFile(sourceFile+'.interface', function(err, abi){
      utility.readFile(sourceFile, function(err, source){
        if (abi && bytecode) {
          abi = JSON.parse(abi);
          bytecode = JSON.parse(bytecode);
        } else if (typeof(solc)!='undefined') {
          var compiled = solc.compile(source, 1).contracts[contractName];
          abi = JSON.parse(compiled.interface);
          bytecode = compiled.bytecode;
        }
        var contract = web3.eth.contract(abi);
        utility.testSend(web3, contract, undefined, 'constructor', constructorParams.concat([{from: address, data: bytecode}]), address, undefined, 0, function(err, result) {
          var initialTransaction = result;
          assert.deepEqual(initialTransaction.length, 66);
          web3.eth.getTransactionReceipt(initialTransaction, function(err, receipt) {
            assert.equal(err, undefined);
            var addr = receipt.contractAddress;
            contract = contract.at(addr);
            assert.notEqual(receipt, null, "Transaction receipt shouldn't be null");
            assert.notEqual(addr, null, "Transaction did not create a contract");
            web3.eth.getCode(addr, function(err, result) {
              assert.equal(err, undefined);
              assert.notEqual(result, null);
              assert.notEqual(result, "0x0");
              callback(undefined, {contract: contract, addr: addr});
            });
          });
        });
      });
    });
  });
}

describe("Test", function(done) {
  this.timeout(240*1000);
  var web3 = new Web3();
  var port = 12345;
  var server;
  var accounts;
  var contractMarket;
  var contractMarketAddr;
  var zero = new BigNumber(0);
  var unit = new BigNumber(utility.ethToWei(1));
  var expiration = 1457676000;
  var symbol = "ETH/USD";
  var margin = Number(utility.ethToWei(5));
  var unit = Number(1000000000000000000);
  var realityID = 7573;
  var factHash = '0x4c28f2fecb85003b84f3e93ae89d97925f217e5151aafe46d01d2a7434b481aa';
  var ethAddr = '0x6fde387af081c37d9ffa762b49d340e6ae213395';
  var strikes = [11, -11, 11.5, -11.5, 12, -12, 12.5, -12.5, 13, -13];
  strikes = strikes.map(function(x){return Number(utility.ethToWei(x))});

  before("Initialize TestRPC server", function(done) {
    server = TestRPC.server(logger);
    server.listen(port, function() {
      config.ethProvider = "http://localhost:" + port;
      config.ethGasCost = 20000000000;
      web3.setProvider(new Web3.providers.HttpProvider("http://localhost:" + port));
      done();
    });
  });

  before("Initialize accounts", function(done) {
    web3.eth.getAccounts(function(err, accs) {
      assert.equal(err, undefined);
      assert.equal(err, undefined);
      accounts = accs;
      config.ethAddr = accounts[0];
      done();
    });
  });

  after("Shutdown server", function(done) {
    server.close(done);
  });

  describe("contract scenario", function() {
    it("Should add the contract to the network", function(done) {
      deploy(web3, config.contractMarket, 'Etheropt', [expiration, symbol, margin, realityID, factHash, ethAddr, strikes], accounts[0], function(err, contract) {
        contractMarket = contract.contract;
        contractMarketAddr = contract.addr;
        done();
      });
    });
    it("Should add and withdraw some funds", function(done) {
      var funds = new BigNumber(utility.ethToWei(1500));
      var withdraw = new BigNumber(utility.ethToWei(500));
      utility.testSend(web3, contractMarket, contractMarketAddr, 'addFunds', [{gas: 1000000, value: funds}], accounts[0], undefined, 0, function(err, result) {
        assert.equal(err, undefined);
        utility.testSend(web3, contractMarket, contractMarketAddr, 'withdrawFunds', [withdraw, {gas: 1000000, value: 0}], accounts[0], undefined, 0, function(err, result) {
          assert.equal(err, undefined);
          utility.testCall(web3, contractMarket, contractMarketAddr, 'getFundsAndAvailable', [accounts[0]], function(err, result) {
            assert.equal(err, undefined);
            assert.equal(!result[0].equals(funds.minus(withdraw)) || !result[1].equals(funds.minus(withdraw)), false);
            utility.testSend(web3, contractMarket, contractMarketAddr, 'addFunds', [{gas: 1000000, value: funds}], accounts[1], undefined, 0, function(err, result) {
              assert.equal(err, undefined);
              utility.testCall(web3, contractMarket, contractMarketAddr, 'getFundsAndAvailable', [accounts[1]], function(err, result) {
                assert.equal(err, undefined);
                assert.equal(!result[0].equals(funds) || !result[1].equals(funds), false);
                done();
              });
            });
          });
        });
      });
    });
    it("Should check option chain", function(done) {
      utility.testCall(web3, contractMarket, contractMarketAddr, 'getMarket', [accounts[0]], function(err, result) {
        assert.equal(err, undefined);
        assert.equal(!result[0].slice(0,10).map(function(x){return x.toNumber()}).equals([0,1,2,3,4,5,6,7,8,9]), false);
        assert.equal(!result[1].slice(0,10).map(function(x){return x.toNumber()}).equals(strikes), false);
        assert.equal(!result[2].slice(0,10).map(function(x){return x.toNumber()}).equals([0,0,0,0,0,0,0,0,0,0]), false);
        assert.equal(!result[3].slice(0,10).map(function(x){return x.toNumber()}).equals([0,0,0,0,0,0,0,0,0,0]), false);
        done();
      });
    });
    it("Should execute some trades", function(done) {
      function makeTrade(trade, callback) {
        var optionID = trade.optionID ? trade.optionID : 0;
        var orderAccount = accounts[0];
        var counterpartyAccount = accounts[1];
        var orderID = utility.getRandomInt(0,Math.pow(2,64));
        var blockExpires = 10;
        var price = trade.price ? trade.price : new BigNumber(utility.ethToWei(0.50000));
        var size = trade.size ? trade.size : new BigNumber(utility.ethToWei(1.0000));
        var matchSize = trade.matchSize ? trade.matchSize : new BigNumber(utility.ethToWei(-0.50000));
        utility.testCall(web3, contractMarket, contractMarketAddr, 'getMarket', [orderAccount], function(err, result) {
          assert.equal(err, undefined);
          var initialPosition = result[2];
          var initialCash = result[3];
          web3.eth.getBlockNumber(function(err, blockNumber) {
            assert.equal(err, undefined);
            blockExpires = blockNumber + blockExpires;
            var option = {optionID: optionID};
            var condensed = utility.pack([contractMarketAddr, option.optionID, price, size, orderID, blockExpires], [160, 256, 256, 256, 256, 256]);
            var hash = sha256(new Buffer(condensed,'hex'));
            utility.sign(web3, orderAccount, hash, undefined, function(err, sig) {
              assert.equal(err, undefined);
              var order = {optionID: option.optionID, price: price, size: size, orderID: orderID, blockExpires: blockExpires, addr: orderAccount, v: sig.v, r: sig.r, s: sig.s, hash: '0x'+hash};
              utility.testCall(web3, contractMarket, contractMarketAddr, 'orderMatchTest', [contractMarketAddr, order.optionID, order.price, order.size, order.orderID, order.blockExpires, order.addr, counterpartyAccount, 0, matchSize], function(err, result) {
                assert.equal(err, undefined);
                assert.equal(result, true);
                utility.testSend(web3, contractMarket, contractMarketAddr, 'orderMatch', [contractMarketAddr, order.optionID, order.price, order.size, order.orderID, order.blockExpires, order.addr, order.v, order.r, order.s, matchSize, {gas: 4000000, value: 0}], counterpartyAccount, undefined, 0, function(err, result) {
                  assert.equal(err, undefined);
                  utility.testCall(web3, contractMarket, contractMarketAddr, 'getMarket', [orderAccount], function(err, result) {
                    assert.equal(err, undefined);
                    var finalPosition = result[2];
                    var finalCash = result[3];
                    assert.equal(!finalPosition[optionID].sub(initialPosition[optionID]).equals(matchSize.neg()), false);
                    callback();
                  });
                });
              });
            });
          });
        });
      }
      var trades = [];
      for (var i=0; i<4; i++) {
        var size = Math.random().toFixed(4);
        var price = Math.random().toFixed(4);
        var matchSize = -size;
        var optionID = Math.floor(Math.random()*10);
        trades.push({optionID: optionID, price: new BigNumber(utility.ethToWei(price)), size: new BigNumber(utility.ethToWei(size)), matchSize: new BigNumber(utility.ethToWei(matchSize))});
      }
      trades.push({optionID: 0, price: new BigNumber(utility.ethToWei(1.000)), size: new BigNumber(utility.ethToWei(1.000)), matchSize: new BigNumber(utility.ethToWei(-1.000))});
      trades.push({optionID: 7, price: new BigNumber(utility.ethToWei(1.000)), size: new BigNumber(utility.ethToWei(-1.000)), matchSize: new BigNumber(utility.ethToWei(1.000))});
      async.eachSeries(trades,
        function(trade, callback_each) {
          makeTrade(trade, function(err) {
            if (err) {
              callback_each(err);
            } else {
              callback_each();
            }
          });
        },
        function(err){
          assert.equal(err, undefined);
          done();
        }
      );
    });
    it("Should check position sums", function(done) {
      utility.testCall(web3, contractMarket, contractMarketAddr, 'getMarket', [accounts[0]], function(err, result) {
        assert.equal(err, undefined);
        var positions1 = result[2];
        var cashes1 = result[3];
        utility.testCall(web3, contractMarket, contractMarketAddr, 'getMarket', [accounts[1]], function(err, result) {
          assert.equal(err, undefined);
          var positions2 = result[2];
          var cashes2 = result[3];
          for (var i=0; i<positions1.length; i++) {
            assert.equal(!positions1[i].plus(positions2[i]).equals(zero), false);
            assert.equal(!cashes1[i].plus(cashes2[i]).equals(zero), false);
          }
          done();
        });
      });
    });
    it("Should check available funds", function(done) {
      utility.testCall(web3, contractMarket, contractMarketAddr, 'getFundsAndAvailable', [accounts[0]], function(err, result) {
        assert.equal(err, undefined);
        var funds = result[0];
        var available = result[1];
        utility.testCall(web3, contractMarket, contractMarketAddr, 'getMarket', [accounts[0]], function(err, result) {
          assert.equal(err, undefined);
          var strikes = result[1];
          var positions = result[2];
          var cashes = result[3];
          utility.testCall(web3, contractMarket, contractMarketAddr, 'getOptionChain', [], function(err, result) {
            var margin = result[2];
            var realityID = result[3];
            var factHash = result[4];
            var ethAddr = result[5];
            var maxLoss = undefined;
            for (var i=0; i<strikes.length; i++) {
              //on the strike
              var loss = cashes[0].div(unit);
              var settlement = strikes[i].abs();
              for (var j=0; j<strikes.length; j++) {
                if (strikes[j].gt(zero) && settlement.gt(strikes[j])) {
                  loss = loss.plus(positions[j].times(min(margin, settlement.minus(strikes[j]))).div(unit));
                } else if (strikes[j].lt(zero) && settlement.lt(strikes[j].neg())) {
                  loss = loss.plus(positions[j].times(min(margin, strikes[j].neg().minus(settlement))).div(unit));
                }
              }
              if (maxLoss==undefined || loss.lt(maxLoss)) {
                maxLoss = loss;
              }
              //margin away from the strike in the in the money direction
              loss = cashes[0].div(unit);
              settlement = strikes[i].gt(zero) ? strikes[i].plus(margin) : max(zero,strikes[i].neg().minus(margin));
              for (var j=0; j<strikes.length; j++) {
                if (strikes[j].gt(zero) && settlement.gt(strikes[j])) {
                  loss = loss.plus(positions[j].times(min(margin, settlement.minus(strikes[j]))).div(unit));
                } else if (strikes[j].lt(zero) && settlement.lt(strikes[j].neg())) {
                  loss = loss.plus(positions[j].times(min(margin, strikes[j].neg().minus(settlement))).div(unit));
                }
              }
              if (maxLoss==undefined || loss.lt(maxLoss)) {
                maxLoss = loss;
              }
            }
            // console.log(available.toNumber());
            // console.log(funds.plus(maxLoss).toNumber());
            assert.equal(!available.equals(funds.plus(maxLoss)), false);
            done();
          });
        });
      });
    });
    it("Should expire", function(done) {
      utility.testCall(web3, contractMarket, contractMarketAddr, 'getOptionChain', [], function(err, result) {
        var margin = result[2];
        var realityID = result[3];
        var factHash = result[4];
        var ethAddr = result[5];
        var r = '0x76f6018a8c182f7da65c2cd0a9c10c20c1636d5c95dc0f3645671d3d71ef926f';
        var s = '0xb644a2bec11216221a403fe20f868a8aa18c49feb30b1e64ee4b398f15fcf694';
        var v = 28;
        var value = '0x0000000000000000000000000000000000000000000000009d140d4cd91b0000'; //11.3186863872
        utility.testCall(web3, contractMarket, contractMarketAddr, 'getFundsAndAvailable', [accounts[0]], function(err, result) {
          assert.equal(err, undefined);
          var funds = result[0];
          var available = result[0];
          utility.testCall(web3, contractMarket, contractMarketAddr, 'getMarket', [accounts[0]], function(err, result) {
            assert.equal(err, undefined);
            var strikes = result[1];
            var positions = result[2];
            var cashes = result[3];
            var expectedFundChange = funds.add(cashes[0].divToInt(unit));
            var settlement = new BigNumber(utility.hexToDec(value));
            for (var i=0; i<strikes.length; i++) {
              if (strikes[i].gt(new BigNumber(0)) && settlement.gt(strikes[i])) {
                if (margin.gt(settlement.sub(strikes[i]))) {
                  expectedFundChange = expectedFundChange.add(positions[i].mul(settlement.sub(strikes[i])).divToInt(unit));
                } else {
                  expectedFundChange = expectedFundChange.add(positions[i].mul(margin).divToInt(unit));
                }
              } else if (strikes[i].lt(new BigNumber(0)) && settlement.lt(strikes[i].neg())) {
                if (margin.gt(strikes[i].neg().sub(settlement))) {
                  expectedFundChange = expectedFundChange.add(positions[i].mul(strikes[i].neg().sub(settlement)).divToInt(unit));
                } else {
                  expectedFundChange = expectedFundChange.add(positions[i].mul(margin).divToInt(unit));
                }
              }
            }
            utility.getBalance(web3, accounts[0], function(err, result) {
              assert.equal(err, undefined);
              var balanceBefore = result;
              utility.testSend(web3, contractMarket, contractMarketAddr, 'expire', [0, v, r, s, value, {gas: 4000000, value: 0}], accounts[1], undefined, 0, function(err, result) {
                assert.equal(err, undefined);
                utility.testCall(web3, contractMarket, contractMarketAddr, 'getFundsAndAvailable', [accounts[0]], function(err, result) {
                  assert.equal(err, undefined);
                  var funds = result[0].toNumber();
                  var available = result[0].toNumber();
                  assert.equal(funds!=0 || available!=0, false);
                  utility.getBalance(web3, accounts[0], function(err, result) {
                    assert.equal(err, undefined);
                    var balanceAfter = result;
                    assert.equal(balanceAfter.sub(balanceBefore).equals(expectedFundChange),true);
                    done();
                  });
                });
              });
            });
          });
        });
      });
    });
    it("Should check option chain now expired", function(done) {
      utility.testCall(web3, contractMarket, contractMarketAddr, 'getMarket', [accounts[0]], function(err, result) {
        assert.equal(err, undefined);
        var strikes = result[1].map(function(x){return x.toNumber()});
        var positions = result[2].map(function(x){return x.toNumber()});
        var cashes = result[3].map(function(x){return x.toNumber()});
        assert.equal(strikes.filter(function(x){return x!=0}).length>0 || positions.filter(function(x){return x!=0}).length>0 || cashes.filter(function(x){return x!=0}).length>0, false);
        done();
      });
    });
    it("Should check that contract balance is now zero", function(done){
      utility.getBalance(web3, contractMarketAddr, function(err, result) {
        assert.equal(err, undefined);
        assert.equal(result.toNumber()!=0, false);
        done();
      });
    });
  });

});
