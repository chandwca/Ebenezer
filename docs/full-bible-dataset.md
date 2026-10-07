# Full Bible preparation

The first full-Bible expansion step is complete: the World English Bible Classic text for the standard 66-book Old and New Testament is stored in `apps/web/data/bible/full.json`. The official ecumenical archive also contains additional books; those are outside this explicitly selected scope.

Source: https://ebible.org/Scriptures/eng-web_html.zip
Public-domain notice: https://ebible.org/eng-web/copyright.htm

The dataset contains 1,189 chapters and 31,103 numbered verse markers. Some markers have no main-body text in this edition; their text is retained as an empty string and their references are listed in `emptyVerseMarkers`. Footnotes are excluded, and text is never substituted from another translation. Whitespace is normalized; punctuation and wording are preserved. Each chapter records its source URL and HTML SHA-256. `manifest.json` binds the complete generated dataset to its checksum and byte count.

## Reproduce

From the repository root, download and extract the official archive into the ignored source cache, then prepare the dataset:

```sh
curl --fail --silent --show-error https://ebible.org/Scriptures/eng-web_html.zip -o /tmp/ebenezer-web.zip
mkdir -p apps/web/scripts/bible/.source-cache/full
unzip -q -o /tmp/ebenezer-web.zip '*.htm' -d apps/web/scripts/bible/.source-cache/full
pnpm --filter @ebenezer/web bible:dataset:full
pnpm --filter @ebenezer/web test:bible
```

Preparation fails if any expected chapter file is missing or verse markers are out of order. A refreshed source archive can change generated checksums; review those changes before regenerating embeddings.

## Full passage index

`bible:embed:full` uses the same pinned multilingual-e5-small model entirely locally, including its cached weights. It groups source narrative paragraphs and consecutive poetry lines, then splits longer blocks at verse boundaries around 256 tokens. Every input is checked against the model's actual 512-token limit. A single verse that exceeds that limit fails explicitly rather than being truncated. Source chapter checksums must match the prepared dataset.

There are no newly invented editorial summaries. This index embeds Scripture only. Empty verse markers do not become search entries. Each nonempty verse must appear exactly once in the index, and full chapter context remains available in the dataset.

Artifacts in `apps/web/data/bible/`:

- `full.json`: verified chapter text and source metadata.
- `manifest.json`: dataset counts, checksum, and size.
- `index.json`: passage text, references, token counts, model revision, and checksums.
- `vectors.f32`: normalized 384-dimensional vectors encoded as little-endian Float32, in index passage order (1,536 bytes per passage).

```sh
pnpm --filter @ebenezer/web bible:embed:full
pnpm --filter @ebenezer/web test:bible:full
pnpm --filter @ebenezer/web bible:evaluate:full
```

The full-index test verifies checksum binding, vector dimensions and normalization, passage text against the chapter dataset, and complete nonduplicated coverage of nonempty verses.

## Relevance comparison

`bible:evaluate:full` searches the full index and the original 50-passage context index with the same queries, including “I feel loved”, “I feel unloved”, and “I want to feel loved”. It writes `docs/bible-search/full-evaluation.json`. Model setup is excluded from timing; inference and ranking are included. This is desktop Node performance, not a phone benchmark.

The report contains unfilled human review fields. Similarity is not confidence. More coverage does not establish that a result is helpful or that opposite emotions are understood correctly. This comparison changes coverage, passage grouping, and context strategy together, so it cannot isolate which change improves relevance. Unrelated queries still return candidates; calibrated rejection is not implemented.

## React experimental option

Open `/bible-search`, choose **Full Bible — experimental** under Search approach, and submit a sentence. The original 50-passage context and Scripture-only options remain available. Switching options and languages preserves the query. The completion message labels the option that produced the visible results.

Vite serves the full artifacts in development and emits them for production under content-versioned `/bible/full/` URLs. A small manifest points to the matching dataset, index, and binary vectors. These files are deliberately excluded from initial service-worker precaching. The worker downloads and caches the optional package on first full-Bible search, verifies checksums, exact Scripture, coverage, and vector normalization, then searches locally with the same model used by the sample. Successful cached initialization enables subsequent offline search. Production offline reopening still requires the app's offline-ready message as well as one completed online full-Bible search.

The optional package is about 24.8 MB uncompressed, in addition to the shared model of about 145 MB. Browser caches can be removed by the user or browser; this is not permanent storage. Superseded content-versioned package entries are retained for compatibility; bounded cache cleanup remains future work.

Full results do not display invented editorial summaries. Read chapter opens the verified full chapter with selected verses highlighted; footnote-only empty verse markers are labelled explicitly. Experimental suggestions may still be unsuitable, including for opposite feelings or unrelated inputs. No paid AI service is called, and descriptions stay on the device.

The production Chrome integration check confirms full-index result references match the recorded Node fixture for “I feel loved”, full-chapter reading, and full-Bible search after a fresh offline reload. Physical phone performance remains untested.

## First completed run

The generated index contains **9,534 passages**. Raw artifacts total about **24.80 MB**: 4.95 MB chapter dataset, 5.20 MB passage metadata/text, and 14.64 MB vectors. This excludes the already-used embedding model and application assets; an eventual download may be compressed and need not duplicate passage text. These artifacts are preparation outputs, not a finalized offline package.

The first 23 evaluation sentences ran successfully. The report now also includes the exact user test sentence “I am unloved”. On this machine, median inference-plus-ranking time was 26 ms and the maximum was 138 ms; setup and file validation were excluded.

Observed relevance issues prevent recommending this index as the app default yet:

- “I feel loved”: Song of Solomon 4:1, Song of Solomon 3:1, Jeremiah 31:3. The last result directly expresses enduring love, while the first two concern romantic love and need context-sensitive review.
- “I feel unloved”: Luke 14:20, Song of Solomon 3:1, 1 Corinthians 9:27. This result set does not reliably address the expressed feeling.
- “I am exhausted from caring for my family and need rest”: Psalms 95:11, Hebrews 13:18–19, Hebrews 13:22–23. Broader coverage did not produce the desired rest/comfort results.
- The unrelated keyboard question still retrieves Scripture instead of declining to suggest a passage.

These are direct inspections of the recorded results, not a formal human-reviewed accuracy score. The next quality experiment should compare grouping and retrieval strategies on this fixed query set, consider lexical-plus-semantic ranking and alternative embedding models, and develop an evaluated unrelated-input response. Preserve verified text and the full chapter reader throughout. Do not assume that a larger index or a particular similarity threshold solves emotional understanding.
