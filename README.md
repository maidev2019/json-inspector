# Pega JSON Inspector – Deployment Rule Analyzer

An English-language JSON formatter with rule-type filters for **Pega Deployment Manager**. It is a **static GitHub Pages-ready web app** (plain HTML, CSS and JavaScript), with no backend, build process, third-party dependencies or runtime API calls.

## Publish on GitHub Pages

1. Create a GitHub repository, for example `pega-json-inspector`.
2. Upload the **contents** of this project ZIP to the **root** of the repository. Important: `index.html` must be at the repository root, next to the `src/` folder.
3. Commit the files to the `main` branch.
4. Open **Settings → Pages → Build and deployment** and select **Deploy from a branch**.
5. Choose branch **main**, folder **/(root)**, then **Save**.
6. Once GitHub Pages has deployed the site, open `https://YOUR-USERNAME.github.io/pega-json-inspector/` (or your configured repository Pages URL).

You can also preview locally by opening `index.html` with a browser without running a development server. Alternatively, open `pega-json-inspector-standalone.html`, which includes the app in a single file.

## Pega Deployment Manager workflow

1. Open a pipeline, such as DEV → STAGE or STAGE → PROD.
2. Go to **Deployment Report → Timeline → Deploy application → View output parameters**.
3. Select **View** next to **Application new instances** or **Application updated instances**, then copy the JSON.
4. Paste the JSON into the editor on the left. The right editor formats it; the rule analysis and checkbox filters appear below.
5. For a single copied View list, set **Pega list type** to **New instances** or **Updated instances** if not automatically identifiable.
6. Click **Focus: Activities + Reports** to narrow results to those types, or customize the type checkboxes.
7. Search and export results as JSON or CSV.

### Original-data guarantee (v1.2)

- **Full JSON** formats the parsed input only: no generated JSON keys or fields.
- **Filtered rules** keeps the original rule records and existing container keys, removing only entries/branches that do not match the selected filters. No `change`, `jsonPath`, `ruleType`, `name`, or other synthetic fields are injected. Original record fields, order, and duplicate entries are preserved.
- When no rule matches, the filtered view is an empty array (`[]`) or object (`{}`), matching the original root container type.
- The **analysis table** and its CSV overview can show *derived columns* (e.g. rule category, inferred change status, JSON path) for inspection; these values are never written into JSON data or the JSON exports. The CSV is an analysis report, not a lossless copy of the input.
- Formatting changes whitespace and indentation but not the original JSON properties or values. Filtering necessarily removes non-matching content.


## Supported structures

- Arrays of rule objects, for example with `pxObjClass`, `pyRuleName`, `pyClassName`, `pyRuleSet`, `pyRuleSetVersion`, `pzInsKey`.
- Arrays of `pzInsKey` strings beginning with `RULE-`.
- Nested containers such as `applicationNewInstances` and `applicationUpdatedInstances`.
- JSON encoded as a JSON string (double-encoded JSON).
- Rule types including Activities, Report Definitions, Data Transforms, Flows, Flow Actions, When, Decision Tables/Trees, Sections, Properties, Validate rules, Classes and other rules.
- Automatic or manually selected classification as new or updated.

**Important:** The number of detected, deduplicated rules may differ from Pega’s **Application records moved count**, which can include non-rule records.

## Security and privacy

All formatting, parsing and searching happen in your browser. The app does not upload deployment JSON to a server, call Pega APIs, or persist JSON in storage. When hosted via GitHub Pages, browsers retrieve the static site files from GitHub; pasted JSON remains local to the browser unless you intentionally copy/export it. Avoid committing real deployment JSON to the public repository. Confirm your organization's policy before using deployment data on public Pages domains.

## Project layout

```text
index.html                          GitHub Pages entry point
src/styles.css                      Styling and responsive layout
src/pega.js                         Parser, Pega rule detection, CSV export
src/app.js                          UI controls and event handlers
src/sample.js                       Synthetic sample (no real data)
tests/test-pega.js                  Node.js parser test suite
pega-json-inspector-standalone.html All-in-one file, usable offline
```

## Tests

Run `node tests/test-pega.js` (Node.js 18+ recommended).

## Limitations

Field names depend on your Pega version and Deployment Manager output. Parser support is based on common Pega structures, but has **not yet been validated against an anonymized real-world View export**. The parser is designed to be adjustable in `src/pega.js`. This tool is read-only and has no live Pega connection.
