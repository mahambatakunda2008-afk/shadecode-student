-- Cambridge International AS & A Level Chemistry 9701 (2025-2027) scope seed.
-- Detailed numbered learning outcomes are intentionally not seeded here until the
-- official PDF outcome layer has been fully extracted and independently checked.
insert into public.curriculum_sources
(id,board_id,qualification_id,subject_id,level,authority,kind,url,allowed_domains,frequency,discover_linked_documents,extract_text,auto_promote,active,last_status,syllabus_id,syllabus_version)
values
('cambridge-9701-2025-2027','cambridge','cambridge-as-a-level','chemistry','a_level','Cambridge International Education','pdf',
'https://www.cambridgeinternational.org/Images/664563-2025-2027-syllabus.pdf',
ARRAY['www.cambridgeinternational.org','cambridgeinternational.org'],'weekly',false,true,false,true,'ok','cambridge-9701','2025-2027')
on conflict (id) do update set active=true,last_status='ok';

insert into public.curriculum_documents
(id,source_id,url,title,content_hash,content_characters,extracted_text,status,page_count,structure,extraction_engine,extraction_version,extraction_status)
values
('f3a1a2c9-3f57-4c16-9d5b-3c7e8f2a6b44','cambridge-9701-2025-2027',
'https://www.cambridgeinternational.org/Images/664563-2025-2027-syllabus.pdf',
'Cambridge International AS & A Level Chemistry 9701 syllabus for 2025, 2026 and 2027 (version 1, September 2022)',
'not-computed:web-fetch-2026-09-29',0,null,'draft',98,
'{"topics":37,"asTopics":"1-22","aLevelTopics":"1-37","assessmentPapers":5}'::jsonb,
'manual-web-fetch','2026-09-29','manual')
on conflict (id) do update set structure=excluded.structure,updated_at=now();

insert into public.curriculum_versions
(id,source_document_id,board_id,qualification_id,syllabus_id,syllabus_version,subject_id,effective_from,effective_to,status,provenance,document_hash)
values
('3d7f2e44-0e2d-4b66-9f7a-0c4d1c5b8a11','f3a1a2c9-3f57-4c16-9d5b-3c7e8f2a6b44','cambridge','cambridge-as-a-level','cambridge-9701','2025-2027','chemistry','2025-01-01','2027-12-31','draft',
'{"authority":"Cambridge International","edition":"Version 1, published September 2022","officialSource":"https://www.cambridgeinternational.org/Images/664563-2025-2027-syllabus.pdf","retrievedAt":"2026-09-29","wholeSyllabusVerified":false,"outcomeLayer":"pending"}',
'not-computed:web-fetch-2026-09-29')
on conflict (id) do update set status='draft';

delete from public.curriculum_knowledge where curriculum_version_id='3d7f2e44-0e2d-4b66-9f7a-0c4d1c5b8a11';

with topics(key,title,level) as (
  values
  ('1','Atomic structure','as_level'),('2','Atoms, molecules and stoichiometry','as_level'),
  ('3','Chemical bonding','as_level'),('4','States of matter','as_level'),
  ('5','Chemical energetics','as_level'),('6','Electrochemistry','as_level'),
  ('7','Equilibria','as_level'),('8','Reaction kinetics','as_level'),
  ('9','The Periodic Table: chemical periodicity','as_level'),('10','Group 2','as_level'),
  ('11','Group 17','as_level'),('12','Nitrogen and sulfur','as_level'),
  ('13','An introduction to AS Level organic chemistry','as_level'),('14','Hydrocarbons','as_level'),
  ('15','Halogen compounds','as_level'),('16','Hydroxy compounds','as_level'),
  ('17','Carbonyl compounds','as_level'),('18','Carboxylic acids and derivatives','as_level'),
  ('19','Nitrogen compounds','as_level'),('20','Polymerisation','as_level'),
  ('21','Organic synthesis','as_level'),('22','Analytical techniques','as_level'),
  ('23','Chemical energetics','a_level'),('24','Electrochemistry','a_level'),
  ('25','Equilibria','a_level'),('26','Reaction kinetics','a_level'),
  ('27','Group 2','a_level'),('28','Chemistry of transition elements','a_level'),
  ('29','An introduction to A Level organic chemistry','a_level'),('30','Hydrocarbons','a_level'),
  ('31','Halogen compounds','a_level'),('32','Hydroxy compounds','a_level'),
  ('33','Carboxylic acids and derivatives','a_level'),('34','Nitrogen compounds','a_level'),
  ('35','Polymerisation','a_level'),('36','Organic synthesis','a_level'),
  ('37','Analytical techniques','a_level')
)
insert into public.curriculum_knowledge
(curriculum_version_id,source_document_id,board_id,qualification_id,level,syllabus_id,syllabus_version,subject_id,kind,knowledge_key,title,content,topic_key,objective_keys,status,provenance,metadata)
select
'3d7f2e44-0e2d-4b66-9f7a-0c4d1c5b8a11','f3a1a2c9-3f57-4c16-9d5b-3c7e8f2a6b44','cambridge','cambridge-as-a-level',level,'cambridge-9701','2025-2027','chemistry','topic',
'topic|'||key,title,'Topic '||key||': '||title,key,'{}','verified',
'{"authority":"Cambridge International","sourceDocument":"https://www.cambridgeinternational.org/Images/664563-2025-2027-syllabus.pdf","retrievedAt":"2026-09-29","mappingStatus":"verified"}'::jsonb,
jsonb_build_object('source','structured-cambridge-scope-dataset','section',key)
from topics
union all
select
'3d7f2e44-0e2d-4b66-9f7a-0c4d1c5b8a11','f3a1a2c9-3f57-4c16-9d5b-3c7e8f2a6b44','cambridge','cambridge-as-a-level',level,'cambridge-9701','2025-2027','chemistry','content_scope',
'scope|'||key,title,
case when level='as_level' then 'AS Level candidates study this topic.'
else 'A Level candidates study this topic in addition to the AS Level topics.' end,
key,'{}','verified',
'{"authority":"Cambridge International","sourceDocument":"https://www.cambridgeinternational.org/Images/664563-2025-2027-syllabus.pdf","retrievedAt":"2026-09-29","mappingStatus":"verified"}'::jsonb,
jsonb_build_object('source','structured-cambridge-scope-dataset','section',key)
from topics;