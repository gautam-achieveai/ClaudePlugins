# External research memory

Use a supplied memory service, document store, database or knowledge graph through its actual available tools. Do not invent APIs, install a provider, or require one for local research. Existing user authorization still governs reads and writes.

## Choose one authority

Search the supplied scope for the study and relevant lessons first. Inspect actual capabilities: stable identities, full record readback, provenance/links, history or immutable replacement, and scoped retrieval. Check how concurrent writes are detected or serialize writers.

- **External canonical:** suitable existing research store with these capabilities. Keep full records there. A local cache is explicitly a cache with provider URI, version and retrieval time.
- **Local canonical:** portable study records remain authoritative. An external service may hold a searchable index or explicit exported snapshot, with links back to the canonical study. Do not maintain two independently editable truths.

Record the choice, study namespace, canonical URI/path and provider identity in the study's existing home document. For a local study, an optional `artifacts/memory-link.md` suffices. Keep credentials out. The CLI does not interpret this pointer or synchronize providers.

## Map the contract

Preserve study ID, record ID, kind, creation time, content fields, typed links, supersession and source references. A native document/database row can carry these fields; a JSON attachment can preserve them if native fields cannot. Embeddings and summaries are retrieval aids, not substitutes for original evidence.

Retrieve relevant lessons **and** contrary evidence, conditions and versions. Cite stable record URIs/IDs. If the provider returns only summaries or cannot expose history, treat it as an index/cache, not sufficient authority for revising a thesis.

Use `export` for a portable `{schemaVersion, study, records}` snapshot. Use `validate --file` on a compatible retrieved snapshot. This proves structural integrity only. Native formats require equivalent checks through available provider tools; do not claim the CLI verified an incompatible format.

## Write and recover

1. Prepare records with stable IDs. Preserve earlier versions; use provider revision checks when available.
2. Perform authorized writes using native tools. Read back IDs, content and links; retain receipt/version references.
3. If the call's outcome is uncertain, look up the stable ID before retrying. A request sent is not proof of a saved record.
4. If the authoritative service is unavailable, label available context stale. Keep any work as an explicit pending draft with its base version. Do not silently switch authority or claim synchronization.
5. On reconnection, reconcile changes against the current canonical version. Surface conflicting edits; do not use last-write-wins to erase contradictory research.

Use a confirmed, user-authorized transfer to change authority. Verify snapshot completeness and readback before changing the pointer. The plugin ships no background sync, provider credentials, or universal memory adapter. Local storage and the common contract remain usable without them.
