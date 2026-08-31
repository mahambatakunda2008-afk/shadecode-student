import type { LearningPolicy } from "./stagePolicy";
export type PrimaryGrade=1|2|3|4|5|6|7;
export interface PrimaryGradeBand{grade:PrimaryGrade;ageRange:string;readingLevel:LearningPolicy["readingLevel"];maxExplanationWords:number;scaffoldingSteps:number;questionStyle:"playful"|"guided";}
export interface PrimarySubjectProfile{subject:string;skills:string[];activityModes:string[];localContextExamples:string[];}
const BANDS:Record<PrimaryGrade,PrimaryGradeBand>={
  1:{grade:1,ageRange:"6-7",readingLevel:"emerging",maxExplanationWords:90,scaffoldingSteps:4,questionStyle:"playful"},
  2:{grade:2,ageRange:"7-8",readingLevel:"emerging",maxExplanationWords:110,scaffoldingSteps:4,questionStyle:"playful"},
  3:{grade:3,ageRange:"8-9",readingLevel:"developing",maxExplanationWords:130,scaffoldingSteps:3,questionStyle:"playful"},
  4:{grade:4,ageRange:"9-10",readingLevel:"developing",maxExplanationWords:160,scaffoldingSteps:3,questionStyle:"playful"},
  5:{grade:5,ageRange:"10-11",readingLevel:"developing",maxExplanationWords:190,scaffoldingSteps:3,questionStyle:"guided"},
  6:{grade:6,ageRange:"11-12",readingLevel:"fluent",maxExplanationWords:220,scaffoldingSteps:2,questionStyle:"guided"},
  7:{grade:7,ageRange:"12-13",readingLevel:"fluent",maxExplanationWords:250,scaffoldingSteps:2,questionStyle:"guided"},
};
const SUBJECTS:Record<string,PrimarySubjectProfile>={
 Mathematics:{subject:"Mathematics",skills:["number sense","operations","fractions","measurement","geometry","patterns","data","problem solving"],activityModes:["worked examples","number games","visual puzzles","real-life problems"],localContextExamples:["money","shopping","time","distance","farming","school supplies"]},
 English:{subject:"English",skills:["phonics and decoding","reading fluency","vocabulary","grammar","comprehension","storytelling","writing"],activityModes:["read-aloud","picture prompts","short stories","word games"],localContextExamples:["school","family","community","market","animals","weather"]},
 Science:{subject:"Science",skills:["observation","classification","materials","living things","energy","weather","simple investigation"],activityModes:["predict-observe-explain","sorting","mini investigations","picture diagrams"],localContextExamples:["plants","soil","water","animals","weather","household materials"]},
 "Heritage Studies":{subject:"Heritage Studies",skills:["family and community","Zimbabwean history","culture","heritage","citizenship","environment","local geography"],activityModes:["storytelling","maps","oral history","picture timelines"],localContextExamples:["Zimbabwean communities","traditional practices","local landmarks","national symbols"]},
 Shona:{subject:"Shona",skills:["oral language","vocabulary","reading","writing","grammar","stories","proverbs"],activityModes:["oral practice","storytelling","picture vocabulary","reading games"],localContextExamples:["mhuri","chikoro","musha","mhuka","chikafu"]},
 Ndebele:{subject:"Ndebele",skills:["oral language","vocabulary","reading","writing","grammar","stories"],activityModes:["oral practice","storytelling","picture vocabulary","reading games"],localContextExamples:["family","school","community","animals","food"]},
};
export function getPrimaryGradeBand(grade:number):PrimaryGradeBand{if(!Number.isInteger(grade)||grade<1||grade>7)throw new Error("Primary grade must be 1-7");return BANDS[grade as PrimaryGrade];}
export function getPrimarySubjectProfile(subject:string):PrimarySubjectProfile{const profile=SUBJECTS[subject.trim()];if(profile)return profile;return{subject:subject.trim(),skills:["understanding","practice","problem solving"],activityModes:["guided examples","short practice","recall games"],localContextExamples:["school","family","community"]};}
export function getPrimaryLearningPolicy():LearningPolicy{return{stage:"primary",readingLevel:"emerging",maxExplanationWords:250,preferVisuals:true,allowAdvancedNotation:false,requireScaffolding:true,questionStyle:"playful"};}
export function buildPrimaryPrompt(grade:number,subject:string,topic:string):string{const band=getPrimaryGradeBand(grade);const profile=getPrimarySubjectProfile(subject);return[`Primary Grade ${grade} (typical age ${band.ageRange})`,`Subject: ${profile.subject}`,`Topic: ${topic}`,`Use ${band.scaffoldingSteps} short scaffold steps maximum.`,`Keep explanations under ${band.maxExplanationWords} words unless the learner asks for more.`,`Prefer pictures, concrete objects, stories, examples and simple language.`,`Avoid advanced notation and unexplained jargon.`,`Use familiar school, family and Zimbabwean community contexts where useful.`,`Give one worked example before independent practice.`,`Never shame mistakes; explain the next small step.`].join("\n");}
