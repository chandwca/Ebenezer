# Bible search experiment

We are building this experiment on the current branch. The existing journal and PWA continue to work. Dataset preparation and Node embedding generation are complete. The React search UI is now implemented at `/bible-search`.

## Step 1 — prepare the sample (complete)

- 50 passages from 41 complete chapters of the World English Bible Classic.
- Source: https://ebible.org/eng-web/. Public-domain text; permissions: https://ebible.org/eng-web/copyright.htm.
- Dataset: `apps/web/public/bible/sample.json` (about 267 KB before compression).
- Each passage has a stable ID, reference, verse range, source URL, exact extracted text, and a separate editorial context summary.
- Each chapter has its complete numbered verse text, source URL, and SHA-256 of the downloaded HTML snapshot.
- Extraction removes navigation, verse markers, headings, and footnotes and normalizes whitespace. Bible wording is not paraphrased. Scripture and our context summaries remain distinct fields.
- Verification means matching the selected text to the extracted official source, checking every verse in each requested range, and validating ordering/unique IDs. Context summaries await independent editorial/theological review.
- The selection spans situations such as anxiety, belonging, gratitude, weariness, grief, and uncertainty. This is a sample collection, not the whole Bible and not an emotion-to-verse mapping table.

Regenerate and check:

```sh
pnpm --filter @ebenezer/web bible:dataset
pnpm --filter @ebenezer/web test:bible
```

First generation needs internet. Later runs use downloaded HTML in the ignored `scripts/bible/.source-cache/`. Delete specific cached chapter files only when deliberately refreshing the source; preserve the committed dataset for reproducible evaluation.

## Step 2 — generate embeddings (complete)

Transformers.js 3.8.1 is installed. The model is `Xenova/multilingual-e5-small`, pinned to revision `761b726dd34fb83930e26aab4e9ac3899aa1fa78`, with q8 ONNX weights, mean pooling, normalization, and 384-dimensional embeddings. Inputs use `passage: ` for documents and `query: ` for user searches. Inputs exceeding 512 tokens are rejected rather than silently truncated. No model training occurs.

Two complete indexes are in `apps/web/public/bible/`: `embeddings-scripture.json` and `embeddings-context.json` (about 221 KB each). The second indexes the separate editorial summary plus Scripture; displayed Scripture remains exact. Both record the model configuration, dataset SHA-256, strategy, and generation timestamp. Tests reject stale indexes, duplicate IDs, incompatible dimensions, and invalid/non-normalized vectors.

Downloaded model files are about 145 MiB on this development computer and remain in the ignored `scripts/bible/.model-cache/`. They are not committed or included in the website build. Browser model downloads are cached separately in Cache Storage after an explicit search. Production asset caching includes the matching self-hosted WASM runtime and the sample/index files. The same revision, q8 artifact, tokenization, pooling, and normalization must be used by the future browser worker; Browser-versus-Node retrieval is checked for the exhaustion fixture; broad numeric parity and physical phone performance still need evaluation.

Commands:

```sh
pnpm --filter @ebenezer/web bible:pin-model
pnpm --filter @ebenezer/web bible:embed
pnpm --filter @ebenezer/web bible:evaluate
pnpm --filter @ebenezer/web bible:search "I feel disconnected after moving home."
pnpm --filter @ebenezer/web test:bible
```

Pinning initially fetches the model revision; embedding initially downloads the model. Evaluation and interactive CLI search use the cached model with remote access disabled, so no AI-service calls occur. If the local model cache is absent, run embedding generation online first. Do not regenerate the dataset without regenerating its indexes afterward.

### Initial results

The saved report is [bible-search/evaluation.json](bible-search/evaluation.json). Twenty example queries ran locally, including three non-English examples and two ambiguous/unrelated inputs. Both strategies matched at least one manually selected candidate in 9 of 18 scored cases. This is candidate agreement, not an accuracy measurement; other returned passages may be relevant, and all suggestions need human/context review. Adding our current context summaries did not improve this aggregate measure.

For exhaustion, the context index retrieved Psalms 61:1–4, Matthew 11:28–30, and Psalms 42:1–5. For returning home, it retrieved Ephesians 2:17–22, Jeremiah 29:10–14, and Luke 15:17–24. For the unrelated laptop-keyboard question, it still returned Scripture, confirming that nearest-neighbor ranking does not know when to abstain. We have not implemented or calibrated a rejection threshold. Do not treat scores as percentages or as divine guidance.

Before integration, review results for relevance and proper context, improve any misleading editorial summaries, and test whether better document grouping or another model is needed. There are no per-query AI API fees in this local setup. No Python backend, cloud chatbot, Redis, or vector database is required.

## Step 3 — React search screen (complete)

Open `/bible-search`, or Today → Find a Word. Shared FormBuilder validates the description (3–2,000 characters) and provides a strategy selector. The interface, errors, accessibility labels, and progress are translated in bundled English/Spanish `bible` namespaces. Changing language retains input. Download size and on-device privacy are disclosed before searching.

`src/lib/bible/search.worker.ts` loads and checks the dataset SHA-256 and pinned model configuration, runs q8 inference in WASM, applies mean pooling and normalization, and ranks the stored passage vectors. The same `scripts/bible/search-core.mjs` ranking and validation functions are used by Node and the browser. Inputs above 512 model tokens are rejected without truncation. Work runs outside the UI thread; cancellation/navigation terminates the worker and releases its memory.

Three result cards show exact Scripture, an explicitly editorial context summary, a similarity score labeled as not confidence, and an online source link. The in-app chapter reader displays the complete stored chapter and highlights the selected range. The experiment remains separate, while the journey now reuses its worker and contextual sample index to bring a passage forward automatically; see the integration section below.

First use downloads the pinned model files from Hugging Face. User descriptions are never included in remote requests or persisted to a journal. Model files use `ebenezer-bible-model-<revision>` Cache Storage; the dataset/index uses `ebenezer-bible-data-v1`. Offline-ready model status is shown only after checking all four required model files exist in the cache. Browser storage must be available; setup errors preserve text and allow retry.

The matching WASM runtime is served by Vite during development and emitted into the production build, rather than fetched from a CDN. It adds about 21.6 MB uncompressed to production assets. The 145 MB model is optional/on-demand and not bundled with deployment. Production service-worker precaching includes worker code, runtime, translations, and sample/index files. After a first successful online setup, offline reload creates a fresh worker using cached data/model/runtime.

Verification:

```sh
pnpm check
pnpm --filter @ebenezer/web test
pnpm --filter @ebenezer/web test:bible
pnpm --filter @ebenezer/web test:bible-browser
```

The browser smoke test uses installed Chrome in a temporary profile and a local production server. It downloads the model, retrieves relevant passages for exhaustion, opens the full chapter, and performs another search after network-disabled reload. Existing draft recovery and PWA update tests run too. Unit tests cover validation, failure/cancellation, reader rendering, and language/input preservation. The fixture returned the same three ranked passages as the Node report; browser inference/ranking took 236 ms in one Chrome run on this development machine, excluding initial setup/download. This is not a phone benchmark. Actual Android/iPhone performance remains a manual test.

## Step 4 — evaluate

Twenty exploratory cases are in `apps/web/scripts/bible/evaluation-cases.json`, including English, Spanish, Hindi, Chinese, ambiguous text, and an unrelated question. Candidate passage IDs are manually selected review aids, not objectively correct answers.

Measure top-three usefulness with human review, latency, initial download size, memory/device behavior, and offline reload. Similarity is not a probability or theological validation. Ambiguous and unrelated inputs are important: nearest-neighbor search always returns candidates unless we add and evaluate abstention behavior.

Expand to the entire Bible only after the sample demonstrates useful results. Whole-Bible coverage and integrated journey redesign remain separate work from this initial dataset preparation.

## Full-Bible expansion

The YouVersion API comparison is deferred at the user's request. Continue using the local World English Bible pipeline. See [full Bible preparation and evaluation](full-bible-dataset.md) for the 66-book source dataset, paragraph splitting, compact vector index, and comparison with the original sample. The React screen now offers **Full Bible — experimental** alongside the original sample; the optional full package is downloaded and cached on first use. Relevance remains experimental.

## Journey integration

`useJourneyWord` now reuses the browser worker with the person's check-in plus selected feelings and an encouragement-oriented query. It searches the 50 verified passages with editorial context, automatically carries the top result into Find/Read, and offers the other results without a selection form. It is not LLM interpretation and does not use raw whole-Bible similarity as supportive guidance. Saved Scripture snapshots include the full chapter, survive backup import, and open offline in the journey and stone dialog. Initial model setup needs internet; an explicitly chosen bundled KJV care fallback keeps the journal usable.

Run `node apps/web/scripts/offline-smoke.mjs --journey-bible` after a web build to check real WASM inference in the journey, offline chapter opening/reloading and saving the exact passage with a stone. This mode seeds a temporary browser model cache from the existing pinned Node artifacts in the ignored `.model-cache` directory; it checks inference and offline behavior, not remote download availability. It does not alter the developer's browser journal. Unit tests cover query inputs, auto-selection, alternate results, language switching, late-response cancellation, failure fallback, snapshot validation and backup round-trip. Independent relevance/theological review and physical-device performance remain outstanding.
