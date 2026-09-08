update public.primary_activities
set content = jsonb_build_object(
  'kind', 'quiz',
  'instructions', 'Explore hundreds, tens, and ones.',
  'questions', jsonb_build_array(
    jsonb_build_object('id','q1','prompt','In 347, what does the 4 mean?','choices',jsonb_build_array('4','40','400'),'answer','40','hint','The 4 is in the tens place.'),
    jsonb_build_object('id','q2','prompt','Which number has 6 hundreds?','choices',jsonb_build_array('261','612','126'),'answer','612','hint','Look at the hundreds digit.'),
    jsonb_build_object('id','q3','prompt','What is the value of 8 in 582?','choices',jsonb_build_array('8','80','800'),'answer','80','hint','The 8 is in the tens place.'),
    jsonb_build_object('id','q4','prompt','Build 305. Which digit is in the hundreds place?','choices',jsonb_build_array('3','0','5'),'answer','3','hint','Hundreds come before tens and ones.'),
    jsonb_build_object('id','q5','prompt','Which number is greatest?','choices',jsonb_build_array('409','490','904'),'answer','904','hint','Compare the hundreds digits first.')
  )
)
where title = 'Place Value Explorer';

update public.primary_activities
set content = jsonb_build_object(
  'kind', 'quiz',
  'instructions', 'Build your number sense with a quick sprint.',
  'questions', jsonb_build_array(
    jsonb_build_object('id','q1','prompt','What is 7 + 5?','choices',jsonb_build_array('11','12','13'),'answer','12','hint','Count five more after 7.'),
    jsonb_build_object('id','q2','prompt','Which number is even?','choices',jsonb_build_array('13','17','24'),'answer','24','hint','Even numbers can be split into pairs.'),
    jsonb_build_object('id','q3','prompt','What is 30 - 8?','choices',jsonb_build_array('20','22','28'),'answer','22','hint','Take away 8 from 30.'),
    jsonb_build_object('id','q4','prompt','Which is greater?','choices',jsonb_build_array('46','64','54'),'answer','64','hint','Compare the tens digits first.'),
    jsonb_build_object('id','q5','prompt','What comes next: 5, 10, 15, ?','choices',jsonb_build_array('18','20','25'),'answer','20','hint','Add 5 each time.')
  )
)
where title = 'Number Sprint';