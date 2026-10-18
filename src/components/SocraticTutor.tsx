"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, Lightbulb, List, AlertCircle, BookOpen, Send, ChevronDown, ChevronUp, RefreshCw, Zap, Globe, Eye, GraduationCap } from "lucide-react";
import { TutoringSession, TutoringMessage, Hint, ReasoningStep, ErrorAnalysis, ConceptReinforcement, ExplanationStyle, LessonContext } from "@/lib/socratic/types";
import { generateSocraticResponse, TutoringRequest } from "@/lib/socratic/tutoringEngine";

interface SocraticTutorProps {
  userId: string;
  subject: string;
  topic: string;
  initialQuestion?: string;
  lessonContext?: LessonContext;
  onClose?: () => void;
}

export default function SocraticTutor({ userId, subject, topic, initialQuestion, lessonContext, onClose }: SocraticTutorProps) {
  const [session, setSession] = useState<TutoringSession | null>(null);
  const [input, setInput] = useState(initialQuestion || "");
  const [loading, setLoading] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [showConcepts, setShowConcepts] = useState(false);
  const [currentHintLevel, setCurrentHintLevel] = useState(0);
  const [requestError, setRequestError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session?.conversation]);

  const handleSendMessage = async (messageOverride?: string) => {
    const messageContent = messageOverride ?? input;
    if (!messageContent.trim() || loading) return;

    const userMessage: TutoringMessage = {
      id: crypto.randomUUID(),
      role: "student",
      content: messageContent,
      type: "question",
      timestamp: new Date().toISOString(),
    };

    const newConversation = session ? [...session.conversation, userMessage] : [userMessage];
    
    setSession(prev => prev ? {
      ...prev,
      conversation: newConversation,
      updatedAt: new Date().toISOString(),
    } : {
      id: crypto.randomUUID(),
      userId,
      subject,
      topic,
      question: messageContent,
      conversation: newConversation,
      currentHintLevel: 0,
      conceptsCovered: [],
      studentLevel: "intermediate",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setLoading(true);
    setRequestError(null);
    setInput(messageOverride ? input : "");

    try {
      const request: TutoringRequest = {
        userId,
        subject,
        topic,
        question: messageContent,
        previousContext: newConversation,
        lessonContext,
      };

      const response = await generateSocraticResponse(request);

      const tutorMessage: TutoringMessage = {
        ...response.message,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      };

      setSession(prev => prev ? {
        ...prev,
        conversation: [...prev.conversation, tutorMessage],
        currentHintLevel: 0,
        updatedAt: new Date().toISOString(),
      } : null);

      setCurrentHintLevel(0);
    } catch (err) {
      console.error("Failed to generate tutoring response:", err);
      setSession(prev => prev ? { ...prev, conversation: prev.conversation.filter(message => message.id !== userMessage.id), updatedAt: new Date().toISOString() } : null);
      setInput(messageOverride ? input : userMessage.content);
      setRequestError("The tutor could not respond just now. Your attempt is still here. Retry when you are ready.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestHint = () => {
    if (!session || !session.conversation.length) return;

    const lastTutorMessage = [...session.conversation].reverse().find(m => m.role === "tutor");
    if (!lastTutorMessage) return;

    // Generate a hint based on the current conversation
    const hints = generateHints(session.topic, session.studentLevel);
    if (currentHintLevel < hints.length) {
      const hintMessage: TutoringMessage = {
        id: crypto.randomUUID(),
        role: "tutor",
        content: hints[currentHintLevel].content,
        type: "hint",
        timestamp: new Date().toISOString(),
        metadata: { hintLevel: currentHintLevel + 1 },
      };

      setSession(prev => prev ? {
        ...prev,
        conversation: [...prev.conversation, hintMessage],
        currentHintLevel: currentHintLevel + 1,
        updatedAt: new Date().toISOString(),
      } : null);

      setCurrentHintLevel(currentHintLevel + 1);
    }
  };

  const handleRequestExplanation = async (style: ExplanationStyle) => {
    if (!session || !session.conversation.length || loading) return;

    const lastStudentMessage = [...session.conversation].filter(m => m.role === "student").pop();
    if (!lastStudentMessage) return;

    setLoading(true);
    setRequestError(null);

    try {
      const request: TutoringRequest = {
        userId,
        subject,
        topic,
        question: lastStudentMessage.content,
        previousContext: session.conversation,
        explanationStyle: style,
        lessonContext,
      };

      const response = await generateSocraticResponse(request);

      const tutorMessage: TutoringMessage = {
        ...response.message,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      };

      setSession(prev => prev ? {
        ...prev,
        conversation: [...prev.conversation, tutorMessage],
        updatedAt: new Date().toISOString(),
      } : null);
    } catch (err) {
      console.error("Failed to generate explanation:", err);
      setRequestError("That explanation did not arrive. Your session is intact; try again.");
    } finally {
      setLoading(false);
    }
  };

  const lastTutorResponse = session?.conversation.filter(m => m.role === "tutor").pop();
  const studentAttempts = session?.conversation.filter(m => m.role === "student").length ?? 0;
  const sessionStep = studentAttempts === 0 ? 1 : Math.min(4, studentAttempts + 1);
  const hasHints = lastTutorResponse?.type === "question" || lastTutorResponse?.type === "guidance";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: "12px", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px", borderBottom: "1px solid var(--card-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MessageSquare size={18} color="#6366f1" />
          </div>
          <div>
            <p style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>Socratic Tutor</p>
            <p style={{ fontSize: "11px", color: "var(--muted-foreground)", margin: 0 }}>{subject} • {topic}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--muted-foreground)" }}>×</button>
        )}
      </div>

      {/* Visible study-session structure */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--card-border)", background: "var(--background)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: "12px", fontWeight: 700 }}>Your study session</span>
          <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Step {sessionStep} of 4</span>
        </div>
        <div aria-label={`Study session step ${sessionStep} of 4`} role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={sessionStep} style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 5, marginBottom: 8 }}>
          {[1, 2, 3, 4].map(step => <div key={step} style={{ height: 4, borderRadius: 99, background: step <= sessionStep ? "var(--primary)" : "var(--card-border)" }} />)}
        </div>
        <p style={{ fontSize: "12px", lineHeight: 1.45, color: "var(--muted-foreground)", margin: 0 }}>
          {studentAttempts === 0 ? "Start with your current thinking. You do not need to get it right first time." : studentAttempts === 1 ? "First attempt captured. Use the feedback to refine your reasoning." : "Keep testing your understanding. The next step is to check what you can do independently."}
        </p>
        <div aria-label="Learning progress trace" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
          <div style={{ padding: "8px 10px", border: "1px solid var(--card-border)", borderRadius: 8 }}>
            <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>Attempts recorded</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{studentAttempts}</div>
          </div>
          <div style={{ padding: "8px 10px", border: "1px solid var(--card-border)", borderRadius: 8 }}>
            <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>Independent check</div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Not yet verified</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, minHeight: 120, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {!session || session.conversation.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <p style={{ fontSize: "3rem", marginBottom: "12px" }}>🎓</p>
            <p style={{ fontWeight: 700, fontSize: "16px", marginBottom: "8px" }}>Socratic Tutoring</p>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "10px" }}>
              I&apos;ll help you understand {topic}, practise the steps, and check what you can do independently. I may ask a question first because your reasoning helps me target the explanation, but you can always ask for more detail or a worked explanation.
            </p>
          </div>
        ) : (
          <>
            {session.conversation.map(message => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px", borderRadius: 8, background: "var(--muted)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366f1", animation: "pulse 1.5s ease-in-out infinite" }} />
                <p style={{ fontSize: "13px", color: "var(--muted-foreground)", margin: 0 }}>Thinking...</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {requestError && (
        <div role="alert" style={{ margin: "0 16px 8px", padding: "10px 12px", border: "1px solid var(--card-border)", borderRadius: 8, background: "var(--muted)", color: "var(--foreground)", fontSize: 12, lineHeight: 1.45 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /><span>{requestError}</span></div>
        </div>
      )}

      {/* Action Buttons */}
      {hasHints && !loading && (
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--card-border)", display: "flex", gap: 8 }}>
          <button
            onClick={handleRequestHint}
            disabled={currentHintLevel >= 4}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "6px",
              background: currentHintLevel >= 4 ? "var(--muted)" : "rgba(245,158,11,0.1)",
              border: currentHintLevel >= 4 ? "1px solid var(--card-border)" : "1px solid rgba(245,158,11,0.3)",
              color: currentHintLevel >= 4 ? "var(--muted-foreground)" : "#f59e0b",
              fontSize: "12px",
              fontWeight: 600,
              cursor: currentHintLevel >= 4 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Lightbulb size={14} />
            {currentHintLevel === 0 ? "Get Hint" : `Next Hint (${currentHintLevel}/4)`}
          </button>
        </div>
      )}

      {/* Structured help controls: student control without forcing a single tutoring style */}
      {session && session.conversation.length > 0 && !loading && (
        <div aria-label="Choose how the tutor should help" style={{ padding: "10px 16px", borderTop: "1px solid var(--card-border)", display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={{ width: "100%", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 2 }}>Need a different kind of help?</span>
          {[
            { label: "Hint is too vague", prompt: "That hint is too vague. Give me a more specific next step based on the question and what I have tried." },
            { label: "Show more detail", prompt: "Show me a more detailed explanation of the current problem, including the key reasoning steps. Do not skip important steps." },
            { label: "Try another method", prompt: "Show me a different valid method for approaching the current problem, and explain when it is useful." },
            { label: "Why this question?", prompt: "Explain briefly why you are asking me this question and how it helps me solve the problem." },
            { label: "Show worked solution", prompt: "I am stuck. Show a worked solution with the reasoning for each step, then give me a similar question to try independently." },
          ].map(action => (
            <button key={action.label} type="button" onClick={() => handleSendMessage(action.prompt)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--card-border)", background: "var(--card)", color: "var(--foreground)", fontSize: 11, fontWeight: 600, cursor: "pointer", minHeight: 34 }}>
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Explanation Style Buttons */}
      {session && session.conversation.length > 0 && !loading && (
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--card-border)", display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            onClick={() => handleRequestExplanation("simpler")}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.3)",
              color: "#22c55e",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <RefreshCw size={12} /> Simpler
          </button>
          <button
            onClick={() => handleRequestExplanation("detailed")}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.3)",
              color: "#3b82f6",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <List size={12} /> Detailed
          </button>
          <button
            onClick={() => handleRequestExplanation("real-world")}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.3)",
              color: "#f59e0b",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Globe size={12} /> Real World
          </button>
          <button
            onClick={() => handleRequestExplanation("analogy")}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              background: "rgba(168,85,247,0.1)",
              border: "1px solid rgba(168,85,247,0.3)",
              color: "#a855f7",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Eye size={12} /> Analogy
          </button>
          <button
            onClick={() => handleRequestExplanation("exam-focused")}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              background: "rgba(236,72,153,0.1)",
              border: "1px solid rgba(236,72,153,0.3)",
              color: "#ec4899",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <GraduationCap size={12} /> Exam
          </button>
        </div>
      )}

      {/* Distinct student attempt area */}
      <div style={{ padding: "14px 16px", borderTop: "1px solid var(--card-border)", background: "var(--background)" }}>
        <label htmlFor="socratic-attempt" style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Your attempt</label>
        <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "0 0 8px" }}>Show a step, explain your idea, or tell the tutor exactly where you got stuck.</p>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            id="socratic-attempt"
            value={input}
            onChange={(e) => { setInput(e.target.value); if (requestError) setRequestError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            placeholder="Write your working or reasoning here…"
            disabled={loading}
            rows={2}
            style={{
              flex: 1,
              minWidth: 0,
              resize: "vertical",
              padding: "12px 14px",
              borderRadius: "8px",
              border: "1px solid var(--card-border)",
              background: "var(--card)",
              color: "var(--foreground)",
              fontSize: "14px",
              lineHeight: 1.5,
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || loading}
            aria-label="Send message"
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              background: !input.trim() || loading ? "var(--muted)" : "var(--primary)",
              color: "white",
              border: "none",
              fontWeight: 600,
              fontSize: "14px",
              minHeight: 44,
              cursor: !input.trim() || loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Send size={16} />
          </button>
        </div>
        <p style={{ fontSize: 10, color: "var(--muted-foreground)", margin: "7px 0 0" }}>Enter to submit · Shift + Enter for a new line</p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

function MessageBubble({ message }: { message: TutoringMessage }) {
  const isTutor = message.role === "tutor";
  const typeColors = {
    question: "#6366f1",
    hint: "#f59e0b",
    guidance: "#22c55e",
    feedback: "#f87171",
    explanation: "#8b5cf6",
    reinforcement: "#06b6d4",
  };

  const color = typeColors[message.type] || "#6366f1";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isTutor ? "flex-start" : "flex-end",
      }}
    >
      <div
        style={{
          maxWidth: "80%",
          padding: "12px 16px",
          borderRadius: 12,
          background: isTutor ? `${color}10` : "var(--primary)",
          border: isTutor ? `1px solid ${color}20` : "none",
          color: isTutor ? "var(--foreground)" : "white",
        }}
      >
        {isTutor && message.type !== "hint" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            {message.type === "feedback" && <AlertCircle size={12} color="var(--danger)" />}
            {message.type === "guidance" && <List size={12} color="#22c55e" />}
            {message.type === "explanation" && <BookOpen size={12} color="#8b5cf6" />}
            <span style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", color }}>
              {message.type}
            </span>
          </div>
        )}
        <p style={{ fontSize: "14px", lineHeight: 1.5, margin: 0 }}>{message.content}</p>
      </div>
    </div>
  );
}

function generateHints(topic: string, studentLevel: string): Hint[] {
  return [
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
}
