window.PEGA_SAMPLE = {
  deployment: { from: 'DEV', to: 'STAGE', application: 'DemoPricing', version: '01.01.01', note: 'Synthetic sample data – not real deployment records.' },
  applicationNewInstances: [
    { pxObjClass: 'Rule-Obj-Activity', pyRuleName: 'CalculatePremium', pyClassName: 'Demo-Pricing-Work', pyRuleSet: 'DemoPricing', pyRuleSetVersion: '01-01-01', pzInsKey: 'RULE-OBJ-ACTIVITY DEMO-PRICING-WORK CALCULATEPREMIUM #20260805T092200.000 GMT' },
    { pxObjClass: 'Rule-Obj-Report-Definition', pyRuleName: 'OpenPriceRequests', pyClassName: 'Demo-Pricing-Work', pyRuleSet: 'DemoPricing', pyRuleSetVersion: '01-01-01' },
    { pxObjClass: 'Rule-Obj-Model', pyRuleName: 'SetDefaultPrice', pyClassName: 'Demo-Pricing-Work', pyRuleSet: 'DemoPricing', pyRuleSetVersion: '01-01-01' },
    { pxObjClass: 'Rule-Obj-Flow', pyRuleName: 'PricingApproval', pyClassName: 'Demo-Pricing-Work', pyRuleSet: 'DemoPricing', pyRuleSetVersion: '01-01-01' },
    { pxObjClass: 'Rule-HTML-Section', pyRuleName: 'PriceSummary', pyClassName: 'Demo-Pricing-Work', pyRuleSet: 'DemoPricing', pyRuleSetVersion: '01-01-01' },
    { pxObjClass: 'Rule-Obj-Property', pyRuleName: 'PriceAmount', pyClassName: 'Demo-Pricing-Work', pyRuleSet: 'DemoPricing', pyRuleSetVersion: '01-01-01' },
    { pxObjClass: 'Rule-Declare-DecisionTable', pyRuleName: 'RateMatrix', pyClassName: 'Demo-Pricing-Work', pyRuleSet: 'DemoPricing', pyRuleSetVersion: '01-01-01' },
    { pxObjClass: 'Data-Admin-Operator-ID', pyUserIdentifier: 'example@example.invalid' }
  ],
  applicationUpdatedInstances: [
    { pxObjClass: 'Rule-Obj-Activity', pyRuleName: 'ValidateRate', pyClassName: 'Demo-Pricing-Work', pyRuleSet: 'DemoPricing', pyRuleSetVersion: '01-01-01' },
    { pxObjClass: 'Rule-Obj-Report-Definition', pyRuleName: 'CurrentRates', pyClassName: 'Demo-Pricing-Data', pyRuleSet: 'DemoPricing', pyRuleSetVersion: '01-01-01' },
    { pxObjClass: 'Rule-Obj-When', pyRuleName: 'CanChangeRate', pyClassName: 'Demo-Pricing-Work', pyRuleSet: 'DemoPricing', pyRuleSetVersion: '01-01-01' },
    'RULE-OBJ-ACTIVITY DEMO-PRICING-WORK REFRESHPREMIUM #20260805T092400.000 GMT'
  ]
};
