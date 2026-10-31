# Tornado and sensitivity chart maker

Makes a tornado chart from one of three explicitly named statistics and prints that statistic on the chart: one-at-a-time swing, Spearman rank correlation or standardised regression coefficient. Exports SVG and PNG.

- Web page: https://vladkulakovsky.com/resources/tornado-chart-maker (explanation, worked examples, FAQ)
- Version 1.0.0, 30 October 2026. Code MIT, text CC BY 4.0 (see `LICENSE`).

## Who it is for

Cost, schedule and risk analysts who need a clear, honestly labelled sensitivity chart for a report, and readers who want to see why different sensitivity measures rank inputs differently.

## Inputs

| Statistic | Input | Rules |
| --- | --- | --- |
| One-at-a-time swing | Output name and units; per input a low, base and high value of a `sum` or `product` model, or the output already calculated at each input's low and high value plus the base output | 1–50 inputs, unique names up to 60 characters, numbers only |
| Spearman rank correlation | A table of simulation results: header row, one column per input, one output column, one row per iteration | at least 3 rows; up to 50 inputs and 100,000 rows; every column must vary |
| Standardised regression coefficient | The same table | more rows than inputs + 1; refused when inputs are collinear |

CSV parsing accepts quoted headers, a byte-order mark and Windows line endings. Non-numeric cells are reported by row and column.

## Outputs

Ranked values with the statistic's name and notes (`{statistic, label, values, notes}`), an SVG chart (deterministic text; title and axis carry the statistic, R² for regression) and PNG export in the browser. The top 15 inputs are drawn; the chart says how many are hidden.

## Assumptions and limits

- Swing analysis moves one input at a time and ignores interactions and correlations.
- Spearman ρ uses average ranks for ties; it measures monotonic association, not share of the range.
- Regression standardises all columns and solves the normal equations; it adds a caution note when R² < 0.7.
- None of these is a variance decomposition such as Sobol indices. The chart describes the model or table entered, not the project.

## Data and privacy

Runs in the browser tab (or Node for tests). A CSV file you open is read locally with the File API and never uploaded. No backend, no network call, no API key.

## Files

```
src/sensitivity.mjs          engine: OAT, Spearman, SRC, CSV parser, SVG renderer (no DOM, no network)
src/browser-export.mjs       browser downloads (SVG, PNG via canvas)
src/react/TornadoChartMaker.tsx   website component (React 19, 'use client')
src/page/site-kit.mjs, tool.css   website guide copy, SEO entry, CMS record, styles
src/make-fixtures.mjs        regenerates examples/*.expected.json, *.expected.svg and linear-known.csv
examples/                    inputs, expected results and golden SVG charts
tests/sensitivity.test.mjs   Node tests
tests/independent/verify.py  independent Python check (statistics.correlation, exact Fraction regression)
preview.html                 no-build local preview
assets/icon.svg
```

## Run the checks (Windows PowerShell)

Node 22 or later and Python 3.12 or later; no packages to install.

```powershell
cd tornado-chart-maker   # from the folder that holds the tools
node --test "tests/*.test.mjs"
python -I tests/independent/verify.py
```

After an intentional change, regenerate expected files with `node src/make-fixtures.mjs`, review the SVG differences, then run both checks again.

## Examples

| Example | What it shows |
| --- | --- |
| `oat-cost-drivers` | Four additive cost drivers, base 110; swings 18, 8, 5 and 3 worked out by hand |
| `spearman-hand` | Six rows with ties; ρ = −1, 17/√297.5 and 11.5/√297.5 worked out by hand |
| `linear-known` | 2,000 rows (seed 42) from a known linear model; SRC 0.761 / 0.511 / 0.261 against theory 0.775 / 0.516 / 0.258 |
| `linear-known-spearman` | The same rows ranked by Spearman ρ (0.756 / 0.519 / 0.280) |
| `collinear-rejected` | Steel price = 2 × steel tonnes; regression must refuse and name the column |

## Method references

Saltelli et al., *Global Sensitivity Analysis: The Primer*, Wiley 2008; Spearman, *The proof and measurement of association between two things*, 1904; NIST/SEMATECH *e-Handbook of Statistical Methods*. Citation does not imply endorsement.
