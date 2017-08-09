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

 'use strict';

    /*eslint-disable no-unused-vars*/
    /*eslint-disable no-undef*/

    /**
    * A transaction processor for DocumentSign
    * @param  {clinicaltrial.network.DocumentSign} DocumentSign - the transaction to be processed
    * @transaction
    */
    function onDocumentSign(DocumentSign) {
    console.log('DocumentSigned');
    var currentParticipant = getCurrentParticipant(UserID);
    var signer = currentParticipant;

};

    /**
    * A transaction processor for ChangeDocStatus
    * @param  {clinicaltrial.network.ChangeDocStatus} ChangeDocStatus  - the transaction to be processed
    * @transaction
    */

    function onChangeDocStatus(ChangeDocStatus){
    
    return getAssetRegistry('org.acme.Document')
    .then(function (DocumentAssetRegistry) {
    var status = clinicaltrial.network.Document.status
    var newstatus = ChangeDocStatus.status
    return status.update(newstatus)
    return documentAssetRegistry.update(status);
        })
.catch(function (error) {
    // Add optional error handling here.
  });}

    function onAnimalMovementArrival(movementArrival) {
       
        var DocID;
return getAssetRegistry('org.acme.Document')
  .then(function (vehicleAssetRegistry) {
    // Get the factory for creating new asset instances.
    var factory = getFactory();
    // Modify the properties of the vehicle.
    vehicle.colour = 'PURPLE';
    // Update the vehicle in the vehicle asset registry.
    return vehicleAssetRegistry.update(vehicle);
  })
  .catch(function (error) {
    // Add optional error handling here.
  });


// Get the vehicle asset registry.

    
    }

    /*eslint-enable no-unused-vars*/
    /*eslint-enable no-undef*/
    }

function DocumentESignature(DocumentESignature) {
    console.log('DocumentSigned');

    var currentParticipant = getCurrentParticipant(StudyStaffID);
    var signer = currentParticipant;

};
   
function onChangeDocStatus(ChangeDocStatus){
    var status = clinicaltrial.network.Document.status
    var newstatus = ChangeDocStatus.status
    return status.update(newstatus)
};


    //change document status
    document.status = signed;

    //PrivateVehicleTransaction for log
    var documentLogEntry = factory.newConcept('documentLogEntry');
    documentLogEntry.timestamp = privatedocument.timestamp;
    if (!document.logEntries) {
        vehicle.logEntries = [];
    }

    return getAssetRegistry(document.getFullyQualifiedType())
        .then(function(ar) {
            return ar.update(document);
        });
}

function ChangeDocStatus(temperatureReading) {

    var shipment = temperatureReading.shipment;

    console.log('Adding temperature ' + temperatureReading.centigrade + ' to shipment ' + shipment.$identifier);

    if (shipment.temperatureReadings) {
        shipment.temperatureReadings.push(temperatureReading);
    } else {
        shipment.temperatureReadings = [temperatureReading];
    }

    return getAssetRegistry('org.acme.shipping.perishable.Shipment')
        .then(function (shipmentRegistry) {
            // add the temp reading to the shipment
            return shipmentRegistry.update(shipment);
        });
}

function onRegisterPropertyForSale(propertyForSale) {
    console.log('### onRegisterPropertyForSale ' + propertyForSale.toString());
    propertyForSale.title.forSale = true;

    return getAssetRegistry('net.biz.digitalPropertyNetwork.LandTitle').then(function(result) {
        return result.update(propertyForSale.title);
    }
    );
}
 */
transaction ChangeDocStatus extends DocumentChange {
 // --> DocumentLog logEntries
}

transaction DocumentSign extends ChangeDocStatus {
 // --> SignatureLog logSignatures
}