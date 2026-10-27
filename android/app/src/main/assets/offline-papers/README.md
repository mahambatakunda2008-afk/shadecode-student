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
- Cambridge International's official guidance says it does not grant permission to publish past papers on websites and does not grant permission for electronic publication of complete papers/questions/mark schemes. See [Cambridge reproduction FAQ](https://help.cambridgeinternational.org/hc/en-gb/articles/203544371-Can-I-reproduce-Cambridge-past-examination-papers-on-the-school-s-website-my-website) and [permission FAQ](https://help.cambridgeinternational.org/hc/en-gb/articles/115004418469-How-do-I-apply-for-permission-to-use-Cambridge-copyright-material). Do not bundle Cambridge papers based on the assumption that public access permits redistribution.
- ZIMSEC redistribution terms have not yet been verified for Shadecode's intended distribution model. Keep ZIMSEC papers out of the APK until the rights position is documented.
- Keep the source and permission/licence record in the project’s release evidence.
- Use the required attribution exactly.
- Calculate SHA-256 from the final PDF bytes. The importer rejects missing metadata, invalid paths, non-PDF files, oversized files and checksum mismatches.
- Prefer a small, subject-balanced starter pack over a large APK. Pack size and licence terms must be reviewed before release.
- Never add learner data, signed URLs, credentials or account-specific files to this directory.

Currently, `index.json` contains no papers. Downloaded papers can still be saved to the device from Exam Hub when online, then reopened offline.
