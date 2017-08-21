$(function () {
  google.charts.load('current', {packages: ['corechart', 'line']});
  google.charts.setOnLoadCallback(function() {
    bundle.Main.drawOptionChart('buy_call', {strike: 12.5, kind: 'Call', margin: 5.0}, 1.5, 100.0);
    bundle.Main.drawOptionChart('sell_call', {strike: 12.5, kind: 'Call', margin: 5.0}, 1.5, -100.0);
    bundle.Main.drawOptionChart('buy_put', {strike: 8.5, kind: 'Put', margin: 5.0}, 0.5, 10.0);
    bundle.Main.drawOptionChart('sell_put', {strike: 8.5, kind: 'Put', margin: 5.0}, 0.5, -10.0);
  });
});
$(function () {
  var period = 1800; //30 minute bars
  var daysData = 10; //10 days
  var start = Math.ceil(Date.now()/1000 - daysData*86400);
  var end = Math.ceil(Date.now()/1000);
  Highcharts.setOptions({
    global: {timezoneOffset: (new Date()).getTimezoneOffset()}
  });
  $.getJSON('https://api.coindesk.com/v1/bpi/currentprice/USD.json', function(result) {
    var btc = result.bpi.USD.rate;
    $.getJSON('https://poloniex.com/public?command=returnChartData&currencyPair=BTC_ETH&start='+start+'&end='+end+'&period='+period, function(eth) {
      var data = eth.map(function(x){return [x["date"]*1000, x["open"]*btc, x["high"]*btc, x["low"]*btc, x["close"]*btc]});

      $('#chart').highcharts('StockChart', {
        title: {
          text: 'ETH/USD'
        },
        navigator : {
          enabled : false
        },
        exporting: {
          enabled: false
        },
        chart : {
          events : {
            load : function () {
              var newPointInterval = 5;
              var chart = this;
              function new_point() {
                var price = bundle.Main.getPrice();
                if (price) {
                  chart.setTitle({text: "ETH/USD "+price.toFixed(2)});
                }
                setTimeout(function () {
                  new_point();
                }, newPointInterval*1000);
              }
              new_point();
            }
          }
        },
        rangeSelector: {
          buttons : [{type: 'day', count: 1, text: '1D'}, {type: 'day', count: 5, text: '5D'}, {type: 'all', count: 1, text: 'All'}],
          selected: 0,
          inputEnabled: false
        },
        series: [{name: 'ETH/USD', type: 'candlestick', data : data, tooltip: {valueDecimals: 2}}]
      });
    });
  });
});
$(function () {
    $('body').on('click', '#account_submit', function (e) {
        e.preventDefault();
        $('#account_modal').modal('hide');
        bundle.Main.addAccount($('#account_addr').val(), $('#account_pk').val());
    });
});
$(function () {
    $('body').on('click', '#new_expiration_submit', function (e) {
        e.preventDefault();
        $('#new_expiration_modal').modal('hide');
        bundle.Main.newExpiration($('#new_expiration_fromcur').val(), $('#new_expiration_tocur').val(), $('#new_expiration_date').val(),$('#new_expiration_call_strikes').val(),$('#new_expiration_put_strikes').val(),$('#new_expiration_margin').val());
    });
});
$(function () {
    $('body').on('click', '#publish_expiration_submit', function (e) {
        e.preventDefault();
        $('#publish_expiration_modal').modal('hide');
        bundle.Main.publishExpiration($('#publish_expiration_address').val());
    });
    $('body').on('click', '#disable_expiration_submit', function (e) {
        e.preventDefault();
        $('#disable_expiration_modal').modal('hide');
        bundle.Main.disableExpiration($('#disable_expiration_address').val());
    });
});
$(function () {
    $('body').on('click', '#expire_submit', function (e) {
        e.preventDefault();
        $('#expire_modal').modal('hide');
        bundle.Main.expire($('#expire_contract_addr').val());
    });
    $('#expire_modal').on('show.bs.modal', function(e) {
      $('#expire_submit').hide();
      $("#expire_message").html('<i class="fa fa-circle-o-notch fa-spin"></i>');
      var contract_addr = $(e.relatedTarget).data('contract');
      $(e.currentTarget).find('input[id="expire_contract_addr"]').val(contract_addr);
      bundle.Main.expireCheck(contract_addr, function(result){
        var ready = result[0];
        var settlement = result[1];
        if (ready) $('#expire_submit').show();
        var message = "";
        if (ready && settlement) {
          $('#expire_submit').show();
          message = "This contract is ready to expire. The settlement price is "+settlement+". Only one person needs to send the expiration transaction. If you are ready to be that person, press 'Expire.'";
        } else if (settlement) {
          message = "This contract is not ready to expire. The settlement price will be "+settlement+".";
        } else {
          message = "This contract is not ready to expire."
        }
        $("#expire_message").html(message);
      });
    });
});
$(function () {
    $('body').on('click', '#fund_submit', function (e) {
        e.preventDefault();
        $('#fund_modal').modal('hide');
        bundle.Main.fund($('#fund_amount').val(),$('#fund_contract_addr').val());
    });
    $('#fund_modal').on('show.bs.modal', function(e) {
      var contract_addr = $(e.relatedTarget).data('contract');
      $(e.currentTarget).find('input[id="fund_contract_addr"]').val(contract_addr);
    });
});
$(function () {
    $('body').on('click', '#withdraw_submit', function (e) {
        e.preventDefault();
        $('#withdraw_modal').modal('hide');
        bundle.Main.withdraw($('#withdraw_amount').val(),$('#withdraw_contract_addr').val());
    });
    $('#withdraw_modal').on('show.bs.modal', function(e) {
      var contract_addr = $(e.relatedTarget).data('contract');
      $(e.currentTarget).find('input[id="withdraw_contract_addr"]').val(contract_addr);
    });
});
function buyMargin() {
  var price = Number($('#buy_price').val());
  var size = Number($('#buy_size').val());
  var option = JSON.parse($('#buy_option').val());
  var margin = (price*size).toFixed(3);
  $('#buy_margin').html(margin+" eth");
  bundle.Main.drawOptionChart('buy_graph', option, price, size);
}
$(function () {
    $('body').on('click', '#buy_submit', function (e) {
        e.preventDefault();
        $('#buy_modal').modal('hide');
        bundle.Main.order($('#buy_option').val(), $('#buy_price').val(), $('#buy_size').val(), $('#buy_expires').val(), $('#buy_post_only').val());
    });
    $('#buy_modal').on('show.bs.modal', function(e) {
        var option = JSON.stringify($(e.relatedTarget).data('option'));
        $(e.currentTarget).find('input[id="buy_option"]').val(option);
        var order = JSON.stringify($(e.relatedTarget).data('order'));
        $(e.currentTarget).find('input[id="buy_order"]').val(order);
        var price = $(e.relatedTarget).data('price');
        $(e.currentTarget).find('input[id="buy_price"]').val(price);
        var size = $(e.relatedTarget).data('size');
        $(e.currentTarget).find('input[id="buy_size"]').val(size);
        var description = $(e.relatedTarget).data('description');
        $(e.currentTarget).find('#buy_description').html(description);
        buyMargin();
    });
});
function sellMargin() {
  var price = Number($('#sell_price').val());
  var size = Number($('#sell_size').val());
  var option = JSON.parse($('#sell_option').val());
  var margin = ((option.margin-price)*size).toFixed(3);
  $('#sell_margin').html(margin+" eth");
  bundle.Main.drawOptionChart('sell_graph', option, price, -size);
}
$(function () {
    $('body').on('click', '#sell_submit', function (e) {
        e.preventDefault();
        $('#sell_modal').modal('hide');
        bundle.Main.order($('#sell_option').val(), $('#sell_price').val(), -$('#sell_size').val(), $('#sell_expires').val(), $('#sell_post_only').val());
    });
    $('#sell_modal').on('show.bs.modal', function(e) {
        var option = JSON.stringify($(e.relatedTarget).data('option'));
        $(e.currentTarget).find('input[id="sell_option"]').val(option);
        var order = JSON.stringify($(e.relatedTarget).data('order'));
        $(e.currentTarget).find('input[id="sell_order"]').val(order);
        var price = $(e.relatedTarget).data('price');
        $(e.currentTarget).find('input[id="sell_price"]').val(price);
        var size = $(e.relatedTarget).data('size');
        $(e.currentTarget).find('input[id="sell_size"]').val(size);
        var description = $(e.relatedTarget).data('description');
        $(e.currentTarget).find('#sell_description').html(description);
        sellMargin();
    });
});
$(function() {
    $('.clickable').on('click',function(){
        var effect = $(this).data('effect');
        $(this).closest('.panel')[effect]();
    });
});
$(function() {
    $('#clear-log').click(function(){
        $('#notifications').empty();
    });
});
