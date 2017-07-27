// export namespace org.hyperledger.composer.system{
   export abstract class Asset {
   }
   export abstract class Participant {
   }
   export abstract class Transaction {
      transactionId: string;
      timestamp: Date;
   }
   export abstract class Event {
      eventId: string;
      timestamp: Date;
   }
   export abstract class Registry extends Asset {
      registryId: string;
      name: string;
      type: string;
      system: boolean;
   }
   export class AssetRegistry extends Registry {
   }
   export class ParticipantRegistry extends Registry {
   }
   export class TransactionRegistry extends Registry {
   }
   export class Network extends Asset {
      networkId: string;
   }
   export enum IdentityState {
      ISSUED,
      BOUND,
      ACTIVATED,
      REVOKED,
   }
   export class Identity extends Asset {
      identityId: string;
      name: string;
      issuer: string;
      certificate: string;
      state: IdentityState;
      participant: Participant;
   }
   export class IssueIdentity extends Transaction {
      participant: Participant;
      identityName: string;
   }
   export class BindIdentity extends Transaction {
      participant: Participant;
      certificate: string;
   }
   export class ActivateCurrentIdentity extends Transaction {
   }
   export class RevokeIdentity extends Transaction {
      identity: Identity;
   }
// }
