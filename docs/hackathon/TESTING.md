# SafeOps Hackathon — Testing and Verification

## Verification model

SafeOps distinguishes source-level tests from controlled live-demo evidence. Passing tests is not presented as proof of a live effect; a successful tool call is not presented as verification.

## Repository verification

```sh
npm ci
npm run check
npm test
npm run docs:links
npm run docs:verify
npm run safeops:test
node --test demo/safeops-participant/test/*.test.mjs
node --check scripts/safeops-c0-start.mjs
```

Controlled fixture helpers:

```sh
npm run safeops:fixture:create
npm run safeops:fixture:verify
npm run safeops:fixture:reset
```

Backend tests cover actor/target binding, SAFE / REVIEW / DENIED classification, bounded approval, MCP elicitation, exact operation subsets, apply-time policy behavior, verification, explanation, and authenticated HTTP/MCP boundaries.

Participant-carrier tests cover authorization-code + PKCE behavior, exact resource binding, token refresh, exact three-tool projection, explicit single-use approval, stale and cross-session/plan rejection, no UI-supplied operation set, no generic raw tool-call route, target binding, responsive behavior, and presentation state.

## Controlled live proof

```text
user OAuth
  -> MCP initialize
  -> tools/list
  -> safeops_inspect_workspace
  -> SAFE 1 / REVIEW 1 / DENIED 1 / EFFECT NONE
  -> "Apply only the safe actions"
  -> safeops_apply_safe_actions
  -> one controlled SAFE effect
  -> VERIFIED_SUCCESS
  -> safeops_explain_workflow on the same effectful workflow
```

After the effect, the SAFE candidate was removed while REVIEW and DENIED remained. The explanation reported what changed and why the other actions did not execute.

## Deterministic demo target

The live C0 startup wrapper at [`scripts/safeops-c0-start.mjs`](../../scripts/safeops-c0-start.mjs) validates the expected target/policy contract and materializes a deterministic fixture before starting the backend.

## Interpretation limits

These checks do not establish production identity-provider readiness, Amazon-hosted Alexa+ UI access, customer production deployment, unrestricted host safety, automatic rollback for arbitrary effects, or mainline adoption.

The proof target is narrower: the controlled governed workflow works end to end, and the evidence surface distinguishes plan, authority, effect, verification, and explanation.
