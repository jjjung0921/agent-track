# Codex Cloud Korean notes routine

Run this task in the `jjjung0921/agent-track` Codex Cloud environment. Use only the release data already in the repository; do not browse for additional claims. Write Korean notes for up to eight pending releases per run. Preserve unrelated work.

1. From the latest `main`, install dependencies and list pending releases:
   ```bash
   npm ci
   node scripts/pending.mjs 8
   ```
   If it prints `nothing pending`, stop without a commit.
2. For each file in `work/pending/`, read `input` and write `work/out/<same file name>` containing `{"id": <id>, "hash": <hash>, "output": {...}}`.
   - Follow [`ko-notes.md`](ko-notes.md) and [`ko-notes.schema.json`](ko-notes.schema.json) exactly. Use only the supplied source text and screenshot candidates.
   - `items` must cover every input item with the same index. `features` must cover every item with `needs_detail: true`.
   - Do not invent UI labels, commands, values, screenshots, or claims absent from the input. Leave example fields empty when the source does not support them.
3. Validate and merge:
   ```bash
   node scripts/apply-ko.mjs
   npm test
   ```
   Correct any `FAIL` output and rerun validation. Inspect the diff; only `data/ko.json` should change.
4. Commit only the note cache with `data: Korean notes (Codex Cloud)` and push to `main` if repository write access is available. If direct push is unavailable, open a pull request containing only `data/ko.json` and report that publication waits for its merge. A push to `main` triggers the update and deploy workflow, which copies the notes into the site data.
