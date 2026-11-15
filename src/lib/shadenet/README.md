# ShadeNet

ShadeNet is Shadecode Student's optional peer-assisted educational content network.

## Data boundaries

- Personal study state stays device-first.
- Private Cortex memory, tasks, scores, and account data are not advertised.
- Shareable resources require an explicit sharing policy.
- Device discovery is disabled by default.
- Replication is disabled by default.
- Peers are untrusted transport; received content is accepted only after final SHA-256 verification.

## Network model

1. Check the local resource cache.
2. If missing, discover opted-in peers advertising the resource.
3. Establish a short-lived signaling session when a peer connection is needed.
4. Transfer resource chunks directly over WebRTC where available.
5. Reassemble and verify the content hash.
6. Cache verified content locally.
7. Fall back to another peer or the cloud backup/control path when necessary.

The cloud is a control/backup path, not the default carrier for peer-shareable content.


## Open web knowledge search

ShadeNet's learner-facing Knowledge Search can query the public web through a server-side search provider. Configure one provider key on the deployment:

- `BRAVE_SEARCH_API_KEY` (preferred when both keys exist), or
- `TAVILY_API_KEY` (fallback).

Keys must remain server-side and must never use a `NEXT_PUBLIC_` prefix. The authenticated `/api/shadenet/web-search` endpoint applies a per-user/IP rate limit, validates that the requested subject is enrolled, bounds query/result sizes, and returns HTTPS-only public result URLs. If no provider key is configured or the learner is offline, local ShadeNet search continues to work.

Search results are deliberately labelled **unverified**. Brave returns search-result excerpts; Tavily is asked for provider-extracted page text where available, with a strict 12,000-character cap. Neither is independently verified and neither may be represented as official Cambridge/ZIMSEC curriculum or teacher-approved material. Every result retains its original URL and publisher hostname so a learner can inspect the source.

This is the first open-web retrieval layer. Provider-extracted page text is now surfaced when Tavily supplies it. Direct arbitrary URL fetching, dedicated PDF extraction, cross-source corroboration, source freshness evaluation and saving reviewed pages into the learner's library remain subsequent integration work. No page is silently scraped or treated as authoritative by this search adapter.


## Full-page and PDF reading

Learners can request **Read full page / PDF** from a search result. The authenticated `/api/shadenet/read-document` route reads public HTTPS HTML pages and PDFs, extracts readable text and returns it as an unverified ShadeNet resource with its original source URL, publisher, retrieval time and document metadata.

Safety and resource limits:

- HTTPS only; reject localhost, private/internal hostnames and DNS results containing private/reserved IP addresses.
- Revalidate every redirect destination and allow at most three redirects.
- Only HTML/XHTML and PDF content types are accepted.
- Downloads are capped at 8 MB and fetches time out after 12 seconds.
- PDF extraction uses the first 20 pages and caps extracted text at 40,000 characters.
- HTML extraction removes scripts, styles, navigation and common non-content regions.
- Login-only, paywalled, blocked, malformed or image-only documents may not yield readable text.
- Extracted material remains **unverified**. It is not automatically saved as an official curriculum source or teacher-approved resource.

This is a bounded reader, not a general-purpose crawler. It reads only a source the learner explicitly selects from the search results.
