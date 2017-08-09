'use strict';
/**
 * Write your transction processor functions here
 */

/**
 * Sample transaction
 * @param {firm.risk.dltnet.ChangeAssetValue} changeAssetValue
 * @transaction
 */
function onChangeAssetValue(changeAssetValue) {
    var assetRegistry;
    var id = changeAssetValue.relatedAsset.assetId;
    return getAssetRegistry('firm.risk.dltnet.Asset')
        .then(function(ar) {
            assetRegistry = ar;
            return assetRegistry.get(id);
        })
        .then(function(asset) {
            asset.value = changeAssetValue.newValue;
            return assetRegistry.update(asset);
        });
}