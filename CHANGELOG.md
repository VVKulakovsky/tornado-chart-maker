# Changelog: tornado and sensitivity chart maker

Versions follow semantic versioning. Any change that alters a fixture result or golden SVG is at least a minor version and is listed here.

## 1.0.0 (2026-10-30)

- Statistics: one-at-a-time swing (sum or product model, or given outputs), Spearman rank correlation with average ranks, standardised regression coefficients with R² and collinearity refusal.
- CSV parser with quoted headers, byte-order mark, size limits and cell-level errors.
- Deterministic SVG renderer naming the statistic in title and axis; escaped text; top 15 shown with a hidden-count note; PNG export in the browser.
- Examples with hand-worked and theoretical values, golden SVGs; independent Python check using statistics.correlation and exact Fraction regression.
- Website React component, guide copy and styles.
