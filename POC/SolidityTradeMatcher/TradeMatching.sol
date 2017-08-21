contract TradeMatching{
    

    // Trades to be matched
    struct Trade{
        address sender;
        bytes32 senderid;
        address seller;
        address buyer;
        bytes12 seccode;
        uint32 tradedate; //YYYYMMDD
        uint32 deliverydate; //YYYYMMDD
        uint quantity;
        uint32 price;
        int deliveryamount;
        uint matchedtrade;
    }
    
    // The storage to save all trades
    uint numTrades = 1; //start with 1 to make clear 0=null
    mapping(uint => Trade) trademap;
    
    // data structure to link trades by Date
    mapping(uint32 => mapping(uint => uint)) tradesByDate;
    mapping(uint32 => uint) tradesByDateCounter;
    
    // The function
    function addTrade(bytes32 senderid, address seller, address buyer,  bytes12 seccode, uint32 tradedate, uint32 deliverydate, uint quantity, uint32 price, int deliveryamount){
        uint tradeID = numTrades++;
        trademap[tradeID] = Trade(msg.sender,senderid, seller,buyer,seccode,tradedate,deliverydate,quantity,price, deliveryamount,0);
        
        // store tradeID to tradesByDate
        uint count = tradesByDateCounter[tradedate];
        tradesByDate[tradedate][count] = tradeID;
        tradesByDateCounter[tradedate] = count + 1;
        
        /* here starts "matching" part! */
        
        // for the rest of the trade date's trades,
        uint matchingTradeID;
        
        while(count > 0){
            count--;
            matchingTradeID = tradesByDate[tradedate][count];
            Trade t = trademap[matchingTradeID];
            if(t.sender == msg.sender || t.matchedtrade != 0) continue;
            if(t.seller == seller && t.buyer == buyer && t.seccode == seccode && t.tradedate == tradedate && t.deliverydate == deliverydate && t.quantity == quantity && t.price == price){
                trademap[matchingTradeID].matchedtrade = tradeID;
                trademap[tradeID].matchedtrade = matchingTradeID;
                break;
            }
        }
    }
    
    // getter
    function getTrade(uint tradeID) constant returns (address sender, bytes32 senderid, address seller, address buyer,  bytes12 seccode, uint32 tradedate, uint32 deliverydate, uint quantity, uint32 price, int deliveryamount, uint matchedtrade){
        Trade t = trademap[tradeID];
        sender = t.sender;
        senderid = t.senderid;
        seller = t.seller;
        buyer = t.buyer;
        seccode = t.seccode;
        tradedate = t.tradedate;
        deliverydate = t.deliverydate;
        quantity = t.quantity;
        price = t.price;
        deliveryamount = t.deliveryamount;
        matchedtrade = t.matchedtrade;
    }
    
    
    function getTradeIdByTradedate(uint32 tradedate,uint count) constant returns (uint tradeID){
        tradeID = tradesByDate[tradedate][count];
    }
}

