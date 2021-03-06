const EventEmmiter = require('events');
const Wallet = require('../wallet/wallet');
const { MACD, EMA, RSI } = require("talib-binding");

const MAX_HISTORY = 400;

class TradeStrategy extends EventEmmiter {

    #klines = new Array();
    wallet = null;

    constructor() {
        super();
        if (this.constructor === TradeStrategy) {
            throw new TypeError('Abstract class "TradeStrategy" cannot be instantiated directly');
        }
        this.klines = new Array();
        this.wallet = new Wallet();

        // -- Events Start
      
        this.on("openLong", this.wallet.openLong);
    
        this.on("closeLong" , this.wallet.closeLong);
    
        this.on("openShort" , this.wallet.openShort);
    
        this.on("closeShort" , this.wallet.closeShort);
  
        // -- Events End
    }

    init(klines) {
        this.klines = klines;
    }

    addKline(kline) {
        this.klines.push(kline);

        if(this.klines.length > MAX_HISTORY) {
            this.klines.shift();
            this.evaluate();
        }
    }

    isDownOrUpTrend() {
        // get last kline
        const lastKline = this.klines[this.klines.length - 1];
        
        // get close values
        const close = new Array();
        for(let i = 0; i < this.klines.length; i++) {
            close.push(this.klines[i].close);
        }

        // get indicators
        const ema200 = EMA(close, 200);
        const lastEma2000 = ema200[ema200.length -1];

        if(lastKline.close > lastEma2000 && lastKline.open > lastEma2000) {
            //uptrend
            return 1;
        }
            
        if(lastKline.close < lastEma2000 && lastKline.open < lastEma2000) {
            // downtrend
            return -1;
        }

        return 0;

    }
}

module.exports = TradeStrategy;