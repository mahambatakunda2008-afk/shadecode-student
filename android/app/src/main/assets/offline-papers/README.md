# Bundled offline past-paper packs

The Android app imports entries from `index.json` into its private offline library at launch. The manifest is intentionally empty until Shadecode has documented permission or a suitable redistribution licence for real board papers.

For each authorized PDF, add it beneath this directory and add an object to `index.json`:

```json
[
  {
    "id": "stable-pack-paper-id",
    "assetPath": "offline-papers/example-paper.pdf",
    "title": "O Level Mathematics Paper 1",
    "subject": "Mathematics",
    "board": "Board name",
    "level": "O Level",
    "session": "June",
    "year": 2025,
    "paperNumber": 1,
    "variant": 1,
    "kind": "qp",
    "sha256": "64-character-lowercase-sha256",
    "source": "Official source or rights-holder record",
    "licence": "Exact licence or written permission reference",
    "attribution": "Required attribution text"
  }
]
```

## Pack admission rules

- Do not bundle a paper merely because its PDF can be downloaded publicly.
- Keep the source and permission/licence record in the project’s release evidence.
- Use the required attribution exactly.
- Calculate SHA-256 from the final PDF bytes. The importer rejects missing metadata, invalid paths, non-PDF files, oversized files and checksum mismatches.
- Prefer a small, subject-balanced starter pack over a large APK. Pack size and licence terms must be reviewed before release.
- Never add learner data, signed URLs, credentials or account-specific files to this directory.

Currently, `index.json` contains no papers. Downloaded papers can still be saved to the device from Exam Hub when online, then reopened offline.
