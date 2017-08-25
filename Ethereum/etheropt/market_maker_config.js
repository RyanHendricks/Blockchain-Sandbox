var config = {
  'ETH/USD': {
    vol: 1.5,
    size: 0.1,
    rollRiskWidthMultiplier: 0.065,
    deltaRetreatStepMultiplier: 4.0,
    deltaRetreatCapDivisor: 2.0,
    deltaRetreatAmountDivisor: 4.0,
    premiumWidth: 0.15,
    minWidth: 0.25,
    retreatSizeMultiplier: 1.0,
    retreatAmount: 0.15,
    minTheoRetreatDivisor: 10.0,
  },
  'XBT/USD': {
    vol: 0.5,
    size: 0.01,
    rollRiskWidthMultiplier: 0.065,
    deltaRetreatStepMultiplier: 4.0,
    deltaRetreatCapDivisor: 2.0,
    deltaRetreatAmountDivisor: 4.0,
    premiumWidth: 0.15,
    minWidth: 0.25,
    retreatSizeMultiplier: 1.0,
    retreatAmount: 0.15,
    minTheoRetreatDivisor: 10.0,
  },
};

module.exports = config;
