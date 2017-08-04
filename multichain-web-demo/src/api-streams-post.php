<?php

  require_once 'api-header.php';

  $max_upload_size=multichain_max_data_size()-512; // take off space for file name and mime type

  $upload=@$_FILES['upload'];
  $upload_file=@$upload['tmp_name'];

  if (strlen($upload_file)) {
    $upload_size=filesize($upload_file);

    if ($upload_size>$max_upload_size) {
      http_response_code(400);
      echo 'Uploaded file is too large ('.number_format($upload_size).' > '.number_format($max_upload_size).' bytes).';
      return;

    } else
      $data=file_to_txout_bin($upload['name'], $upload['type'], file_get_contents($upload_file));

  } else
    $data=string_to_txout_bin($_POST['text']);

  if (no_displayed_error_result($publishtxid, multichain(
    'publishfrom', $_POST['from'], $_POST['stream'], $_POST['key'], bin2hex($data)
  )))

  http_response_code(202);
  echo 'Item successfully published in transaction '.$publishtxid.'. The transaction will be validated by consensus and then the data will be confirmed in the chain.';

?>
