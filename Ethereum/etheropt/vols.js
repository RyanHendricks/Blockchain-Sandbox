var request = require('request');
var async = require('async');

var period = 86400; //1 day bars
var daysData = 3; //200 days
var start = Math.ceil(Date.now()/1000 - daysData*86400);
var end = Math.ceil(Date.now()/1000);
var expectedDataPoints = daysData * 86400 / period;

function getPoloniex(pair, pairRename, callback) {
  var url = 'https://poloniex.com/public?command=returnChartData&currencyPair='+pair+'&start='+start+'&end='+end+'&period='+period;
  request.get(url, function(err, httpResponse, body) {
    var err = null;
    var result = undefined;
    try {
      var result = JSON.parse(body);
      prices = result.map(function(x) {return x['close']});
      result = {name: pairRename, prices: prices};
    } catch (err) {
      console.log("Error getting Poloniex historical prices", err);
      err = err;
      result = {name: pairRename, prices: []};
    }
    callback(err, result);
  });
}

function rets(data, direction) {
  if (typeof(direction)=="undefined") direction=0;
  var result = [];
  for (var i=1; i<data.length; i++) {
    if (direction==0 || (direction>0 && data[i]-data[i-1]>0) || (direction<0 && data[i]-data[i-1]<0)) {
      result.push((data[i]-data[i-1])/data[i-1]);
    }
  }
  return result;
}
function mean(data){
  return data.reduce(function(sum, value){ return sum + value; }, 0) / data.length;
}
function std_zero(data){
  return Math.sqrt(mean(data.map(function(value){ return Math.pow(value, 2) })));
}
function std(data){
  var avg = mean(data);
  return Math.sqrt(mean(data.map(function(value){ return Math.pow(value - avg, 2) })));
}

async.parallel(
  [
    function(callback) {
      getPoloniex('USDT_BTC', 'BTC_USD', callback);
    },
    function(callback) {
      getPoloniex('BTC_ETH', 'ETH_BTC', callback);
    }
  ],
  function(err, results) {
    var minLength = results.reduce(function(a,b){return b.prices.length<a ? b.prices.length : a}, results[0].prices.length);
    var prices = [];
    for (var i = 0; i<minLength; i++) {
      var priceObj = {};
      for (var j=0; j<results.length; j++) {
        priceObj[results[j].name] = results[j].prices[i+(results[j].prices.length-minLength)];
      }
      prices.push(priceObj);
    }
    if (prices.length<expectedDataPoints*0.9) {
      console.log("Didn't get enough price data points to calculate volatility.");
    }
    var BTC_USD = prices.map(function(x){return x['BTC_USD']});
    var vol_BTC_USD = std_zero(rets(BTC_USD)) * Math.sqrt(365*86400/period);
    var last_BTC_USD = BTC_USD.slice(-1)[0];
    var ETH_USD = prices.map(function(x){return x['BTC_USD']*x['ETH_BTC']});
    var vol_ETH_USD = std_zero(rets(ETH_USD)) * Math.sqrt(365*86400/period);
    var last_ETH_USD = ETH_USD.slice(-1)[0];
    console.log(new Date());
    console.log("BTC_USD price:", last_BTC_USD, ", vol:", vol_BTC_USD);
    console.log("ETH_USD price:", last_ETH_USD, ", vol:", vol_ETH_USD);
    console.log(mean(ETH_USD));
  }
);
