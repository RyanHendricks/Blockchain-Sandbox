# Clinical Trial Document Integrity Network - Module 11 - Electronic Records + Electronic Signatures 

This network is designed to track the electronic signatures on electronic records for a clinical trial in accordance with Title 21 CFR Part 11 of the Code of Federal Regulations.

Various participants in the network have differing levels of access and authority but no single participant group has complete authority. A regulator is able to view the transaction chain to obtain information such as:
> * The timeline and chain of events for the creation of a document, review, approval, certification, signature, modification, signature, trasmittal, archival, and destruction.
> * Participant creation (activation), modification, actions taken, authority modified, access level changes, and account removal (deactivated).


This business network is for the Management and Oversight of Clinical Trials. Currently, this is just a framework upon which more features and integrations can be built. There are numerous  ways a distributed ledger can be implemented into the Trial Management Procedures. From Regulatory Document version control, electronic signatures, investigational product accountability, Institutional Review Board approvals,subject enrollment logs, temperature reading for IP shipments, training certificates, etc. Excel is still heavily used in the industry due to its simplicity, familiarity, compatibility, and the overall frustration of research staff resulting from an uneccesarily large number of individual systems required for only one protocol.

Currently, this Clinical Research DLT Application is in the infancy stage and merely consists of a framework at this time. The goal of this version was to focus on illustrating the potential larger scale application of the framework by creating a comprehensive foundation that would permit such larger scale implementation. 


**Participants**    
`Regulator` - FDA, Auditors, Regulators  
`Sponsor` - The Clinical Trial Sponsor  
`TrialManagement` - The group or entity repsonsible for the management of the Clinical Trial; typically a CRO.  
`SiteManagement` - The person or group responsible for management of individual Clinical Trial sites. Usually a member of the `TrialManagement` organization but with oversight for only a subset of the study sites. A "CRA" would be an example of a member of this participant group.  
`SitePI` - The principal investigator for an individual study site. This name will be listed on the FDA 1572 for a clinical trial completed by the clinical trial site prior to initiation of a protocol. Sub-Investigators will be implemented in this group in later version.  
`SiteResearchStaff` - Research staff for a clinical trial site that are not considered to be investigators (PI or sub-Is). These participants will be listed in the Delegation of Authority Log prior to their inclusion in this network.   


**Assets**  
`Document`  
`Signature`  
`Authority` -- maybe  


**Transactions**  
`Create Participant`  
`Activate Participant`  
`Deactivate Particpant`  
`Assign Participant Permissions`  

`Create Document`  
`Modify Document`  
`Review Document`  
`Approve Document`  
`Certify Document`  
`Retrieve Document`  
`Transmit Document`  
`Archive Document`  

`Create Signature`  
`Certify Signature`  
`Approve Signature`  
`Revoke Signature`  
`Amend Signature`  



`PlaceOrder` `UpdateOrderStatus` `ApplicationForVehicleRegistrationCertificate` `PrivateVehicleTransfer` `ScrapVehicle` `UpdateSuspicious` `ScrapAllVehiclesByColour` `SetupDemo`

**Events**
`PlaceOrderEvent` `UpdateOrderStatusEvent` `ScrapVehicleEvent`

A `PriavteOwner` participant would submit a `PlaceOrder` transaction, through a Manufacturer's application. A `Manufacturer` would submit an `UpdateOrderStatus` transaction which would be the Vehicle being manufactured. They would apply for a registration certificate by submitting an `ApplicationForVehicleRegistrationCertificate` transaction. After the vehicle has been manufactured they would submit a `PrivateVehicleTransfer` transaction. A `Regulator` would be able perform oversight over this whole process and submit an `UpdateSuspicious` transaction to view any suspicious vehicles that may be out of compliance with regulations. A `ScrapMerchant` would be able to submit a `ScrapVehicle` or a `ScrapAllVehiclesByColour` transaction to complete the lifecycle of a vehicle.

To test this Business Network Definition in the **Test** tab:

Submit a `SetupDemo` transaction:

```
{
  "$class": "org.acme.vehicle.lifecycle.SetupDemo"
}
```

This transaction populates the Participant Registries with three `Manufacturer` participants, twenty-three `PrivateOwner` participants and a `Regulator` participant. The `Vehicle` Asset Registry will have thirteen `Vehicle` assets.

Submit a `PlaceOrder` transaction:

```
{
  "$class": "org.acme.vehicle.lifecycle.manufacturer.PlaceOrder",
  "orderId": "1234",
  "vehicleDetails": {
    "$class": "org.vda.VehicleDetails",
    "make": "Arium",
    "modelType": "Gamora",
    "colour": "Sunburst Orange"
  },
  "manufacturer": "resource:org.acme.vehicle.lifecycle.manufacturer.Manufacturer#Arium",
  "orderer": "resource:org.acme.vehicle.lifecycle.PrivateOwner#toby"
}
```

This `PlaceOrder` transaction creates a new order in the `Order` Asset Registry. It also emits a `PlaceOrderEvent` events.

Submit a `UpdateOrderStatus` transaction:

```
{
  "$class": "org.acme.vehicle.lifecycle.manufacturer.UpdateOrderStatus",
  "orderStatus": "SCHEDULED_FOR_MANUFACTURE",
  "order": "resource:org.acme.vehicle.lifecycle.manufacturer.Order#1234"
}
```

This `UpdateOrderStatus` transaction updates the order status of `orderId:1234` in the `Order` Asset Registry. It also emits a `UpdateOrderStatusEvent` event.

Congratulations!

This Business Network definition had been used to create demo applications for the `PrivateOwner`, `Manufacturer` and `Regulator`. Find more information here: https://github.com/hyperledger/composer-sample-applications/tree/master/packages/vehicle-lifecycle

# Basic Sample Business Network

> This is the "Hello World" of Hyperledger Composer samples, which demonstrates the core functionality of Hyperledger Composer by changing the value of an asset.

This business network defines:

**Participant**
`SampleParticipant`

**Asset**
`SampleAsset`

**Transaction**
`SampleTransaction`

**Event**
`SampleEvent`

SampleAssets are owned by a SampleParticipant, and the value property on a SampleAsset can be modified by submitting a SampleTransaction. The SampleTransaction emits a SampleEvent that notifies applications of the old and new values for each modified SampleAsset.

To test this Business Network Definition in the **Test** tab:

Create a `SampleParticipant` participant:

```
{
  "$class": "org.acme.sample.SampleParticipant",
  "participantId": "Toby",
  "firstName": "Tobias",
  "lastName": "Hunter"
}
```

Create a `SampleAsset` asset:

```
{
  "$class": "org.acme.sample.SampleAsset",
  "assetId": "assetId:1",
  "owner": "resource:org.acme.sample.SampleParticipant#Toby",
  "value": "original value"
}
```

Submit a `SampleTransaction` transaction:

```
{
  "$class": "org.acme.sample.SampleTransaction",
  "asset": "resource:org.acme.sample.SampleAsset#assetId:1",
  "newValue": "new value"
}
```

After submitting this transaction, you should now see the transaction in the Transaction Registry and that a `SampleEvent` has been emitted. As a result, the value of the `assetId:1` should now be `new value` in the Asset Registry.

Congratulations!

