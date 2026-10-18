# Local Codex CLI Korean notes routine

Work only from the JSON files in this worker's `work/pending/` and the instructions in `prompts/`. Each worker has a separate directory containing only its assigned releases. Do not browse for additional claims, run Git commands, commit, push, or change files outside `work/out/`.

For each JSON file in `work/pending/`, read its `input` and write `work/out/<same file name>` containing `{"id": <id>, "hash": <hash>, "output": {...}}`.

- Follow `prompts/ko-notes.md` and `prompts/ko-notes.schema.json` exactly. Use only the supplied source text and screenshot candidates.
- `items` must cover every input item with the same index. `features` must cover every item with `needs_detail: true`.
- Do not invent UI labels, commands, values, screenshots, or claims absent from the input. Leave example fields empty when the source does not support them.
- The local runner validates and merges your files after you finish.
