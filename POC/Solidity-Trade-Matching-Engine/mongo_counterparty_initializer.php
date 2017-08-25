<?php
// a script to add 3 counterparties
//TODO: terminate if already exists

$mongo_manager = new MongoDB\Driver\Manager("mongodb://localhost:3001");
define("MONGO_COLLECTION", "meteor.counterparties");

$address_A = array(
    "PartyName"  => "A Company",
    "Address"    => "0x119655bc72cfbdfa35562ad27c06a832a90f6f06",
    "self"       => false
    );
$address_B = array(
    "PartyName"  => "B Company",
    "Address"    => "0xfcfb6c5aa562ba1f8883b2dae4c161046f5e4814",
    "self"       => false
    );
$address_C = array(
    "PartyName"  => "C Company",
    "Address"    => "0x1c99b1a24d573af5fd9f0c1066989489af450490",
    "self"       => false
    );

$bulk = new MongoDB\Driver\BulkWrite;
//$bulk->delete([]);// delete all
$bulk->insert($address_A);
$bulk->insert($address_B);
$bulk->insert($address_C);

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

?>
