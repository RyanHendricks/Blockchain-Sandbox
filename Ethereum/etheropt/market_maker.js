var commandLineArgs = require('command-line-args');
var async = require('async');
var API = require('./api.js');
var gaussian = require('gaussian');
var marketMakerConfig = require('./market_maker_config.js');

var cli = commandLineArgs([
	{ name: 'help', alias: 'h', type: Boolean },
	{ name: 'address', type: String },
  { name: 'expires', type: Number, defaultValue: 5},
	{ name: 'armed', type: Boolean, defaultValue: false},
]);
var cliOptions = cli.parse()

if (cliOptions.help) {
	console.log(cli.getUsage());
} else if (cliOptions.address) {

	API.init(function(err,result){
    function bs(cp, s, k, t, v, r) {
      if (t<=0) {
        if (cp==1) return Math.max(0, s-k);
        if (cp==-1) return Math.max(0, k-s);
      }
      if (k<=0 && cp<0) return 0;
      var d1 = (Math.log(s/k)+(r+Math.pow(v,2)/2.0)*t)/(v*Math.sqrt(t));
      var d2 = d1 - v*Math.sqrt(t);
      return cp*s*gaussian(0, 1).cdf(cp*d1)-cp*k*Math.exp(-r*t)*gaussian(0, 1).cdf(cp*d2);
    }
    function bs2(cp, s, k, t, v, v2, margin, r) {
      return bs(cp, s, k, t, v, r) - bs(cp, s, Math.max(0,k+cp*margin), t, v2, r);
    }
    //pricer fn
    var pricerFn = function(option, portfolioGreeks, cp, margin, s, k, t) {
			var pair = option.fromcur+"/"+option.tocur;
			var params = marketMakerConfig[pair];
			if (!params) return undefined;
			var vol = params.vol;
			var size = params.size;
	    var volCurve = {vol: vol, upRatio: 0.9, downRatio: 1.1, percentAway80: 1};
      var r = 0;
      //percent away is percent away from atm where vol is 80% up vol and 20% down vol (or vice versa)
      function proportionUpVol(k, volCurve){return 1/(1+Math.exp(-(k-s)/s*(-Math.log(1/0.8 - 1)/ volCurve.percentAway80)))}
      function vSlope(k, volCurve){return proportionUpVol(k, volCurve) * (volCurve.upRatio*volCurve.vol - volCurve.downRatio*volCurve.vol) + volCurve.downRatio*volCurve.vol}
      function v2Calc(k, cp, volCurve) {return vSlope(Math.max(0,k+cp*option.margin), volCurve)}
      var v = vSlope(k, volCurve);
      var v2 = v2Calc(k, cp, volCurve);

      //delta retreat params
      var rollRiskWidth = s * params.rollRiskWidthMultiplier;
      var deltaRetreatStep = size * params.deltaRetreatStepMultiplier; //retreat the theoretical underlying price every time delta reaches this amount
      var deltaRetreatCap = rollRiskWidth / s / params.deltaRetreatCapDivisor; //max absolute percent retreat
      var deltaRetreatAmount = deltaRetreatCap / params.deltaRetreatAmountDivisor; //retreat by this percent of the underlying

      //delta retreat
      if (portfolioGreeks && portfolioGreeks[option.contractAddr]) {
        var deltaOverall = portfolioGreeks[option.contractAddr].delta;
        var thetaExpirationOverall = portfolioGreeks[option.contractAddr].thetaExpiration;
        var deltaRetreat = Math.pow(1+deltaRetreatAmount, -Math.sign(deltaOverall)*Math.floor(Math.abs(deltaOverall)/deltaRetreatStep))-1;
        if (Math.abs(deltaRetreat)>deltaRetreatCap) {
          deltaRetreat = Math.sign(deltaRetreat) * deltaRetreatCap;
        }
        s = s + deltaRetreat * s;
      }

      //calculate price
      var price = bs2(cp, s, k, t, v, v2, margin, r);
      return price;
    }
    //size width fn
    function sizeWidthFn(theo, option, portfolioGreeks, cp, margin, s, k, t){
			var pair = option.fromcur+"/"+option.tocur;
			var params = marketMakerConfig[pair];
			if (!params) return undefined;
			var vol = params.vol;
			var size = params.size;
			var volCurve = {vol: vol, upRatio: 0.9, downRatio: 1.1, percentAway80: 1};
      var r = 0;
      //percent away is percent away from atm where vol is 80% up vol and 20% down vol (or vice versa)
      function proportionUpVol(k, volCurve){return 1/(1+Math.exp(-(k-s)/s*(-Math.log(1/0.8 - 1)/ volCurve.percentAway80)))}
      function vSlope(k, volCurve){return proportionUpVol(k, volCurve) * (volCurve.upRatio*volCurve.vol - volCurve.downRatio*volCurve.vol) + volCurve.downRatio*volCurve.vol}
      function v2Calc(k, cp, volCurve) {return vSlope(Math.max(0,k+cp*option.margin), volCurve)}
      var v = vSlope(k, volCurve);
      var v2 = v2Calc(k, cp, volCurve);
      //params
      var premiumWidth = params.premiumWidth;
			var rollRiskWidth = s * params.rollRiskWidthMultiplier;
      var minWidth = params.minWidth;
      var retreatSize = size * params.retreatSizeMultiplier; //retreat every time position changes by this amount
      var retreatAmount = params.retreatAmount; //retreat by this percent of the theo
      var minTheoRetreat = margin / params.minTheoRetreatDivisor; //minimum theo for the retreatAmount (so if theo is 0, you don't retreat by nothing)

      var thetaExpiration = bs2(cp, s, k, 0, v, v2, margin, r) - bs2(cp, s, k, t, v, v2, margin, r);
      var delta = (bs2(cp, s*1.005, k, t, v, v2, margin, r) - bs2(cp, s*(1-0.005), k, t, v, v2, margin, r))/0.01/s;

      //sizes and width
      var width = premiumWidth*Math.abs(thetaExpiration) + rollRiskWidth*Math.abs(delta);
      var width = Math.max(minWidth, width);
      var position = Number(API.utility.weiToEth(option.position));
      var buyEdge = position>0 ? (Math.pow(1+retreatAmount,Math.floor(Math.abs(position)/retreatSize))-1)*Math.max(theo,minTheoRetreat) : 0;
      var sellEdge = position<0 ? (Math.pow(1+retreatAmount,Math.floor(Math.abs(position)/retreatSize))-1)*Math.max(theo,minTheoRetreat) : 0;
      var buyPrice = (Math.max(theo-width*0.5-buyEdge,0)).toFixed(2);
      var sellPrice = (Math.min(option.margin, Math.max(Math.max(theo+width*0.5+sellEdge,0),minWidth))).toFixed(2);
      var buySize = size;
      var sellSize = size;

      //return
      return {buyPrice: buyPrice, sellPrice: sellPrice, buySize: buySize, sellSize: sellSize};
    }
    API.getPortfolioGreeks(cliOptions.address, pricerFn, function(err, greeks){
      console.log(greeks);
    });
    API.marketMake(cliOptions.address, cliOptions.armed, cliOptions.expires, pricerFn, sizeWidthFn);
  });
}
