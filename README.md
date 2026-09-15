# Mutually Assured Progress (MAP)

**Progress that transfers.**

Mutually Assured Progress is a research program for replacing equilibria built on reciprocal threat with equilibria built on reciprocal capacity to improve.

MAP did not begin as a slogan looking for a theory. It emerged from work on bounded knowledge, iterative refinement, confidence, surprise, reflection, and multi-agent dynamics, and was later developed into explicit formal and mechanically checked machinery.

## The motivating inversion

Mutually Assured Destruction stabilizes adversaries by making defection catastrophically expensive.

MAP asks a different question:

> Can interaction be structured so that continued mutual progress becomes the stable trajectory?

This is not the claim that cooperation automatically wins. The formal work is concerned precisely with the conditions under which progress does — and does not — propagate.

## A mechanically checked convergence kernel

A Lean development in [`PaulTiffany/sketched`](https://github.com/PaulTiffany/sketched/blob/4854e71ae062eb246c9bc7ee5f663c8d34104286/verification/lean/ForcingAnalysis/ForcingAnalysis/Book5ConvergenceMAP.lean) studies a population share of MAP dynamics:

```text
mapShare(q, p₀, n) = 1 - qⁿ(1 - p₀)
```

For `0 ≤ q < 1`, the MAP share converges to `1`.

More importantly, the file proves boundary results:

- increasing drift alone does **not** force MAP convergence;
- a persistent MAP fitness advantage alone does **not** force convergence when non-MAP mass can continually flow back into the system;
- persistent quantitative advantage together with a mutation-free, simplex-preserving contraction does force MAP population share to converge to one.

In plain language: **advantage is not enough. Progress has to transfer through the dynamics.**

## Formal lineage

MAP has developed across several layers of the larger research program:

**Giants / MagicBeans** — bounded horizons, confidence, iterative refinement, contraction, surprise, and multi-agent reflective dynamics.

**Giants Phase 3** — an explicit MAP mechanism measuring whether agents move in aligned directions in both state space and entropy dynamics.

**Principia Symbolica, Book V** — symbolic metabolism, viability, covenants, and Mutually Assured Progress as formal machinery for sustainable relational dynamics.

**Lean / `sketched`** — mechanically checked convergence results and countermodels establishing sufficient and insufficient conditions for MAP population convergence.

This repository is the accessible front door to that body of work. The source artifacts remain the authority for their respective formal claims.

## Origin and provenance

The best currently recovered conversational record places the naming of MAP in March 2025, during an attempt to **sublimate** the MAD/MAIM logic being discussed around contemporary superintelligence strategy.

The conceptual move was already underway: rather than treating reciprocal capacity for failure or destruction as the basis of equilibrium, ask whether bounded, uncertain, adaptive systems could use surprise, reflection, and iterative refinement to sustain reciprocal progress.

The exact phrase **“Mutually Assured Progress”** appears to have crystallized during that human–AI exchange. This provenance statement is intentionally conservative: surviving artifacts establish the subsequent development and formalization much more strongly than they establish a single moment of lexical authorship.

## Working principle

> **MAD amortizes distrust. MAP amortizes trustworthy cooperation.**

Or, more mechanically:

> **Progress is improvement that transfers.**

## Status

This repository is an index and public interface under construction. Future work will separate claims into explicit status classes such as:

- mechanically proved;
- formally defined;
- paper theorem or proposition;
- conjectural or interpretive extension.

The goal is not to flatten those distinctions. It is to make them visible.

---

Research and formalization: **Paul Carver Tiffany III**
