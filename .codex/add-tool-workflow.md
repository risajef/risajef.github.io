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

   Match the existing `docs/tools/reverse-chart.*.md` pattern: front matter with tags, `github`, `page_type: iframe`, `lang`, and an iframe pointing to `/assets/NAME/`.

3. Update `mkdocs.yml`.

   - Add the tool under `nav > Tools`.
   - Add redirects for `programming/NAME` and `de/programming/NAME`.
   - Add translation labels under both `extra.translations.en.nav` and `extra.translations.de.nav`.

4. Check local status and leave the final commit/push to the user unless they explicitly ask for it.

   ```bash
   git status --short
   git submodule status
   ```

## Do Not

- Do not add the workflow note to website navigation.
- Do not commit or push unless the user explicitly asks.
