# Solidity-Trade-Matching-Engine
A project aimed at building on the SolidityTradeMatcher project found here: https://github.com/kkoiwai/SolidityTradeMatcher

## Description
An experimental code to implement Security Trade Matching over Ethereum


This is an experiment as to whether you can implement settlement collation system on the Ethereum protocol. 
Here is a summary of the circumstances, specifications etc., by the original author:
https://github.com/kkoiwai/SolidityTradeMatcher/blob/master/TradeMatchingOnEthereum.pdf

## How to use
    docker network create --driver bridge testnet
    docker run -d -p 3331:3000 --name=ethereum1 -h ethereum1 --net=testnet kocko/soliditytradematcher
### Wait about 10 minutes (because contract compiling and registration automatically runs in Unit 1)
    docker run -d -p 3332:3000 --name=ethereum2 -h ethereum2 --net=testnet kocko/soliditytradematcher 2
    docker run -d -p 3333:3000 --name=ethereum3 -h ethereum3 --net=testnet kocko/soliditytradematcher 3

After reaching this point please navigate to、`http://localhost:3331` `http://localhost:3332` `http://localhost:3333` and play around with various things.