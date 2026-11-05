# Parallelismus architecture and code review

Reviewed 5 November 2026. Submodule: `docs/assets/parallelismus`, commit `32fcfc72db5d141db40b1ea18a570b88890cf12b`.

## Assessment

Parallelismus has a reasonable foundation for a small Bible annotation tool: immutable corpus data is separated from editable relations, chapter content can load on demand, and a data adapter keeps much of the UI independent of storage. A static application with IndexedDB is a suitable architecture for personal use. FastAPI and SQLite are also suitable for a separately operated service.

The main architectural problem is that these two products coexist without a dependable shared contract. They duplicate the UI and data processing, return different meanings for the same operation, and have different persistence guarantees. Important correctness rules live in click handlers or comments rather than storage boundaries. Consequently, the application can lose imported annotations, report incomplete concordance results, and attach the wrong verse as evidence for a relation.

I would treat this as a working prototype that needs data-integrity repairs before relying on it for substantial annotation work. A rewrite or larger framework would not address the main problems. Prioritize atomic writes, correct provenance, stable identifiers, and explicit adapter contracts.

## Scope and verification

Inspected the Python API, models, importer, seed script, diagnostic test, static data builder, browser storage layer, both frontend variants, supporting pages, styles, graph export tool, package configuration, and parent website integration. Application source was not modified.

| Check | Result |
| --- | --- |
| Corpus preprocessing and asset copying into `/tmp` | Passed: 66 books, 1,188 chapters, 31,031 verses, 14,076 word entries and 379,911 verse-word entries. |
| Regenerated index against committed index | Byte-for-byte identical; index size is 7,085,753 bytes, about 6.76 MiB uncompressed. |
| Three static JavaScript entry points | Bundled successfully using an already installed esbuild from the neighboring background-generator submodule. This was not the submodule's clean dependency installation or complete CSS build. |
| Cold and warm word-detail probe using real generated corpus data | `g3588` reported zero usages before loading a chapter and 25 after loading chapter ID 1. |
| Concurrent chapter reads | Five concurrent verse reads from the same uncached chapter caused five calls to fetch its chapter JSON. |
| Corpus token comparison | Preprocessing omitted 64,592 repeated Strong-ID occurrences within verses. Existing verse numbering matched the source in this corpus. |
| HTTP write-error probe | The backend adapter's `addRelation` resolved normally for an HTTP 422 response. |
| HTML escaping probe | `escapeHtml('a&&b <> c')` returned `ab  c`, deleting content. |

JavaScript probes ran on Node v26.5.0. Read-path storage initialization used a minimal IndexedDB-open stub; these probes did not exercise actual IndexedDB transactions. Data-loss, UI-navigation, and backend findings below are established by source inspection unless a runtime result is explicitly stated. The Python dependencies were unavailable, so the API and seed command were not run. No interactive browser, live deployment, clean `npm ci` build, or dependency vulnerability audit was performed.

## Architecture

The repository contains two execution paths:

```text
Static deployment
  bible/*.json → build.js → index + chapter JSON files
  browser UI → app.static.js → db.js → corpus in memory + lazy chapter cache
                                   → relations in IndexedDB

Backend deployment
  bible/*.json → import_strong.py → SQLite
  browser UI → app.js → FastAPI routes → SQLModel → SQLite

Parent website
  embed loader → inject HTML + global CSS + bundled static UI
```

### Useful existing boundaries

- The static deployment needs no server process, and relation export provides a portable backup mechanism.
- Chapter payloads are separate from the main index, avoiding an upfront download of every verse-word entry.
- `app.static.js` provides a recognizable adapter boundary; shared DOM, tooltip, and keyboard helpers already exist.
- SQLModel relationships distinguish the global lexicon from verse-specific spellings and translations.
- Backend queries generally use parameterized ORM expressions. I found no basis for reporting SQL injection in the inspected query code.

### Boundaries to strengthen

- Choose which deployment modes are supported. If both remain, share the UI and specify common read/write behavior in adapter contract tests.
- Put validation and relation operations in a small application layer. Click handlers should select and display data, while storage adapters enforce durable writes.
- Give corpus identity and backup compatibility an explicit contract. Browser relations currently reference generated numeric IDs with no corpus version.
- Keep corpus preprocessing consistent between Python and JavaScript, or generate one canonical dataset consumed by both.
- Make the embedded UI a component with a root, asset base, and mount lifecycle. Its present use of global DOM, CSS, and browser routing assumes ownership of the surrounding page.

## Prioritized findings

### 1 High severity relation import can destroy existing annotations before failing

References: [db.js](docs/assets/parallelismus/frontend/db.js:371), [import handler](docs/assets/parallelismus/frontend/index.static.js:673).

`importRelations` checks only that the input is an array. It then clears the entire relations store and waits for that transaction to commit. In a second transaction, it inserts the replacement records. If a record is invalid for IndexedDB, quota is exceeded, or insertion otherwise fails, the original annotations are already gone. For example, an array containing a primitive passes the array check but cannot be stored as a relation object with an inline key.

The UI calls this operation “Import” without explaining that it replaces all existing annotations. An empty array deliberately empties the database, and arbitrary object shapes can be accepted as records. Neither an invalid import nor an accidental replacement has a recovery mechanism beyond a prior manual export.

**Fix:** validate every record and its references before mutation; make merge and replace explicit operations. Execute replacement as one transaction containing both clear and insert, abort on any failure, and handle transaction aborts. Include a backup format version and corpus identifier.

### 2 High severity chapter annotation can record the wrong source verse

References: [whole-chapter rendering](docs/assets/parallelismus/frontend/index.static.js:234), [word selection](docs/assets/parallelismus/frontend/index.static.js:277), [relation creation](docs/assets/parallelismus/frontend/index.static.js:611).

Whole-chapter view renders words from many verses, but relation creation derives `source_verse_id` exclusively from the verse dropdown. Word boxes preserve their Strong ID but do not preserve the verse from which they were selected. Choosing words in verse 2 while the dropdown still selects verse 1 therefore records verse 1 as the evidence. The same mechanism permits selections spanning verses without an explicit provenance rule.

This directly affects the tool's central purpose: a saved relation can appear valid while pointing to the wrong textual evidence. `Description.md` says relations have a source verse, so this is a correctness requirement.

**Fix:** retain verse identity on every selectable word, derive or explicitly request the evidence verse, and reject ambiguous selections. Make whole-chapter selection and the displayed evidence agree before saving. Add a regression covering selection in a nonfirst verse.

### 3 High severity backend writes have no access control

References: [CORS configuration](docs/assets/parallelismus/backend/main.py:92), [write routes](docs/assets/parallelismus/backend/main.py:498).

The API permits relation creation and deletion without authentication or authorization. CORS includes `*` and permits every method and header. If the backend is exposed beyond a trusted local environment, anyone who can reach it can alter or delete the shared relation database. Permissive CORS also lets other websites initiate cross-origin API calls; it is not an access-control mechanism.

This finding applies to an operated backend, not the parent website's static IndexedDB deployment. The README describes a proof of concept and starts a local development server, so public exposure was not established.

**Fix:** decide and document whether the service is local-only or shared. Restrict a local-only service to its intended clients and origins. A shared deployment needs authenticated writes and an explicit authorization policy. Remove the debug-header route from a production API unless it has a defined operational purpose.

### 4 Medium severity word detail reports cache contents as complete usages

References: [static word detail](docs/assets/parallelismus/frontend/db.js:186), [Strong detail page](docs/assets/parallelismus/frontend/strong.static.html:81), [backend word detail](docs/assets/parallelismus/backend/main.py:275).

The static `fetchWordDetail` scans only `_chapterCache`. A newly opened Strong detail page initializes the index and IndexedDB but never loads chapter data, so its cache is empty and the page reports “no usages found” for words that occur in the corpus. A new tab also has its own empty cache, regardless of chapters visited in the main tab.

**Reproduced:** `g3588` returned zero usages immediately after initialization and 25 after loading chapter ID 1. Those 25 are still only that chapter's usages. The backend operation instead queries the full corpus. Identical function names and result shapes conceal different meanings.

**Fix:** generate a reverse usage index, potentially sharded by Strong ID, and load the required shard for word details. If partial results are intentionally supported, return completeness metadata and label them as partial. A full concordance view should not depend on browsing history.

### 5 Medium severity relation validity and durability are not enforced at storage boundaries

References: [Relation model](docs/assets/parallelismus/backend/models.py:63), [SQLite engine](docs/assets/parallelismus/backend/database.py:5), [POST route](docs/assets/parallelismus/backend/main.py:498), [browser writes](docs/assets/parallelismus/frontend/db.js:268).

The API accepts the persistence model directly, including a client-provided primary key. `relation_type` is an unrestricted string even though a fixed list is exposed separately. Source verse is optional despite the stated source requirement. Neither adapter validates that endpoints exist or that an evidence verse is appropriate. There is no duplicate relation constraint. SQLite foreign-key enforcement is not explicitly enabled by this engine configuration, so declaring foreign keys alone does not establish the intended checks.

The browser adapter likewise copies payload fields without validating them. Its `addRelation` resolves on request success rather than transaction completion, so the UI may report success before the write is committed. Creation and deletion helpers do not consistently handle transaction aborts. Multi-member composition writes happen in separate transactions and can leave a partial result after an error.

**Fix:** introduce a validated create command that excludes database IDs, enforces allowed relation types and evidence rules, and checks references. Mirror applicable rules in database constraints and explicitly enable SQLite foreign keys. Resolve browser writes on transaction completion and reject on abort. Save a composition's members atomically.

### 6 Medium severity interrupted backend imports leave books permanently incomplete on retry

References: [book existence check and commit](docs/assets/parallelismus/backend/import_strong.py:25), [chapter and verse commits](docs/assets/parallelismus/backend/import_strong.py:56).

The importer commits a Book before even parsing its JSON, then commits chapters and verses incrementally. On rerun, it skips any book whose name already exists. A parse failure or interruption after the first book commit therefore leaves a partial book that subsequent runs treat as fully imported. A verse can also be committed before its words.

The schema lacks uniqueness constraints for book identity, chapter number within a book, and verse number within a chapter. There is no completed-import marker or explicit resumable import protocol.

**Fix:** parse and validate a book first, then import it in a transaction that either commits the complete book or rolls back. If resumability is necessary, track completion and update by stable source keys. Batch inserts and flushes rather than committing every individual verse.

### 7 Medium severity the documented seed command uses an obsolete schema

References: [README](docs/assets/parallelismus/README.md:5), [seed script](docs/assets/parallelismus/backend/seed.py:27), [Word model](docs/assets/parallelismus/backend/models.py:42).

`seed.py` constructs Word objects using `verse_id` and scalar `original`/`translation`, while the current model links verses through VerseWord and expects lists for the lexical variants. It then accesses `w1.id` and `w2.id`; the current Word primary key is `strong`, and there is no `id` field. Even setting aside version-specific validation behavior, those attribute accesses cannot implement the current model. No VerseWord associations are seeded.

The script commits several rows before reaching the stale relation construction and is not idempotent. The README's primary setup path therefore needs repair, and failed retries can accumulate sample data. This was source-verified, not executed against installed SQLModel.

**Fix:** update the seed to the current model, create associations, use actual Strong IDs as relation endpoints, and make seeding transactional and repeatable. Verify the exact README setup commands in an isolated database.

### 8 Medium severity persisted verse references have no stable corpus identity

References: [generated identifiers](docs/assets/parallelismus/build.js:41), [verse identifiers](docs/assets/parallelismus/build.js:78), [backup format](docs/assets/parallelismus/frontend/db.js:366).

Book, chapter, and verse IDs are sequential counters derived from alphabetical filenames and traversal order. Relations persist only those numeric verse IDs, and backups contain a bare array of records without corpus metadata. Adding an earlier-sorting book or inserting an earlier verse shifts subsequent IDs. Existing annotations can then point to a different verse without an error.

The raw corpus already supplies explicit verse identifiers. The builder also assigns verse numbers by array position rather than using the source verse suffix. Current corpus numbering matched in the probe, so this is a compatibility hazard rather than a demonstrated mismatch in today's files.

**Fix:** persist canonical source verse keys, use a versioned corpus manifest, and migrate existing numeric references. Reject or explicitly migrate incompatible backups. Stable identity matters more than retaining compact sequential numbers.

### 9 Medium severity source links can display a different verse from the selected one

References: [relation source-link handler](docs/assets/parallelismus/frontend/index.static.js:479), corresponding backend UI at [index.js](docs/assets/parallelismus/frontend/index.js:519).

Clicking a relation's source link loads the chapter with default options, which renders its first verse. A timer then changes the verse dropdown to the intended verse but never loads that verse's words. The book dropdown and route are also not updated consistently. For a source in a later verse, the visible content and selected verse can disagree, which can affect subsequent annotation.

**Fix:** route every navigation through one awaited operation that selects book, chapter, verse, renders the requested content, and updates the URL. Remove the 150 ms timer; pass `selectVerseId` directly into the existing load operation.

### 10 Medium severity dynamically generated links break in the parent website

References: [generated Strong links](docs/assets/parallelismus/frontend/index.static.js:309), [keyboard navigation](docs/assets/parallelismus/frontend/index.static.js:334), [embed link rewriting](docs/assets/parallelismus-embed.js:26).

The embed loader rewrites links in the fetched HTML before executing the app. Word links created later still use `strong.html#...`, and keyboard navigation opens the same relative path. Within a host tool page, those paths resolve beside that page rather than beneath `assets/apps/parallelismus/dist/`, where the Strong page is published. The configured `__PARALLELISMUS_BASE__` is used for data loading but not these routes.

**Fix:** centralize asset/page URL construction and use the configured base for links and `window.open`. Verify both standalone and embedded navigation, including keyboard actions.

## Additional architecture and code concerns

### Duplicated implementations have already diverged

[app.ts](docs/assets/parallelismus/frontend/app.ts:1) is a short, stale API prototype; [app.js](docs/assets/parallelismus/frontend/app.js:1) claims to be compiled from it but contains far more functionality. The build skips TypeScript and bundles JavaScript variants. Editing or compiling the apparent TypeScript source would not reliably maintain the application.

`index.js` and `index.static.js` duplicate hundreds of lines, alongside duplicate HTML, search, and graph controllers. Word-usage semantics already differ between adapters, and only static search includes Strong-ID substring matching. Share the UI, transliteration, relation types, and result contracts; keep mode-specific behavior in adapters selected explicitly by the build.

### Composition storage loses the identity of a multi-member assertion

[Composition creation](docs/assets/parallelismus/frontend/index.static.js:617) expands a selection into separate `member → target` edges. There is no composition ID or member-group record. Two distinct member sets with the same target cannot be distinguished reliably, and individual member edges can be deleted independently. If `composes` means the n-ary assertion described in `Description.md`, preserve the assertion and its member set explicitly, with evidence attached to the whole assertion.

### Verse preprocessing discards repeated occurrences

[The static builder](docs/assets/parallelismus/build.js:89) and [Python importer](docs/assets/parallelismus/backend/import_strong.py:128) deliberately keep at most one occurrence of a Strong ID per verse. The probe found 64,592 omitted repeated occurrences. In Acts 1:1, for example, `g3588` occurs as both `Τὸν` and `ὁ`; only the first is retained in the verse payload, although the global dictionary retains variants.

This is acceptable for a view explicitly showing distinct lexemes per verse. It is insufficient for a faithful word sequence or occurrence-specific annotation, and “canonical” currently means the first encountered form. Decide which behavior the product needs. Preserve source token position and occurrence identity if the UI is intended to show the verse itself.

### Lazy loading still repeats work and downloads a large index

[ensureChapter](docs/assets/parallelismus/frontend/db.js:112) caches completed data but not an in-flight promise. Whole-chapter rendering concurrently calls `fetchWords` once per verse. Five concurrent reads produced five fetch calls for the same chapter; browser HTTP caching may reduce transfers, but application-level work is still duplicated. Cache in-flight requests and evict failed promises so retry works.

The startup index is 6.76 MiB uncompressed, despite the builder comment describing approximately 200 KB. It includes every global word variant. Consider separating navigation metadata, search data, and usage data once measured startup performance warrants it. Relation lookups also call `getAll()` repeatedly despite having source and target indexes; use indexed lookups or a relation adjacency map as annotations grow.

### Error handling can report failed operations as successful

[Backend addRelation](docs/assets/parallelismus/frontend/app.js:44) does not check `res.ok`; an HTTP 422 probe returned an error body as a normal result. The UI then labels that result “Relation added.” Require successful status and validated response shape before displaying success.

[initDB](docs/assets/parallelismus/frontend/db.js:74) retains a rejected initialization promise indefinitely, preventing a same-page retry after a transient failure. Its IndexedDB opening logic also lacks blocked-upgrade handling and a version-change lifecycle. Give initialization and storage failures visible recovery paths instead of relying on global error handlers.

### Embedded styles and DOM operations lack isolation

[styles.scss](docs/assets/parallelismus/frontend/styles.scss:11) targets `body`, `header`, and other global selectors, while the [embed loader](docs/assets/parallelismus-embed.js:48) appends that stylesheet to the host document. Those rules can restyle the surrounding site. Document-wide ID lookups, selection queries, keyboard handlers, and hash routing also assume a single application owns the page. Scope the styles and queries to a component root; use a mount/unmount lifecycle or an iframe if page-level isolation is preferred.

### HTML handling needs repair without overstating the security finding

[escapeHtml](docs/assets/parallelismus/frontend/dom-utils.js:11) matches runs of special characters but switches on individual characters. A run such as `&&` or `<>` falls into the default branch and disappears. Remove the regex quantifier or use DOM text nodes.

The [Strong detail page](docs/assets/parallelismus/frontend/strong.static.html:90) concatenates corpus variants directly into HTML. Those fields currently originate from checked-in corpus data, so this is an unsafe trust boundary rather than an established arbitrary-user XSS exploit. Render them as text, and keep imported or externally sourced content out of HTML sinks.

### The current diagnostic is unsafe as an automated test

[test_import_quick.py](docs/assets/parallelismus/backend/test_import_quick.py:1) creates tables and writes test rows into the configured application database at module import time. It copies importer logic instead of invoking the real importer and has no isolated database fixture. Running test discovery can therefore mutate local application data. Replace it with isolated tests against a temporary database and production import functions.

There is no submodule CI workflow or npm test script. The graph PNG tool additionally imports matplotlib and NetworkX without declaring them in the backend requirements, and its `DiGraph` collapses different relation types between the same endpoints. Use a multigraph if that export must preserve all assertions.

## Recommended implementation order

1. Make relation import atomic and validate backup contents. Add regressions for invalid replacement, transaction abort, and preservation of existing annotations.
2. Correct evidence-verse selection and source-link navigation. Test a whole-chapter selection outside verse 1 and navigation to a later source verse.
3. Define relation creation rules, enforce them in both adapters, and make grouped writes atomic. Protect writes before operating a shared backend.
4. Fix Strong usages with a complete reverse index, and introduce stable verse keys plus versioned backups before changing the corpus.
5. Repair the seed and importer with isolated, repeatable database tests. Add importer interruption and retry coverage.
6. Consolidate the UI and keep explicit static/API adapters. Remove or update stale TypeScript, then add adapter contract checks.
7. Fix embedded URL construction and CSS scope. Add a small browser smoke suite for standalone and host-page operation.
8. Add a compact CI gate covering the supported Python setup, static build including CSS, key data invariants, storage rollback, and source navigation. Optimize index loading and relation queries using measurements.

The strongest code no-gos are deleting user data before replacement succeeds, deriving evidence from unrelated UI state, treating cache contents as complete query results, skipping partially imported books as though they were complete, and reporting success before storage or HTTP success is established. These are concrete correctness and reliability problems rather than style preferences.
