import { Template } from 'meteor/templating';

import { Trades } from '../api/trades.js';

import './trade.html';

Template.trade.events({

  'click .delete'() {
    Trades.remove(this._id);
  },
});
