// Import the page's CSS. Webpack will know what to do with it.

import "../stylesheets/app.css";

// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'

/*
 * When you compile and deploy your Voting contract,
 * truffle stores the abi and deployed address in a json
 * file in the build directory. We will use this information
 * to setup a Voting abstraction. We will use this abstraction
 * later to create an instance of the Voting contract.
 * Compare this against the index.js from our previous tutorial to see the difference
 * https://gist.github.com/maheshmurthy/f6e96d6b3fff4cd4fa7f892de8a1a1b4#file-index-js
 */

  
import voting_artifacts from '../../build/contracts/Voting.json'


var lightwallet = require("eth-lightwallet/dist/lightwallet.min.js");


var Voting = contract(voting_artifacts);

let candidates = {}

let tokenPrice = null;
window.voteForCandidate = function(candidateName, voteTokens) {

  /* Voting.deployed() returns an instance of the contract. Every call
   * in Truffle returns a promise which is why we have used then()
   * everywhere we have a transaction call
   */
  Voting.deployed().then(function(contractInstance) {

    $("#msg").show();
    $("#msg").attr('class', 'col-sm-12 margin-top-2 alert alert-dismissible alert-success');
    $("#msg").html("Vote has been submitted. The vote count will increment as soon as the vote is recorded on the blockchain. Please wait.")
    $("#candidate").val("");
    $("#vote-tokens").val("");
    
    $("#"+candidates[candidateName]+"-loading").show();



    //showPendingTransactionsByAccount(contractInstance.address);

    contractInstance.voteForCandidate(candidateName, voteTokens, {from: web3.eth.defaultAccount}).then(function() {
      // If this callback is called, the transaction was successfully processed.
      // Note that Ether Pudding takes care of watching the network and triggering
      // this callback.

      console.log("Transaction successful!");
      let div_id = candidates[candidateName];
      $("#msg").hide();
      $("#msg").html("");
      $("#"+candidates[candidateName]+"-loading").hide();

      showTransactions(contractInstance.address);

      return contractInstance.totalVotesFor.call(candidateName).then(function(v) {
    		  $("#" + div_id+"-progress").attr('style', "width: "+ (v.toString()/15)*100 +"%" );
    		  $("#" + div_id+"-progress").html(v.toString());
      }).catch(function(e) {
          $("#msg").show();
          $("#msg").attr('class', 'col-sm-12 margin-top-2 alert alert-dismissible alert-danger');
          $("#msg").html(e.message);
      });
    }).catch(function(e) {
        $("#msg").show();
        $("#msg").attr('class', 'col-sm-12 margin-top-2 alert alert-dismissible alert-danger');
        $("#msg").html(e.message);
		    $("#"+candidates[candidateName]+"-loading").hide();
        console.log(e)
    });
  });
/*
Voting.deployed().then(function(contractInstance) {
  contractInstance.voteForCandidate(candidateName, voteTokens, {gas: 140000, from: web3.eth.accounts[0]}).then(function() {
    let div_id = candidates[candidateName];
    return contractInstance.totalVotesFor.call(candidateName).then(function(v) {
      $("#" + div_id).html(v.toString());
      $("#msg").html("");
    }).catch(function(e) {
      $("#msg").html(e);
      // There was an error! Handle it.  
    });
  });
});
*/

}

/* The user enters the total no. of tokens to buy. We calculate the total cost and send it in
 * the request. We have to send the value in Wei. So, we use the toWei helper method to convert
 * from Ether to Wei.
 */

window.buyTokens = function() {
  let tokensToBuy = $("#buy").val();
  let price = tokensToBuy * tokenPrice;
  $("#buy-msg").html("Purchase order has been submitted. Please wait.");
  $("#buy-msg").show();
  Voting.deployed().then(function(contractInstance) {
    contractInstance.buy({value: web3.toWei(price, 'ether'), from:web3.eth.defaultAccount}).then(function(v) {
      $("#buy-msg").html("");
      $("#buy-msg").hide();
      web3.eth.getBalance(contractInstance.address, function(error, result) {
        $("#contract-balance").html(web3.fromWei(result.toString()) + " Ether");
      });
      populateTokenData();
      showTransactions(contractInstance.address);
    })
  });
 
}

window.lookupVoterInfo = function() {
  let address = $("#voter-info").val();
  lookupVoterInfoByAdress(address);
}

window.lookupMyInfo = function() {
   Voting.deployed().then(function(contractInstance) {
		contractInstance.voterDetails.call(web3.eth.defaultAccount).then(function(v) {
			$("#my-tokens-bought").html( v[0].toString());
			let votesPerCandidate = v[1];
			let tokensUsed = 0;
			let allCandidates = Object.keys(candidates);
			for(let i=0; i < allCandidates.length; i++) {
				tokensUsed += parseInt(votesPerCandidate[i]);
			}
			$("#my-tokens-remaining").html( v[0] - tokensUsed);
		});
	  });
  
}

window.lookupVoterInfoByAdress = function(address) {
  Voting.deployed().then(function(contractInstance) {
    contractInstance.voterDetails.call(address).then(function(v) {
      $("#tokens-bought").show();
      $("#tokens-bought").html("Total Tokens bought: " + v[0].toString());
      let votesPerCandidate = v[1];
      $("#votes-cast").empty();
      $("#votes-cast").append("Votes cast per candidate: <br>");
      let allCandidates = Object.keys(candidates);
      for(let i=0; i < allCandidates.length; i++) {
        $("#votes-cast").append(allCandidates[i] + ": " + votesPerCandidate[i] + "<br>");
      }
    });
  });
}


/* Instead of hardcoding the candidates hash, we now fetch the candidate list from
 * the blockchain and populate the array. Once we fetch the candidates, we setup the
 * table in the UI with all the candidates and the votes they have received.
 */
function populateCandidates() {
  Voting.deployed().then(function(contractInstance) {
    contractInstance.allCandidates.call().then(function(candidateArray) {
      for(let i=0; i < candidateArray.length; i++) {
        /* We store the candidate names as bytes32 on the blockchain. We use the
         * handy toUtf8 method to convert from bytes32 to string
         */
        candidates[web3.toUtf8(candidateArray[i])] = "candidate-" + i;
      }
      setupCandidateRows();
      populateCandidateVotes();
      populateTokenData();
    });
  });
}

function populateCandidateVotes() {
  let candidateNames = Object.keys(candidates);
  for (var i = 0; i < candidateNames.length; i++) {
    let name = candidateNames[i];
    Voting.deployed().then(function(contractInstance) {
      contractInstance.totalVotesFor.call(name).then(function(v) {
		 var progress =  "<div><div style='margin-top: 4px;' class='col-md-1 glyphicon glyphicon-lock'> </div><div class='col-md-8 progress progress-striped'><div id='"+candidates[name]+"-progress' class='progress-bar progress-bar-info active' style='width: "+ (v.toString()/15)*100 +"%'>" + v.toString() + "</div></div><div class='col-md-2'><a onclick='voteForCandidate(\""+name+"\",1)' class='text-left btn btn-primary'><span class='glyphicon glyphicon-thumbs-up' aria-hidden='true'></span> </a></div><span id='" + candidates[name] + "-loading' style='display:none' class='glyphicon glyphicon-refresh glyphicon-refresh-animate'></span></div>";
        $("#" + candidates[name]).html(progress );
      });
    });
  }
}

function setupCandidateRows() {
  Object.keys(candidates).forEach(function (candidate) { 
    $("#candidate-rows").append("<tr><td>" + candidate + "</td><td id='" + candidates[candidate] + "'> </td></tr>");

	
  });
}

/* Fetch the total tokens, tokens available for sale and the price of
 * each token and display in the UI
 */
function populateTokenData() {
  Voting.deployed().then(function(contractInstance) {
    contractInstance.totalTokens().then(function(v) {
      $("#tokens-total").html(v.toString());
    });
    contractInstance.tokensSold.call().then(function(v) {
      $("#tokens-sold").html(v.toString());
    });
    contractInstance.tokenPrice().then(function(v) {
      tokenPrice = parseFloat(web3.fromWei(v.toString()));
      $("#token-cost").html(tokenPrice + " Ether");
    });
    web3.eth.getBalance(contractInstance.address, function(error, result) {
      $("#contract-balance").html(web3.fromWei(result.toString()) + " Ether");
    });
  });
}

var filterLatest;
var filterPending;

$( document ).ready(function() {
  $("#buy-msg").hide();
  $("#msg").hide();
  $("#tokens-bought").hide();
  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source like Metamask")
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);

    web3.eth.getAccounts(function(error, accounts){
      web3.eth.defaultAccount = accounts[0];
      lookupMyInfo();
      $("#current-address").html('<a target="_blank" href="https://ropsten.etherscan.io/address/'+web3.eth.defaultAccount+'" class="alert-link">'+web3.eth.defaultAccount+'</a>');
    });
  } else {
    alert('No web3 ? You should consider trying MetaMask !')
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    console.warn("No web3 detected. Falling back to http://localhost:8545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io/LvO6Uz8sauUJB1qHeZ9z"));
  }

  Voting.setProvider(web3.currentProvider);
  populateCandidates();
 

  filterLatest = web3.eth.filter('latest');
  filterPending = web3.eth.filter('pending')
  Voting.deployed().then(function(contractInstance) {
    $("#contract-address").html('<a target="_blank" href="https://ropsten.etherscan.io/address/'+contractInstance.address+'" class="alert-link">'+contractInstance.address+'</a>');
    showTransactions(contractInstance.address);
    watchLatestTransactionsByAccount(contractInstance.address);
    watchPendingTransactionsByAccount(contractInstance.address);
  });

 
});

function showTransactions(account){
  $.getJSON('http://ropsten.etherscan.io/api?module=account&action=txlist&address='+account+'&startblock=1100391&endblock=99999998&sort=desc&apikey=YourApiKeyToken', function (data) {
    console.log(data);
    $("#transactions > tr").html("");
    for (var i =0; i < data.result.length; i++) {
        if (i>20) break;
        $("#transactions > tbody").append("<tr><td><a target='_blank' class='address-tag' href='https://ropsten.etherscan.io/tx/"+data.result[i].hash+"'>"+data.result[i].hash+"</a></td><td><a target='_blank' href='https://ropsten.etherscan.io/block/"+data.result[i].blockNumber+"'>"+data.result[i].blockNumber+"</a></td><td><span rel='tooltip' data-placement='bottom' title='' data-original-title=''>"+getDateTimeSince(data.result[i].timeStamp*1000)+" ago</span></td><td><a target='_blank' class='address-tag' href='https://ropsten.etherscan.io/address/"+data.result[i].from+"'>"+ data.result[i].from + "</a></td><td><span class='label label-success rounded'>&nbsp; IN &nbsp;</span></td><td><i class='fa fa-file-text-o' rel='tooltip' data-placement='bottom' title='' data-original-title='Contract'></i> <span class='address-tag'>"+data.result[i].to+"</span></td><td>"+data.result[i].value/1000000000000000000+" Ether</td><td><font color='gray' size='1'>0<b>.</b>00141376</font></td></tr>");
    }
  });
}

function watchLatestTransactionsByAccount(account) {
  filterLatest.watch(function (error, blockash) {
    if(!error){
      doWatchBlock(account, blockash)
    } else {
      console.error(error);
    }
  });
}

function watchPendingTransactionsByAccount(account) {
  filterPending.watch(function (error, transactionHash) {
    if(!error){
      showPendingTransaction(account, transactionHash);
    } else {
      console.error(error);
    }
  });
}

  function doWatchBlock(account, blockash){
    console.log("Searching block from hash : " + blockash);
    web3.eth.getBlock(blockash, function(error, block){
      if (!error){
        if (block != null && block.transactions != null) {
          block.transactions.forEach( function(transactionHash) {
            showTransaction(account, block, transactionHash);
          })
        }
      } else {
         console.error(error);
      }
    });
  }

  function showTransaction(account, block, transactionHash){
    console.log("  tx hash          : " + transactionHash );
    web3.eth.getTransaction(transactionHash, function(error, e){
      if (!error){
        if (account == "*" || account == e.from || account == e.to) {
          $("#transactions > tbody > tr:first").before("<tr><td><a target='_blank' class='address-tag' href='https://ropsten.etherscan.io/tx/"+e.hash+"'>"+e.hash+"</a></td><td><a target='_blank' href='https://ropsten.etherscan.io/block/"+e.blockNumber+"'>"+e.blockNumber+"</a></td><td><span rel='tooltip' data-placement='bottom' title='' data-original-title=''>"+getDateTimeSince(block.timestamp*1000)+" ago</span></td><td><a target='_blank' class='address-tag' href='https://ropsten.etherscan.io/address/"+e.from+"'>"+ e.from + "</a></td><td><span class='label label-success rounded'>&nbsp; IN &nbsp;</span></td><td><i class='fa fa-file-text-o' rel='tooltip' data-placement='bottom' title='' data-original-title='Contract'></i> <span class='address-tag'>"+e.to+"</span></td><td>"+e.value/1000000000000000000+" Ether</td><td><font color='gray' size='1'>0<b>.</b>00141376</font></td></tr>");
          console.log("  tx hash          : " + e.hash + "\n"
            + "   nonce           : " + e.nonce + "\n"
            + "   blockHash       : " + e.blockHash + "\n"
            + "   blockNumber     : " + e.blockNumber + "\n"
            + "   transactionIndex: " + e.transactionIndex + "\n"
            + "   from            : " + e.from + "\n" 
            + "   to              : " + e.to + "\n"
            + "   value           : " + e.value + "\n"
            + "   time            : " + block.timestamp + " " + new Date(block.timestamp * 1000).toGMTString() + "\n"
            + "   gasPrice        : " + e.gasPrice + "\n"
            + "   gas             : " + e.gas + "\n"
            + "   input           : " + web3.toAscii(e.input));
        }
      } else {
         console.error(error);
      }
    });
  }

  function showPendingTransaction(account, transactionHash){
    console.log("  tx hash          : " + transactionHash );
    web3.eth.getTransaction(transactionHash, function(error, e){
      if(!error){
        if (account == "*" || account == e.from || account == e.to) {
          $("#transactions > tbody > tr:first").before("<tr style='color: #999999; font-style: italic'><td><a target='_blank' class='address-tag' href='https://ropsten.etherscan.io/tx/"+e.hash+"'>"+e.hash+"</a></td><td>-</td><td><span rel='tooltip' data-placement='bottom' title='' data-original-title=''>Pending</span></td><td><a target='_blank' class='address-tag' href='https://ropsten.etherscan.io/address/"+e.from+"'>"+ e.from + "</a></td><td><span class='label label-success rounded'>&nbsp; IN &nbsp;</span></td><td><i class='fa fa-file-text-o' rel='tooltip' data-placement='bottom' title='' data-original-title='Contract'></i> <span class='address-tag'>"+e.to+"</span></td><td>"+e.value/1000000000000000000+" Ether</td><td><font color='gray' size='1'>0<b>.</b>00141376</font></td></tr>");
          console.log("  tx hash          : " + e.hash + "\n"
            + "   nonce           : " + e.nonce + "\n"
            + "   blockHash       : " + e.blockHash + "\n"
            + "   blockNumber     : -\n"
            + "   transactionIndex: " + e.transactionIndex + "\n"
            + "   from            : " + e.from + "\n" 
            + "   to              : " + e.to + "\n"
            + "   value           : " + e.value + "\n"
            + "   time            : Pending \n"
            + "   gasPrice        : " + e.gasPrice + "\n"
            + "   gas             : " + e.gas + "\n"
            + "   input           : " + web3.toAscii(e.input));
        }
      } else {
         console.error(error);
      }
    });
  }

// Get function hashes
// TODO: also extract input parameter types for later decoding

function getFunctionHashes(abi) {
  var hashes = [];
  for (var i=0; i<abi.length; i++) {
    var item = abi[i];
    if (item.type != "function") continue;
    var signature = item.name + "(" + item.inputs.map(function(input) {return input.type;}).join(",") + ")";
    var hash = web3.sha3(signature);
    console.log(item.name + '=' + hash);
    hashes.push({name: item.name, hash: hash});
  }
  return hashes;
}

function findFunctionByHash(hashes, functionHash) {
  for (var i=0; i<hashes.length; i++) {
    if (hashes[i].hash.substring(0, 10) == functionHash.substring(0, 10))
      return hashes[i].name;
  }
  return null;
}


function getDaysInMonth(month,year) {     
    if( typeof year == "undefined") year = 1999; // any non-leap-year works as default     
    var currmon = new Date(year,month),     
        nextmon = new Date(year,month+1);
    return Math.floor((nextmon.getTime()-currmon.getTime())/(24*3600*1000));
} 
function getDateTimeSince(target) { // target should be a Date object
    var now = new Date(), diff, yd, md, dd, hd, nd, sd, out = [];
    diff = Math.floor(now.getTime()-target);
	
	
	var totalSeconds = diff / 1000;
	var days = Math.floor(totalSeconds / 86400); // 86400 = 24 hours * 60 minutes * 60 seconds per day
	var hours = Math.floor((totalSeconds % 86400) / 3600); // 3600 = 60 minutes * 60 seconds per day
	var minutes = Math.floor((totalSeconds % 3600) / 60); // 
	var seconds = Math.floor(totalSeconds % 3600); // 

  if( days > 0) out.push( days+" day"+(days == 1 ? "" : "s"));
  if( hours > 0) out.push( hours+" hr"+(hours == 1 ? "" : "s"));
  if( minutes > 0) out.push( minutes+" mn");
  if( minutes == 0 && minutes == 0 && seconds > 0) out.push( seconds + " s");
  return out.join(" ");
}


var global_keystore;

window.newAddresses = function newAddresses(password) {
  
  if (password == '') {
    password = prompt('Enter password to retrieve addresses', '');
    if(! password) { return false; }
  }

  global_keystore.keyFromPassword(password, function(err, pwDerivedKey) {
    if(! global_keystore.isDerivedKeyCorrect(pwDerivedKey)) {
      alert('Wrong password');
      return newAddresses('');
    }
    
    var numAddr = parseInt(document.getElementById('numAddr').value)
    global_keystore.generateNewAddress(pwDerivedKey, numAddr);

    showAddresses();
  });
}

window.showAddresses = function showAddresses() {
  if(typeof web3 === 'undefined'){
      web3 = new Web3();
  }
  var addresses = global_keystore.getAddresses();
  document.getElementById('addr').innerHTML = 'Retrieving addresses...'

  var addrString = ''
  //document.getElementById('sendFrom').innerHTML = ''
  document.getElementById('addr').innerHTML = ''
  for (var i=0; i<addresses.length; ++i) {
    document.getElementById('addr').innerHTML += '<div>' + web3.toChecksumAddress(addresses[i]) + '</div>'
    // set the default account
    web3.eth.defaultAccount =  web3.toChecksumAddress(addresses[i]);

    if (i !== (addresses.length-1)) {
      addrString += addresses[i] + '_'; // i dont see any dashes on the page
    }
    else {
      addrString += addresses[i];
    }
  }
  $("#current-address").html('<a target="_blank" href="https://ropsten.etherscan.io/address/"'+web3.eth.defaultAccount+'" class="alert-link">'+web3.eth.defaultAccount+'</a>');


   /*
  // Add link to Workflow app
  var workflowURL = 'workflow://run-workflow?name=AddressQR&input=text&text='
  document.getElementById('workflowAddr').innerHTML = '<a href="' + workflowURL + addrString + '">Address QR Codes (Workflow App)</a>';
  // Add the 'sendFrom' modal
 
  document.getElementById('sendFrom').innerHTML = ''
  for (var i=0; i<addresses.length; ++i) {
    document.getElementById('sendFrom').innerHTML += '<option value="' + addresses[i] + '">' + addresses[i] + '</option>'
  }
  */
}

window.setSeed = function setSeed() {

  var password = prompt('Enter password to encrypt your seed for this session', '');
  if(! password) { return false; }

  var randomSeed = document.getElementById('seed').value;
  
  lightwallet.keystore.createVault({
    password: password,
    seedPhrase: randomSeed
  }, function(err, ks) {
    window.global_keystore = ks;
    newAddresses(password);
    document.getElementById('seed').value = '';
  });
}

window.newWallet = function newWallet() {
  var extraEntropy = document.getElementById('userEntropy').value;
  document.getElementById('userEntropy').value = '';
  var randomSeed = lightwallet.keystore.generateRandomSeed(extraEntropy);

  var infoString = 'Your new wallet seed is: "' + randomSeed + 
    '". Please write it down on paper, you will need it to access your wallet. Do not let anyone see this seed or they can take your Ether. Please chooses a password to encrypt your wallet for this session.'

  var password = prompt(infoString, '');
  if(! password) { return false; }

  lightwallet.keystore.createVault({
    password: password,
    seedPhrase: randomSeed
  }, function(err, ks) {
    global_keystore = ks;
    newAddresses(password);
  });
}

window.showSeed = function showSeed() {
  var password = prompt('Enter your password to show your seed.', '');
  if(! password) { return false; }

  global_keystore.keyFromPassword(password, function(err, pwDerivedKey) {
    if(! global_keystore.isDerivedKeyCorrect(pwDerivedKey)) {
      alert('Wrong password');
      return showSeed();
    }

    var seed = global_keystore.getSeed(pwDerivedKey);
    alert('Your seed is:\n\n"' + seed + '"\n\n. Please write it down.');
  })
}

window.saveWallet = function saveWallet() {
  var serialized = global_keystore.serialize();
  document.getElementById('savedWallet').value = serialized;
}

window.loadWallet = function loadWallet() {
  var serialized = document.getElementById('loadedWallet').value;
  global_keystore = lightwallet.keystore.deserialize(serialized);
  showAddresses();
  alert('Wallet Loaded.');
}