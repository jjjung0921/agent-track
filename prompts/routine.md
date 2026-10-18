# Local Codex CLI Korean notes routine

Work only from the checked-out release data and the JSON files already prepared in `work/pending/`. Do not browse for additional claims, run Git commands, commit, push, or change files outside `work/out/`.

For each JSON file in `work/pending/`, read its `input` and write `work/out/<same file name>` containing `{"id": <id>, "hash": <hash>, "output": {...}}`.

- Follow `prompts/ko-notes.md` and `prompts/ko-notes.schema.json` exactly. Use only the supplied source text and screenshot candidates.
- `items` must cover every input item with the same index. `features` must cover every item with `needs_detail: true`.
- Do not invent UI labels, commands, values, screenshots, or claims absent from the input. Leave example fields empty when the source does not support them.
- Do not run `scripts/pending.mjs`: it clears `work/out/`. The local runner validates and merges your files after you finish.
