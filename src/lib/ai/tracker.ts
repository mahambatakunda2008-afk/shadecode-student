/**
 * AI Usage Tracking System
 * 
 * Tracks AI model usage, costs, and performance metrics across all features.
 * Provides utilities for logging AI calls and calculating costs.
 */

import { createClient } from '@supabase/supabase-js';

// Cost per 1M tokens (in USD) - Updated as of 2025-01-15
// These are approximate costs and should be updated regularly
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-4': { input: 30.0, output: 60.0 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'gpt-4o': { input: 5.0, output: 15.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  
  // Claude (Anthropic)
  'claude-3-opus': { input: 15.0, output: 75.0 },
  'claude-3-sonnet': { input: 3.0, output: 15.0 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'claude-3.5-sonnet': { input: 3.0, output: 15.0 },
  
  // Gemini (Google)
  'gemini-1.5-pro': { input: 3.5, output: 10.5 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
  'gemini-pro': { input: 0.5, output: 1.5 },
  
  // Cloudflare Workers AI
  '@cf/meta/llama-2-7b-chat-int8': { input: 0.0, output: 0.0 }, // Free tier
  '@cf/meta/llama-2-7b-chat-fp16': { input: 0.0, output: 0.0 }, // Free tier
  '@cf/mistral/mistral-7b-instruct': { input: 0.0, output: 0.0 }, // Free tier
  
  // OpenRouter (varies by model)
  'openrouter-default': { input: 1.0, output: 2.0 },
};

export interface AIUsageLog {
  userId?: string;
  sessionId?: string;
  feature: string;
  subfeature?: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  errorCode?: string;
  requestMetadata?: Record<string, unknown>;
  responseMetadata?: Record<string, unknown>;
}

export interface AIUsageResult {
  logId?: string;
  estimatedCost: number;
}

/**
 * Calculate estimated cost based on model and token usage
 */
export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const costs = MODEL_COSTS[model] || MODEL_COSTS['openrouter-default'];
  
  const inputCost = (promptTokens / 1_000_000) * costs.input;
  const outputCost = (completionTokens / 1_000_000) * costs.output;
  
  return inputCost + outputCost;
}

/**
 * Log AI usage to the database
 */
export async function logAIUsage(log: AIUsageLog): Promise<AIUsageResult> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const estimatedCost = calculateCost(
      log.model,
      log.promptTokens,
      log.completionTokens
    );

    const { data, error } = await supabase.rpc('log_ai_usage', {
      p_user_id: log.userId || null,
      p_session_id: log.sessionId || null,
      p_feature: log.feature,
      p_subfeature: log.subfeature || null,
      p_provider: log.provider,
      p_model: log.model,
      p_prompt_tokens: log.promptTokens,
      p_completion_tokens: log.completionTokens,
      p_estimated_cost: estimatedCost,
      p_latency_ms: log.latencyMs,
      p_success: log.success,
      p_error_message: log.errorMessage || null,
      p_error_code: log.errorCode || null,
      p_request_metadata: (log.requestMetadata || {}) as any,
      p_response_metadata: (log.responseMetadata || {}) as any,
    });

    if (error) {
      console.error('[AI Tracker] Failed to log usage:', error);
      // Don't throw - we don't want to break the main flow
      return { estimatedCost };
    }

    // Update budget usage
    await updateBudgetUsage(log.feature, estimatedCost);

    return {
      logId: data as string,
      estimatedCost,
    };
  } catch (error) {
    console.error('[AI Tracker] Error logging usage:', error);
    // Don't throw - we don't want to break the main flow
    const estimatedCost = calculateCost(log.model, log.promptTokens, log.completionTokens);
    return { estimatedCost };
  }
}

/**
 * Update budget usage after logging
 */
async function updateBudgetUsage(feature: string, cost: number): Promise<void> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Update global budget
    await supabase.rpc('update_budget_usage', {
      p_scope_type: 'global',
      p_scope_id: null,
      p_period_type: 'monthly',
      p_cost: cost,
    });

    // Update feature-specific budget
    await supabase.rpc('update_budget_usage', {
      p_scope_type: 'feature',
      p_scope_id: feature,
      p_period_type: 'monthly',
      p_cost: cost,
    });
  } catch (error) {
    console.error('[AI Tracker] Error updating budget:', error);
    // Don't throw
  }
}

/**
 * Check if a request would exceed budget limits
 */
export async function checkBudgetLimit(
  feature: string,
  estimatedCost: number
): Promise<boolean> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check global budget
    const { data: globalAllowed } = await supabase.rpc('check_budget_limit', {
      p_scope_type: 'global',
      p_scope_id: null,
      p_period_type: 'monthly',
      p_cost: estimatedCost,
    });

    if (globalAllowed === false) {
      return false;
    }

    // Check feature-specific budget
    const { data: featureAllowed } = await supabase.rpc('check_budget_limit', {
      p_scope_type: 'feature',
      p_scope_id: feature,
      p_period_type: 'monthly',
      p_cost: estimatedCost,
    });

    return featureAllowed !== false;
  } catch (error) {
    console.error('[AI Tracker] Error checking budget:', error);
    // Allow the request if we can't check the budget
    return true;
  }
}

/**
 * Wrapper function to track AI calls automatically
 */
export async function trackAICall<T>(
  params: AIUsageLog & {
    fn: () => Promise<{ response: T; tokens?: { prompt: number; completion: number } }>;
  }
): Promise<T> {
  const startTime = Date.now();
  const { fn, ...logParams } = params;

  try {
    const result = await fn();
    const latencyMs = Date.now() - startTime;

    const log: AIUsageLog = {
      ...logParams,
      latencyMs,
      success: true,
      promptTokens: result.tokens?.prompt || 0,
      completionTokens: result.tokens?.completion || 0,
    };

    await logAIUsage(log);

    return result.response;
  } catch (error) {
    const latencyMs = Date.now() - startTime;

    const log: AIUsageLog = {
      ...logParams,
      latencyMs,
      success: false,
      promptTokens: 0,
      completionTokens: 0,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorCode: error instanceof Error ? error.constructor.name : 'UNKNOWN',
    };

    await logAIUsage(log);

    throw error;
  }
}

/**
 * Get model cost information
 */
export function getModelCost(model: string): { input: number; output: number } {
  return MODEL_COSTS[model] || MODEL_COSTS['openrouter-default'];
}

/**
 * Add or update model cost information
 */
export function setModelCost(
  model: string,
  inputCost: number,
  outputCost: number
): void {
  MODEL_COSTS[model] = { input: inputCost, output: outputCost };
}
