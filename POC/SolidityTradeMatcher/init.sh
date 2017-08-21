#!/bin/sh

set -x
####################################################
#
#  Solidity Trade Matcher
#
# argument;: 1 or 2 or 3 (represent node id)
#
####################################################

# 0. set ENV_ARGs

GETH_GENESIS=./testnet5101/CustomGenesis.json
GETH_DATADIR=./testnet5101/data
GETH_NETWORKID=5101
GETH_MAXPEERS=2
GETH_PASSWORD=./testnet5101/.acctpasswd
GETH_LOGFILE=./console.log

METEOR_LOGFILE=../meteor.log
PHPIF_LOGFILE=./geth_mongo_interface.log

# 3 account files are all in the data directory.
case $1 in
 1) GETH_ACCOUNT=0x119655bc72cfbdfa35562ad27c06a832a90f6f06;;
 2) GETH_ACCOUNT=0xfcfb6c5aa562ba1f8883b2dae4c161046f5e4814;;
 3) GETH_ACCOUNT=0x1c99b1a24d573af5fd9f0c1066989489af450490;;
 *) exit;;
esac



# 1. Boot meteor (and mongodb)

(cd TradeMatchingWeb ; meteor run 1>>${METEOR_LOGFILE} 2>&1 &)

# 2. Boot geth

geth --genesis ${GETH_GENESIS} --datadir ${GETH_DATADIR} --networkid ${GETH_NETWORKID} --nodiscover --maxpeers ${GETH_MAXPEERS} --etherbase="${GETH_ACCOUNT}" --unlock "${GETH_ACCOUNT}" --password ${GETH_PASSWORD} --rpc --rpcaddr "localhost" --rpcport "8545" --rpccorsdomain "*" --rpcapi "admin,eth,net,web3"  --mine --minerthreads "1"  >>${GETH_LOGFILE} 2>&1 &



# 3. Boot interfacing php script

# wait for mongo and geth to boot
while :
do
  if curl -s --connect-timeout 5 localhost:8545 >/dev/null && curl -s --connect-timeout 5 localhost:3001 >/dev/null; then
    break
  fi
  echo "waiting for mongo and geth to start..."
  sleep 5
done

# compile and register contract, add other nodes
sleep 5 
#otherwise mongodb sometime returns "not master" error
php geth_configulator.php $1

# assign each address a name: A or B or C company respectedly.
# keep the names to Mongodb meteor.counterparty
php mongo_counterparty_initializer.php

#then start the php interface
php geth_mongo_interface.php 1>>${PHPIF_LOGFILE} 2>&1 &


# 4. welldone. keep it running
tail -f /dev/null

