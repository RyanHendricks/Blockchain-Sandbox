# ethereum-docker
Docker image that will generate a single node or multi node network.

# Getting started

### Prerequisites

Install Docker and Docker Compose. Refere this [file](https://raw.githubusercontent.com/manojpramesh/shell/master/server_init.sh) for help.

## 0. For lazy people

Others go to step 1

Run this command to get things done in a step

```
bash <(curl -s https://raw.githubusercontent.com/manojpramesh/shell/master/ethereum_docker.sh)
```

## 1. Installing

### 1.1 Single Node Ethereum

#### Running a node

Clone the repository

```
git clone https://github.com/manojpramesh/ethereum-docker.git
cd ethereum-docker
```

Run the following to create a single node network:

```
docker-compose -f docker-compose-standalone.yml up -d
```

To access the JSON RPC client, use the following end point

```
http://<p-address>:8545
```

#### Connecting to the node console

```
docker exec -it ethdockerpanel_geth_1 geth attach ipc://root/.ethereum/devchain/geth.ipc
```

### 1.1 Multi node Ethereum with network monitoring

#### Running a node

Clone the repository

```
git clone https://github.com/manojpramesh/ethereum-docker.git
cd ethereum-docker
```

Run the following to create a single node network:

```
docker-compose up -d
```

To add more peers run the scaling command

```
docker-compose scale eth=3
```

To access the JSON RPC client, use the following end point

```
http://<p-address>:8545
```

#### Connecting to the node console

```
docker exec -it ethdockerpanel_geth_1 geth attach ipc://root/.ethereum/devchain/geth.ipc
```


## 2. Test Accounts 

As part of the bootstrapping process we included 1 account pre-filled with 1000 ethers by default.
