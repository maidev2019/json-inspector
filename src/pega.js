/* Pega JSON Inspector — pure parsing and rule-analysis logic. No network calls. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PegaInspector = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TYPES = [
    { id: 'activity', label: 'Activities', match: /^RULE-OBJ-ACTIVITY$/ },
    { id: 'report', label: 'Report Definitions', match: /^RULE-OBJ-REPORT-DEFINITION$/ },
    { id: 'data-transform', label: 'Data Transforms', match: /^RULE-OBJ-MODEL$/ },
    { id: 'flow', label: 'Flows', match: /^RULE-OBJ-FLOW$/ },
    { id: 'flow-action', label: 'Flow Actions', match: /^RULE-OBJ-FLOWACTION$/ },
    { id: 'when', label: 'When Rules', match: /^RULE-OBJ-WHEN$/ },
    { id: 'decision-table', label: 'Decision Tables', match: /^(RULE-DECLARE-DECISIONTABLE|RULE-OBJ-DECISIONTABLE)$/ },
    { id: 'decision-tree', label: 'Decision Trees', match: /^RULE-DECLARE-DECISIONTREE$/ },
    { id: 'section', label: 'Sections', match: /^RULE-HTML-SECTION$/ },
    { id: 'property', label: 'Properties', match: /^RULE-OBJ-PROPERTY$/ },
    { id: 'validate', label: 'Validate Rules', match: /^RULE-OBJ-VALIDATE$/ },
    { id: 'class', label: 'Classes', match: /^RULE-OBJ-CLASS$/ },
    { id: 'correspondence', label: 'Correspondence', match: /^RULE-OBJ-CORR$/ },
    { id: 'function', label: 'Functions', match: /^RULE-UTILITY-FUNCTION$/ },
    { id: 'other', label: 'Other rules', match: /^RULE-/ }
  ];

  function parseInput(text) {
    if (typeof text !== 'string' || !text.trim()) return { ok: false, empty: true, message: 'Paste JSON on the left.' };
    let source = text.replace(/^\uFEFF/, '').trim();
    try {
      let data = JSON.parse(source);
      // Some copy dialogs return a JSON-encoded JSON string.
      for (let i = 0; i < 2 && typeof data === 'string'; i++) {
        const nested = data.trim();
        if (!nested.startsWith('{') && !nested.startsWith('[')) break;
        data = JSON.parse(nested);
      }
      return { ok: true, data };
    } catch (error) {
      const message = String(error && error.message ? error.message : error);
      let line = null, column = null;
      const pos = /position\s+(\d+)/i.exec(message);
      const lc = /line\s+(\d+)\s+column\s+(\d+)/i.exec(message);
      if (lc) { line = Number(lc[1]); column = Number(lc[2]); }
      else if (pos) {
        const before = source.slice(0, Number(pos[1]));
        line = before.split('\n').length;
        column = before.length - before.lastIndexOf('\n');
      }
      return { ok: false, message: 'Invalid JSON: ' + message, line, column };
    }
  }

  function field(obj, names) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return '';
    for (const name of names) {
      if (Object.prototype.hasOwnProperty.call(obj, name) && obj[name] != null && typeof obj[name] !== 'object') {
        const v = String(obj[name]).trim();
        if (v) return v;
      }
    }
    const keys = Object.keys(obj);
    for (const name of names) {
      const key = keys.find(k => k.toLowerCase() === name.toLowerCase());
      if (key && obj[key] != null && typeof obj[key] !== 'object') {
        const v = String(obj[key]).trim();
        if (v) return v;
      }
    }
    return '';
  }

  function typeFromKey(key) {
    const match = /^\s*(RULE-[A-Z0-9-]+)(?:\s|$)/i.exec(String(key || ''));
    return match ? match[1].toUpperCase() : '';
  }

  function classify(type) {
    const upper = String(type || '').toUpperCase();
    const category = TYPES.find(t => t.match.test(upper));
    return category ? category.id : 'other';
  }

  function fromKey(key, type) {
    if (!key || !type) return { name: '', appliesTo: '' };
    let tail = key.trim().slice(type.length).trim();
    tail = tail.replace(/\s+#\d{8}T[^\s]*(?:\s+GMT)?\s*$/i, '').trim();
    const tokens = tail.split(/\s+/).filter(Boolean);
    if (!tokens.length) return { name: '', appliesTo: '' };
    // Rule-Obj-* keys normally contain an Applies To class before the rule's name.
    const hasClass = /^RULE-(OBJ|HTML)-/.test(type) && type !== 'RULE-OBJ-CLASS';
    if (hasClass && tokens.length >= 2) return { name: tokens.slice(1).join(' '), appliesTo: tokens[0] };
    return { name: tokens.join(' '), appliesTo: '' };
  }

  function determineChange(path, obj, override) {
    if (override === 'new' || override === 'updated') return override;
    const explicit = field(obj, ['changeType', 'change', 'deploymentStatus', 'action', 'status']).toLowerCase();
    if (/\b(new|added|created|inserted)\b/.test(explicit)) return 'new';
    if (/\b(updated|modified|changed|existing)\b/.test(explicit)) return 'updated';
    for (let i = path.length - 1; i >= 0; i--) {
      const normalized = String(path[i]).replace(/[^a-zA-Z]/g, '').toLowerCase();
      if (/^(application|testapplication)?(newinstances|newrules|addedinstances)$/.test(normalized) || normalized === 'new') return 'new';
      if (/^(application|testapplication)?(updatedinstances|modifiedinstances|changedinstances)$/.test(normalized) || normalized === 'updated') return 'updated';
    }
    return 'unknown';
  }

  function jsonPath(parts) {
    return '$' + parts.map(p => typeof p === 'number' ? '[' + p + ']' : /^[a-z_$][\w$]*$/i.test(p) ? '.' + p : '[' + JSON.stringify(p) + ']').join('');
  }

  function asRule(item, path, override) {
    const isString = typeof item === 'string';
    if (!isString && (!item || typeof item !== 'object' || Array.isArray(item))) return null;
    const key = isString ? item.trim() : field(item, ['pzInsKey', 'pxInsKey', 'instanceKey', 'insKey', 'ruleKey']);
    const givenType = isString ? '' : field(item, ['pxObjClass', 'pyRuleType', 'ruleType', 'ruleClass', 'classType', 'type']);
    const type = (/^RULE-[A-Z0-9-]+$/i.test(givenType) ? givenType.toUpperCase() : typeFromKey(key));
    if (!type) return null;
    const parsed = fromKey(key, type);
    const name = isString ? parsed.name : (field(item, [
      'pyRuleName', 'ruleName', 'pyActivityName', 'pyReportName', 'pyReportDefinitionName',
      'pyFlowName', 'pyModelName', 'pyPropertyName', 'pyName', 'pxInsName', 'name'
    ]) || parsed.name);
    const appliesTo = isString ? parsed.appliesTo : (field(item, ['pyClassName', 'appliesTo', 'appliesToClass', 'pyAppliesTo']) || parsed.appliesTo);
    const ruleset = isString ? '' : field(item, ['pyRuleSet', 'pyRuleSetName', 'ruleSet', 'ruleset', 'rulesetName']);
    const version = isString ? '' : field(item, ['pyRuleSetVersion', 'ruleSetVersion', 'rulesetVersion', 'version']);
    return {
      id: '', type, category: classify(type), name: name || '(name not found)',
      appliesTo, ruleset, version, key, change: determineChange(path, isString ? null : item, override),
      path: jsonPath(path), original: item
    };
  }

  function analyze(data, options) {
    const opts = options || {};
    const stack = [{ item: data, path: [], depth: 0 }];
    const rules = [], seen = new Set();
    let examined = 0, dataInstances = 0;
    const MAX_NODES = 120000, MAX_DEPTH = 40;
    while (stack.length && examined < MAX_NODES) {
      const { item, path, depth } = stack.pop();
      examined++;
      const rule = asRule(item, path, opts.context || 'auto');
      if (rule) {
        const identity = rule.key
          ? rule.key.toUpperCase() + '|' + rule.change
          : [rule.type, rule.name, rule.appliesTo, rule.ruleset, rule.version, rule.change].join('|').toUpperCase();
        if (!seen.has(identity)) { rule.id = String(rules.length); rules.push(rule); seen.add(identity); }
      } else if (item && typeof item === 'object' && !Array.isArray(item)) {
        const className = field(item, ['pxObjClass']);
        if (/^DATA-/i.test(className)) dataInstances++;
      }
      if (depth >= MAX_DEPTH) continue;
      if (Array.isArray(item)) {
        for (let i = item.length - 1; i >= 0; i--) stack.push({ item: item[i], path: path.concat(i), depth: depth + 1 });
      } else if (item && typeof item === 'object') {
        const entries = Object.entries(item);
        for (let i = entries.length - 1; i >= 0; i--) {
          const [k, value] = entries[i];
          if (rule && typeof value === 'string' && /^(pzInsKey|pxInsKey|instanceKey|insKey|ruleKey)$/i.test(k)) continue;
          if (value && typeof value === 'object') stack.push({ item: value, path: path.concat(k), depth: depth + 1 });
          else if (typeof value === 'string' && typeFromKey(value) && /(?:key|instance|rule|record)/i.test(k)) {
            stack.push({ item: value, path: path.concat(k), depth: depth + 1 });
          }
        }
      }
    }
    const counts = {};
    for (const t of TYPES) counts[t.id] = 0;
    for (const rule of rules) counts[rule.category]++;
    return { rules, counts, dataInstances, examined, truncated: stack.length > 0, types: TYPES.map(({ id, label }) => ({ id, label })) };
  }

  function matches(rule, selectedTypes, search, change) {
    if (!selectedTypes.has(rule.category)) return false;
    if (change && change !== 'all' && rule.change !== change) return false;
    const query = String(search || '').trim().toLowerCase();
    if (!query) return true;
    return [rule.type, rule.name, rule.appliesTo, rule.ruleset, rule.version, rule.key, rule.path]
      .some(v => String(v).toLowerCase().includes(query));
  }

  function normalize(rule) {
    return {
      ruleType: rule.type, name: rule.name, appliesTo: rule.appliesTo,
      ruleset: rule.ruleset, version: rule.version,
      change: rule.change === 'new' ? 'New' : rule.change === 'updated' ? 'Updated' : 'Unknown',
      pzInsKey: rule.key, jsonPath: rule.path
    };
  }

  function csvEscape(v) {
    let text = String(v == null ? '' : v);
    // Prevent spreadsheet formula execution with untrusted rule names.
    if (/^[\s]*[=+@]/.test(text) || /^[\s]*-\D/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function toCsv(rules) {
    const labels = ['Rule type', 'Name', 'Applies To', 'Ruleset', 'Version', 'Change', 'pzInsKey', 'JSON path'];
    const rows = rules.map(r => { const n = normalize(r); return [n.ruleType, n.name, n.appliesTo, n.ruleset, n.version, n.change, n.pzInsKey, n.jsonPath]; });
    return '\uFEFF' + [labels, ...rows].map(row => row.map(csvEscape).join(';')).join('\r\n');
  }

  return { TYPES, parseInput, analyze, matches, normalize, toCsv, typeFromKey, classify };
});
