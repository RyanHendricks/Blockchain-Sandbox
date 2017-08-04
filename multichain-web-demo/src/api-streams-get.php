<?php

  require_once 'api-header.php';

  no_displayed_error_result($liststreams, multichain('liststreams', '*', true));

  //- 1 - List All Streams
  if (!isset($_GET['stream'])) {
    echo json_encode($liststreams);
    return;
  }

  //- 2 - List all the ITEMS for a given stream NAME and other filters, such as KEY
  foreach ($liststreams as $stream) {
    if ($_GET['stream']==$stream['name']) {

      if (isset($_GET['key']))
        $success=no_displayed_error_result($items, multichain('liststreamkeyitems', $stream['createtxid'], $_GET['key'], true, const_max_retrieve_items));
      elseif (isset($_GET['publisher']))
        $success=no_displayed_error_result($items, multichain('liststreampublisheritems', $stream['createtxid'], $_GET['publisher'], true, const_max_retrieve_items));
      else
        $success=no_displayed_error_result($items, multichain('liststreamitems', $stream['createtxid'], true, const_max_retrieve_items));

      echo json_encode($items);
      return;
    }
  }

?>
