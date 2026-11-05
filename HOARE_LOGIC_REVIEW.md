# Hoare Logic architecture and code review

Reviewed 5 November 2026. Submodule: `docs/assets/hoare-logic`, commit `039bb1815ed844a0782b187f3c9ccda24388b028`.

**Assessment**

The browser-only design is a good fit for a small educational proof editor. The recursive syntax trees, standalone substitution functions, and worker isolation provide a useful foundation. The central weakness is the trust boundary: the application can display “Valid” without establishing that the program is well typed, that the premises prove the actual program, or that solver evidence belongs to the current obligations.

I would fix the correctness findings before extending the language or presenting this as a reliable verifier. A wholesale rewrite or backend service is unnecessary. Extracting a small, thoroughly tested proof kernel and making solver evidence revision-specific would address the largest architectural risks.

This review covers all application TypeScript, UI components, configuration, tests, and solver helpers. I also inspected the parent website's Z3 worker and publishing integration because the submodule depends on them. No application source was changed. Builds regenerated ignored `dist` files locally.

**Verification performed**

| Check | Result |
| --- | --- |
| `npm run build` | Passed. Warns that `../../theme/risajef-theme.css` is unavailable at build time. |
| `npm run lint` | Failed: 27 errors, including explicit `any`, unused catch variables, and empty catches. |
| `npm test` | Blocked by sandbox restriction on the `tsx` CLI's IPC socket (`EPERM`). This is an environment limitation. |
| Direct execution with `node --import tsx src/problemParser.test.ts` and `node --import tsx src/examples.test.ts` | All four defined tests passed. |
| `npm run test-z3` | Exited successfully after falling back to a mock and printing `[mock] sat`. It did not validate real solving. |
| Targeted probes | Reproduced unrelated-premise acceptance, arbitrary rule acceptance, ill-typed proof acceptance, integer precision loss, sort inference rejection, incorrect comparison folding, mixed error/success response acceptance, and an unbounded preflight fetch. |

Checks used the installed dependencies and Node v26.5.0. No live deployment/browser end-to-end test or fresh vulnerability audit was performed. The async UI race below is established by source inspection; it was not reproduced in an interactive browser.

**Current architecture**

The main data flow is `text parser / drag-and-drop builder → Expression + Statement → App proof-tree updates → isValidProof → status display`. Consequence checks branch into `TreeNodeComponent → SMT strings → tryZ3 → /z3/z3-worker.js → WASM`, then write `obligationsProved: true` back by a positional tree path.

Useful separation already exists between parsing, syntax types, components, and the worker transport. However:

- `App.tsx` owns rule semantics, tree updates, dialog state, and workspace orchestration.
- `utils.ts` combines printing, a second parser, substitution, type inference, builder conversion, and proof checking.
- `TreeNodeComponent.tsx` renders nodes, generates logical obligations, infers types, constructs SMT, runs the solver, and commits evidence.
- The actual browser solver implementation and runtime are outside the submodule. The npm `z3-solver` dependency is used by the standalone smoke script, not by the browser proof path.

The important boundary to strengthen is between editable input and validated proof data. UI construction conventions currently substitute for proof-kernel checks.

**Prioritized findings**

**1. High — integer rounding can certify a false mathematical claim. Confirmed.**

References: [problemParser.ts](docs/assets/hoare-logic/src/problemParser.ts), lines 83 and 182–184; [ExpressionBuilder.tsx](docs/assets/hoare-logic/src/components/ExpressionBuilder.tsx), lines 28–35; [types.ts](docs/assets/hoare-logic/src/types.ts), line 3; [utils.ts](docs/assets/hoare-logic/src/utils.ts), numeric serialization and assignment-axiom checking.

Integer literals are stored as JavaScript `number`. Distinct integers beyond the safe integer range collapse to the same value before verification. This input produces `isValidProof(...) === true` when marked with the assignment rule:

```text
{(= 9007199254740993 9007199254740993)}
x := 9007199254740993
{(= x 9007199254740992)}
```

The precondition is true and the postcondition is false for the stated integer assignment. The parser rounds both integer literals to `9007199254740992`, and the assignment check accepts the altered claim. This is reachable through the normal problem loader, without tampering with tree objects or solver messages.

The parser also accepts decimals, while inference calls every numeric constant `Int`. The builder admits `Infinity` because it only rejects `NaN`.

Recommendation: decide and document the numeric domain. For mathematical integers, preserve exact integer text or use `bigint` with explicit serialization; reject decimal and nonfinite values. If retaining `number` temporarily, reject anything that fails `Number.isSafeInteger` at every input boundary.

**2. High — the proof checker does not verify that premises prove the parent's program. Confirmed.**

Reference: [utils.ts](docs/assets/hoare-logic/src/utils.ts), lines 272–311.

The sequence branch checks contracts and child validity, but never checks that the parent is a sequence or that child statements equal its two statements. Conditional and while branches check the parent shape and contracts, but also omit child-statement matching. Consequence accepts a valid child and a boolean without checking statement equality. Leaves accept any defined rule string if the statement happens to satisfy an axiom.

A concrete counterexample accepted by `isValidProof` is:

```text
Parent: {x = 0} x := 1; skip {x = 0}   [sequence]
Child 1: {x = 0} skip {x = 0}          [skip]
Child 2: {x = 0} skip {x = 0}          [skip]
```

The parent's triple is false, but its unrelated premises are accepted. A skip leaf with `rule: 'banana'` is also accepted.

The normal rule buttons generally construct matching statements, so this particular counterexample demonstrates a kernel defect rather than an existing arbitrary-tree import exploit. It makes the checker unsafe to reuse for saved proofs, future imports, or independently constructed trees.

Recommendation: validate rule identity, parent statement kind, exact child count, child program correspondence, contracts, and evidence inside one independent kernel. Use a finite `Rule` union instead of `rule?: string`. UI guards should consume the kernel's rule application functions rather than implement separate semantics.

**3. High — ill-typed programs and assertions can be labeled valid. Confirmed.**

References: [App.tsx](docs/assets/hoare-logic/src/App.tsx), lines 111–119; [utils.ts](docs/assets/hoare-logic/src/utils.ts), lines 272–308 and 324–343; [types.ts](docs/assets/hoare-logic/src/types.ts), lines 1–29.

Root creation checks only that expressions and a converted statement exist. Builder conversion checks expression objects for truthiness, not recursive completeness or type correctness. The proof checker does not type-check. Type inference only runs for consequence obligations sent to the solver.

Both of these are accepted through parsing and axiom checking:

```text
{1} skip {1}
{true} x := (+ true false) {true}
```

The first uses integers as assertions. The second assigns an undefined arithmetic operation over booleans; substitution never inspects the invalid expression because the postcondition is `true`. The same gap applies to nonboolean guards and unfinished nested expressions from the builder.

Recommendation: introduce a validation pass for the complete Hoare triple before proof construction and at the kernel boundary. Require boolean assertions and guards, valid assignment expressions, consistent variable types, and complete subtrees. Separate the draft expression type with nullable children from the validated expression type used by the kernel.

**4. High — an old solver request can certify a replacement consequence node. Source-confirmed race.**

References: [TreeNodeComponent.tsx](docs/assets/hoare-logic/src/components/TreeNodeComponent.tsx), lines 40–47 and 77–131; [App.tsx](docs/assets/hoare-logic/src/App.tsx), lines 319–355; [types.ts](docs/assets/hoare-logic/src/types.ts), lines 16–23.

`handleProve` captures the old obligations, waits for two solver calls, and then sets `obligationsProved: true` on whatever node currently occupies `path`. It checks no node identity, revision, rule, or obligation fingerprint. Removing/reapplying rules and loading another workspace remain possible during solving. The effects reset local display state but do not cancel the request. A missing path is additionally dereferenced through a non-null assertion.

A sequence to exercise in a delayed-solver browser test:

1. Create `{true} skip {false}` and apply consequence with child `{true} skip {false}`.
2. Start proving its two identity implications, which are valid even though the child proof is incomplete.
3. Before completion, remove and reapply consequence with child `{false} skip {false}`, then prove that child with Skip.
4. The old request can mark the replacement consequence proved. The outer, false triple can then display Valid.

Recommendation: attach stable node IDs and revisions, bind evidence to the exact obligation content, and commit only if the current node still matches. Cancel obsolete jobs on replacement/unmount. Treat proved state as evidence about a particular contract, rather than a freely transferable boolean. Bundled examples may carry explicitly trusted fixture evidence, but should not establish the general evidence model.

**5. Medium — sort inference guesses too early and rejects valid boolean formulas. Confirmed.**

References: [utils.ts](docs/assets/hoare-logic/src/utils.ts), lines 71–162; [TreeNodeComponent.tsx](docs/assets/hoare-logic/src/components/TreeNodeComponent.tsx), lines 54–63.

Equality defaults unknown operands to `Int` immediately. In `(and (= b c) b)`, the equality assigns `b` and `c` to Int before the later boolean use of `b` is considered. The probe throws `Variable b is used as both Int and Bool`, although the formula is well typed when both variables are Bool. Independently inferring both sides of an implication creates the same problem across assertion boundaries.

Recommendation: collect constraints across the complete relevant program/assertions, unify them, and default unresolved sorts only after constraint solving. This also provides the type environment needed by finding 3.

**6. Medium — input validation and SMT symbol serialization disagree. Confirmed by inspection.**

References: [ExpressionBuilder.tsx](docs/assets/hoare-logic/src/components/ExpressionBuilder.tsx), lines 30–35; [StatementBuilder.tsx](docs/assets/hoare-logic/src/components/StatementBuilder.tsx), lines 26–33; [utils.ts](docs/assets/hoare-logic/src/utils.ts), lines 21–25; [TreeNodeComponent.tsx](docs/assets/hoare-logic/src/components/TreeNodeComponent.tsx), lines 65–72.

The text parser restricts identifier syntax, but builder editors accept any nonempty name. Those names are inserted verbatim into SMT declarations and expressions. Spaces, parentheses, SMT reserved names, or command fragments can therefore produce different or malformed solver input. React escapes the displayed text; the concern is solver-language integrity, not an established HTML injection vulnerability.

Recommendation: share identifier validation across all entry points and map domain names to generated solver symbols. Serialize through a typed SMT layer. Test invalid names and reserved symbols explicitly. I did not establish an end-to-end false proof through symbol injection.

**7. Medium — the solver smoke test can succeed without testing a solver. Confirmed.**

Reference: [scripts/test-z3.mjs](docs/assets/hoare-logic/scripts/test-z3.mjs), lines 10–45 and 71–79; [package.json](docs/assets/hoare-logic/package.json), lines 7–13.

The script looks for an API shape absent from the installed package, creates a fake implementation, and returns a predetermined satisfying model. That fallback occurred during this review. Errors are logged without establishing a failing process exit code. Moreover, this package-based path is different from the worker/WASM path used by the application.

Recommendation: fail on unexpected APIs or initialization failures, assert known SAT and UNSAT results, and add a browser integration check against the actual deployed worker assets. Keep mocks in tests that explicitly test mock behavior, never as a success fallback for a solver health check.

The existing test suite covers three parser cases and one worked-example loop; it has no negative proof-kernel cases, numeric-boundary tests, solver protocol tests, or async evidence tests. The inspected parent deployment workflow builds the tools but does not run this submodule's lint/tests.

**8. Medium — the solver protocol does not consistently fail closed, and its timeout excludes fetching. Confirmed.**

References: [z3.ts](docs/assets/hoare-logic/src/z3.ts), lines 19–34 and 109–162; parent integration [z3-worker.js](docs/z3/z3-worker.js), stdout/stderr result handling near the end.

A mocked response `{results: ['unsat'], errors: ['solver failed']}` returns status `Unsat`. The component then accepts it because it branches on status, not the accompanying errors. The current parent worker also returns stdout before checking stderr, discarding stderr whenever stdout exists. These are protocol weaknesses; the mixed response probe is not evidence that the live worker currently emits that exact payload.

The timeout starts only after preflight fetches complete. With a pending fetch, a call using a 10 ms budget was still pending after 50 ms. There is no request abort signal. Repeating fallback modes adds complexity without addressing ordinary asynchronous worker startup errors, which occur after construction.

Recommendation: define one explicit response union, reject any error-bearing/malformed response, require the expected number of results, and preserve runtime diagnostics. Apply a single deadline and cancellation signal to fetching, startup, and solving. Prefer one supported worker mode and protocol over speculative API detection.

**9. Medium — language parsing accepts constructs with the wrong semantics and cannot round-trip all builder programs. Confirmed.**

References: [problemParser.ts](docs/assets/hoare-logic/src/problemParser.ts), lines 33–60 and 115–126; [utils.ts](docs/assets/hoare-logic/src/utils.ts), lines 314–320.

Every binary operator accepts two or more operands and is left-folded. `(< 0 x 10)` becomes `(< (< 0 x) 10)`, comparing a boolean with an integer. Equality has the same issue. Either reject extra operands for these operators or explicitly implement chained comparison semantics; do not use arithmetic-style folding indiscriminately.

Statement bodies greedily parse sequences, with no block delimiters. `while b do skip; x := 1` puts the assignment inside the loop. A builder AST representing a loop followed by an outer assignment prints the same text, so the displayed program does not reliably communicate its structure or round-trip through the loader. Conditionals have a corresponding else-branch scope issue.

Recommendation: specify a small grammar with explicit statement blocks and operator arities. Use one canonical printer/parser pair, with nested control-flow round-trip tests. The second, unused `parseExpression` in `utils.ts` should be removed or consolidated; its tokenizer also fails to advance on an unmatched `)` inside an expression, creating a latent infinite loop if reused.

**10. Medium — the submodule is not a self-contained deployable application. Confirmed.**

References: [vite.config.ts](docs/assets/hoare-logic/vite.config.ts), lines 8–43; [z3.ts](docs/assets/hoare-logic/src/z3.ts), line 15; [index.html](docs/assets/hoare-logic/index.html), line 7; [README.md](docs/assets/hoare-logic/README.md), deployment instructions. Integration: [build_tools.py](scripts/build_tools.py), Hoare entry and `build_node_app`; [runtime_assets.py](scripts/runtime_assets.py).

The dev plugin reaches outside the checkout for `../../z3`; the browser requires root-level `/z3` assets; styling depends on the parent site's theme. `npm run build` does not package the Z3 runtime and defaults its JS/CSS URLs to `/assets/...`. The README's advice to copy `dist` therefore omits required runtime assets and hosting/path requirements.

The parent site does supply separate runtime restoration and a relative-base production build. That mitigates its deployment, but does not make the standalone repository's documented deployment reproducible. `configureServer` also does not configure Vite preview's worker asset serving.

Recommendation: explicitly choose a standalone package or a site-integrated package. Bundle/version the runtime, or provide documented configurable runtime/theme URLs and a reproducible setup. Test both local preview and the actual subpath deployment. Do not infer missing production isolation headers are a proven runtime failure without testing the particular WASM build.

**Code and maintainability no-gos**

- **Do not let UI code be the sole guardian of proof correctness.** This is the source of findings 2–4 and the highest-value architectural change.
- **Do not mutate existing React proof state and then shallow-copy only its root.** `App.tsx`, lines 239–284, mutates `node.children` and `node.rule`. Other paths use immutable updates. Mixed update models make captured async state and structural sharing harder to reason about. Use pure transitions with functional state updates consistently.
- **Do not replace a real health check with plausible fake success.** Remove the smoke script's mock fallback.
- **Do not guess a solver API by invoking arbitrary global functions.** The unused [Alt-Ergo wrapper](docs/assets/hoare-logic/public/alt-ergo/alt-ergo-worker.js), lines 55–108, scans and invokes global functions. Its adapter can also classify mixed results as valid if any output matches `Valid` or `unsat`. It is currently disconnected from the UI, so these are dormant hazards. Remove this path or implement a specific, tested protocol. Roughly 700 KB of legacy Alt-Ergo public assets are copied into builds despite being unused by the active UI.
- **Do not use `any`, unchecked casts, and non-null assertions at critical domain boundaries.** `exprEqual`, the legacy `applyRule` signatures, and path updates bypass checks precisely where incorrect tree state matters. A finite rule union, validated AST, and single rule-application signature remove much of this need. Address the 27 lint errors rather than suppressing the rules.
- **Avoid repeated whole-subtree validation while rendering each subtree.** `App.tsx` calls `isValidProof(root)` twice, and every recursive node validates its subtree again. Worst-case work is quadratic for a deep valid tree. Compute one annotated validation result per proof revision; this is lower priority than correctness.
- **Provide keyboard alternatives for editing.** Palette/drop-zone divs require dragging, and focusable value blocks have click handlers without keyboard activation. The text loader helps, but does not provide equivalent access to every editing operation. The floating editors also lack an explicit accessible dialog/focus model. Prefer native controls and a shared accessible editor shell.

Debug logging of entire roots and solver messages, duplicate floating-editor drag logic, commented-out initial state, and the unused legacy callback overload are additional cleanup opportunities. They are not reasons to introduce a large framework or global state library.

**Recommended target structure**

| Area | Responsibility |
| --- | --- |
| Domain syntax | Canonical operators, exact numeric values, draft/validated syntax, input validation and type constraints. |
| Proof kernel | Pure substitution, statement equality, rule application, obligation generation, and proof validation with diagnostics. No React or browser dependencies. |
| Proof session | Immutable actions, stable IDs/revisions, pending requests, and evidence invalidation. A reducer is sufficient at this scale. |
| Solver adapter | Typed queries/results, safe symbol mapping, deadline/cancellation, and one supported worker protocol. |
| React UI | Render validated state and diagnostics; dispatch edits and proof actions. |

The kernel should return structured results such as incomplete, invalid, or valid with the failing path and reason. The current single boolean conflates unfinished work with malformed or refuted proof data. Document that loop proofs establish **partial correctness**: a valid proof does not establish termination. The bundled infinite-loop example is legitimate under that interpretation and is not itself a defect.

**Suggested implementation order**

1. Preserve exact integers and add negative kernel tests, including the false triple in finding 1 and mismatched premises in finding 2.
2. Add complete-triple type validation and enforce every inference rule inside the pure kernel.
3. Bind solver evidence to stable node identity, revision, and exact obligations; test delayed results after remove/reapply/reset/load.
4. Replace the mock smoke check with real assertions; test browser worker success, SAT rejection, timeout, malformed responses, and startup errors. Gate changes on build, lint, and tests.
5. Consolidate parsing/operator normalization and make standalone or integrated deployment requirements reproducible.
6. Remove unused solver paths and compatibility scaffolding, then improve keyboard interaction and large-tree rendering as needed.

**Minimal reproduction for the two strongest confirmed defects**

Run in `docs/assets/hoare-logic` with the installed dependencies:

```sh
node --import tsx --input-type=module <<'JS'
import { parseProblem } from './src/problemParser.ts';
import { isValidProof } from './src/utils.ts';

const problem = parseProblem(
  '{(= 9007199254740993 9007199254740993)} ' +
  'x := 9007199254740993 {(= x 9007199254740992)}'
);
console.log(isValidProof({ ...problem, rule: 'assign', children: [] }));
// Actual: true. Expected: false for the entered mathematical integers.

const p = {
  type: 'binop', op: '==',
  left: { type: 'var', name: 'x' }, right: { type: 'const', value: 0 }
};
const leaf = { pre: p, stmt: { type: 'skip' }, post: p, rule: 'skip', children: [] };
console.log(isValidProof({
  pre: p,
  stmt: {
    type: 'sequence',
    s1: { type: 'assign', var: 'x', expr: { type: 'const', value: 1 } },
    s2: { type: 'skip' }
  },
  post: p, rule: 'sequence', children: [leaf, leaf]
}));
// Actual: true. Expected: false; these premises prove different statements.
JS
```
