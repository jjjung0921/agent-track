# Korean notes routine

Runs in Claude Code cloud on a schedule. It writes Korean notes for releases that don't have them yet, without an API key.

1. Update and install:
   ```bash
   git pull --rebase
   npm ci
   ```
2. List the work. If it prints `nothing pending`, stop here without committing.
   ```bash
   node scripts/pending.mjs 8
   ```
3. For each file in `work/pending/`, read its `input` and write `work/out/<same file name>` containing
   `{"id": <id from the pending file>, "hash": <hash from the pending file>, "output": {...}}`.
   - `output` follows the rules in `prompts/ko-notes.md` and must match `prompts/ko-notes.schema.json` exactly (no extra keys).
   - Use only the text in `input`. Do not look anything up, and do not invent menu names, screens, values or numbers.
   - `items` has one entry per input item, with the same `index`.
   - `features` has one entry per input item with `needs_detail: true`.
4. Validate and merge. Rewrite any file reported as `FAIL` once, then run it again.
   ```bash
   KO_MODEL=claude-haiku-5-5 node scripts/apply-ko.mjs
   ```
5. Commit only the notes cache and push:
   ```bash
   git add data/ko.json
   git commit -m "data: Korean notes (cloud routine)"
   git pull --rebase
   git push
   ```
   The push starts the GitHub Actions workflow, which merges the notes into the site and deploys it.
