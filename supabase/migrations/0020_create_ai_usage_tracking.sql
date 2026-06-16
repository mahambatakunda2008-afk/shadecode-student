-- Migration: Create AI Usage Tracking System
-- Purpose: Track AI model usage, costs, and performance metrics across all features
-- Date: 2025-01-15

-- Create ai_usage_logs table for individual AI calls
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  
  -- Feature identification
  feature TEXT NOT NULL, -- 'cortex', 'homework_helper', 'lesson_assistant', 'exam_sim', 'content_generation'
  subfeature TEXT, -- Specific action within feature (e.g., 'generate_lesson', 'mark_exam')
  
  -- Model information
  provider TEXT NOT NULL, -- 'openai', 'cloudflare', 'gemini', 'openrouter'
  model TEXT NOT NULL, -- 'gpt-4', 'claude-3', 'gemini-pro', etc.
  
  -- Usage metrics
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (prompt_tokens + completion_tokens) STORED,
  
  -- Cost estimation (in USD)
  estimated_cost DECIMAL(10, 6) DEFAULT 0.000000,
  
  -- Performance metrics
  latency_ms INTEGER, -- Request latency in milliseconds
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  error_code TEXT,
  
  -- Request metadata
  request_metadata JSONB DEFAULT '{}',
  response_metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for common queries
  CONSTRAINT valid_cost CHECK (estimated_cost >= 0),
  CONSTRAINT valid_tokens CHECK (prompt_tokens >= 0 AND completion_tokens >= 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_feature ON ai_usage_logs(feature);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_provider ON ai_usage_logs(provider);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_model ON ai_usage_logs(model);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_success ON ai_usage_logs(success);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_session_id ON ai_usage_logs(session_id);

-- Create composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_feature_created_at ON ai_usage_logs(feature, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_created_at ON ai_usage_logs(user_id, created_at DESC);

-- Create ai_usage_aggregates table for daily/weekly/monthly summaries
CREATE TABLE IF NOT EXISTS ai_usage_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Time period
  period_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Aggregation dimensions
  feature TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  
  -- Aggregated metrics
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  success_rate DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE 
      WHEN total_requests > 0 THEN (successful_requests::DECIMAL / total_requests::DECIMAL) * 100
      ELSE 0
    END
  ) STORED,
  
  -- Token aggregates
  total_prompt_tokens BIGINT DEFAULT 0,
  total_completion_tokens BIGINT DEFAULT 0,
  total_tokens BIGINT GENERATED ALWAYS AS (total_prompt_tokens + total_completion_tokens) STORED,
  avg_tokens_per_request DECIMAL(10, 2),
  
  -- Cost aggregates
  total_cost DECIMAL(12, 6) DEFAULT 0.000000,
  avg_cost_per_request DECIMAL(10, 6),
  avg_cost_per_token DECIMAL(10, 8),
  
  -- Performance aggregates
  avg_latency_ms DECIMAL(10, 2),
  p50_latency_ms DECIMAL(10, 2),
  p95_latency_ms DECIMAL(10, 2),
  p99_latency_ms DECIMAL(10, 2),
  
  -- Unique users
  unique_users INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate aggregates
  UNIQUE(period_type, period_start, period_end, feature, provider, model),
  
  CONSTRAINT valid_period CHECK (period_end > period_start),
  CONSTRAINT valid_aggregates CHECK (total_requests >= 0 AND total_cost >= 0)
);

-- Create indexes for aggregate queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_aggregates_period ON ai_usage_aggregates(period_type, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_aggregates_feature ON ai_usage_aggregates(feature);
CREATE INDEX IF NOT EXISTS idx_ai_usage_aggregates_provider ON ai_usage_aggregates(provider);
CREATE INDEX IF NOT EXISTS idx_ai_usage_aggregates_model ON ai_usage_aggregates(model);

-- Create ai_cost_budgets table for budget management
CREATE TABLE IF NOT EXISTS ai_cost_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Budget scope
  scope_type TEXT NOT NULL, -- 'global', 'feature', 'user', 'model'
  scope_id TEXT, -- user_id, feature name, or model name depending on scope_type
  
  -- Budget period
  period_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
  
  -- Budget limits
  budget_limit DECIMAL(12, 6) NOT NULL, -- in USD
  budget_used DECIMAL(12, 6) DEFAULT 0.000000,
  budget_remaining DECIMAL(12, 6) GENERATED ALWAYS AS (budget_limit - budget_used) STORED,
  
  -- Alert thresholds
  alert_threshold_percent INTEGER DEFAULT 80, -- Alert when 80% of budget used
  alert_sent BOOLEAN DEFAULT false,
  
  -- Status
  active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_budget CHECK (budget_limit > 0 AND budget_used >= 0),
  CONSTRAINT valid_threshold CHECK (alert_threshold_percent > 0 AND alert_threshold_percent <= 100)
);

-- Create indexes for budget queries
CREATE INDEX IF NOT EXISTS idx_ai_cost_budgets_scope ON ai_cost_budgets(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_ai_cost_budgets_active ON ai_cost_budgets(active) WHERE active = true;

-- Create ai_anomalies table for anomaly detection
CREATE TABLE IF NOT EXISTS ai_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Anomaly type
  anomaly_type TEXT NOT NULL, -- 'spike', 'drop', 'unusual_pattern', 'budget_exceeded', 'high_failure_rate'
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  
  -- What was detected
  metric_name TEXT NOT NULL, -- 'cost', 'tokens', 'latency', 'error_rate', 'requests'
  expected_value DECIMAL(15, 6),
  actual_value DECIMAL(15, 6),
  deviation_percent DECIMAL(10, 2),
  
  -- Scope
  feature TEXT,
  provider TEXT,
  model TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Time period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Details
  description TEXT,
  recommendation TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_deviation CHECK (deviation_percent >= 0)
);

-- Create indexes for anomaly queries
CREATE INDEX IF NOT EXISTS idx_ai_anomalies_type ON ai_anomalies(anomaly_type);
CREATE INDEX IF NOT EXISTS idx_ai_anomalies_severity ON ai_anomalies(severity);
CREATE INDEX IF NOT EXISTS idx_ai_anomalies_resolved ON ai_anomalies(resolved);
CREATE INDEX IF NOT EXISTS idx_ai_anomalies_created_at ON ai_anomalies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_anomalies_feature ON ai_anomalies(feature);

-- Enable Row Level Security
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cost_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_anomalies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_usage_logs
-- Service role can do anything
CREATE POLICY "Service role full access ai_usage_logs" 
ON ai_usage_logs FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Authenticated users can read their own logs
CREATE POLICY "Users can read own ai_usage_logs" 
ON ai_usage_logs FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- RLS Policies for ai_usage_aggregates
-- Service role can do anything
CREATE POLICY "Service role full access ai_usage_aggregates" 
ON ai_usage_aggregates FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Authenticated users can read aggregates (no user-specific data)
CREATE POLICY "Users can read ai_usage_aggregates" 
ON ai_usage_aggregates FOR SELECT 
TO authenticated 
USING (true);

-- RLS Policies for ai_cost_budgets
-- Service role can do anything
CREATE POLICY "Service role full access ai_cost_budgets" 
ON ai_cost_budgets FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Admin users can manage budgets (will be enforced by RBAC)
CREATE POLICY "Admins can manage ai_cost_budgets" 
ON ai_cost_budgets FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- RLS Policies for ai_anomalies
-- Service role can do anything
CREATE POLICY "Service role full access ai_anomalies" 
ON ai_anomalies FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Admin users can read and manage anomalies
CREATE POLICY "Admins can manage ai_anomalies" 
ON ai_anomalies FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_ai_usage_aggregates_updated_at 
  BEFORE UPDATE ON ai_usage_aggregates 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_cost_budgets_updated_at 
  BEFORE UPDATE ON ai_cost_budgets 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_anomalies_updated_at 
  BEFORE UPDATE ON ai_anomalies 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to log AI usage
CREATE OR REPLACE FUNCTION log_ai_usage(
  p_user_id UUID,
  p_session_id TEXT,
  p_feature TEXT,
  p_subfeature TEXT,
  p_provider TEXT,
  p_model TEXT,
  p_prompt_tokens INTEGER,
  p_completion_tokens INTEGER,
  p_estimated_cost DECIMAL,
  p_latency_ms INTEGER,
  p_success BOOLEAN,
  p_error_message TEXT,
  p_error_code TEXT,
  p_request_metadata JSONB,
  p_response_metadata JSONB
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO ai_usage_logs (
    user_id,
    session_id,
    feature,
    subfeature,
    provider,
    model,
    prompt_tokens,
    completion_tokens,
    estimated_cost,
    latency_ms,
    success,
    error_message,
    error_code,
    request_metadata,
    response_metadata
  ) VALUES (
    p_user_id,
    p_session_id,
    p_feature,
    p_subfeature,
    p_provider,
    p_model,
    COALESCE(p_prompt_tokens, 0),
    COALESCE(p_completion_tokens, 0),
    COALESCE(p_estimated_cost, 0),
    p_latency_ms,
    COALESCE(p_success, true),
    p_error_message,
    p_error_code,
    COALESCE(p_request_metadata, '{}'::jsonb),
    COALESCE(p_response_metadata, '{}'::jsonb)
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to update budget usage
CREATE OR REPLACE FUNCTION update_budget_usage(
  p_scope_type TEXT,
  p_scope_id TEXT,
  p_period_type TEXT,
  p_cost DECIMAL
)
RETURNS VOID AS $$
BEGIN
  UPDATE ai_cost_budgets
  SET budget_used = budget_used + p_cost,
      alert_sent = false -- Reset alert when budget is updated
  WHERE scope_type = p_scope_type
    AND (scope_id = p_scope_id OR scope_id IS NULL)
    AND period_type = p_period_type
    AND active = true;
END;
$$ LANGUAGE plpgsql;

-- Create function to check budget limit
CREATE OR REPLACE FUNCTION check_budget_limit(
  p_scope_type TEXT,
  p_scope_id TEXT,
  p_period_type TEXT,
  p_cost DECIMAL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_budget_remaining DECIMAL;
  v_alert_threshold DECIMAL;
  v_budget_limit DECIMAL;
BEGIN
  SELECT 
    budget_remaining,
    budget_limit * (alert_threshold_percent::DECIMAL / 100.0)
  INTO v_budget_remaining, v_alert_threshold
  FROM ai_cost_budgets
  WHERE scope_type = p_scope_type
    AND (scope_id = p_scope_id OR scope_id IS NULL)
    AND period_type = p_period_type
    AND active = true
  LIMIT 1;
  
  -- If no budget is set, allow the request
  IF v_budget_remaining IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check if adding this cost would exceed the alert threshold
  IF v_budget_remaining - p_cost < v_alert_threshold THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION log_ai_usage TO service_role;
GRANT EXECUTE ON FUNCTION update_budget_usage TO service_role;
GRANT EXECUTE ON FUNCTION check_budget_limit TO service_role;
