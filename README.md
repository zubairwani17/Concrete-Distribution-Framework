# Concrete Distribution Selection Framework

An interactive decision framework for selecting the most appropriate probability distribution for modelling concrete compressive strength variability.

## Overview

This tool guides design engineers, simulation practitioners, and researchers through a structured six-question decision flow to recommend the optimal probability distribution based on:

- **Data source** — laboratory, field-cast, in-situ cores, or mixed databases
- **Concrete type** — normal-strength, high-strength, recycled aggregate, or alternative
- **Coefficient of variation** — low (<10%), moderate (10–20%), high (20–35%), very high (>35%)
- **Sample size** — small (<50), moderate (50–200), large (>200)
- **Modelling objective** — code-based design, reliability, seismic assessment, or durability
- **Tail criticality** — lower tail, upper tail, both, or neither

## Distributions covered

| Distribution | When recommended |
|---|---|
| Normal (Gaussian) | Low CoV, symmetric data, code-based design |
| Lognormal | General-purpose, reliability analysis, right-skewed data |
| 2-parameter Weibull | Lower-tail critical, fracture-governed failure |
| Burr Type XII | High variability + lower-tail critical, heavy tails |
| Lognormal + Gumbel | Upper-tail extreme events, durability/service-life |
| Weibull + Burr XII | Both tails critical, comparative assessment |

## Live demo

Deploy via GitHub Pages — the `index.html` is fully self-contained.

1. Go to repository **Settings → Pages**
2. Set source to **Deploy from a branch**
3. Select **main** branch, **/ (root)** folder
4. Your tool will be live at `https://zubairwani17.github.io/concrete-distribution-framework/`

## Files

| File | Description |
|---|---|
| `index.html` | Standalone web app (React via CDN, no build step needed) |
| `concrete_distribution_framework.jsx` | React component source (for use in React projects) |

## Based on

This framework is derived from the review paper:

> *Uncertainty Quantification and Probabilistic Characterization of Concrete for Informed Modelling — A Review*

Key references supporting the decision logic:
- He et al. (2024) — Burr distribution for in-structure concrete
- Chen et al. (2013) / Vu et al. (2022) — Weibull for core specimens
- Wiśniewski et al. (2012) — Lognormal for field/plant data
- Pacheco et al. (2019) — Normal vs Lognormal indistinguishability at low CoV
- Croce et al. (2018) — Cluster analysis for mixed databases
- Li et al. (2023) — Gumbel for extreme deterioration events

## License

MIT
