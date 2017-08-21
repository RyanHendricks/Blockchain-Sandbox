import { Mongo } from 'meteor/mongo';

export const Trades = new Mongo.Collection('trades');
export const Counterparties = new Mongo.Collection('counterparties');
