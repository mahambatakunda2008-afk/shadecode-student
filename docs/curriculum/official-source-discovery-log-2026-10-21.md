# Official source discovery log: 2026-10-21

**Scope:** targeted discovery for Cambridge International 2028–2031 syllabus editions, Cambridge Computer Science 9618/0478/0265, and ZIMSEC Computer Science 4021.
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

## Cambridge Computer Science source verification targets

### AS & A Level Computer Science 9618, exams 2027–2029

- Official subject page: https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-computer-science-9618/
- Direct official PDF: https://www.cambridgeinternational.org/Images/721397-2027-2029-syllabus.pdf
- The official PDF identifies itself as **Version 2**, published December 2025, and says there are no significant changes affecting teaching. The document is 49 pages and covers exams in 2027, 2028 and 2029.
- The version notice is not permission to skip verification. The stored/normalized 9618 pack must still be reconciled to this exact PDF and fingerprint, including AS/A Level section boundaries, all numbered outcomes, three assessment routes, paper weightings, programming-language requirements, and practical evidence.

### IGCSE Computer Science 0478, exams 2029–2031

- Official subject page: https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse-computer-science-0478/
- Direct official PDF: https://www.cambridgeinternational.org/Images/763431-2029-2031-syllabus.pdf
- The official page lists 2029–2031 as a distinct edition. It describes substantive changes including Python 3 as the only language for teaching, assessment and programming questions; removal of pseudocode; expanded AI/machine-learning and networking content; revised component structure; and calculator-rule changes. Do not carry over 2026–2028 topics or assessment metadata without a document-level diff.

### IGCSE Computer Science 0265, exams in 2029

- Official subject page: https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse-computer-science-0265/
- Direct official PDF: https://www.cambridgeinternational.org/Images/763395-2029-syllabus.pdf
- The official PDF is Version 1, published September 2026, and specifies a digital-only exam route for 2029. Cambridge states that 0265 has the same subject content as paper-based 0478/0984/2210 but a different assessment-delivery route. Preserve 0265 as a separate qualification/assessment configuration instead of merging its component delivery details into 0478.
- Cambridge's official page states that a syllabus for 2030 onwards is due to be published in September 2027. Do not invent or extend the 2029 edition into later years.

## ZIMSEC Computer Science 4021

The official ZIMSEC catalogue lists **Computer Science O level Syllabus**, but the direct syllabus-document URL and edition metadata are not yet confirmed.

Official pages for **Computer Science 4021/01**, **4021/02**, and **4021/03** surfaced as separate paper downloads, each created/updated on 9 March 2026:

- Paper 1 page: https://www5.zimsec.co.zw/download/computer-science-4021-01/
- Paper 2 page: https://www5.zimsec.co.zw/download/computer-science-4021-02/
- Paper 3 page: https://www5.zimsec.co.zw/download/computer-science-4021-03/
- Official syllabus catalogue: https://www5.zimsec.co.zw/syllabi/

The three 4021 pages are individual paper resources, not proof of a complete syllabus document. Do not combine them into a syllabus or use them to mark the syllabus verified. Next retrieval task: follow the catalogue's **Computer Science O level Syllabus** entry to its exact document, confirm the edition and effective years, download the complete file, and record its metadata and hash. If the catalogue does not expose the syllabus document publicly, record the access block and request the document through an authorized route.

## Current evidence state

| Source target | Authority page identified | Direct candidate document URL identified | Bytes retrieved and hashed here | Full extraction/reconciliation complete |
| --- | --- | --- | --- | --- |
| Cambridge Biology 9700, 2028–2030 | Yes | Yes | No | No |
| Cambridge Chemistry 9701, 2028–2030 | Yes | Yes | No | No |
| Cambridge Physics 9702, 2028–2030 | Yes | Yes, candidate from queue | No | No |
| Cambridge Mathematics 9709, 2028–2030 | Yes | Yes, candidate from queue | No | No |
| Cambridge Computer Science 9618, 2027–2029 Version 2 | Yes | Yes | No | No |
| Cambridge IGCSE Computer Science 0478, 2029–2031 | Yes | Yes | No | No |
| Cambridge IGCSE Computer Science 0265, 2029 digital route | Yes | Yes | No | No |
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
