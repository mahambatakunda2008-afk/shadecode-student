-- Cambridge International AS & A Level Biology 9700 (2025-2027)
-- Foundation registration only. Numbered learning outcomes remain unseeded until
-- the official PDF has been fully extracted and reconciled by the subsection-aware
-- extractor. Do not promote this curriculum version from draft here.

insert into public.curriculum_sources
(id,board_id,qualification_id,subject_id,level,authority,kind,url,allowed_domains,frequency,discover_linked_documents,extract_text,auto_promote,active,last_status,syllabus_id,syllabus_version)
values
('cambridge-9700-2025-2027','cambridge','cambridge-as-a-level','biology','a_level','Cambridge International Education','pdf',
'https://www.cambridgeinternational.org/Images/664560-2025-2027-syllabus.pdf',
ARRAY['www.cambridgeinternational.org','cambridgeinternational.org'],'weekly',false,true,false,true,'ok','cambridge-9700','2025-2027')
on conflict (id) do update set active=true,last_status='ok',updated_at=now();

insert into public.curriculum_documents
(id,source_id,url,title,content_hash,content_characters,extracted_text,status,page_count,structure,extraction_engine,extraction_version,extraction_status)
values
('b9700b4a-1a22-4b9a-8b16-9700c2027abc','cambridge-9700-2025-2027',
'https://www.cambridgeinternational.org/Images/664560-2025-2027-syllabus.pdf',
'Cambridge International AS & A Level Biology 9700 syllabus for 2025, 2026 and 2027 (version 1, September 2022)',
'not-computed:web-fetch-2026-09-29',0,null,'draft',73,
'{"topics":19,"asTopics":"1-11","aLevelTopics":"1-19","assessmentPapers":5,"outcomeLayer":"pending"}'::jsonb,
'manual-web-fetch','2026-09-29','manual')
on conflict (id) do update set source_id=excluded.source_id,url=excluded.url,updated_at=now();

insert into public.curriculum_versions
(id,source_document_id,board_id,qualification_id,syllabus_id,syllabus_version,subject_id,effective_from,effective_to,status,provenance,document_hash)
values
('b9700c2d-6a4e-4c7d-9f21-97002027abcd','b9700b4a-1a22-4b9a-8b16-9700c2027abc','cambridge','cambridge-as-a-level','cambridge-9700','2025-2027','biology','2025-01-01','2027-12-31','draft',
'{"authority":"Cambridge International","edition":"Version 1, published September 2022","officialSource":"https://www.cambridgeinternational.org/Images/664560-2025-2027-syllabus.pdf","retrievedAt":"2026-09-29","wholeSyllabusVerified":false,"outcomeLayer":"pending"}',
'not-computed:web-fetch-2026-09-29')
on conflict (id) do update set status='draft';

delete from public.curriculum_knowledge where curriculum_version_id='b9700c2d-6a4e-4c7d-9f21-97002027abcd';

with topics(key,title,level) as (
  values
  ('1','Cell structure','as_level'),
  ('2','Biological molecules','as_level'),
  ('3','Enzymes','as_level'),
  ('4','Cell membranes and transport','as_level'),
  ('5','The mitotic cell cycle','as_level'),
  ('6','Nucleic acids and protein synthesis','as_level'),
  ('7','Transport in plants','as_level'),
  ('8','Transport in mammals','as_level'),
  ('9','Gas exchange','as_level'),
  ('10','Infectious diseases','as_level'),
  ('11','Immunity','as_level'),
  ('12','Energy and respiration','a_level'),
  ('13','Photosynthesis','a_level'),
  ('14','Homeostasis','a_level'),
  ('15','Control and coordination','a_level'),
  ('16','Inheritance','a_level'),
  ('17','Selection and evolution','a_level'),
  ('18','Classification, biodiversity and conservation','a_level'),
  ('19','Genetic technology','a_level')
)
insert into public.curriculum_knowledge
(curriculum_version_id,source_document_id,board_id,qualification_id,level,syllabus_id,syllabus_version,subject_id,kind,knowledge_key,title,content,topic_key,objective_keys,status,provenance,metadata)
select
'b9700c2d-6a4e-4c7d-9f21-97002027abcd','b9700b4a-1a22-4b9a-8b16-9700c2027abc',
'cambridge','cambridge-as-a-level',level,'cambridge-9700','2025-2027','biology','topic',
'topic|'||key,title,'Topic '||key||': '||title,key,'{}','draft',
'{"authority":"Cambridge International","sourceDocument":"https://www.cambridgeinternational.org/Images/664560-2025-2027-syllabus.pdf","retrievedAt":"2026-09-29","mappingStatus":"reviewed","note":"Scope only; numbered learning outcomes pending reconciliation."}'::jsonb,
jsonb_build_object('source','official-cambridge-scope','section',key,'outcomesVerified',false)
from topics
union all
select
'b9700c2d-6a4e-4c7d-9f21-97002027abcd','b9700b4a-1a22-4b9a-8b16-9700c2027abc',
'cambridge','cambridge-as-a-level',level,'cambridge-9700','2025-2027','biology','content_scope',
'scope|'||key,title,
case when level='as_level'
  then 'AS Level candidates study this topic.'
  else 'A Level candidates study this topic in addition to AS Level content.'
end,
key,'{}','draft',
'{"authority":"Cambridge International","sourceDocument":"https://www.cambridgeinternational.org/Images/664560-2025-2027-syllabus.pdf","retrievedAt":"2026-09-29","mappingStatus":"reviewed","note":"Scope only; numbered learning outcomes pending reconciliation."}'::jsonb,
jsonb_build_object('source','official-cambridge-scope','section',key,'outcomesVerified',false)
from topics;

-- Five-paper assessment structure from the official syllabus.
insert into public.curriculum_knowledge
(curriculum_version_id,source_document_id,board_id,qualification_id,level,syllabus_id,syllabus_version,subject_id,kind,knowledge_key,title,content,objective_keys,status,provenance,metadata)
values
('b9700c2d-6a4e-4c7d-9f21-97002027abcd','b9700b4a-1a22-4b9a-8b16-9700c2027abc','cambridge','cambridge-as-a-level','as_level','cambridge-9700','2025-2027','biology','paper_component','paper|1','Paper 1: Multiple Choice','40 marks; 1 hour 15 minutes; 40 multiple-choice questions; AS Level content.','{}','draft','{"authority":"Cambridge International","sourceDocument":"https://www.cambridgeinternational.org/Images/664560-2025-2027-syllabus.pdf","retrievedAt":"2026-09-29","mappingStatus":"reviewed"}'::jsonb,'{"marks":40,"durationMinutes":75,"weightingAS":31,"weightingA":15.5}'),
('b9700c2d-6a4e-4c7d-9f21-97002027abcd','b9700b4a-1a22-4b9a-8b16-9700c2027abc','cambridge','cambridge-as-a-level','as_level','cambridge-9700','2025-2027','biology','paper_component','paper|2','Paper 2: AS Level Structured Questions','60 marks; 1 hour 15 minutes; AS Level content.','{}','draft','{"authority":"Cambridge International","sourceDocument":"https://www.cambridgeinternational.org/Images/664560-2025-2027-syllabus.pdf","retrievedAt":"2026-09-29","mappingStatus":"reviewed"}'::jsonb,'{"marks":60,"durationMinutes":75,"weightingAS":46,"weightingA":23}'),
('b9700c2d-6a4e-4c7d-9f21-97002027abcd','b9700b4a-1a22-4b9a-8b16-9700c2027abc','cambridge','cambridge-as-a-level','as_level','cambridge-9700','2025-2027','biology','paper_component','paper|3','Paper 3: Advanced Practical Skills','40 marks; 2 hours; practical skills and structured questions.','{}','draft','{"authority":"Cambridge International","sourceDocument":"https://www.cambridgeinternational.org/Images/664560-2025-2027-syllabus.pdf","retrievedAt":"2026-09-29","mappingStatus":"reviewed"}'::jsonb,'{"marks":40,"durationMinutes":120,"weightingAS":23,"weightingA":11.5}'),
('b9700c2d-6a4e-4c7d-9f21-97002027abcd','b9700b4a-1a22-4b9a-8b16-9700c2027abc','cambridge','cambridge-as-a-level','a_level','cambridge-9700','2025-2027','biology','paper_component','paper|4','Paper 4: A Level Structured Questions','100 marks; 2 hours; A Level content with AS knowledge assumed.','{}','draft','{"authority":"Cambridge International","sourceDocument":"https://www.cambridgeinternational.org/Images/664560-2025-2027-syllabus.pdf","retrievedAt":"2026-09-29","mappingStatus":"reviewed"}'::jsonb,'{"marks":100,"durationMinutes":120,"weightingA":38.5}'),
('b9700c2d-6a4e-4c7d-9f21-97002027abcd','b9700b4a-1a22-4b9a-8b16-9700c2027abc','cambridge','cambridge-as-a-level','a_level','cambridge-9700','2025-2027','biology','paper_component','paper|5','Paper 5: Planning, Analysis and Evaluation','30 marks; 1 hour 15 minutes; practical planning, analysis and evaluation.','{}','draft','{"authority":"Cambridge International","sourceDocument":"https://www.cambridgeinternational.org/Images/664560-2025-2027-syllabus.pdf","retrievedAt":"2026-09-29","mappingStatus":"reviewed"}'::jsonb,'{"marks":30,"durationMinutes":75,"weightingA":11.5}');

insert into public.curriculum_coverage_checks
(curriculum_version_id,dimension,status,evidence,notes)
values
('b9700c2d-6a4e-4c7d-9f21-97002027abcd','identity','verified','{"syllabusId":"cambridge-9700","syllabusVersion":"2025-2027","subjectId":"biology"}','Official syllabus identity registered.'),
('b9700c2d-6a4e-4c7d-9f21-97002027abcd','source','verified','{"officialUrl":"https://www.cambridgeinternational.org/Images/664560-2025-2027-syllabus.pdf"}','Official Cambridge PDF registered.'),
('b9700c2d-6a4e-4c7d-9f21-97002027abcd','structure','partial','{"topics":19,"asTopics":"1-11","aLevelTopics":"1-19"}','Topic scope is registered; subsection hierarchy and numbered outcomes remain pending.'),
('b9700c2d-6a4e-4c7d-9f21-97002027abcd','scope','partial','{"topics":19,"asTopics":"1-11","aLevelTopics":"1-19"}','Official topic scope verified; outcome reconciliation remains pending.'),
('b9700c2d-6a4e-4c7d-9f21-97002027abcd','objectives','missing','{"verifiedObjectiveCount":0}','Numbered learning outcomes have not yet been reconciled.'),
('b9700c2d-6a4e-4c7d-9f21-97002027abcd','provenance','partial','{"authority":"Cambridge International","retrievedAt":"2026-09-29"}','Source provenance registered; full outcome provenance pending.')
on conflict (curriculum_version_id,dimension) do update set status=excluded.status,evidence=excluded.evidence,notes=excluded.notes,checked_at=now();
