# Tool selection

Read the [generated reference](../../../docs/04-TOOLS-REFERENCE.md) for exact names, selectors, required inputs, schemas, annotations, lifecycle, and source files.

1. Inspect actual state first with `gemba_inspect`, `seiri_sort_analyze`, `lean_ops`, or `5s-shitsuke` health.
2. Use `seiton_organize_system` for inventory and plan-only organization, never as cleanup apply.
3. Use `seiso_clean_system` only for local plan/stage/approved apply.
4. Use `5s_safety_policy` for policy reads/verdicts and separately authorized rule changes.
5. Use `5s_cron_manager` for render/validate/read/install/remove; keep dry-run until the exact path/content is approved.
6. Use `5s_remote_clean` only for concrete evidence-backed remote session artifacts and verify afterward.
7. Use Kaizen, Gemba, Poka-Yoke, and Lean Ops for improvement, inspection, prevention, and status; route cleanup recommendations back to Seiso.

Never invent a tool/action/input from a deprecated guide or memory. Route operational detail to the [operator guide](../../../docs/05-OPERATOR-GUIDE.md).
