pragma solidity ^0.4.11;

import '../node_modules/zeppelin-solidity/contracts/token/MintableToken.sol';

contract CatalystCoin is MintableToken {
  string public name = "CATALYST COIN";
  string public symbol = "CCN";
  uint256 public decimals = 18;
}