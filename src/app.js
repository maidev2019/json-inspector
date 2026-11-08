(function () {
  'use strict';
  const P = window.PegaInspector;
  const $ = id => document.getElementById(id);
  const state = {
    parsed: null, analysis: { rules: [], counts: {}, truncated: false },
    selected: new Set(P.TYPES.map(t => t.id)), search: '', changeFilter: 'all',
    outputTab: 'full', compact: false, activeRule: null, outputText: '',
    debounce: null, toastTimeout: null
  };

  function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(state.toastTimeout);
    state.toastTimeout = setTimeout(() => el.classList.remove('show'), 2400);
  }

  function setStatus(message, type) {
    const el = $('validationStatus');
    el.className = 'validation-status ' + (type || 'neutral');
    const marker = type === 'valid' ? '✓' : type === 'invalid' ? '✕' : '●';
    el.textContent = marker + ' ' + message;
  }

  function updateLineNumbers() {
    const textarea = $('rawJson');
    const lines = textarea.value.split('\n').length;
    $('inputStats').textContent = textarea.value.length.toLocaleString('en-US') + ' characters · ' + lines.toLocaleString('en-US') + ' lines';
    const gutter = $('lineNumbers');
    const count = Math.min(lines, 3000);
    // A large source would otherwise create an enormous gutter.
    gutter.textContent = Array.from({ length: count }, (_, i) => i + 1).join('\n');
    gutter.scrollTop = textarea.scrollTop;
  }

  function inputChanged() {
    updateLineNumbers();
    clearTimeout(state.debounce);
    state.debounce = setTimeout(() => processInput(false), 180);
  }

  function indent() { return $('indentSelect').value === 'tab' ? '\t' : Number($('indentSelect').value); }

  function processInput(announce) {
    const text = $('rawJson').value;
    state.parsed = P.parseInput(text);
    if (!state.parsed.ok) {
      state.analysis = { rules: [], counts: {}, truncated: false };
      if (state.parsed.empty) { setStatus('Ready for JSON', 'neutral'); }
      else setStatus(state.parsed.message, 'invalid');
    } else {
      state.analysis = P.analyze(state.parsed.data, { context: $('contextSelect').value });
      setStatus('Valid JSON · ' + state.analysis.rules.length + ' Pega rules found', 'valid');
      if (announce) toast('JSON is valid. ' + state.analysis.rules.length + ' rules found.');
    }
    updateSummary();
    renderFilters();
    renderTable();
    renderOutput();
  }

  function filteredRules() {
    return state.analysis.rules.filter(r => P.matches(r, state.selected, state.search, state.changeFilter));
  }

  function updateSummary() {
    const rules = state.analysis.rules;
    $('totalRules').textContent = rules.length.toLocaleString('en-US');
    $('activityCount').textContent = (state.analysis.counts.activity || 0).toLocaleString('en-US');
    $('reportCount').textContent = (state.analysis.counts.report || 0).toLocaleString('en-US');
    const fresh = rules.filter(r => r.change === 'new').length;
    const changed = rules.filter(r => r.change === 'updated').length;
    $('changeCounts').textContent = fresh + ' / ' + changed;
    const notice = $('analysisNotice');
    if (state.analysis.truncated) {
      notice.hidden = false;
      notice.textContent = 'This JSON is very large. Rule detection stopped after 120,000 nodes to keep the browser responsive. JSON formatting remains available.';
    } else if (state.parsed && state.parsed.ok && !rules.length) {
      notice.hidden = false;
      notice.textContent = 'The JSON is valid but no rule instances were detected. Supported patterns include pxObjClass, pzInsKey and lists of RULE-… keys. If your Pega export uses different fields, detection can be updated using an anonymized sample.';
    } else { notice.hidden = true; notice.textContent = ''; }
  }

  function renderFilters() {
    const container = $('typeFilters');
    container.replaceChildren();
    for (const type of P.TYPES) {
      const label = document.createElement('label');
      label.className = 'filter-chip';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = state.selected.has(type.id);
      checkbox.setAttribute('aria-label', type.label);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) state.selected.add(type.id); else state.selected.delete(type.id);
        refreshFiltered();
      });
      const name = document.createElement('span');
      name.textContent = type.label;
      const count = document.createElement('span');
      count.className = 'chip-count';
      count.textContent = String(state.analysis.counts[type.id] || 0);
      label.append(checkbox, name, count);
      container.append(label);
    }
  }

  function refreshFiltered() {
    $('filteredTabCount').textContent = filteredRules().length.toLocaleString('en-US');
    renderTable();
    if (state.outputTab === 'filtered') renderOutput();
  }

  function cell(text, className) {
    const el = document.createElement('td');
    el.textContent = text;
    if (className) el.className = className;
    return el;
  }

  function renderTable() {
    const rows = filteredRules();
    $('filteredTabCount').textContent = rows.length.toLocaleString('en-US');
    const tbody = $('rulesBody');
    tbody.replaceChildren();
    if (!rows.length) {
      const tr = document.createElement('tr');
      const td = cell(state.analysis.rules.length ? 'No rules match the selected filters.' : 'Paste JSON to see the deployed rules.', 'empty-table');
      td.colSpan = 7;
      tr.append(td); tbody.append(tr);
    } else {
      const fragment = document.createDocumentFragment();
      // Keep the UI responsive for very large deployments. CSV still exports every matched rule.
      for (const rule of rows.slice(0, 1500)) {
        const tr = document.createElement('tr');
        tr.className = 'rule-row';
        const typ = document.createElement('td');
        const pill = document.createElement('span');
        pill.className = 'type-pill' + (['activity', 'report'].includes(rule.category) ? ' priority' : '');
        pill.textContent = labelFor(rule.category);
        pill.title = rule.type;
        typ.append(pill);
        tr.append(typ, cell(rule.name, 'rule-name'), cell(rule.appliesTo || '–'), cell(rule.ruleset || '–'), cell(rule.version || '–'));
        const change = document.createElement('td');
        const changePill = document.createElement('span');
        changePill.className = 'status-pill ' + rule.change;
        changePill.textContent = rule.change === 'new' ? 'New' : rule.change === 'updated' ? 'Updated' : 'Unknown';
        change.append(changePill);
        tr.append(change);
        const details = document.createElement('td');
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'detail-button'; btn.textContent = 'View';
        btn.setAttribute('aria-label', 'View details for ' + rule.name);
        btn.addEventListener('click', () => openDetail(rule));
        details.append(btn); tr.append(details); fragment.append(tr);
      }
      tbody.append(fragment);
    }
    const capped = rows.length > 1500 ? ' (first 1,500 shown; export includes all)' : '';
    $('tableSummary').textContent = rows.length.toLocaleString('en-US') + ' of ' + state.analysis.rules.length.toLocaleString('en-US') + ' rules selected' + capped;
    $('csvBtn').disabled = !rows.length;
  }

  function labelFor(id) { const t = P.TYPES.find(t => t.id === id); return t ? t.label : id; }

  function highlighter(text) {
    // Escape before applying markup; do not insert user input as HTML.
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return escaped.replace(/("(?:\\.|[^"\\])*"\s*:?)|\b(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|\b(true|false|null)\b/g, function (match, string, num, literal) {
      if (string) return '<span class="' + (string.trimEnd().endsWith(':') ? 'json-key' : 'json-string') + '">' + string + '</span>';
      if (num) return '<span class="json-num">' + match + '</span>';
      if (literal) return '<span class="' + (literal === 'null' ? 'json-null' : 'json-bool') + '">' + match + '</span>';
      return match;
    });
  }

  function renderOutput() {
    const pre = $('formattedJson');
    const isFiltered = state.outputTab === 'filtered';
    $('fullTab').classList.toggle('active', !isFiltered);
    $('filteredTab').classList.toggle('active', isFiltered);
    $('fullTab').setAttribute('aria-selected', String(!isFiltered));
    $('filteredTab').setAttribute('aria-selected', String(isFiltered));
    if (!state.parsed || !state.parsed.ok) {
      state.outputText = state.parsed && !state.parsed.empty ? '// Enter valid JSON.\n// ' + state.parsed.message : '{\n  "hint": "Paste JSON on the left or load the sample"\n}';
    } else {
      const data = isFiltered ? filteredRules().map(P.normalize) : state.parsed.data;
      state.outputText = JSON.stringify(data, null, state.compact ? 0 : indent());
    }
    $('codePane').scrollTop = 0;
    $('codePane').scrollLeft = 0;
    // Syntax highlighting is disabled for very large JSON to avoid locking the browser.
    if (state.outputText.length <= 220000) pre.innerHTML = highlighter(state.outputText);
    else pre.textContent = state.outputText;
    $('outputStats').textContent = state.outputText.length.toLocaleString('en-US') + ' characters · ' + state.outputText.split('\n').length.toLocaleString('en-US') + ' lines';
    $('outputMode').textContent = isFiltered ? 'Filtered rules · JSON' : state.compact ? 'Compact · JSON' : 'Formatted · JSON';
    $('copyBtn').disabled = !state.parsed || !state.parsed.ok;
    $('copyOutputIcon').disabled = !state.parsed || !state.parsed.ok;
    $('downloadBtn').disabled = !state.parsed || !state.parsed.ok;
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const temp = document.createElement('textarea');
        temp.value = text; temp.style.position = 'fixed'; temp.style.opacity = '0';
        document.body.append(temp); temp.select();
        const success = document.execCommand('copy'); temp.remove();
        if (!success) throw new Error('copy failed');
      }
      toast('Copied to clipboard.');
    } catch (error) { toast('Unable to copy. Please select the text and copy it manually.'); }
  }

  function download(text, filename, type) {
    const blob = new Blob([text], { type: type || 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function setInput(text) {
    $('rawJson').value = text;
    updateLineNumbers();
    processInput(false);
  }

  function setSelection(mode) {
    if (mode === 'all') state.selected = new Set(P.TYPES.map(t => t.id));
    else if (mode === 'none') state.selected = new Set();
    else if (mode === 'focus') state.selected = new Set(['activity', 'report']);
    renderFilters(); refreshFiltered();
    if (mode === 'focus') toast('Focus filter: Activities + Report Definitions');
  }

  function openDetail(rule) {
    state.activeRule = rule;
    $('detailTitle').textContent = rule.name;
    const fields = [['Rule type', rule.type], ['Applies To', rule.appliesTo || '–'], ['Ruleset', rule.ruleset || '–'], ['Version', rule.version || '–'], ['Change', rule.change === 'new' ? 'New' : rule.change === 'updated' ? 'Updated' : 'Unknown'], ['JSON path', rule.path], ['pzInsKey', rule.key || 'Not available']];
    const grid = $('detailFields'); grid.replaceChildren();
    for (const [label, value] of fields) {
      const wrapper = document.createElement('div');
      const dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = label; dd.textContent = value; wrapper.append(dt, dd); grid.append(wrapper);
    }
    $('detailJson').textContent = JSON.stringify(rule.original, null, 2);
    $('copyKeyBtn').disabled = !rule.key;
    $('detailDialog').showModal();
  }

  function fileDropped(file) {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { toast('File exceeds 15 MB. Please choose a smaller JSON file.'); return; }
    const reader = new FileReader();
    reader.onload = () => { setInput(String(reader.result || '')); toast('File loaded: ' + file.name); };
    reader.onerror = () => toast('The file could not be read.');
    reader.readAsText(file, 'utf-8');
  }

  function init() {
    $('rawJson').addEventListener('input', inputChanged);
    $('rawJson').addEventListener('scroll', () => { $('lineNumbers').scrollTop = $('rawJson').scrollTop; });
    $('rawJson').addEventListener('keydown', e => {
      if (e.key === 'Tab') { e.preventDefault(); const t = e.currentTarget; const a = t.selectionStart, b = t.selectionEnd; t.setRangeText('  ', a, b, 'end'); inputChanged(); }
    });
    $('formatBtn').addEventListener('click', () => { state.compact = false; processInput(false); if (state.parsed.ok) toast('JSON formatted.'); });
    $('validateBtn').addEventListener('click', () => { processInput(true); if (!state.parsed.ok) toast(state.parsed.message); });
    $('minifyBtn').addEventListener('click', () => { state.compact = true; processInput(false); if (state.parsed.ok) toast('JSON minified.'); });
    $('indentSelect').addEventListener('change', renderOutput);
    $('contextSelect').addEventListener('change', () => processInput(false));
    $('fullTab').addEventListener('click', () => { state.outputTab = 'full'; renderOutput(); });
    $('filteredTab').addEventListener('click', () => { state.outputTab = 'filtered'; renderOutput(); });
    $('copyBtn').addEventListener('click', () => { if (state.parsed && state.parsed.ok) copyText(state.outputText); });
    $('copyOutputIcon').addEventListener('click', () => { if (state.parsed && state.parsed.ok) copyText(state.outputText); });
    $('downloadBtn').addEventListener('click', () => {
      if (state.parsed && state.parsed.ok) download(state.outputText, state.outputTab === 'filtered' ? 'pega-filtered-rules.json' : 'pega-formatted.json');
    });
    $('csvBtn').addEventListener('click', () => {
      const rows = filteredRules();
      if (!rows.length) return;
      download(P.toCsv(rows), 'pega-deployment-rules.csv', 'text/csv;charset=utf-8');
      toast(rows.length + ' rules exported as CSV.');
    });
    $('focusBtn').addEventListener('click', () => setSelection('focus'));
    $('selectAllBtn').addEventListener('click', () => setSelection('all'));
    $('deselectAllBtn').addEventListener('click', () => setSelection('none'));
    $('ruleSearch').addEventListener('input', e => { state.search = e.target.value; refreshFiltered(); });
    $('changeFilter').addEventListener('change', e => { state.changeFilter = e.target.value; refreshFiltered(); });
    $('sampleBtn').addEventListener('click', () => { state.compact = false; state.outputTab = 'full'; $('contextSelect').value = 'auto'; setSelection('all'); setInput(JSON.stringify(window.PEGA_SAMPLE)); toast('Synthetic Pega sample loaded.'); });
    $('clearBtn').addEventListener('click', () => { $('fileInput').value = ''; $('ruleSearch').value = ''; state.search = ''; $('changeFilter').value = 'all'; state.changeFilter = 'all'; state.compact = false; setInput(''); $('rawJson').focus(); });
    $('fileInput').addEventListener('change', e => fileDropped(e.target.files[0]));
    $('pasteBtn').addEventListener('click', async () => {
      try {
        if (!navigator.clipboard || !window.isSecureContext) throw new Error('clipboard permission unavailable');
        setInput(await navigator.clipboard.readText()); toast('JSON pasted.');
      } catch (e) { $('rawJson').focus(); toast('Use Ctrl+V / Cmd+V to paste into the left editor.'); }
    });
    const target = $('dropTarget');
    target.addEventListener('dragover', e => { e.preventDefault(); target.classList.add('dragover'); });
    target.addEventListener('dragleave', e => { if (!target.contains(e.relatedTarget)) target.classList.remove('dragover'); });
    target.addEventListener('drop', e => { e.preventDefault(); target.classList.remove('dragover'); fileDropped(e.dataTransfer.files[0]); });
    $('closeDialogBtn').addEventListener('click', () => $('detailDialog').close());
    $('closeDialogBottomBtn').addEventListener('click', () => $('detailDialog').close());
    $('copyKeyBtn').addEventListener('click', () => { if (state.activeRule && state.activeRule.key) copyText(state.activeRule.key); });
    $('detailDialog').addEventListener('click', e => { if (e.target === $('detailDialog')) $('detailDialog').close(); });
    renderFilters(); renderTable(); renderOutput(); updateLineNumbers();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
