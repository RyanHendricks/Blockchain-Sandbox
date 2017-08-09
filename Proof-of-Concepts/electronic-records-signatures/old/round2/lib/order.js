/**
 * Sample transaction processor function.
 * @param {org.acme.sample.SampleTransaction} tx The sample transaction instance.
 * @transaction
 */
function sampleTransaction(tx) {

    // Save the old value of the asset.
    var oldValue = tx.asset.value;

    // Update the asset with the new value.
    tx.asset.value = tx.newValue;

    // Get the asset registry for the asset.
    return getAssetRegistry('org.acme.sample.SampleAsset')
        .then(function (assetRegistry) {

            // Update the asset in the asset registry.
            return assetRegistry.update(tx.asset);

        })
        .then(function () {

            // Emit an event for the modified asset.
            var event = getFactory().newEvent('org.acme.sample', 'SampleEvent');
            event.asset = tx.asset;
            event.oldValue = oldValue;
            event.newValue = tx.newValue;
            emit(event);

        });

}
 /**
  * Trade a marble to a new player
  * @param  {org.hyperledger_composer.marbles.TradeMarble} tradeMarble - the trade marble transaction
  * @transaction
  */
 function tradeMarble(tradeMarble) {
   tradeMarble.marble.owner = tradeMarble.newOwner;
   return getAssetRegistry('org.hyperledger_composer.marbles.Marble')
     .then(function (assetRegistry) {
       return assetRegistry.update(tradeMarble.marble);
     });
 }




 /*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Close the bidding for a vehicle listing and choose the
 * highest bid that is over the asking price
 * @param {org.acme.vehicle.auction.CloseBidding} closeBidding - the closeBidding transaction
 * @transaction
 */
function closeBidding(closeBidding) {
    var listing = closeBidding.listing;
    if (listing.state !== 'FOR_SALE') {
        throw new Error('Listing is not FOR SALE');
    }
    // by default we mark the listing as RESERVE_NOT_MET
    listing.state = 'RESERVE_NOT_MET';
    var highestOffer = null;
    var buyer = null;
    var seller = null;
    if (listing.offers && listing.offers.length > 0) {
        // sort the bids by bidPrice
        listing.offers.sort(function(a, b) {
            return (b.bidPrice - a.bidPrice);
        });
        highestOffer = listing.offers[0];
        if (highestOffer.bidPrice >= listing.reservePrice) {
            // mark the listing as SOLD
            listing.state = 'SOLD';
            buyer = highestOffer.member;
            seller = listing.vehicle.owner;
            // update the balance of the seller
            console.log('#### seller balance before: ' + seller.balance);
            seller.balance += highestOffer.bidPrice;
            console.log('#### seller balance after: ' + seller.balance);
            // update the balance of the buyer
            console.log('#### buyer balance before: ' + buyer.balance);
            buyer.balance -= highestOffer.bidPrice;
            console.log('#### buyer balance after: ' + buyer.balance);
            // transfer the vehicle to the buyer
            listing.vehicle.owner = buyer;
            // clear the offers
            listing.offers = null;
        }
    }
    return getAssetRegistry('org.acme.vehicle.auction.Vehicle')
        .then(function(vehicleRegistry) {
            // save the vehicle
            if (highestOffer) {
                return vehicleRegistry.update(listing.vehicle);
            } else {
                return true;
            }
        })
        .then(function() {
            return getAssetRegistry('org.acme.vehicle.auction.VehicleListing')
        })
        .then(function(vehicleListingRegistry) {
            // save the vehicle listing
            return vehicleListingRegistry.update(listing);
        })
        .then(function() {
            return getParticipantRegistry('org.acme.vehicle.auction.Member')
        })
        .then(function(userRegistry) {
            // save the buyer
            if (listing.state == 'SOLD') {
                return userRegistry.updateAll([buyer, seller]);
            } else {
                return true;
            }
        });
}

/**
 * Make an Offer for a VehicleListing
 * @param {org.acme.vehicle.auction.Offer} offer - the offer
 * @transaction
 */
function makeOffer(offer) {
    var listing = offer.listing;
    if (listing.state !== 'FOR_SALE') {
        throw new Error('Listing is not FOR SALE');
    }
    if (listing.offers == null) {
        listing.offers = [];
    }
    listing.offers.push(offer);
    return getAssetRegistry('org.acme.vehicle.auction.VehicleListing')
        .then(function(vehicleListingRegistry) {
            // save the vehicle listing
            return vehicleListingRegistry.update(listing);
        });
}


v