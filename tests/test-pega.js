const assert = require('node:assert/strict');
const P = require('../src/pega.js');
const sample = {
  applicationNewInstances: [
    { pxObjClass:'Rule-Obj-Activity', pyRuleName:'CalculatePremium', pyClassName:'Demo-Work', pyRuleSet:'Demo', pyRuleSetVersion:'01-01-01', pzInsKey:'RULE-OBJ-ACTIVITY DEMO-WORK CALCULATEPREMIUM #20260805T092200.000 GMT' },
    { pxObjClass:'Rule-Obj-Report-Definition', pyRuleName:'MyReport', pyClassName:'Demo-Work' },
    'RULE-OBJ-FLOW DEMO-WORK APPROVE #20260805T092200.000 GMT',
    { pxObjClass:'Data-Admin-Operator-ID', pyName:'demo' }
  ],
  applicationUpdatedInstances: [
    {pxObjClass:'Rule-Obj-Model', pyRuleName:'SetValues', pyClassName:'Demo-Work'},
    {pzInsKey:'RULE-OBJ-ACTIVITY DEMO-WORK CHECKPRICE #20260805T092300.000 GMT'},
    {pzInsKey:'RULE-OBJ-ACTIVITY DEMO-WORK CHECKPRICE #20260805T092300.000 GMT'}
  ]
};
const parsed = P.parseInput(JSON.stringify(sample));
assert.ok(parsed.ok);
const a = P.analyze(parsed.data);
assert.equal(a.rules.length, 5);
assert.equal(a.counts.activity, 2);
assert.equal(a.counts.report, 1);
assert.equal(a.counts.flow, 1);
assert.equal(a.counts['data-transform'], 1);
assert.equal(a.dataInstances, 1);
assert.equal(a.rules.filter(r=>r.change==='new').length,3);
assert.equal(a.rules.filter(r=>r.change==='updated').length,2);
assert.ok(a.rules.some(r=>r.name==='CHECKPRICE' && r.appliesTo==='DEMO-WORK'));
assert.equal(P.analyze(sample.applicationUpdatedInstances,{context:'new'}).rules.every(r=>r.change==='new'),true);
assert.equal(P.parseInput('bad JSON').ok,false);
assert.equal(P.parseInput('"[{\\"pxObjClass\\":\\"Rule-Obj-Activity\\",\\"pyRuleName\\":\\"Demo\\"}]"').ok,true);
assert.equal(P.analyze([]).rules.length,0);
assert.ok(P.toCsv(a.rules).startsWith('\uFEFF'));
assert.equal(P.matches(a.rules[0],new Set(['activity']), '', 'all'),true);
assert.equal(P.matches(a.rules[0],new Set(['report']), '', 'all'),false);
assert.equal(P.analyze(['RULE-OBJ-REPORT-DEFINITION TEST-WORK PRICINGREPORT #20260805T092300.000 GMT']).rules[0].name,'PRICINGREPORT');
const csv = P.toCsv([{type:'RULE-OBJ-ACTIVITY',name:'=SUM(A1)',appliesTo:'',ruleset:'',version:'',change:'unknown',key:'',path:'$[0]'}]);
assert.ok(csv.includes("'=SUM(A1)"));
console.log('✓ All parser tests passed.');

// v1.2: Filtered JSON may remove entries, but MUST NOT synthesize properties.
const original = {
  deployment: { from: 'DEV', to: 'STAGE' },
  applicationNewInstances: [
    { pxObjClass: 'Rule-Obj-Activity', pyRuleName: 'CheckRate', pxCustomField: { steps: [1, 2, 3] } },
    { pxObjClass: 'Rule-Obj-Report-Definition', pyRuleName: 'RateReport', flag: false },
    { pxObjClass: 'Rule-Obj-Activity', pyRuleName: 'CheckRate', pxCustomField: { steps: [1, 2, 3] } },
    { pxObjClass: 'Data-Admin-Operator-ID', pyName: 'demo' }
  ],
  applicationUpdatedInstances: [
    { pxObjClass: 'Rule-Obj-Model', pyRuleName: 'SetDefaults', customValue: null },
    'RULE-OBJ-ACTIVITY DEMO-WORK UPDATEPRICE #20260805T092400.000 GMT'
  ]
};
const before = JSON.stringify(original);
const types = new Set(['activity', 'report']);
const result = P.filterOriginalData(original, types, '', 'all');
const expected = {
  applicationNewInstances: original.applicationNewInstances.slice(0, 3),
  applicationUpdatedInstances: [original.applicationUpdatedInstances[1]]
};
assert.deepEqual(result, expected, 'filtered view must contain original unmodified rules and original container keys');
assert.equal(JSON.stringify(original), before, 'filter must never mutate its input');
assert.deepEqual(P.filterOriginalData(original, new Set(['report']), '', 'all'), {
  applicationNewInstances: [original.applicationNewInstances[1]]
});
assert.deepEqual(P.filterOriginalData(original, new Set(['activity']), 'UPDATEPRICE', 'updated'), {
  applicationUpdatedInstances: [original.applicationUpdatedInstances[1]]
});
assert.deepEqual(P.filterOriginalData(original, new Set(['activity']), '', 'new', {context:'new'}), {
  applicationNewInstances: [original.applicationNewInstances[0], original.applicationNewInstances[2]],
  applicationUpdatedInstances: [original.applicationUpdatedInstances[1]]
});
assert.deepEqual(P.filterOriginalData(original, new Set(), '', 'all'), {});
assert.deepEqual(P.filterOriginalData(original.applicationNewInstances, new Set(), '', 'all'), []);
assert.deepEqual(P.filterOriginalData(original.applicationNewInstances[0], new Set(['activity']), '', 'all'), original.applicationNewInstances[0]);
assert.deepEqual(P.filterOriginalData(original.applicationNewInstances[0], new Set(['report']), '', 'all'), {});
assert.deepEqual(P.filterOriginalData(['RULE-OBJ-ACTIVITY DEMO-WORK VALIDATE'], new Set(['activity']), '', 'all'), ['RULE-OBJ-ACTIVITY DEMO-WORK VALIDATE']);
assert.deepEqual(P.filterOriginalData({ nested: { items: [{ pxObjClass: 'Rule-Obj-Activity', pyRuleName:'CheckRate', extra: true }] } }, new Set(['activity']), '', 'all'), { nested: { items: [{ pxObjClass: 'Rule-Obj-Activity', pyRuleName:'CheckRate', extra: true }] } });
assert.deepEqual(P.filterOriginalData({ nested: { items: [{ pxObjClass: 'Rule-Obj-Activity', pyRuleName:'CheckRate' }] } }, new Set(['report']), '', 'all'), {});
console.log('✓ Original-data preservation and filtering tests passed.');
