# Add Tool Workflow

Use this note for this website repository (`risajef.github.io`) when adding another static tool.

## Required Local Changes

1. Add the repository as a submodule under `docs/assets/NAME`.

   ```bash
   git submodule add https://github.com/risajef/NAME.git docs/assets/NAME
   ```

2. Add iframe pages in both languages.

   - `docs/tools/NAME.de.md`
   - `docs/tools/NAME.en.md`

   Match the existing `docs/tools/reverse-chart.*.md` pattern: front matter with tags, `github`, `page_type: iframe`, `lang`, and a titled iframe pointing to `/assets/apps/SLUG/` (or its declared nested entry path).

   Apps are trusted same-origin components. Keep their scripts and styles inside the iframe; do not inject fetched application HTML into the theme. See the README's application trust policy.

3. Update `mkdocs.yml`.

   - Add the tool under `nav > Tools`.
   - Add redirects for `programming/NAME` and `de/programming/NAME`.
   - Add translation labels under both `extra.translations.en.nav` and `extra.translations.de.nav`.
   - Exclude the submodule source tree in `exclude_docs`; only the staged runtime artifact is published.

4. Add an `EmbeddedApp` to `scripts/build_tools.py`.

   - Declare the source path, published slug, entry path, and build kind.
   - Node builds need a committed lockfile and must build in the temporary source copy.
   - COPY and custom builds need explicit `publish_paths` matching runtime files only. Include module files, data, workers, and license notices that the app actually requires.
   - Never publish the entire source tree or add a new denylist exception.
   - Check staged HTML dependencies and the output manifest's missing-file detection.

5. Add news entry.

   - Add entry to `index.de.md` and `index.en.md` news section
   - Summarize what the tool does and link it

6. Verify with `npm test`, `npm run test:browser`, and `npm run build`. If spoken content changed, follow the README runtime publication and lock procedure. Deployment is an explicit manual dispatch after committing and pushing.

7. Check local status and leave the final commit/push to the user unless they explicitly ask for it.

   ```bash
   git status --short
   git submodule status
   ```

## Do Not

- Do not add the workflow note to website navigation.
- Do not commit or push unless the user explicitly asks.
