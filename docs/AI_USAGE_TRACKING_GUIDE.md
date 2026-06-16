# AI Usage Tracking Guide

## Overview

This document describes the AI usage tracking system implemented for Shadecode Student. The system provides comprehensive monitoring of AI API usage across all features, enabling cost tracking, performance analysis, and anomaly detection.

## Architecture

### Database Schema

The tracking system uses four main tables in Supabase:

#### `ai_usage_logs`
Stores individual AI API requests with detailed metrics:
- `id`: Unique identifier
- `user_id`: User who made the request (nullable for anonymous requests)
- `feature`: Feature using AI (e.g., 'cortex', 'homework_helper', 'lesson_assistant')
- `subfeature`: Specific sub-feature (e.g., 'generate_lesson', 'mark_exam')
- `provider`: AI provider (cloudflare, openai, gemini, openrouter)
- `model`: Model name (e.g., 'gpt-4o-mini', 'gemini-2.5-flash')
- `prompt_tokens`: Number of tokens in the prompt
- `completion_tokens`: Number of tokens in the response
- `latency_ms`: Request latency in milliseconds
- `success`: Whether the request succeeded
- `error_message`: Error message if failed
- `error_code`: Error code if failed
- `estimated_cost`: Estimated cost in USD
- `request_metadata`: Additional context (JSON)
- `created_at`: Timestamp

#### `ai_usage_aggregates`
Pre-computed aggregates for faster reporting:
- Daily, weekly, monthly aggregations
- Grouped by feature, provider, model
- Includes totals, averages, and success rates

#### `ai_usage_budgets`
Budget management for cost control:
- Per-feature or global budgets
- Period-based (daily, weekly, monthly)
- Alert thresholds

#### `ai_usage_anomalies`
Detected anomalies for monitoring:
- Anomaly type (latency, cost, tokens, error rate, volume)
- Severity level
- Detected value vs expected range
- Context information

### Utility Functions

Located in `src/lib/ai/tracker.ts`:

#### `logAIUsage(log: AIUsageLog): Promise<AIUsageResult>`
Logs an AI usage event to Supabase. Automatically calculates cost and updates aggregates.

```typescript
await logAIUsage({
  userId: 'user-123',
  feature: 'lesson_assistant',
  subfeature: 'generate_lesson',
  provider: 'openai',
  model: 'gpt-4o-mini',
  promptTokens: 1000,
  completionTokens: 500,
  latencyMs: 1500,
  success: true,
  requestMetadata: { topic: 'algebra', difficulty: 'medium' },
});
```

#### `calculateCost(model: string, promptTokens: number, completionTokens: number): number`
Calculates estimated cost based on model pricing.

#### `updateBudgetUsage(userId: string, feature: string, cost: number): Promise<void>`
Updates budget usage for a user/feature combination.

#### `checkBudgetLimit(userId: string, feature: string): Promise<boolean>`
Checks if a user has exceeded their budget limit.

#### `trackAICall<T>(fn: () => Promise<T>, config: TrackConfig): Promise<T>`
Wrapper function to automatically track AI calls with error handling.

## Integration Guide

### Adding Tracking to New Features

1. **Import the tracking function:**
```typescript
import { logAIUsage } from "@/lib/ai/tracker";
```

2. **Wrap your AI API call:**
```typescript
const startTime = Date.now();
const promptTokens = Math.ceil(prompt.length / 4);

try {
  const response = await fetch(apiUrl, options);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  
  if (text) {
    const latencyMs = Date.now() - startTime;
    const completionTokens = Math.ceil(text.length / 4);
    
    await logAIUsage({
      userId,
      feature: 'your_feature',
      subfeature: 'your_subfeature',
      provider: 'your_provider',
      model: 'your_model',
      promptTokens,
      completionTokens,
      latencyMs,
      success: true,
      requestMetadata: { /* context */ },
    });
    
    return text;
  }
} catch (error) {
  const latencyMs = Date.now() - startTime;
  
  await logAIUsage({
    userId,
    feature: 'your_feature',
    subfeature: 'your_subfeature',
    provider: 'your_provider',
    model: 'your_model',
    promptTokens,
    completionTokens: 0,
    latencyMs,
    success: false,
    errorMessage: error instanceof Error ? error.message : String(error),
    errorCode: error instanceof Error ? error.constructor.name : 'UNKNOWN',
    requestMetadata: { /* context */ },
  });
  
  throw error;
}
```

### Currently Integrated Features

- **Cortex Operations** (`src/lib/cortex/runtime/ai-gateway.ts`)
  - Tracks Gemini API calls for behavioral insights
  - Feature: `cortex`
  - Subfeature: `behavioral_insight`

- **Homework Helper** (`src/app/api/math-checker/route.js`)
  - Tracks Gemini API calls for math problem analysis
  - Feature: `homework_helper`
  - Subfeature: `math_checker`

- **Lesson Assistant** (`src/app/api/learn/route.ts`)
  - Tracks multi-provider AI calls for lesson generation
  - Feature: `lesson_assistant`
  - Subfeature: `generate_lesson`
  - Providers: Cloudflare, OpenAI, Gemini, OpenRouter

- **Exam Sim - Generate** (`src/app/api/exam/generate/route.js`)
  - Tracks multi-provider AI calls for exam generation
  - Feature: `exam_sim`
  - Subfeature: `generate_exam`
  - Providers: Cloudflare, OpenAI, Gemini, OpenRouter

- **Exam Sim - Mark** (`src/app/api/exam/mark/route.js`)
  - Tracks multi-provider AI calls for exam marking
  - Feature: `exam_sim`
  - Subfeature: `mark_exam`
  - Providers: Cloudflare, OpenAI, Gemini

- **Content Generation** (`src/app/api/generate-revision/route.ts`)
  - Tracks OpenAI API calls for revision generation
  - Feature: `content_generation`
  - Subfeature: `generate_revision`
  - Provider: OpenAI

## Admin Dashboard

### Access
Navigate to `/admin/ai-usage` to view the AI usage dashboard.

### Features
- **Overview Stats**: Total requests, tokens, cost, success rate, average latency
- **Time Range Filter**: View data for last 24 hours, 7 days, 30 days, or all time
- **Feature Breakdown**: Usage and cost by feature
- **Provider Breakdown**: Usage and cost by AI provider
- **Recent Logs**: Last 20 AI requests with full details

### Auto-Refresh
Dashboard refreshes every 30 seconds automatically.

## API Endpoints

### Usage Report
**Endpoint**: `GET /api/admin/ai-usage-report`

**Query Parameters**:
- `format`: 'json' or 'csv' (default: 'json')
- `startDate`: ISO date string (optional)
- `endDate`: ISO date string (optional)
- `feature`: Filter by feature (optional)
- `provider`: Filter by provider (optional)

**Response** (JSON):
```json
{
  "generatedAt": "2024-01-15T10:00:00Z",
  "period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-15T10:00:00Z"
  },
  "summary": {
    "totalRequests": 1000,
    "totalTokens": 500000,
    "totalCost": 0.5,
    "successRate": "98.5",
    "avgLatency": 1500
  },
  "breakdowns": {
    "byFeature": [...],
    "byProvider": [...],
    "byModel": [...]
  },
  "logs": [...]
}
```

**Example Usage**:
```bash
# Get JSON report for last 7 days
curl "https://your-domain.com/api/admin/ai-usage-report?startDate=2024-01-08&endDate=2024-01-15"

# Download CSV report
curl "https://your-domain.com/api/admin/ai-usage-report?format=csv" -o report.csv

# Filter by feature
curl "https://your-domain.com/api/admin/ai-usage-report?feature=lesson_assistant"
```

### Cost Report
**Endpoint**: `GET /api/admin/ai-cost-report`

**Query Parameters**:
- `startDate`: ISO date string (optional)
- `endDate`: ISO date string (optional)
- `granularity`: 'hourly', 'daily', 'weekly', 'monthly' (default: 'daily')

**Response**:
```json
{
  "generatedAt": "2024-01-15T10:00:00Z",
  "period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-15T10:00:00Z",
    "granularity": "daily"
  },
  "summary": {
    "totalCost": 0.5,
    "totalTokens": 500000,
    "totalRequests": 1000,
    "avgCostPerRequest": 0.0005,
    "avgCostPerToken": 0.000001,
    "costTrend": "+5.2"
  },
  "timeSeries": [...],
  "breakdowns": {
    "byProvider": [...],
    "byFeature": [...],
    "byModel": [...]
  },
  "insights": {
    "mostExpensiveProvider": "openai",
    "mostExpensiveFeature": "lesson_assistant",
    "mostExpensiveModel": "gpt-4o-mini",
    "costEfficiency": {
      "bestProvider": "gemini",
      "bestModel": "gemini-2.5-flash"
    }
  }
}
```

### Anomaly Detection
**Endpoint**: `GET /api/admin/ai-anomalies`

**Query Parameters**:
- `lookbackHours`: Hours to look back (default: 24)
- `zScoreThreshold`: Z-score threshold (default: 3)
- `iqrMultiplier`: IQR multiplier (default: 1.5)

**Response**:
```json
{
  "generatedAt": "2024-01-15T10:00:00Z",
  "analysisPeriod": {
    "start": "2024-01-14T10:00:00Z",
    "end": "2024-01-15T10:00:00Z",
    "lookbackHours": 24
  },
  "parameters": {
    "zScoreThreshold": 3,
    "iqrMultiplier": 1.5
  },
  "summary": {
    "totalAnomalies": 5,
    "criticalCount": 1,
    "highCount": 2,
    "mediumCount": 2,
    "lowCount": 0
  },
  "anomalies": [
    {
      "type": "latency_anomaly",
      "severity": "high",
      "description": "Unusual latency detected for openai/gpt-4o-mini",
      "metric": "latency_ms",
      "value": 5000,
      "expectedRange": { "min": 500, "max": 2500 },
      "timestamp": "2024-01-15T09:30:00Z",
      "context": { ... }
    }
  ]
}
```

## Cost Calculation

The system uses a cost calculation function in `src/lib/ai/tracker.ts` that estimates costs based on model pricing:

```typescript
const COST_PER_TOKEN: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.00000015, output: 0.0000006 },
  'gpt-4o': { input: 0.0000025, output: 0.00001 },
  'gemini-2.5-flash': { input: 0.000000075, output: 0.0000003 },
  'gemini-2.0-flash': { input: 0.000000075, output: 0.0000003 },
  'llama-3.3-70b-instruct': { input: 0.0000001, output: 0.0000001 },
};
```

Cost is calculated as:
```
total_cost = (prompt_tokens * input_price) + (completion_tokens * output_price)
```

## Anomaly Detection

The anomaly detection system uses statistical methods to identify unusual patterns:

### Detection Methods

1. **Z-Score Analysis**: Detects values that deviate significantly from the mean
2. **IQR (Interquartile Range)**: Detects outliers using quartile-based thresholds
3. **Rolling Window Analysis**: Detects patterns over time windows

### Anomaly Types

- **Latency Anomalies**: Unusual response times
- **Cost Anomalies**: Unusually high costs per request
- **Token Anomalies**: Unusual token counts
- **Error Rate Spikes**: Sudden increases in failure rates
- **Volume Anomalies**: Unusual request volume patterns

### Severity Levels

- **Critical**: Immediate attention required (Z-score > 5)
- **High**: Should be investigated soon (Z-score > 4)
- **Medium**: Monitor for patterns (Z-score > 3)
- **Low**: Informational only

## Best Practices

### 1. Always Track Both Success and Failure
```typescript
try {
  // AI call
  await logAIUsage({ success: true, ... });
} catch (error) {
  await logAIUsage({ success: false, errorMessage: error.message, ... });
  throw error;
}
```

### 2. Include Relevant Context
Use `requestMetadata` to include feature-specific context:
```typescript
requestMetadata: {
  topic: 'algebra',
  difficulty: 'medium',
  questionCount: 10,
}
```

### 3. Use Meaningful Feature Names
Choose clear, consistent feature names:
- Good: `lesson_assistant`, `homework_helper`, `exam_sim`
- Bad: `api1`, `feature_x`, `temp`

### 4. Handle Async Logging Gracefully
Logging is asynchronous and should not block main operations:
```typescript
// Fire and forget - don't await in hot paths
logAIUsage({...}).catch(err => console.error('Logging failed:', err));
```

### 5. Set Appropriate Budgets
Configure budgets in the `ai_usage_budgets` table to prevent runaway costs:
```sql
INSERT INTO ai_usage_budgets (user_id, feature, period, limit_amount, alert_threshold)
VALUES ('user-123', 'lesson_assistant', 'daily', 0.10, 0.08);
```

## Troubleshooting

### Logs Not Appearing in Dashboard
1. Check Supabase connection: Verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
2. Check RLS policies: Ensure service role has write access to `ai_usage_logs`
3. Check console for errors: Look for logging errors in browser/dev console

### Incorrect Cost Calculations
1. Verify model pricing in `src/lib/ai/tracker.ts`
2. Check token estimation: Rough estimate (length/4) may be inaccurate
3. For accurate costs, use provider-provided token counts when available

### High Latency in Tracking
1. Tracking is async and should not block operations
2. If blocking occurs, check Supabase connection performance
3. Consider batching logs for high-volume scenarios

## Future Enhancements

Potential improvements to consider:

1. **Real-time Dashboard**: WebSocket-based real-time updates
2. **Alert System**: Automated alerts for anomalies and budget overruns
3. **User-level Reporting**: Per-user usage and cost breakdowns
4. **Cost Optimization Suggestions**: AI-powered recommendations for cost reduction
5. **Provider Failover Analysis**: Track and analyze provider reliability
6. **Custom Metrics**: Allow adding custom metrics per feature
7. **Export Scheduling**: Automated report generation and delivery
8. **Budget Enforcement**: Hard limits that prevent requests when exceeded

## Security Considerations

1. **Service Role Key**: The tracking system uses the service role key - keep this secret
2. **RLS Policies**: Ensure RLS policies prevent unauthorized access to usage data
3. **PII**: Avoid logging personally identifiable information in `request_metadata`
4. **Rate Limiting**: The admin endpoints should be rate-limited to prevent abuse

## Support

For issues or questions about the AI usage tracking system:
1. Check this documentation first
2. Review the database schema in `supabase/migrations/0020_create_ai_usage_tracking.sql`
3. Examine the utility functions in `src/lib/ai/tracker.ts`
4. Check existing integrations for examples
