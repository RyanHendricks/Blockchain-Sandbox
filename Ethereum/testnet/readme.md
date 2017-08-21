geth --identity "MyTestNetNode" --nodiscover --networkid 1999 --datadir chain-data init Genesis.json

## Create a new account in the blockchain data directory
 geth account new --datadir chain-data

## Remove data from previous blockchain
 geth removedb — datadir chain-data