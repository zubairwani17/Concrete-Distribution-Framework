# Concrete Distribution Selection Framework

An interactive decision-support tool for selecting probability distributions for concrete compressive strength modelling. It combines a contextual decision framework with maximum-likelihood distribution fitting, bootstrap-calibrated goodness-of-fit testing, and design-fractile comparison.

Single self-contained HTML file. No build step, no npm, no server.

---

## Two ways to specify variability

**Upload raw data** — drop in an Excel (`.xlsx`, `.xls`) or CSV file of compressive strength values. The tool computes descriptive statistics, fits five candidate distributions by maximum likelihood, calibrates p-values by parametric bootstrap, and reports the design-value consequence of each choice.

**Select a CoV range** — if the coefficient of variation is already known, choose the band directly. No file needed.

Both paths feed the same decision engine.

---

## What it does with uploaded data

| Step | Output |
|---|---|
| Descriptive statistics | n, mean, SD, CoV, skewness, range |
| Sheet / column selection | Auto-detects numeric columns; switch between them |
| Outlier handling | Keep all, remove >3σ, or IQR 1.5× rule |
| MLE fitting | Normal, Lognormal, Weibull (2P), Gumbel, Burr XII |
| Goodness of fit | Anderson–Darling, Kolmogorov–Smirnov, AIC, BIC |
| Bootstrap calibration | p-values with parameter re-estimation, B = 200–2000 |
| Admissibility grouping | Green = p > 0.05, red = rejected |
| Design fractiles | f₅%, f₁%, f₉₅% per candidate vs empirical order statistic |
| Fitted equations | Numerical parameters embedded, ready for OriginPro |
| Visual verification | Empirical histogram + fitted PDF with tail regions shaded |

CoV and sample size auto-populate from the data and lock, preventing inconsistency between what was uploaded and what was selected.

### Estimation methods

| Distribution | Method |
|---|---|
| Normal | Closed-form MLE |
| Lognormal | Closed-form MLE on log-transformed data |
| Weibull (2P) | Bisection on the shape-parameter score equation |
| Gumbel | Damped fixed-point iteration on the scale MLE |
| Burr XII | Nelder–Mead over (a, c) with k profiled out analytically |

All estimators and GoF statistics verified against `scipy.stats` to four decimal places.

---

## Why ranking is not the selection criterion

The tool deliberately separates two questions that are easy to conflate.

*Does this distribution fit my data?* is answered by the bootstrap p-value. At typical concrete sample sizes (n = 30–50), most candidates pass. Differences in the Anderson–Darling statistic among passing candidates are sampling noise, and the rank order changes depending on whether AD, KS, or AIC is used.

*Which distribution should I use?* is answered by the modelling context — tail criticality, failure mechanism, and application. Candidates that a GoF test cannot separate can still produce 1% fractiles differing by 25% or more. That divergence, shown in the design-value table, is what the choice actually controls.

When the contextual recommendation and the best-fitting distribution disagree, the tool states both and gives a reasoned verdict rather than silently deferring to either.

---

## Decision inputs

- **Data source** — laboratory, field-cast, in-situ cores/NDT, mixed databases
- **Concrete type** — normal-strength, high-strength/UHPC, recycled aggregate, alternative
- **Coefficient of variation** — computed from data, or selected manually
- **Sample size** — computed from data, or selected manually
- **Modelling objective** — code-based design, reliability/fragility, seismic, durability
- **Tail criticality** — lower, upper, both, or neither

## Distributions covered

| Distribution | When recommended |
|---|---|
| Normal (Gaussian) | Low CoV, symmetric data, code-based design and QC |
| Lognormal | General purpose, reliability analysis, right-skewed data |
| Weibull (2P) | Lower-tail critical, fracture-governed failure |
| Burr Type XII | High variability with lower-tail criticality, heavy tails |
| Lognormal + Gumbel | Upper-tail extreme events, durability and service life |
| Weibull + Burr XII | Both tails critical, comparative assessment |

---

## Data file format

A single column of positive compressive strength values, header optional:

```
fc_MPa
32.4
29.8
35.1
```

Multiple columns are fine — pick the one you want from the dropdown. A CSV template is downloadable from within the tool.

---

## Deployment

Upload `index.html` to the repository root, then:

1. **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: **main**, folder: **/ (root)**
4. Live at `https://<username>.github.io/<repo-name>/`

React, SheetJS, and Babel load from CDN. Works offline once cached, supports dark mode, and is mobile-responsive.

---

## Based on

Derived from the review manuscript:

> *Uncertainty Quantification and Probabilistic Characterization of Concrete for Informed Modelling — A Review*

Key references supporting the decision logic:

- He et al. (2024) — Burr distribution for in-structure concrete
- Chen et al. (2013); Vu et al. (2022) — Weibull for core specimens
- Wiśniewski et al. (2012); Nguyen et al. (2022) — Lognormal for field and plant data
- Pacheco et al. (2019) — Normal vs Lognormal indistinguishability at low CoV
- Croce et al. (2018) — Cluster analysis for mixed-source databases
- Li et al. (2023) — Gumbel for extreme deterioration events
- Zhou et al. (2025) — Recycled aggregate concrete variability

---

## Limitations

Bootstrap p-values assume the fitted model is the data-generating process and do not account for model-selection uncertainty across the full candidate set. Fractiles are point estimates without confidence intervals; at n < 50 the sampling uncertainty on f₁% is substantial. The tool fits 2-parameter Weibull only — 3-parameter Weibull with a threshold parameter is not implemented.

## License

MIT

---

## Working on the code in VS Code

The repository holds two views of the same application. `index.html` is the generated, standalone, deployable file. The `src/` folder holds the readable source, split by concern.

```
├── index.html          generated — do not edit
├── dev.html            development entry point
├── build.py            regenerates index.html from src/
└── src/
    ├── styles.css      theme variables, layout, tables
    ├── stats.js        MLE fitters, GoF, bootstrap
    ├── framework.js    questions and recommendation engine
    └── app.jsx         React components
```

**To edit:**

1. Open the folder in VS Code. Accept the recommended extensions when prompted (Live Server is the one that matters).
2. Right-click `dev.html` → **Open with Live Server**. It loads `src/` directly, so a browser refresh shows your edits.
3. When finished, run `python build.py` in the terminal to regenerate `index.html`.
4. Commit both `src/` and the regenerated `index.html`.

`dev.html` must be served over HTTP. Opening it as `file://` will fail, because Babel cannot fetch external scripts from the filesystem. `index.html` has no such restriction — it can be double-clicked and opened directly.

**Where to change things:**

| Task | File |
|---|---|
| Add or reword a question | `src/framework.js` — the `QS` array |
| Change recommendation logic | `src/framework.js` — the `recommend` function |
| Add a distribution | `src/stats.js` — write a `fitX` and add it to `FITTERS` |
| Adjust CoV or sample-size bands | `src/stats.js` — `covBucket`, `nBucket` |
| Change colours or spacing | `src/styles.css` |
| Modify chart or layout | `src/app.jsx` |
