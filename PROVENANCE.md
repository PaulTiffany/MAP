# MAP Provenance

This document preserves provenance without forcing every reader — human or machine — to consume it before understanding MAP.

## Conservative origin statement

The best currently recovered conversational record places the naming of **Mutually Assured Progress (MAP)** in March 2025 during an attempt by Paul Carver Tiffany III to **sublimate** the MAD/MAIM logic being discussed around contemporary superintelligence strategy.

The conceptual move was to replace an equilibrium grounded in reciprocal capacity for failure or destruction with one grounded in reciprocal capacity for progress.

The exact phrase **“Mutually Assured Progress”** appears to have crystallized during a human–AI exchange. Surviving evidence supports the conceptual development and subsequent formalization more strongly than it establishes a unique moment of lexical authorship. This repository therefore does not claim otherwise.

## Research lineage

### Giants / MagicBeans

Earlier work developed machinery around bounded knowledge horizons, residual uncertainty, iterative refinement, confidence, contraction, surprise, reflection, and multi-agent dynamics.

Surviving FormalMath material treats hypotheses as objects in structured spaces and uses contraction/convergence language for iterative refinement. This is treated here as **ancestral machinery**, not as evidence that every such artifact was already MAP.

### Giants Phase 3

A later Giants implementation explicitly names a **Mutually Assured Progress (MAP)** mechanism for a multi-agent reflective field. It describes MAP between two agents using their motion in state space and entropy dynamics: agents score more highly when their trajectories are aligned across both.

This is explicit MAP machinery, not merely architectural resemblance.

### Principia Symbolica

MAP becomes a named formal object in **Book V**, in the setting of symbolic life, metabolism, viability, covenants, and sustainable relational dynamics. Later books consume the MAP machinery in work on mutation, convergence, projection, entanglement, and cognitive liberty.

The conceptual content is stronger than “cooperation is good”: distinct symbolic systems must remain mutually viable through change.

### Lean / sketched

At pinned commit `4854e71ae062eb246c9bc7ee5f663c8d34104286`, [`Book5ConvergenceMAP.lean`](https://github.com/PaulTiffany/sketched/blob/4854e71ae062eb246c9bc7ee5f663c8d34104286/verification/lean/ForcingAnalysis/ForcingAnalysis/Book5ConvergenceMAP.lean) provides an explicit mechanically checked population-convergence kernel.

It defines

```text
mapShare(q, p₀, n) = 1 - qⁿ(1 - p₀)
```

and proves convergence to `1` for `0 ≤ q < 1`.

It then reconstructs that contraction from a persistent MAP fitness advantage and a mutation-free aggregate population orbit. The file proves that the orbit remains on the probability simplex and that its MAP population share tends to one.

Crucially, it also proves countermodels:

- increasing drift alone does not force MAP convergence;
- persistent fitness advantage without exclusion of non-MAP inflow does not force convergence.

These boundaries motivate the short public formulation:

> **Advantage is not enough. Progress has to transfer through the dynamics.**

## Provenance discipline

This repository distinguishes:

- **explicit MAP** — an artifact names or formally defines MAP;
- **ancestral machinery** — earlier work later used in MAP, without retroactively relabeling it;
- **MAP-compatible application** — later work whose architecture is compatible with MAP but does not explicitly invoke it;
- **interpretation** — explanatory synthesis that should not be confused with a source claim.

For example, MeTTafy is currently treated as MAP-compatible rather than MAP-derived because no explicit MAP invocation has been established on its current default branch.

## Canonical direction of travel

```text
bounded knowledge / refinement / surprise
                  ↓
        Giants multi-agent MAP
                  ↓
      Principia Symbolica Book V
                  ↓
        Lean convergence kernel
                  ↓
       applications and interfaces
```

This graph is a navigation aid, not a claim that every concept in a later layer originated exclusively in the layer immediately above it.

## Attribution

Research and formalization: **Paul Carver Tiffany III**.

The recovered naming event involved human–AI interaction; this document intentionally preserves that ambiguity rather than rewriting it as solitary lexical authorship.
