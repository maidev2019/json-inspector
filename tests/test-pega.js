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
