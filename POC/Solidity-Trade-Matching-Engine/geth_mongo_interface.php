<?php
//define("CONTRACT_ADDR", "0xcafebabedeadbeafcafebabedeadbeafcafebabedeadbeaf");// your contract
define("CONTRACT_FILE", "TradeMatching.sol");
$mongo_manager = new MongoDB\Driver\Manager("mongodb://localhost:3001");
define("MONGO_COLLECTION", "meteor.trades");
define("GETH_RPC_URL", "http://localhost:8545");
define("GETH_GAS_LIMIT", "0xffffff"); // default gas limit is too small

require "geth_include.php";

$MY_ACCT = json_decode(call_method("eth_coinbase"), true)['result'];

$JSON_ID_COUNTER = 1;

if(defined("CONTRACT_ADDR")){
  $CONTRACT_ADDR = CONTRACT_ADDR;
}else{
  $CONTRACT_ADDR = getMongoContractAddress();
}
if(!isset($CONTRACT_ADDR) || !$CONTRACT_ADDR) die ("\$CONTRACT_ADDR not set \n");

while(true){
  // get queued trades from mongo and send to the network (addTrades) and change the status to pending
  addQueuedTrades();
  
  // traverse all trades in the network and update mongo (until the filter function is implemented)
  $i=1;
  while( updateMongoByTradeID($i++));
  
  sleep(10);
  // 
}



function eth_call($data="[]",$id=1){
  global $CONTRACT_ADDR;
  print '[eth_call] call_method("eth_call",[{"to": "'.$CONTRACT_ADDR.'", "data": "'.$data.'"}],'.$id.');'."\n";
  return call_method("eth_call",'[{"to": "' .$CONTRACT_ADDR. '", "data": "'.$data.'"}, "latest"]' ,$id);
}

function getTrade($tradeID){
 // echo str_pad(dechex($input), 64, "0", STR_PAD_LEFT); 
  $retval = eth_call('0x2db25e05'.str_pad(dechex($tradeID), 64, "0", STR_PAD_LEFT),1);
  return parse_trade($retval);
}

function parse_trade($retStr){
  $max_int_length = strlen((string) PHP_INT_MAX) - 1;
  $json_without_bigints = preg_replace('/:\s*(-?\d{'.$max_int_length.',})/', ': "$1"', $retStr);
  $retArray = json_decode($json_without_bigints, true, 512);
  //echo "parse_trade: ".$retStr."\n";
  //var_dump($retArray);
  $result = $retArray["result"];
  //$result = $retStr;
  return  array(
    "sender"       => add_0x(substr(substr($result,2,64),-40,40)),
    "senderid"     => trim(hex2bin(substr($result,2+64*1,64))),
    "seller"       => add_0x(substr(substr($result,2+64*2,64),-40,40)),
    "buyer"        => add_0x(substr(substr($result,2+64*3,64),-40,40)),
    "seccode"      => trim(hex2bin(substr($result,2+64*4,64))),
    "tradedate"    => hexdec(substr($result,2+64*5,64)),
    "deliverydate" => hexdec(substr($result,2+64*6,64)),
    "quantity"     => hexdec(substr($result,2+64*7,64)),
    "price"        => hexdec(substr($result,2+64*8,64)),
    "deliveryamount" => hexdec(substr($result,2+64*9,64)),
    "matchedtrade" => hexdec(substr($result,2+64*10,64))
    );
}

function updateMongoByTradeID($tradeID){
  global $mongo_manager,$MY_ACCT;
  $trade = getTrade($tradeID);
  echo "updateMongoByTradeID( ".$tradeID." )\n";
  //var_dump($trade);
  //var_dump($trade["sender"]);
  if (empty($trade["sender"])||preg_match('/^(0+|0x0+)$/',$trade["sender"])){
    echo "no trade found\n";
    return false;
  }
  
  // set status by matchiedtrade
  if($trade["matchedtrade"]>0){
    $trade["status"]="matched";
    $trade["matchedkey"]= min(intval($tradeID),intval($trade["matchedtrade"]));
  }else{
    $trade["status"]="unmatch";
  }
  // set tradeID
  $trade["tradeID"] = $tradeID;
  
  $bulk = new MongoDB\Driver\BulkWrite;
  //echo "strcasecmp". $trade['sender']."  ".substr($MY_ACCT,-40,40);
  if (strcasecmp($trade['sender'],substr($MY_ACCT,-42,42))==0){
    // MY Trade
    //echo "my trade is updated:";
    //var_dump ($trade);
    $bulk->update(['_id' => $trade['senderid'],'sender' => $trade['sender']], ['$set' => $trade], ['multi' => false, 'upsert' => true]);
  }else{
    // OTHER's Trade
    //$bulk->insert($trade);
    $bulk->update(['tradeID' => $trade['tradeID']], ['$set' => $trade], ['multi' => false, 'upsert' => true]);
  }
  
  $result = $mongo_manager->executeBulkWrite(MONGO_COLLECTION, $bulk);
  
  $retval = true;
  /* If the WriteConcern could not be fulfilled */
  if ($writeConcernError = $result->getWriteConcernError()) {
      printf("%s (%d): %s\n", $writeConcernError->getMessage(), $writeConcernError->getCode(), var_export($writeConcernError->getInfo(), true));
      $retval = false;
  }

  /* If a write could not happen at all */
  foreach ($result->getWriteErrors() as $writeError) {
      printf("Operation#%d: %s (%d)\n", $writeError->getIndex(), $writeError->getMessage(), $writeError->getCode());
      $retval = false;
  }
  return $retval;
}

function addTrade($senderid, $seller, $buyer, $seccode, $tradedate,  $deliverydate, $quantity, $price, $deliveryamount){
  // function addTrade(bytes32 senderid, address seller, address buyer,  bytes12 seccode, uint32 tradedate, uint32 deliverydate, uint quantity, uint32 price, int deliveryamount)
  global $JSON_ID_COUNTER;
  $retval = eth_sendTransaction('0x582ec91b'
                  .str_pad(bin2hex(substr($senderid,0,32)), 64, "0", STR_PAD_RIGHT)
                  .str_pad(substr($seller,-40,40), 64, "0", STR_PAD_LEFT)
                  .str_pad(substr($buyer,-40,40) , 64, "0", STR_PAD_LEFT)
                  .str_pad(bin2hex(substr($seccode,0,12)), 64, "0", STR_PAD_RIGHT)
                  .str_pad(dechex(intval($tradedate)), 64, "0", STR_PAD_LEFT)
                  .str_pad(dechex(intval($deliverydate)), 64, "0", STR_PAD_LEFT)
                  .str_pad(dechex(intval($quantity)), 64, "0", STR_PAD_LEFT)
                  .str_pad(dechex(intval($price)), 64, "0", STR_PAD_LEFT)
                  .str_pad(dechex(intval($deliveryamount)), 64, "0", STR_PAD_LEFT)
                  ,$JSON_ID_COUNTER++);

  return parse_transaction_hash($retval);
}
                             


                             
function addQueuedTrades(){
  global $mongo_manager;
  $filter = ['status' => 'queued'];

  $query = new MongoDB\Driver\Query($filter);
  $cursor = $mongo_manager->executeQuery(MONGO_COLLECTION, $query);
  
  foreach ($cursor as $document) {
    //var_dump($document);
    $tranhash = addTradeFromDocument($document);
    if($tranhash){
      updateMongoTranHash($document->{"_id"},$tranhash);
    }
  } 
}

function addTradeFromDocument($document){
  // addTrade($senderid, $seller,  $buyer,   $seccode,  $tradedate,  $deliverydate,  $quantity,  $price,  $deliveryamount)
  
  return addTrade($document->{"_id"}, $document->{"seller"}, $document->{"buyer"}, $document->{"seccode"}, $document->{"tradedate"}, $document->{"deliverydate"}, $document->{"quantity"}, $document->{"price"}, $document->{"deliveryamount"});
}

function updateMongoTranHash($id,$tranhash){
  global $mongo_manager,$MY_ACCT;
  $bulk = new MongoDB\Driver\BulkWrite;
  $bulk->update(['_id' => $id], ['$set' => ['status' => 'pending', 'transactionhash' => $tranhash, 'sender' => substr($MY_ACCT,-42,42)]], ['multi' => false, 'upsert' => false]);
  $result = $mongo_manager->executeBulkWrite(MONGO_COLLECTION, $bulk);
  
  $retval = true;
  /* If the WriteConcern could not be fulfilled */
  if ($writeConcernError = $result->getWriteConcernError()) {
      printf("%s (%d): %s\n", $writeConcernError->getMessage(), $writeConcernError->getCode(), var_export($writeConcernError->getInfo(), true));
    
      $retval = false;
  }

  /* If a write could not happen at all */
  foreach ($result->getWriteErrors() as $writeError) {
      printf("Operation#%d: %s (%d)\n", $writeError->getIndex(), $writeError->getMessage(), $writreError->getCode());
    
      $retval = false;
  }
  return $retval;
}


function getMongoContractAddress(){
  global $mongo_manager;
  $filter = [];
  $query = new MongoDB\Driver\Query($filter);
  $cursor = $mongo_manager->executeQuery("meteor.contract", $query);
  foreach ($cursor as $document) {
   // var_dump($document);
   // var_dump($document->address);
    return $document->address;
  }
  return false;
}
?>
