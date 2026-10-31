"""Independent check of the tornado chart maker. MIT licence.

Python standard library only, sharing no code with the JavaScript engine:
- Spearman coefficients from statistics.correlation(method="ranked");
- standardised regression coefficients by exact rational arithmetic (fractions.Fraction) on the small fixtures
  and by a separately written float solver on the 2,000-row example;
- one-at-a-time swings recomputed from the model.
Run: python -I tests/independent/verify.py   (exit code 0 = all checks passed)
"""
import csv
import json
import math
import pathlib
import statistics
import sys
from fractions import Fraction

HERE = pathlib.Path(__file__).resolve()
EX = HERE.parents[2] / "examples"
ENGINE = HERE.parents[2] / "src" / "sensitivity.mjs"
failures = []


def check(ok, message):
    print(("PASS " if ok else "FAIL ") + message)
    if not ok:
        failures.append(message)


def load(name):
    return json.loads((EX / f"{name}.input.json").read_text("utf8")), json.loads((EX / f"{name}.expected.json").read_text("utf8"))


def table(inp):
    if "csv" in inp:
        with open(EX / inp["csv"], newline="", encoding="utf8") as f:
            rows = list(csv.reader(f))
        return rows[0], [[float(c) for c in r] for r in rows[1:]]
    return inp["table"]["columns"], inp["table"]["rows"]


def src(columns, rows, output, exact):
    k = columns.index(output)
    num = Fraction if exact else float
    cols = [[num(r[j]) for r in rows] for j in range(len(columns))]
    n = len(rows)

    def standardise(v):
        m = sum(v) / n
        var = sum((x - m) ** 2 for x in v) / (n - 1)
        return [(x - m) for x in v], var

    y, vy = standardise(cols[k])
    xs = [(columns[j],) + standardise(cols[j]) for j in range(len(columns)) if j != k]
    # regression on centred data, then scale: SRC_j = b_j * sd(x_j) / sd(y)
    p = len(xs)
    a = [[sum(xi * xj for xi, xj in zip(xs[r][1], xs[c][1])) for c in range(p)] + [sum(xi * yi for xi, yi in zip(xs[r][1], y))] for r in range(p)]
    for c in range(p):  # Gauss-Jordan; exact fractions need no pivoting beyond a non-zero check
        piv = next(r for r in range(c, p) if a[r][c] != 0)
        a[c], a[piv] = a[piv], a[c]
        for r in range(p):
            if r != c:
                f = a[r][c] / a[c][c]
                a[r] = [u - f * v for u, v in zip(a[r], a[c])]
    b = [a[i][p] / a[i][i] for i in range(p)]
    return {xs[i][0]: float(b[i]) * math.sqrt(float(xs[i][2]) / float(vy)) for i in range(p)}


# one-at-a-time
inp, exp = load("oat-cost-drivers")
spec = inp["spec"]
base = sum(i["base"] for i in spec["inputs"])
check(exp["result"]["base"] == base == inp["handChecked"]["base"], f"OAT base {base}")
for i in spec["inputs"]:
    lo, hi = base - i["base"] + i["low"], base - i["base"] + i["high"]
    row = next(v for v in exp["result"]["values"] if v["name"] == i["name"])
    check([row["low"], row["high"], row["swing"]] == [lo, hi, abs(hi - lo)] == inp["handChecked"]["outputs"][i["name"]], f"OAT {i['name']}: {lo} to {hi}")
check([v["name"] for v in exp["result"]["values"]] == inp["handChecked"]["order"], "OAT order by swing")

# Spearman
for name in ["spearman-hand", "linear-known-spearman"]:
    inp, exp = load(name)
    columns, rows = table(inp)
    k = columns.index(inp["output"])
    y = [r[k] for r in rows]
    for v in exp["result"]["values"]:
        j = columns.index(v["name"])
        mine = statistics.correlation([r[j] for r in rows], y, method="ranked")
        check(abs(mine - v["value"]) < 1e-10, f"{name}: Spearman {v['name']} {v['value']:.6f} vs {mine:.6f}")
    if "handChecked" in inp:
        for v in exp["result"]["values"]:
            check(abs(v["value"] - inp["handChecked"][v["name"]]) < 1e-12, f"{name}: hand-worked {v['name']}")

# Standardised regression coefficients
inp, exp = load("spearman-hand")
columns, rows = table(inp)
exact = src(columns, rows, "Y", exact=True)
print("     exact SRC on the hand table:", {k: round(v, 6) for k, v in exact.items()})
inp, exp = load("linear-known")
columns, rows = table(inp)
mine = src(columns, rows, inp["output"], exact=False)
for v in exp["result"]["values"]:
    check(abs(mine[v["name"]] - v["value"]) < 1e-9, f"linear-known: SRC {v['name']} {v['value']:.6f} vs {mine[v['name']]:.6f}")
    check(abs(v["value"] - inp["theory"][v["name"]]) < 0.03, f"linear-known: {v['name']} near theory {inp['theory'][v['name']]:.4f}")
small = [r[:] for r in rows[:40]]
exact = src(columns, small, inp["output"], exact=True)
import subprocess  # compare the exact rational answer with the JS engine on a 40-row slice
js = subprocess.run(["node", "--input-type=module", "-e",
    "const {regression}=await import(process.argv[1]);const t=JSON.parse(process.argv[2]);console.log(JSON.stringify(regression(t,'Total cost').values))",
    ENGINE.as_uri(), json.dumps({"columns": columns, "rows": small})], capture_output=True, text=True)
if js.returncode == 0:
    for v in json.loads(js.stdout):
        check(abs(exact[v["name"]] - v["value"]) < 1e-9, f"40-row slice: exact SRC {v['name']} {exact[v['name']]:.9f} vs engine {v['value']:.9f}")
else:
    check(False, "could not run node for the exact comparison: " + js.stderr.strip()[:200])

inp, exp = load("collinear-rejected")
check("error" in exp and inp["expectError"] in exp["error"], f"collinear-rejected: {exp.get('error', 'no error')[:80]}")

print(f"\n{len(failures)} failure(s)")
sys.exit(1 if failures else 0)
