import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';

import { Trades } from '../api/trades.js';
import { Counterparties } from '../api/trades.js';

import './trade.js';
import './body.html';

Template.body.onCreated(function bodyOnCreated() {
  this.state = new ReactiveDict();
});

Template.body.helpers({
  trades() {
    const instance = Template.instance();
    if (instance.state.get('my-trade-only')) {
      // If hide completed is checked, filter trades
      return Trades.find();
    }
    if (instance.state.get('my-unmatch-only')) {
      // If hide completed is checked, filter trades
      return Trades.find({ checked: { $ne: true } }, { sort: { createdAt: -1 } });
    }
    if (instance.state.get('tradeDateFilter') != null) {
      // If a date is selected, filter trades
     return Trades.find( {tradedate:instance.state.get('tradeDateFilter')},{ sort: { createdAt: -1 } });
    }
    // Otherwise, return all of the trades
    //return Trades.find({ tradedate:{$gt: "20150508" }}, { sort: { matchedkey: -1 } });
      return Trades.find({},{ sort: { createdAt: -1 } });
  },

  incompleteCount() {
    return Trades.find().count();
  },
  counterparties(){
    return Counterparties.find();
  },


});

UI.registerHelper('showCounterpartyName', function(context, options) {
  if(context){
    if(context=="me"){
        return "myself";
    }else if(Counterparties.find({Address:context}).count()) {
        return Counterparties.findOne({Address:context},{fields:{PartyName:1}}).PartyName;
    }
   }else{
        return context.substring(0,10);
   }
});

Template.body.events({
  'keydown input'(event){
    //prevent enter to submit
     if ((event.which && event.which === 13) || (event.keyCode && event.keyCode === 13)) return false;
    
  },
  'submit .new-trade'(event) {
    // Prevent default browser form submit
    event.preventDefault();

    // Get value from form element
    const target = event.target;
    const status = "queued";
    const tradeID = 0;
    const sender = "me";
    const seller = target.seller.value;
    const buyer = target.buyer.value;
    const seccode = target.seccode.value;
    const tradedate = target.tradedate.value;
    const deliverydate = target.deliverydate.value;
    const quantity = target.quantity.value;
    const price = target.price.value;
    const deliveryamount = target.deliveryamount.value;

    // Insert a task into the collection
    Trades.insert({
      status,
      tradeID,
      sender,
      seller,
      buyer,
      seccode,
      tradedate,
      deliverydate,
      quantity,
      price,
      deliveryamount,
      createdAt: new Date(), // current time
    });

    // Clear form
    target.seller.value = '';
    target.buyer.value = '';
    target.seccode.value = '';
    target.tradedate.value = '';
    target.deliverydate.value = '';
    target.quantity.value = '';
    target.price.value = '';
    target.deliveryamount.value = '';
  },
  'change .my-trade-only input'(event, instance) {
    instance.state.set('myTradeOnly', event.target.checked);
  },
  'change .my-unmatch-only input'(event, instance) {
    instance.state.set('myUnmatchOnly', event.target.checked);
  },
  'change .tradedate-selector input'(event, instance) {
    instance.state.set('tradeDateFilter', event.target.value);
  },
});
       
Template.body.rendered = function(){
     $('.datetimepicker').each(function(){
           $(this).datetimepicker({format:'YYYYMMDD'}); 
     });
  
};