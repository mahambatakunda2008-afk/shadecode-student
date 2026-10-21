# Official source discovery log: 2026-10-21

**Scope:** targeted discovery for Cambridge International AS & A Level 2028–2030 and ZIMSEC Computer Science 4021.
**Boundary:** this is a discovery record, not a claim that the PDFs have been downloaded, hashed, extracted, reconciled, or ingested into Shadecode Student.

## Cambridge AS & A Level, exams 2028–2030

The official Cambridge subject pages list the new 2028–2030 syllabus alongside older versions. Cambridge's published guidance says the syllabus year refers to the year the candidate takes the exam: candidates sitting in 2027 use the 2025–2027 syllabus, while candidates sitting in 2028 use the 2028–2030 syllabus.

- **Biology 9700**
  - Official subject page: https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-biology-9700/
  - Direct official PDF: https://www.cambridgeinternational.org/Images/744622-2028-2030-syllabus.pdf
  - Discovery result confirms the PDF content identifies Biology 9700 for 2028–2030 and includes numbered learning outcomes. It is not a substitute for downloading and checking the complete document.
- **Chemistry 9701**
  - Official subject page: https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-chemistry-9701/
  - Direct official PDF: https://www.cambridgeinternational.org/Images/744624-2028-2030-syllabus.pdf
  - Discovery result confirms the PDF content identifies Chemistry 9701 for 2028–2030 and contains detailed numbered learning outcomes. Complete extraction and reconciliation remain outstanding.
- **Physics 9702**
  - Official subject page: https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-physics-9702/
  - Direct official PDF listed in the current repository queue: https://www.cambridgeinternational.org/Images/744626-2028-2030-syllabus.pdf
  - The exact URL is a candidate official source from the queue. Retrieval, response validation, byte hash, page count and content review remain outstanding in this workflow.
- **Mathematics 9709**
  - Official subject page: https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-mathematics-9709/
  - Direct official PDF listed in the current repository queue: https://www.cambridgeinternational.org/Images/744634-2028-2030-syllabus.pdf
  - The subject has route-specific combinations, so verification must preserve the route and component matrix rather than flattening all content into one route. Cambridge's official page notes the two A Level route patterns: Pure Mathematics + Probability & Statistics, or Pure Mathematics + Mechanics + Probability & Statistics. Retrieval, byte hash, page count and full reconciliation remain outstanding.

### Official exam-year guidance

Cambridge's help centre states that candidates taking exams in 2027 use the 2025–2027 syllabus and candidates taking exams in 2028 use the 2028–2030 syllabus:
https://help.cambridgeinternational.org/hc/en-gb/articles/37190057441298-General-FAQ-Which-syllabus-year-should-I-use

**Important:** Cambridge's official subject pages describe substantive syllabus updates, including clarified learning outcomes and topics added, removed, or moved between AS and A Level. Do not assume that a topic-name match means the old and new editions are equivalent. These 2028–2030 PDFs must not be relabelled as the 2025–2027 or 2026–2027 syllabus packs. Keep each edition separately versioned and selected by the student's exam year.

## ZIMSEC Computer Science 4021

The official ZIMSEC site surfaced pages titled **Computer Science 4021/01** and **Computer Science 4021/02**, each created/updated on 9 March 2026:

- Paper 1 page: https://www5.zimsec.co.zw/download/computer-science-4021-01/
- Paper 2 page: https://www5.zimsec.co.zw/download/computer-science-4021-02/
- Official syllabus catalogue: https://www5.zimsec.co.zw/syllabi/

The surfaced 4021/01 and 4021/02 pages are labelled as individual papers, not an explicitly identified syllabus document. They must **not** be mistaken for the full 2024–2030 syllabus or used to mark the syllabus verified. Next retrieval task: inspect the official syllabus catalogue, identify the exact syllabus document and edition, download the complete file, and record its metadata and hash. If the catalogue does not expose the syllabus document publicly, record the access block and request the document through an authorized route.

## Current evidence state

| Source target | Authority page identified | Direct candidate document URL identified | Bytes retrieved and hashed here | Full extraction/reconciliation complete |
| --- | --- | --- | --- | --- |
| Cambridge Biology 9700, 2028–2030 | Yes | Yes | No | No |
| Cambridge Chemistry 9701, 2028–2030 | Yes | Yes | No | No |
| Cambridge Physics 9702, 2028–2030 | Yes | Yes, candidate from queue | No | No |
| Cambridge Mathematics 9709, 2028–2030 | Yes | Yes, candidate from queue | No | No |
| ZIMSEC Computer Science 4021, 2024–2030 | Yes, catalogue | Not yet confirmed | No | No |

This table deliberately distinguishes source discovery from artifact retrieval. No curriculum database status should change based on this log alone.

## Next execution sequence

1. Retrieve each exact official PDF through an available, authorized fetch path.
2. Validate HTTP status, content type, byte length, PDF signature and page count.
3. Calculate SHA-256 from the actual bytes and preserve an immutable snapshot.
4. Extract text with page boundaries and log warnings, empty pages, tables and diagrams.
5. Compare all numbered outcomes, section hierarchy, assessment components and practical requirements to the corresponding edition.
6. Reconcile coverage dimensions under an explicit policy for the board and qualification.
7. Run the read-only readiness report. Do not promote or mutate production rows until evidence and required review are complete.
