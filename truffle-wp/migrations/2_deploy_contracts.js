var ConvertLib = artifacts.require("./ConvertLib.sol");
var CatalystCoin = artifacts.require("./CatalystCoin.sol");

module.exports = function(deployer) {
  deployer.deploy(ConvertLib);
  deployer.link(ConvertLib, CatalystCoin);
  deployer.deploy(CatalystCoin);
};
