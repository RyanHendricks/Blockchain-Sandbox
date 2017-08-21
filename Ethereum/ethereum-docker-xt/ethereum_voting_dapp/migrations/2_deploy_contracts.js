var Voting = artifacts.require("./Voting.sol");
module.exports = function(deployer) {
  deployer.deploy(Voting, 1000, web3.toWei('0.1', 'ether'), ['La ravigote', 'La landaise', 'Le marocain', 'Le libanais', 'Le bonal', 'Le thai', 'Le coreen']);
};
