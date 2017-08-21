<?php
// a script to
// 1. register nodeinfo to mongodb so that meteor can publish to other nodes
// 2. look up the nodeinfo of other nodes and add them to geth
// 3. if it is node1, create contract and register the address to mongodb
// 4. if it is not node1, 

$mongo_manager = new MongoDB\Driver\Manager("mongodb://localhost:3001");
require "geth_include.php";

$MY_ACCT = json_decode(call_method("eth_coinbase"), true)['result'];

switch ($argv[1]){
  case 1:
    getMyNodeInfoAndAddToMongo();
    createContractAndAddToMongo();
    break;
  case 2:
    getMyNodeInfoAndAddToMongo();
    findNodeInfoAndAddToGeth(1);
    findContractAndAddToMongo();
    break;
  case 3:
    findNodeInfoAndAddToGeth(1);
    findNodeInfoAndAddToGeth(2);
    findContractAndAddToMongo();
    break;
}

exit;
    

function getMyNodeInfoAndAddToMongo(){
  $enode = json_decode(call_method("admin_nodeInfo"), true)['result']['enode'];
  $ip = gethostbyname(php_uname('n'));
  $enode = str_replace("[::]",$ip,$enode);
  print("my enode found: ".$enode. "\n");
  
  global $mongo_manager;
  $bulk = new MongoDB\Driver\BulkWrite();
  $bulk->delete([]);// delete all
  $bulk->insert(['enode' => $enode]);
  while (true){
    try 
    {
      $mongo_manager->executeBulkWrite("meteor.enode", $bulk);
      break;
    }catch ( MongoDB\Driver\Exception\Exception $e ) {
      echo "Exception:", $e->getMessage(), "\n";
      sleep(5);
    }            
  }
}

function createContractAndAddToMongo(){
  print "check if contract alread exists:" .strlen(curl_get_content("http://localhost:3000/contractinfo"))."\n";
  if(strlen(curl_get_content("http://localhost:3000/contractinfo"))==42){
    return;
  }
  compileAndAddContract("TradeMatching.sol");
}

function findNodeInfoAndAddToGeth($nodeID){
  $nodeID = intval($nodeID);
  $str = curl_get_content("http://ethereum".$nodeID.":3000/nodeinfo");
  print("node".$nodeID." enode found: ".$str. "\n");
  $retval = json_decode(call_method("admin_addPeer",'["'.$str.'"]'), true);
  var_dump($retval); 
}


function findContractAndAddToMongo(){
  $addr = curl_get_content("http://ethereum1:3000/contractinfo");
  addMongoContractAddress( $addr);
}

function addMongoContractAddress($address){
  global $mongo_manager;
  $bulk = new MongoDB\Driver\BulkWrite();
  $bulk->delete([]);// delete all
  $bulk->insert(['address' => $address]);
  while (true){
    try 
    {
      $mongo_manager->executeBulkWrite("meteor.contract", $bulk);
      print("contract added :".$address."\n");
      break;
    }catch ( MongoDB\Driver\Exception\Exception $e ) {
      echo "Exception:", $e->getMessage(), "\n";
      sleep(5);
    }            
  }
  
}


function compileAndAddContract($file){
  global $MY_ACCT;
  $str = file_get_contents($file);
  $str = compressCode($str);
  var_dump($str);
  $retval = call_method("eth_compileSolidity",'["'.$str.'"]');
  //$retval = call_method("eth_compileSolidity",$str);
  //var_dump($retval);
  $compiled = json_decode($retval, true)['result']['TradeMatching']['code'];
  //var_dump($compiled);
  $retval = call_method("eth_sendTransaction",'[{"from":"'.$MY_ACCT.'"   ,"data":"'.$compiled.'","gas":"'.GETH_GAS_LIMIT.'","value":"0x0"}]',0); 
  $rethash = parse_transaction_hash($retval);
  var_dump($rethash);
  print("\nwaiting for contract to be registered.");
  $retval = null;
  do{
    sleep(5);
    print(".");
    $retval = json_decode(call_method("eth_getTransactionReceipt",'["'.$rethash.'"]'), true);
    //var_dump($retval);
    //var_dump(isset($retval['result']['contractAddress']));
  }while(!isset($retval['result']['contractAddress']));
  
  addMongoContractAddress($retval['result']['contractAddress']);
  
  print("\ncontract registered: ".$retval['result']['contractAddress']."\n");
}

function compressCode($buffer){
  //http://php.net/manual/en/function.preg-replace.php
//START Remove comments.

   $buffer = str_replace('/// ', '///', $buffer);        
   $buffer = str_replace(',//', ', //', $buffer);
   $buffer = str_replace('{//', '{ //', $buffer);
   $buffer = str_replace('}//', '} //', $buffer);
   $buffer = str_replace('*//*', '*/  /*', $buffer);
   $buffer = str_replace('/**/', '/*  */', $buffer);
   $buffer = str_replace('*///', '*/ //', $buffer);
   $buffer = preg_replace("/\/\/.*\n\/\/.*\n/", "", $buffer);
   $buffer = preg_replace("/\s\/\/\".*/", "", $buffer);
   $buffer = preg_replace("/\/\/\n/", "\n", $buffer);
   $buffer = preg_replace("/\/\/\s.*.\n/", "\n  \n", $buffer);
   $buffer = preg_replace('/\/\/w[^w].*/', '', $buffer);
   $buffer = preg_replace('/\/\/s[^s].*/', '', $buffer);
   $buffer = preg_replace('/\/\/\*\*\*.*/', '', $buffer);
   $buffer = preg_replace('/\/\/\*\s\*\s\*.*/', '', $buffer);
   $buffer = preg_replace('/[^\*]\/\/[*].*/', '', $buffer);
   $buffer = preg_replace('/([;])\/\/.*/', '$1', $buffer);
   $buffer = preg_replace('/((\r)|(\n)|(\R)|([^0]1)|([^\"]\s*\-))(\/\/)(.*)/', '$1', $buffer);
   $buffer = preg_replace("/([^\*])[\/]+\/\*.*[^a-zA-Z0-9\s\-=+\|!@#$%^&()`~\[\]{};:\'\",<.>?]/", "$1", $buffer);
  $buffer = preg_replace("/\/\*/", "\n/*dddpp", $buffer);
  $buffer = preg_replace('/((\{\s*|:\s*)[\"\']\s*)(([^\{\};\"\']*)dddpp)/','$1$4', $buffer);
  $buffer = preg_replace("/\*\//", "xxxpp*/\n", $buffer);
  $buffer = preg_replace('/((\{\s*|:\s*|\[\s*)[\"\']\s*)(([^\};\"\']*)xxxpp)/','$1$4', $buffer);
  $buffer = preg_replace('/([\"\'])\s*\/\*/', '$1/*', $buffer);
  $buffer = preg_replace('/(\n)[^\'"]?\/\*dddpp.*?xxxpp\*\//s', '', $buffer);
  $buffer = preg_replace('/\n\/\*dddpp([^\s]*)/', '$1', $buffer);
  $buffer = preg_replace('/xxxpp\*\/\n([^\s]*)/', '*/$1', $buffer);
  $buffer = preg_replace('/xxxpp\*\/\n([\"])/', '$1', $buffer);
  $buffer = preg_replace('/(\*)\n*\s*(\/\*)\s*/', '$1$2$3', $buffer);
  $buffer = preg_replace('/(\*\/)\s*(\")/', '$1$2', $buffer);
  $buffer = preg_replace('/\/\*dddpp(\s*)/', '/*', $buffer);
  $buffer = preg_replace('/\n\s*\n/', "\n", $buffer);
  $buffer = preg_replace("/([^\'\"]\s*)<!--.*-->(?!(<\/div>)).*/","$1", $buffer);
  $buffer = preg_replace('/([^\n\w\-=+\|!@#$%^&*()`~\[\]{};:\'",<.>\/?\\\\])(\/\/)(.*)/', '$1', $buffer);

//END Remove comments.    

//START Remove all whitespaces

  $buffer = preg_replace('/\s+/', ' ', $buffer);
  $buffer = preg_replace('/\s*(?:(?=[=\-\+\|%&\*\)\[\]\{\};:\,\.\<\>\!\@\#\^`~]))/', '', $buffer);
  $buffer = preg_replace('/(?:(?<=[=\-\+\|%&\*\)\[\]\{\};:\,\.\<\>\?\!\@\#\^`~]))\s*/', '', $buffer);
  $buffer = preg_replace('/([^a-zA-Z0-9\s\-=+\|!@#$%^&*()`~\[\]
{};:\'",<.>\/?])\s+([^a-zA-Z0-9\s\-=+\|!@#$%^&*()`~\[\]
{};:\'",<.>\/?])/', '$1$2', $buffer);

//END Remove all whitespaces
  return $buffer;
}

function curl_get_content($url){
    $defaults = array( 
        CURLOPT_POST => 1, 
        CURLOPT_HEADER => 0, 
        CURLOPT_URL => $url, 
        CURLOPT_FRESH_CONNECT => 1, 
        CURLOPT_RETURNTRANSFER => 1, 
        CURLOPT_FORBID_REUSE => 1, 
        CURLOPT_TIMEOUT => 15, 
    ); 

    $ch = curl_init(); 
    curl_setopt_array($ch, ($defaults)); 
    if( ! $result = curl_exec($ch)) 
    { 
        trigger_error(curl_error($ch)); 
    } 
    curl_close($ch); 
  
    return $result;
}


?>
