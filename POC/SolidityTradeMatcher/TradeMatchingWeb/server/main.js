import '../imports/api/trades.js';

import { Mongo } from 'meteor/mongo';

export const Enode = new Mongo.Collection('enode');
export const Contract = new Mongo.Collection('contract');

Router.route('/nodeinfo', function () {
  var req = this.request;
  var res = this.response;
  if (Contract.find().count()==0){
    res.end("");
  }
  else{
    var enode = Enode.findOne().enode;
    res.end(enode);
  }
}, {where: 'server'});

Router.route('/contractinfo', function () {
  var req = this.request;
  var res = this.response;
  if (Contract.find().count()==0){
    res.end("");
  }
  else{
    var contractaddress = Contract.findOne().address;
    res.end(contractaddress);
  }
}, {where: 'server'});


