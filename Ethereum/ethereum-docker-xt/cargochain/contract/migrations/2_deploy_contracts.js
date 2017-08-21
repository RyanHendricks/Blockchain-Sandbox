var Shipment = artifacts.require("./Shipment.sol");
module.exports = function(deployer) {
  deployer.deploy(Shipment);
};
