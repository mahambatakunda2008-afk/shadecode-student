/**
 * /lib/socratic/tutoringEngine.ts
 *
 * Socratic Tutoring Engine
 *
 * AI-powered tutoring that guides students through learning rather than giving answers
 */

import { TutoringRequest, TutoringResponse, TutoringMessage, Hint, ReasoningStep, ErrorAnalysis, ConceptReinforcement } from "./types";
import { getMemory } from "@/lib/cortex/memory";

export type { TutoringRequest, TutoringResponse };

/**
 * Generate a Socratic tutoring response that guides rather than answers
 */
export async function generateSocraticResponse(request: TutoringRequest): Promise<TutoringResponse> {
  const { userId, subject, topic, question, studentLevel = "intermediate", previousContext = [] } = request;

  // Get student's learning memory for personalization
  const memory = await getMemory(userId);
  const weakTopics = memory.weakTopics || [];
  const strongTopics = memory.subjects || [];

  // Determine if this is a weak area for the student
  const isWeakArea = weakTopics.some(t => t.toLowerCase().includes(topic.toLowerCase()));

  // Analyze the student's response if there's previous context
  const lastStudentMessage = previousContext
    .filter(m => m.role === "student")
    .pop();

  const errorAnalysis = lastStudentMessage ? analyzeStudentResponse(lastStudentMessage.content, topic) : undefined;

  // Generate the main tutoring message
  const message = generateGuidedMessage({
    question,
    topic,
    subject,
    studentLevel,
    isWeakArea,
    previousContext,
    errorAnalysis,
  });

  // Generate progressive hints
  const hints = generateHints(question, topic, studentLevel);

  // Generate reasoning steps for complex problems
  const reasoningSteps = isComplexQuestion(question) ? generateReasoningSteps(question, topic, studentLevel) : undefined;

  // Generate concept reinforcement if this is a weak area
  const conceptReinforcement = isWeakArea ? generateConceptReinforcement(topic, subject, studentLevel) : undefined;

  // Suggest next question to continue learning
  const suggestedNextQuestion = generateNextQuestion(topic, subject, studentLevel, isWeakArea);

  return {
    message,
    hints,
    reasoningSteps,
    errorAnalysis,
    conceptReinforcement,
    suggestedNextQuestion,
  };
}

interface GuidedMessageInput {
  question: string;
  topic: string;
  subject: string;
  studentLevel: "beginner" | "intermediate" | "advanced";
  isWeakArea: boolean;
  previousContext: TutoringMessage[];
  errorAnalysis?: ErrorAnalysis;
}

function generateGuidedMessage(input: GuidedMessageInput): TutoringMessage {
  const { question, topic, subject, studentLevel, isWeakArea, previousContext, errorAnalysis } = input;

  let content = "";
  let type: "question" | "hint" | "guidance" | "feedback" | "explanation" | "reinforcement" = "question";

  // If there was an error in the previous response, provide feedback
  if (errorAnalysis) {
    content = generateErrorFeedback(errorAnalysis, studentLevel);
    type = "feedback";
  } else if (previousContext.length === 0) {
    // First interaction - ask guiding question
    content = generateInitialGuidingQuestion(question, topic, studentLevel, isWeakArea);
    type = "question";
  } else {
    // Continue the conversation with follow-up guidance
    content = generateFollowUpGuidance(question, topic, previousContext, studentLevel);
    type = "guidance";
  }

  return {
    id: crypto.randomUUID(),
    role: "tutor",
    content,
    type,
    timestamp: new Date().toISOString(),
    metadata: {
      confidence: isWeakArea ? 0.9 : 0.7,
    },
  };
}

function generateInitialGuidingQuestion(
  question: string,
  topic: string,
  studentLevel: "beginner" | "intermediate" | "advanced",
  isWeakArea: boolean
): string {
  const levelAdjustments = {
    beginner: "Let's start with the basics. ",
    intermediate: "Let's think through this step by step. ",
    advanced: "Let's dive deeper into this. ",
  };

  const weakAreaAdjustment = isWeakArea ? "I know this topic can be challenging, so let's take it slow. " : "";

  const templates = [
    `Instead of jumping to the answer, let's first understand what the question is really asking. What do you think is the key concept here?`,
    `Before we solve this, can you tell me what you already know about ${topic}?`,
    `Let's break this down. What's the first thing you would try to do with this problem?`,
    `What approach would you take if you had to explain this to someone who's never seen it before?`,
    `Can you identify what information the question gives you and what it's asking you to find?`,
  ];

  const template = templates[Math.floor(Math.random() * templates.length)];
  return levelAdjustments[studentLevel] + weakAreaAdjustment + template;
}

function generateFollowUpGuidance(
  question: string,
  topic: string,
  previousContext: TutoringMessage[],
  studentLevel: "beginner" | "intermediate" | "advanced"
): string {
  const lastStudentResponse = previousContext.filter(m => m.role === "student").pop();
  
  if (!lastStudentResponse) {
    return "Can you share your thoughts on how you would approach this?";
  }

  const response = lastStudentResponse.content.toLowerCase();

  // Analyze the student's response and provide guidance
  if (response.includes("don't know") || response.includes("not sure")) {
    return "That's okay! Let's think about this together. What's the first step that comes to mind, even if you're not sure it's right?";
  }

  if (response.length < 20) {
    return "Can you tell me more about your thinking? What led you to that conclusion?";
  }

  if (studentLevel === "beginner") {
    return "Good start! Now, let's think about what happens next. How would you build on that idea?";
  } else if (studentLevel === "advanced") {
    return "Interesting perspective. Can you explain the reasoning behind that approach? What assumptions are you making?";
  } else {
    return "That's a good direction. Now, how would you verify if that approach is correct?";
  }
}

function generateErrorFeedback(errorAnalysis: ErrorAnalysis, studentLevel: "beginner" | "intermediate" | "advanced"): string {
  const { errorType, description, suggestedQuestion } = errorAnalysis;

  const feedbackTemplates = {
    conceptual: [
      `I notice there might be a conceptual misunderstanding here. ${description}. Let's revisit the core idea. ${suggestedQuestion}`,
      `This is a common point of confusion. ${description}. Can you think about it from a different angle? ${suggestedQuestion}`,
    ],
    calculation: [
      `I see a calculation issue. ${description}. Let's check each step carefully. ${suggestedQuestion}`,
      `There's a calculation error here. ${description}. What if we worked through this step by step? ${suggestedQuestion}`,
    ],
    misunderstanding: [
      `I think there might be a misunderstanding of what the question is asking. ${description}. ${suggestedQuestion}`,
      `Let's clarify what we're trying to find. ${description}. ${suggestedQuestion}`,
    ],
    incomplete: [
      `You're on the right track, but this answer is incomplete. ${description}. What else do we need to consider? ${suggestedQuestion}`,
      `Good start, but we need to go further. ${description}. What's the next logical step? ${suggestedQuestion}`,
    ],
  };

  const templates = feedbackTemplates[errorType];
  return templates[Math.floor(Math.random() * templates.length)];
}

function generateHints(question: string, topic: string, studentLevel: "beginner" | "intermediate" | "advanced"): Hint[] {
  const hintLevels = [
    {
      level: 1,
      content: "Think about what the question is asking you to find. What are the key pieces of information given?",
      isRevealing: false,
    },
    {
      level: 2,
      content: `Consider the fundamental concepts of ${topic}. Which one seems most relevant to this problem?`,
      isRevealing: false,
    },
    {
      level: 3,
      content: "What would be the first step in solving this type of problem? Don't worry about getting it perfect - just think about the process.",
      isRevealing: false,
    },
    {
      level: 4,
      content: "Try to identify the relationship between the given information and what you need to find. Is there a formula or method that connects them?",
      isRevealing: false,
    },
  ];

  // Adjust hints based on student level
  if (studentLevel === "beginner") {
    hintLevels[0].content = "Let's start simple: What is the question asking you to do?";
    hintLevels[1].content = `What do you remember about ${topic} from your lessons?`;
  } else if (studentLevel === "advanced") {
    hintLevels[3].content = "Consider the underlying principles. What's the most efficient approach given the constraints?";
  }

  return hintLevels;
}

function generateReasoningSteps(question: string, topic: string, studentLevel: "beginner" | "intermediate" | "advanced"): ReasoningStep[] {
  // Generate generic reasoning steps that can be customized based on the question
  const steps: ReasoningStep[] = [
    {
      stepNumber: 1,
      description: "Identify what the question is asking",
      isCompleted: false,
    },
    {
      stepNumber: 2,
      description: "List the given information",
      isCompleted: false,
    },
    {
      stepNumber: 3,
      description: "Determine which concepts or formulas apply",
      isCompleted: false,
    },
    {
      stepNumber: 4,
      description: "Set up the problem using the relevant approach",
      isCompleted: false,
    },
    {
      stepNumber: 5,
      description: "Solve step by step, checking your work",
      isCompleted: false,
    },
  ];

  if (studentLevel === "beginner") {
    steps[2].description = "Think about which topic this relates to";
  } else if (studentLevel === "advanced") {
    steps[4].description = "Apply the most efficient method and verify assumptions";
  }

  return steps;
}

function analyzeStudentResponse(response: string, topic: string): ErrorAnalysis | undefined {
  const lowerResponse = response.toLowerCase();

  // Check for common error patterns
  if (lowerResponse.includes("don't know") || lowerResponse.includes("not sure") || lowerResponse.length < 10) {
    return {
      errorType: "incomplete",
      description: "The response doesn't show enough reasoning or understanding",
      suggestedQuestion: "Can you share what you're thinking, even if you're not sure?",
      relatedConcepts: [topic],
    };
  }

  // Check for calculation errors (simplified detection)
  if (/\d+[\+\-\*\/]\d+/.test(response) && !/=\s*\d+/.test(response)) {
    return {
      errorType: "calculation",
      description: "The calculation appears incomplete or incorrect",
      suggestedQuestion: "Can you walk through your calculation step by step?",
      relatedConcepts: [topic, "arithmetic"],
    };
  }

  // Check for conceptual misunderstandings (simplified)
  const commonMisconceptions = [
    "always", "never", "every time", "impossible",
  ];
  if (commonMisconceptions.some(m => lowerResponse.includes(m))) {
    return {
      errorType: "conceptual",
      description: "There might be an absolute statement that needs qualification",
      suggestedQuestion: "Are there any exceptions or conditions where this might not be true?",
      relatedConcepts: [topic],
    };
  }

  return undefined;
}

function generateConceptReinforcement(
  topic: string,
  subject: string,
  studentLevel: "beginner" | "intermediate" | "advanced"
): ConceptReinforcement {
  const examples = [
    `Consider how ${topic} applies to real-world situations in ${subject}`,
    `Think about when you've encountered ${topic} in previous problems`,
  ];

  const practiceQuestions = [
    `Can you think of a similar problem where ${topic} would be useful?`,
    `How would you explain ${topic} to someone who's learning it for the first time?`,
  ];

  return {
    conceptId: crypto.randomUUID(),
    conceptName: topic,
    explanation: `Understanding ${topic} is fundamental to ${subject}. It helps us solve problems by...`,
    examples,
    practiceQuestions,
    masteryLevel: studentLevel === "beginner" ? 30 : studentLevel === "intermediate" ? 60 : 80,
  };
}

function generateNextQuestion(
  topic: string,
  subject: string,
  studentLevel: "beginner" | "intermediate" | "advanced",
  isWeakArea: boolean
): string {
  if (isWeakArea) {
    return `Would you like to try another ${topic} problem to strengthen your understanding?`;
  }

  if (studentLevel === "beginner") {
    return `Ready to try a slightly more challenging ${topic} problem?`;
  } else if (studentLevel === "advanced") {
    return `Would you like to explore a more complex application of ${topic}?`;
  }

  return `Shall we continue with another ${topic} problem to reinforce what you've learned?`;
}

function isComplexQuestion(question: string): boolean {
  // Heuristic: questions with multiple parts or complex structure
  const complexityIndicators = [
    "then", "after that", "finally", "first", "second", "third",
    "step", "process", "calculate", "determine", "find",
  ];

  return complexityIndicators.some(indicator => question.toLowerCase().includes(indicator)) ||
         question.split(/[?.!]/).length > 2;
}
