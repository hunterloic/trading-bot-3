const TradeStrategy = require("./tradestrategy");
const { datediff } = require("../utils/date");

class PercentTradeStrategy extends TradeStrategy {

    /*
    {
        open: price,
        opentime: timestamp,
        amount: amount
    }

    */
    longs = new Array();
    shorts = new Array();
    firstPrice = 0;
    allMinutesToClose = new Array();

    BASE_ASSET = 100;
    totalWin = 0;

    evaluate() {
        // get last kline
        const lastKline = this.klines[this.klines.length - 1];

        // first evaluation
        if(this.longs.length == 0 && this.shorts.length == 0) {
            const trend = this.isDownOrUpTrend();
            if(trend == 1) {
                // uptrend
                this.addLong(lastKline.close * 1, lastKline.closetime);
                this.firstPrice = lastKline.close * 1;
            }
            
            if(trend == -1) {
                // downtrend
                this.addShort(lastKline.close * 1, lastKline.closetime);
                this.firstPrice = lastKline.close * 1;
            }

            return;
        }

        
        // price up evaluation
        let nextLongPrice = this.getNextLongPrice();
        if(lastKline.close * 1 >= nextLongPrice) {
            while(lastKline.close >= nextLongPrice) {
                // +2%
                if(this.longs.length >= this.shorts.length) {
                    // close all
                    this.longs.forEach((l) => {
                        this.totalWin += ((nextLongPrice * l.amount) - this.BASE_ASSET);
                    });

                    this.shorts.forEach((s) => {
                        this.totalWin += ((nextLongPrice * s.amount) - this.BASE_ASSET) * -1;
                    });
    
                    this.logTradeInfo("long", lastKline.closetime);

                    this.shorts = new Array();
                    this.longs = new Array();
                }
                
                // open long
                this.addLong(nextLongPrice, lastKline.closetime);
                this.firstPrice = lastKline.close * 1;

                // get next long price
                nextLongPrice = this.getNextLongPrice();
            }
        }

        // price down evaluation
        let nextShortPrice = this.getNextShortPrice();
        if(lastKline.close * 1 <= nextShortPrice) {
            while(lastKline.close <= nextShortPrice) {
                // -2%
                if(this.shorts.length >= this.longs.length) {
                    // close all
                    this.shorts.forEach((s) => {
                        this.totalWin += ((nextShortPrice * s.amount) - this.BASE_ASSET) * -1;
                    })

                    this.longs.forEach((l) => {
                        this.totalWin += ((nextShortPrice * l.amount) - this.BASE_ASSET);
                    })
                    
                    this.logTradeInfo("short", lastKline.closetime);

                    this.shorts = new Array();
                    this.longs = new Array();
                }
                
                // open long
                this.addShort(nextShortPrice, lastKline.closetime);
                this.firstPrice = lastKline.close * 1;

                // get next short price
                nextShortPrice = this.getNextShortPrice();
            }
        }
        //console.log(`nextLongPrice:${nextLongPrice}, nextShortPrice:${nextShortPrice}, close:${lastKline.close}, time:${lastKline.closetime}`)
    }

    getNextLongPrice() {
        let nextLongPrice = this.firstPrice;
        let lastTradePrice;
        let i = 1;

        if(this.longs.length == 0) {
            lastTradePrice = this.shorts[0].open * 1;
        } else {
            lastTradePrice = this.longs[this.longs.length - 1].open * 1;
        }

        while(nextLongPrice <= lastTradePrice) {
            nextLongPrice = this.firstPrice * Math.pow(1.02, i);
            i++;
        }
        return nextLongPrice;
    }

    getNextShortPrice() {
        let nextShortPrice = this.firstPrice;
        let lastTradePrice;
        let i = 1;

        if(this.shorts.length == 0) {
            lastTradePrice = this.longs[0].open * 1;
        } else {
            lastTradePrice = this.shorts[this.shorts.length - 1].open * 1;
        }

        while(nextShortPrice >= lastTradePrice) {
            nextShortPrice = this.firstPrice * Math.pow(0.98, i);
            i++;
        }
        return nextShortPrice;
    }

    addLong(open, opentime) {
        this.longs.push({
            open,
            opentime,
            amount: this.BASE_ASSET / open,
        });
    }

    addShort(open, opentime) {
        this.shorts.push({
            open,
            opentime,
            amount: this.BASE_ASSET / open,
        });
    }

    getLowerTradeTime() {

        let lowerTime = this.shorts.length > 0 ? this.shorts[0].opentime : this.longs[0].opentime;
        this.shorts.forEach((s) => {
            if(s.opentime < lowerTime) {
                lowerTime = s.opentime;
            }
        })

        this.longs.forEach((l) => {
            if(l.opentime < lowerTime) {
                lowerTime = l.opentime;
            }
        })

        return lowerTime;
    }

    getMinuteToClose(closetime) {
        const lowerTradeTime = this.getLowerTradeTime();
        const minutesToClose = datediff(closetime, lowerTradeTime);
        this.allMinutesToClose.push(minutesToClose);
        return minutesToClose;
    }

    getMaxMinutesToClose() {
        return Math.max( ...this.allMinutesToClose );
    }

    getAvgMinutesToClose() {
        var total = 0;
        for(var i = 0; i < this.allMinutesToClose; i++) {
            total += this.allMinutesToClose[i];
        }
        return total / this.allMinutesToClose.length;
    }

    logTradeInfo(type, closetime) {
        let minutesToClose = this.getMinuteToClose(closetime);
        console.log(
            `close all for ${type}, ` + 
            `time to close : ${Math.round(minutesToClose/60)}, ` + 
            `max : ${Math.round(this.getMaxMinutesToClose()/60)}, ` + 
            `avg : ${this.getAvgMinutesToClose()}, ` + 
            `totalwin : ${this.totalWin}, ` +
            `time : ${closetime}`);
    }
    
}

module.exports = PercentTradeStrategy