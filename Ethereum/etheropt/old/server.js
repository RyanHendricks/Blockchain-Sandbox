var config = (typeof(global.config) == 'undefined' && typeof(config) == 'undefined') ? require('./config.js') : global.config;
var utility = require('./common/utility.js');
var http = require('http');
var natUpnp = require('nat-upnp');
var os = require('os');
var async = require('async');
var express = require('express');
var bodyParser = require('body-parser');
var Web3 = require('web3');
var request = require('request');
var commandLineArgs = require('command-line-args');
var sha256 = require('js-sha256').sha256;
var BigNumber = require('bignumber.js');
require('datejs');

function Server(ethAddr, armed, pricerDataFn, pricerFn) {
	//self
	var self = this;

	//config
  this.ethAddr = ethAddr;
  this.armed = armed;
  this.pricerDataFn = pricerDataFn;
  this.pricerFn = pricerFn;

  //data
  this.options = [];
  this.pricerData = undefined;
  this.mmOrders = [];
	this.eventsHash = {};

	//web3
	web3 = new Web3();
	web3.eth.defaultAccount = self.ethAddr;
	web3.setProvider(new web3.providers.HttpProvider(config.ethProvider));

	//get contracts
	var myContract = undefined;
	//get contracts
	var contractsContract = undefined;
	var myContract = undefined;
	utility.loadContract(web3, config.contractContracts, config.contractContractsAddr, function(err, contract){
	  contractsContract = contract;
	  utility.call(web3, contractsContract, config.contractContractsAddr, 'getContracts', [], function(err, result) {
	    if (result) {
	      config.contractAddrs = result.filter(function(x){return x!='0x0000000000000000000000000000000000000000'}).getUnique();
	      utility.loadContract(web3, config.contractMarket, undefined, function(err, contract){
	        myContract = contract;

					//pricing data loop
					async.forever(
						function(next) {
							self.pricerDataFn(self.pricerData, function(pricerData){
								self.pricerData = pricerData;
								setTimeout(function () { next(); }, 1*1000);
							});
						},
						function(err) {
							console.log(err);
						}
					);

					//load log
					async.eachSeries(config.contractAddrs,
						function(contractAddr, callbackEach){
							utility.logs(web3, myContract, contractAddr, 0, 'latest', function(err, event) {
								event.txLink = 'http://'+(config.ethTestnet ? 'testnet.' : '')+'etherscan.io/tx/'+event.transactionHash;
								self.eventsHash[event.transactionHash+event.logIndex] = event;
							});
							callbackEach();
						},
						function (err) {
						}
					);

					//market info and pricing loop
					async.forever(
						function(next) {
							//market info
							async.map(config.contractAddrs,
								function(contractAddr, callback) {
									utility.call(web3, myContract, contractAddr, 'getOptionChain', [], function(err, result) {
										if (result) {
											var expiration = (new Date(result[0].toNumber()*1000)).toISOString().substring(0,10);
											var fromcur = result[1].split("/")[0];
											var tocur = result[1].split("/")[1];
											var margin = result[2].toNumber() / 1000000000000000000;
											var realityID = result[3].toNumber();
											var optionChainDescription = {expiration: expiration, fromcur: fromcur, tocur: tocur, margin: margin, realityID: realityID};
											utility.call(web3, myContract, contractAddr, 'getMarket', [self.ethAddr], function(err, result) {
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
																function (callback) {
																		setTimeout(function () {
																				callback(null);
																		}, 1000);
																},
																function (err) {
																	option.expiration = optionChainDescription.expiration;
																	option.fromcur = optionChainDescription.fromcur;
																	option.tocur = optionChainDescription.tocur;
																	option.margin = optionChainDescription.margin;
																	callbackMap(null, option);
																}
															);
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
								function(err, options){
									options = options.reduce(function(a, b) {return a.concat(b);}, []);
									options.sort(function(a,b){ return a.expiration+(a.strike+10000000).toFixed(3).toString()+(a.kind=='Put' ? '0' : '1')<b.expiration+(b.strike+10000000).toFixed(3).toString()+(b.kind=='Put' ? '0' : '1') ? -1 : 1 });
									self.options = options;
									//pricing
									async.reduce(config.contractAddrs, {},
										function(memo, contractAddr, callbackReduce){
											utility.call(web3, myContract, contractAddr, 'getFundsAndAvailable', [self.ethAddr], function(err, result) {
												if (result) {
													var funds = result[0].toString();
													var fundsAvailable = result[1].toString();
													memo[contractAddr] = {funds: funds, fundsAvailable: fundsAvailable};
													callbackReduce(null, memo)
												} else {
													callbackReduce(null, memo);
												}
											});
										},
										function(err, fundsData){
											var events = Object.values(self.eventsHash);
											events.sort(function(a,b){ return b.blockNumber-a.blockNumber || b.transactionIndex-a.transactionIndex });
											var today = Date.now();
											utility.blockNumber(web3, function(err, blockNumber) {
												var orderID = utility.getRandomInt(0,Math.pow(2,32));
												var nonce = undefined;
												async.map(self.options,
													function(option, callback) {
														var expiration = Date.parse(option.expiration+" 00:00:00 UTC");
														var tDays = (expiration - today)/86400000.0;
														var t = tDays / 365.0;
														var result = self.pricerFn(option, self.pricerData, fundsData, events);
														if (result) {
															console.log(option.expiration, option.kind, option.strike, ((result.buyPrice)+" ("+(utility.weiToEth(result.buySize))+" eth) @ "+(result.sellPrice)+" ("+(utility.weiToEth(result.sellSize))+" eth)"));
															var buyPrice = new BigNumber(result.buyPrice).times(new BigNumber(1000000000000000000)).toNumber();
															var sellPrice = new BigNumber(result.sellPrice).times(new BigNumber(1000000000000000000)).toNumber();
															var buySize = Number(result.buySize);
															var sellSize = Number(result.sellSize);
															var blockExpires = Number(blockNumber + result.expires);

															var orders = [];

															var condensedBuy = utility.pack([option.optionID, buyPrice, buySize, orderID, blockExpires], [256, 256, 256, 256, 256]);
															var hashBuy = sha256(new Buffer(condensedBuy,'hex'));
															utility.sign(web3, self.ethAddr, hashBuy, undefined, function(err, sig){
																if (!err) {
																	var order = {contractAddr: option.contractAddr, optionID: option.optionID, price: buyPrice, size: buySize, orderID: orderID, blockExpires: blockExpires, addr: self.ethAddr, v: sig.v, r: sig.r, s: sig.s, hash: '0x'+hashBuy};
																	utility.call(web3, myContract, order.contractAddr, 'getMaxLossAfterTrade', [order.addr, order.optionID, order.size, -order.size*order.price], function(err, result) {
																		if (result && Number(fundsData[order.contractAddr].funds) + Number(result.toString())>=0) {
																			orders.push(order);
																		} else {
																			console.log("Need more funds for this order.");
																			orders.push(undefined);
																		}
																	});
																} else {
																	console.log("Failed to sign order.");
																	orders.push(undefined);
																}
															});

															var condensedSell = utility.pack([option.optionID, sellPrice, -sellSize, orderID, blockExpires], [256, 256, 256, 256, 256]);
															var hashSell = sha256(new Buffer(condensedSell,'hex'));
															utility.sign(web3, self.ethAddr, hashSell, undefined, function(err, sig) {
																if (!err) {
																	var order = {contractAddr: option.contractAddr, optionID: option.optionID, price: sellPrice, size: -sellSize, orderID: orderID, blockExpires: blockExpires, addr: self.ethAddr, v: sig.v, r: sig.r, s: sig.s, hash: '0x'+hashSell};
																	utility.call(web3, myContract, order.contractAddr, 'getMaxLossAfterTrade', [order.addr, order.optionID, order.size, -order.size*order.price], function(err, result) {
																		if (result && Number(fundsData[order.contractAddr].funds) + Number(result.toString())>=0) {
																			orders.push(order);
																		} else {
																			console.log("Need more funds for this order.");
																			orders.push(undefined);
																		}
																	});
																} else {
																	console.log("Failed to sign order.");
																	orders.push(undefined);
																}
															});

															async.until(
																function() { return orders.length==2; },
																function(callbackUntil) { setTimeout(function () { callbackUntil(null); }, 1000); },
																function(err) {
																	callback(null, orders.filter(function(x){return x!=undefined}));
																}
															);
														} else {
															callback(null, []);
														}
													},
													function(err, mmOrders) {
														var mmOrders = mmOrders.reduce(function(a, b) {return a.concat(b);}, []);
														var blockExpires = mmOrders.map(function(x){return x.blockExpires}).max();
														async.eachSeries(mmOrders,
															function(mmOrder, callbackEach){
																if (self.armed) {
																	utility.postGitterMessage(JSON.stringify(mmOrder), function(err, result){
																		callbackEach();
																	});
																} else {
																	callbackEach();
																}
															},
															function (err) {
																self.mmOrders = mmOrders;
																var blockNumber = 0;
																async.until(
																	function() { return blockNumber>=blockExpires; },
																	function(callbackUntil) {
																		utility.blockNumber(web3, function(err, result) {
																			blockNumber = result;
																			callbackUntil(null);
																		});
																	},
																	function(err) {
																		next();
																	}
																);
															}
														);
													}
												);
											});
										}
									);
								}
							);
						},
						function(err) {
							console.log(err);
						}
					);
        });
      }
    });
  });
}

module.exports = {Server: Server}
