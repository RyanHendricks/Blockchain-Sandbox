[Cloud framework] Smart contract based on block chain

  

Blockchain is a support tool to solve the trust, transparency and accountability issues between the two sides through the sale of goods and services through the Internet. It is an intelligent peer for identifying, disseminating and documenting information in a distributed database. Network, also known as the value of the Internet. We can compare the block chain as a book, the block represents the page in the book, the transaction details are open to all.

Block chain 1.0 times the application of Bitcoin as the representative of the currency and the means of payment to solve the problem of centralization; block chain 2.0 era is more macroscopic to the whole market to the center, the use of block chain technology to convert many Different assets, through the transfer to create the value of different asset units. Smart contract is such an application.

A smart contract is an intelligent contract that records specific terms in computer language rather than legal language, runs on multiple nodes in a chain chain (distributed environment), and new / invoked are triggered by Transactions in the block chain. According to the trigger condition contained in the event description information, the intelligent contract automatically issues the preset data resource and the event including the trigger condition when the condition is satisfied, so that a set of complicated, with the trigger of the digital promise can follow the participants' Properly executed.

The current mainstream smart contract design includes Ethereum and Fabric. Which Fabric that IBM HyperLedger, using Go and Java implementation, running in the Docker, can support business complexity higher.

This cloud framework will take charities as an example to provide best practices for implementing a chain-based intelligent contract system through Fabric.

Content overview

Quick deployment
Business description
Frame description
Pre-executed
Transaction execution
Transaction call
How to become your own project
Update plan
Community contribution
Quick deployment

Local deployment

Prepare the Docker environment

Clone the full code

Git clone https://github.com/cloudframeworks-blockchain/user-guide-fabric-smart-contract
Go to the charity directory

Cd user-guide-blockchain / chaincode-docker-devmode
Use the docker-compose command to run the following command

Docker-compose -f docker-charity.yaml up -d
access

Http://127.0.0.1:8080/swagger Click the try it out to fill in the transaction command

Or in the terminal to execute the command docker exec -it cli bash into the shell after the implementation of the corresponding transaction

Business description

The use of block-chain technology to achieve smart contracts, a charity will upgrade the original donation process into a transparent, easy to trace the intelligent donation system, the user can complete the following affairs -

Registration, initial donation
Increase the amount of donations
Query account information
Donation (random / designated donation)
Check the donation record
Query balance information
View the transaction command

The business process is shown below:



Frame description

Pre-executed

In the implementation of the transaction before the need to pre-start the chain code and install the chain code and instantiation (this example has been done in the docker compose implementation)

Start chain code (chaincode), executed in the chaincode container, the command is as follows:

CORE_PEER_ADDRESS = peer: 7051 CORE_CHAINCODE_ID_NAME = charity: 0 ./charity
Install chain code and instantiation, execute in cli container, use channel myc, the command is as follows:

Peer channel create -c myc -f myc.tx -o orderer: 7050
Peer channel join -b myc.block
Peer chaincode install -p chaincodedev / chaincode / charity -n charity -v 0
Peer chaincode instantiate -n charity -v 0 -c '{"Args": []}' -C myc
Transaction execution

In this example, the transaction command can be combined according to the actual situation, examples are as follows:

When the donor (mike) donated (donation) funds (2000), the following order calls the following:

Peer chaincode invoke -n charity -c '{"Args": ["donation", "mike", "2000"]}' -C myc
Check the donor (mike) account information

Peer chaincode invoke -n charity -c '{"Args": ["queryUserInfo", "mike"]}' -C myc
Donors (mike) donations designated donations "Hope Primary School"

Peer chaincode invoke -n charity -c '{"Args": ["donationRules", "mike", "assign", "Hope_ Primary_School"]}' -C myc
Donke (mike) random selection, by the charity contract to choose to donate

Peer chaincode invoke -n charity -c '{"Args": ["donationRules", "mike", "random"]}' -C myc
Donors (mike) inquiries the number of donations and whereabouts

Peer chaincode invoke -n charity -c '{"Args": ["queryDealALL", "mike"]}' -C myc
The donor (mike) inquired about his second contribution

Peer chaincode invoke -n charity -c '{"Args": ["queryDealOnce", "mike", "2"]}' -C myc
Donors (mike) additional contributions 40,000 yuan

Peer chaincode invoke -n charity -c '{"Args": ["donation", "mike", "40000"]}' -C myc
Specific process see below:



Click to view detailed flow chart

Cli & Peer & Oderer
Application request channel Peer node (one or more)
The peer node executes the transaction (via the chaincode), but does not commit the execution results to the local account (which can be considered as an execution of the simulation, and the transaction is in a suspended state). The peer that attends the endorsement will return the results to the application (including Own signature of endorsement results)
The application collects endorsement results and submits the results to the Ordering service node
Ordering service node implementation of the consensus process and generate blocks, through the message channel to the Peer node, by the peer node to verify the transaction and submitted to the local ledger (including state state changes)
Transaction call



The transaction flow consists of the transaction proposal sent by the application client to the specific endorsement node. The endorsement node verifies the client signature and executes the chaincode function to simulate the transaction. The output is a chain code result, a set of key / value versions read in the chain code (read set), and a set of key / values ​​written in chain code (write set). A proposal response with an endorsement signature will be sent back to the client. The client assembles the signature into the transaction payload and broadcasts it to the ordering service. The ordering service transfers the ordered transactions as blocks to all peers on this channel.

Before delivery, peers will verify the transaction. First, they will check the endorsement strategy to ensure that the specified peer has signed the results and will validate the signature based on the transaction payload.

Second, peers will perform a version check on the transaction readings to ensure data integrity and prevent double flowers and other threats. The Hyperledger fabric has concurrency control, where transaction executes in parallel (through the endorsement node) to increase the throughput, and each transaction is verified when committing (by all peers) to ensure that no other transactions have been modified Take the data. In other words, it ensures that the data that needs to be read during the chaincode execution (endorsement) has not changed, so that the execution result is valid and can be submitted to the account state database. If the read data has been changed by another transaction, the transaction in the block is marked as invalid and will not be written to the account state database. The client application is reminded and can then control the error or try again.

Learn more about Transation Flow

How to become your own project

According to the specific business to write chain code file, structure reference: @pujielan explain some clearly

Key references

"Github.com/hyperledger/fabric/core/chaincode/shim"
"Github.com/hyperledger/fabric/protos/peer"
Func Init (acting on chain code instantiation)

Func (s * SmartContract) Init (api shim.ChaincodeStubInterface) peer.Response {
   Return shim.Success (nil)
}
Func Invoke (method to determine the role of invoke call on the parameters of the deal)

Func (s * SmartContract) Invoke (api shim.ChaincodeStubInterface) peer.Response {

   Function, args: = api.GetFunctionAndParameters ()

   Switch function {
   Case "donation":
      Return s.donation (api, args)
   Case "queryDealOnce":
      ...
   }

   Return shim.Error ("Invalid function name.")
}
For example, -c '{"Args": ["donation", "xxxx", "2000"]}, the donation method is called to perform subsequent business processing. It can be understood that when writing a chain code program, it is a contract logic that needs to be modified in accordance with its own business.

Place the chain code in the container

Download go environment mirror, compile the chain code, it is recommended that the name used in this example for the chaincode image

Docker exec -it chaincode bash
Cd $ yourProj
Go build
Modify the docker-charity.yml file

Modify the channel registration in the script.sh with the chaincode instantiation
Peer channel create -c myc -f myc.tx -o orderer: 7050

Peer channel join -b myc.block

Sleep 10

CORE_PEER_ADDRESS = peer: 7051 CORE_CHAINCODE_ID_NAME = charity: 0 / opt / gopath / src / chaincodedev / chaincode / charity / charity &

Peer chaincode install -p chaincodedev / chaincode / charity -n charity -v 0

Peer chaincode instantiate -n charity -v 0 -c '{"Args": []}' -C myc
Assign cli's entrypoint directive to your own chaincode
The entry in the entry instruction, specify the installation and instantiate your personal chaincode
Run the docker-compose file

Bash init_tx.sh
Docker-composer -f docker-charity.yml up -d
carry out

Login cli container, you can do the command operation

Webserver

Although Fabric uses go development, but it does not provide go sdk (Hyperledger Fabric SDKs), it is recommended to use Java or Node to achieve webserver access. This example calls the shell to complete the processing and for the go sdk package, you can also refer to some go sdk items such as fabric-sdk-go, gohfc and so on.

Update plan

Document content extension
CODE increase self-built go sdk
CODE optimized display interface
Click to view historical updates

Community contribution

QQ group: 644955229
Participate in contribution
contact us
Cloud framework series theme, follow APAC