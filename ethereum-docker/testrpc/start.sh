#!/bin/bash
set -e
cd /root/eth-net-intelligence-api
/usr/bin/pm2 start /root/eth-net-intelligence-api/app.json
sleep 3

node /src/bin/testrpc
