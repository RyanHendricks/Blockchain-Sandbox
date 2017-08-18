<?php

 // fundamental functions to interact with geth
 
if(!defined("GETH_RPC_URL")) define("GETH_RPC_URL", "http://localhost:8545");
if(!defined("GETH_GAS_LIMIT")) define("GETH_GAS_LIMIT", "0xffffff"); // default gas limit is too small



function call_method($method, $params="[]", $id=1){
    $defaults = array( 
        CURLOPT_POST => 1, 
        CURLOPT_HEADER => 0, 
        CURLOPT_URL => GETH_RPC_URL, 
        CURLOPT_FRESH_CONNECT => 1, 
        CURLOPT_RETURNTRANSFER => 1, 
        CURLOPT_FORBID_REUSE => 1, 
        CURLOPT_TIMEOUT => 4, 

        CURLOPT_POSTFIELDS => '{"jsonrpc":"2.0","method":"' . $method . '","params":' . $params . ',"id":' . $id . '}'

    ); 

    $ch = curl_init(); 
    curl_setopt_array($ch, ($defaults)); 
    if( ! $result = curl_exec($ch)) 
    { 
        trigger_error(curl_error($ch)); 
    } 
    curl_close($ch); 
  //echo 'call_method  : '.'{"jsonrpc":"2.0","method":"' . $method . '","params":' . $params . ',"id":' . $id . '}'."\n";
  //echo $result."\n";
  return $result;
}


function eth_sendTransaction($data="[]",$id=1){
  global $MY_ACCT,$CONTRACT_ADDR;
  return call_method("eth_sendTransaction",'[{"from":"'.$MY_ACCT.'","to":"' .$CONTRACT_ADDR. '","data":"'.$data.'","gas":"'.GETH_GAS_LIMIT.'","value":"0x0"}]',$id); 
}

function parse_transaction_hash($retStr){
  //$retArray = json_decode($retStr, true, 512, JSON_BIGINT_AS_STRING);
  $max_int_length = strlen((string) PHP_INT_MAX) - 1;
  $json_without_bigints = preg_replace('/:\s*(-?\d{'.$max_int_length.',})/', ': "$1"', $retStr);
  $retArray = json_decode($json_without_bigints, true, 512);
  if( isset($retArray["error"])){
    echo "parse_transaction_hash error\n";
    var_dump($retArray);
    return false;
  }
  $result = $retArray["result"];
  //echo "parse_transaction_hash\n";
  //var_dump($result);
  //return  substr($result,2,64);
  return $result;
}

function add_0x($value){
  var_dump($value);
  if(strlen($value)< 3 || strncmp($value,'0x',2)==0){
    return $value;
  }else{
    return '0x'.$value;
  }
}

?>
