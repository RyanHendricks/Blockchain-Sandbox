<?php

  header('Content-type:application/json;charset=utf-8');

  require_once 'functions.php';

  define('const_max_retrieve_items', 5000);

  $config=read_config();
  $chain=@$_GET['chain'];
  if (strlen($chain))
    $name=@$config[$chain]['name'];
  else {
    http_response_code(400);
    echo 'Missing chain name in the request. Please provide the query parameter `chain` with the chain name.';
    return;
  }

  set_multichain_chain($config[$chain]);
  
 ?>
