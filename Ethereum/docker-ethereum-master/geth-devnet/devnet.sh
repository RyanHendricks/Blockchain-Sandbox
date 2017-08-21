#!/bin/bash -x

# Generate and store a wallet password
if [ ! -f ~/.accountpassword ]; then
    echo `date +%s | sha256sum | base64 | head -c 32` > ~/.accountpassword
fi

if [ ! -f ~/.primaryaccount ]; then
    geth --dev --password ~/.accountpassword account new > ~/.primaryaccount
fi

geth --rpc --rpcaddr "0.0.0.0" --datadir "/root" --rpccorsdomain "*" --rpcapi "admin,db,eth,net,web3,personal" --dev --unlock 0 --password ~/.accountpassword --mine --minerthreads 1 --extradata "Kunstmaan"
