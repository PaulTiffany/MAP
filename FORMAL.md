# MAP — Formal Core

This page separates formal claims from interpretation.

## Mechanically checked: population convergence

Source: [`Book5ConvergenceMAP.lean`](https://github.com/PaulTiffany/sketched/blob/4854e71ae062eb246c9bc7ee5f663c8d34104286/verification/lean/ForcingAnalysis/ForcingAnalysis/Book5ConvergenceMAP.lean), pinned at commit `4854e71ae062eb246c9bc7ee5f663c8d34104286`.

### Scalar kernel

For contraction `q`, initial MAP population share `p₀`, and discrete step `n`:

```text
mapShare(q, p₀, n) = 1 - qⁿ(1 - p₀)
```

**Status: mechanically proved.**

For `0 ≤ q < 1`:

```text
mapShare(q, p₀, n) → 1  as n → ∞
```

### Persistent MAP advantage

The Lean structure `PersistentMAPAdvantage` requires MAP fitness to be positive, non-MAP fitness to be nonnegative, and:

```text
nonMAPFitness < mapFitness
```

It defines the residual contraction:

```text
q = nonMAPFitness / mapFitness
```

and proves:

```text
0 ≤ q < 1
```

**Status: mechanically proved.**

### Population orbit

`MAPPopulationOrbit` assumes an initial population share in `[0,1]` and the exact residual recurrence:

```text
1 - share(n + 1) = q · (1 - share(n))
```

The Lean development proves that the orbit remains in `[0,1]`, is exactly the scalar `mapShare` model, and converges to MAP share `1`.

**Status: mechanically proved.**

## Mechanically checked boundaries

### Drift is insufficient

There exists a strictly increasing drift trajectory while MAP population share remains fixed at `1/2`.

Therefore:

```text
increasing drift ⇏ MAP convergence
```

**Status: mechanically proved counterexample.**

### Advantage with inflow is insufficient

A MAP strategy can have strictly greater fitness while replenishing non-MAP mass keeps MAP share fixed at `1/2`.

Therefore:

```text
persistent MAP fitness advantage ⇏ MAP convergence
```

unless the population dynamics provide the required contraction / exclusion of hidden inflow.

**Status: mechanically proved counterexample.**

## Interpretation

The compact interpretation used by this repository is:

> **Advantage is not enough. Progress has to transfer through the dynamics.**

That sentence is explanatory prose, not itself a Lean theorem.

## Broader formal theory

Principia Symbolica develops MAP in a broader symbolic setting involving metabolism, viability, covenants, reflection, mutation, convergence, projection, and relational dynamics.

Those claims should be promoted into this page individually as their exact source and proof status are audited. This page intentionally does not collapse “defined in the formal text” into “mechanically proved in Lean.”
