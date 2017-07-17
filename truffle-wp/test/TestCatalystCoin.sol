pragma solidity ^0.4.2;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/CatalystCoin.sol";

contract TestCatalystCoin {

  function testInitialBalanceUsingDeployedContract() {
    CatalystCoin meta = CatalystCoin(DeployedAddresses.CatalystCoin());

    uint expected = 100000;

    Assert.equal(meta.getBalance(tx.origin), expected, "Owner should have 10000 CatalystCoin initially");
  }

  function testInitialBalanceWithNewCatalystCoin() {
    CatalystCoin meta = new CatalystCoin();

    uint expected = 100000;

    Assert.equal(meta.getBalance(tx.origin), expected, "Owner should have 10000 CatalystCoin initially");
  }

}
