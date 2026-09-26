# Mutually Assured Progress

## Progress that transfers.

We learned to stabilize competition by making destruction mutual.

**What happens when we make progress mutual?**

| MAD | MAP |
| --- | --- |
| *I cannot defect because you can destroy me.* | *I can progress because your progress helps preserve mine.* |
| Stability through reciprocal threat. | Stability through reciprocal capacity to improve. |

MAP asks whether interaction can be structured so that **continued mutual progress becomes the stable trajectory**.

It does **not** assume cooperation automatically wins. The formal work studies what lets progress propagate — and what stops it.

### See it

**[Enter MAP — The listening forest](https://paultiffany.github.io/MAP/)** — the first living scene in an emerging “sticker book”: a photographic-style setting with individually addressable animation objects, shared paths, changing daylight and optional sound. Humans and future agents use the same bounded command interface. The present ambient director is seeded local software, not an AI agent.

[Scene notes](SCENE.md) · [Replication methodology](methodology.html) · [Agent/runtime contract](lib/sticker-world/README.md)

The scene now lives at the project root; its former demo route is removed. The previous home experience remains in Git history. The research records below are preserved independently of this interface experiment.

**[Formal core](FORMAL.md)** · **[Provenance](PROVENANCE.md)** · **[Machine-readable MAP](map.json)**

> **Advantage is not enough. Progress has to transfer through the dynamics.**

A mechanically checked Lean model proves a MAP population converges under a persistent quantitative advantage *and* a contraction that excludes hidden non-MAP inflow. It also proves that increasing drift alone is insufficient, and that advantage with replenishing non-MAP inflow can fail to converge.

**[Read the Lean source](https://github.com/PaulTiffany/sketched/blob/4854e71ae062eb246c9bc7ee5f663c8d34104286/verification/lean/ForcingAnalysis/ForcingAnalysis/Book5ConvergenceMAP.lean)**

---

**MAD amortizes distrust. MAP amortizes trustworthy cooperation.**

Research and formalization: **Paul Carver Tiffany III** · [CC BY 4.0](LICENSE)
