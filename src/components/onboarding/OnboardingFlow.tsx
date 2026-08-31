'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingProgress } from './OnboardingProgress';
import { WelcomeStep } from './steps/WelcomeStep';
import { SubjectsStep } from './steps/SubjectStep';
import { GoalsStep } from './steps/GoalsStep';
import { ConfirmStep } from './steps/ConfirmStep';
import { StepGoalSelection } from './steps/StepGoalSelection';
import { mapOnboardingFormData } from '@/lib/onboarding/mapFormData';
import { setOnboardingComplete } from '@/lib/onboarding';
import { localFirstStore } from '@/lib/local-first/store';
import { mutationQueue } from '@/lib/offline/mutationQueue';
import { createClient } from '@/lib/supabase/client';
import type { OnboardingFormData } from '@/types';

interface OnboardingRecommendations { recommendedSubjects?: string[]; suggestedCourse?: { title?: string; summary?: string }; firstLesson?: { title?: string; description?: string } | null; }
const STEP_LABELS=['Profile','Subjects','Goals','Daily','Confirm'] as const;
const TOTAL=STEP_LABELS.length;
const DEFAULTS:Partial<OnboardingFormData>={subjects:[],goals:[],dailyGoalMinutes:30,studyStyle:'flexible'};
function experienceStage(level?:OnboardingFormData['studyLevel']){switch(level){case'primary':return'upper_primary';case'lower-secondary':return'junior_secondary';case'upper-secondary':return'senior_secondary';case'a-level':return'a_level';case'university':case'tvet':return'tertiary';case'professional':return'adult';default:return'senior_secondary';}}
function parsePrimaryGrade(value?:string){if(!value)return undefined;const match=value.match(/\d+/);if(!match)return undefined;const grade=Number(match[0]);return Number.isInteger(grade)&&grade>=1&&grade<=7?grade:undefined;}

export function OnboardingFlow(){
 const router=useRouter();
 const[step,setStep]=useState(1);const[formData,setFormData]=useState<Partial<OnboardingFormData>>(DEFAULTS);const[isSubmitting,setIsSubmitting]=useState(false);const[submitError,setSubmitError]=useState<string|null>(null);const[recommendations,setRecommendations]=useState<OnboardingRecommendations|null>(null);
 const update=(patch:Partial<OnboardingFormData>)=>setFormData(prev=>({...prev,...patch}));const next=()=>setStep(s=>Math.min(s+1,TOTAL));const back=()=>setStep(s=>Math.max(s-1,1));
 const handleSubmit=async()=>{setIsSubmitting(true);setSubmitError(null);try{const supabase=createClient();const{data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user)throw new Error('Please sign in before finishing setup.');const payload=mapOnboardingFormData(formData);const profile={userId:user.id,educationStage:experienceStage(formData.studyLevel),educationGrade:formData.studyLevel==='primary'?parsePrimaryGrade(formData.yearLevel):undefined,educationYear:formData.yearLevel?.trim()||undefined,educationCurriculum:payload.education_level,educationSubjects:payload.subject_interests,updatedAt:new Date().toISOString()};await localFirstStore.saveEducationProfile(profile);const offline=typeof navigator!=='undefined'&&!navigator.onLine;if(offline){const localRecord=await localFirstStore.get(`education-profile:${user.id}`);await mutationQueue.enqueue({ownerId:user.id,operation:'update',store:'education_profile',deviceId:await localFirstStore.deviceId(),clientVersion:localRecord?.version,baseVersion:localRecord&&localRecord.version>0?localRecord.version-1:undefined,payload:{education_stage:profile.educationStage,education_grade:profile.educationGrade,education_year:profile.educationYear,education_curriculum:profile.educationCurriculum,education_subjects:profile.educationSubjects,user_id:user.id,id:`education-profile:${user.id}`}});setOnboardingComplete(user.id);router.push('/dashboard');return;}const res=await fetch('/api/onboarding/complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const json=await res.json();if(!res.ok)throw new Error(json?.error??'Failed');setOnboardingComplete(user.id);if(json?.recommendations){setRecommendations(json.recommendations);setTimeout(()=>router.push('/dashboard'),1800);}else router.push('/dashboard');}catch(err){setSubmitError(err instanceof Error?err.message:'Something went wrong. Please try again.');setIsSubmitting(false);}};
 const common={data:formData,onUpdate:update};return <div style={{width:'100%',maxWidth:440,margin:'0 auto'}}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:36}}><div style={{width:28,height:28,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(124,58,237,0.2)',color:'rgb(167,139,250)',fontSize:12,fontWeight:700}}>S</div><span style={{fontSize:13,fontWeight:600,color:'var(--muted-foreground)'}}>Shadecode Student</span></div><OnboardingProgress currentStep={step} totalSteps={TOTAL} labels={STEP_LABELS}/><div key={step} style={{borderRadius:16,padding:24,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>{step===1&&<WelcomeStep {...common} onNext={next}/>} {step===2&&<SubjectsStep {...common} onNext={next} onBack={back}/>} {step===3&&<StepGoalSelection {...common} onNext={next} onBack={back}/>} {step===4&&<GoalsStep {...common} onNext={next} onBack={back}/>} {step===5&&<><ConfirmStep {...common} onNext={next} onBack={back} onSubmit={handleSubmit} isSubmitting={isSubmitting} error={submitError}/>{recommendations&&<div style={{marginTop:12,padding:12,borderRadius:10,background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.04)'}}><div style={{fontSize:13,fontWeight:700,marginBottom:6}}>Recommended next course</div><div style={{fontSize:14,fontWeight:600}}>{recommendations.suggestedCourse?.title}</div><div style={{fontSize:12,color:'rgba(255,255,255,0.6)'}}>{recommendations.suggestedCourse?.summary}</div>{recommendations.firstLesson&&<div style={{marginTop:10}}><div style={{fontSize:12,fontWeight:700}}>First lesson</div><div style={{fontSize:13}}>{recommendations.firstLesson.title}</div><div style={{fontSize:12,color:'rgba(255,255,255,0.6)'}}>{recommendations.firstLesson.description}</div></div>}</div>}</>}</div></div>;
}
