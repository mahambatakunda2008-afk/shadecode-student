import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasUserRole } from "@/lib/auth/rbac";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Statistical functions for anomaly detection
function calculateMean(values: number[]): number {
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function calculateStdDev(values: number[], mean: number): number {
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length);
}

function calculateZScore(value: number, mean: number, stdDev: number): number {
  return stdDev === 0 ? 0 : (value - mean) / stdDev;
}

function calculateIQR(values: number[]): { q1: number; q3: number; iqr: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  return { q1, q3, iqr: q3 - q1 };
}

interface Anomaly {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metric: string;
  value: number;
  expectedRange: { min: number; max: number };
  timestamp: string;
  context?: any;
}

export async function GET(req: Request) {
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user || !(await hasUserRole(user.id, "admin"))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const lookbackHours = parseInt(searchParams.get('lookbackHours') || '24');
  const zScoreThreshold = parseFloat(searchParams.get('zScoreThreshold') || '3');
  const iqrMultiplier = parseFloat(searchParams.get('iqrMultiplier') || '1.5');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Fetch recent logs
    const cutoffDate = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();
    
    const { data: logs, error } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .gte('created_at', cutoffDate)
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (!logs || logs.length < 10) {
      return NextResponse.json({ 
        anomalies: [], 
        message: 'Insufficient data for anomaly detection (need at least 10 data points)' 
      });
    }

    const anomalies: Anomaly[] = [];

    // 1. Detect latency anomalies
    const latencies = logs.map(log => log.latency_ms);
    const latencyMean = calculateMean(latencies);
    const latencyStdDev = calculateStdDev(latencies, latencyMean);
    const latencyIQR = calculateIQR(latencies);

    logs.forEach(log => {
      const zScore = calculateZScore(log.latency_ms, latencyMean, latencyStdDev);
      const isBelowQ1 = log.latency_ms < (latencyIQR.q1 - iqrMultiplier * latencyIQR.iqr);
      const isAboveQ3 = log.latency_ms > (latencyIQR.q3 + iqrMultiplier * latencyIQR.iqr);

      if (Math.abs(zScore) > zScoreThreshold || isBelowQ1 || isAboveQ3) {
        const severity = Math.abs(zScore) > 5 ? 'critical' : Math.abs(zScore) > 4 ? 'high' : 'medium';
        
        anomalies.push({
          type: 'latency_anomaly',
          severity,
          description: `Unusual latency detected for ${log.provider}/${log.model}`,
          metric: 'latency_ms',
          value: log.latency_ms,
          expectedRange: { 
            min: Math.max(0, latencyMean - 2 * latencyStdDev), 
            max: latencyMean + 2 * latencyStdDev 
          },
          timestamp: log.created_at,
          context: {
            provider: log.provider,
            model: log.model,
            feature: log.feature,
            success: log.success,
          },
        });
      }
    });

    // 2. Detect cost anomalies
    const costs = logs.map(log => log.estimated_cost || 0);
    const costMean = calculateMean(costs);
    const costStdDev = calculateStdDev(costs, costMean);
    const costIQR = calculateIQR(costs);

    logs.forEach(log => {
      const cost = log.estimated_cost || 0;
      const zScore = calculateZScore(cost, costMean, costStdDev);
      const isAboveQ3 = cost > (costIQR.q3 + iqrMultiplier * costIQR.iqr);

      if (zScore > zScoreThreshold || isAboveQ3) {
        const severity = zScore > 5 ? 'critical' : zScore > 4 ? 'high' : 'medium';
        
        anomalies.push({
          type: 'cost_anomaly',
          severity,
          description: `Unusually high cost detected for ${log.provider}/${log.model}`,
          metric: 'estimated_cost',
          value: cost,
          expectedRange: { 
            min: 0, 
            max: costMean + 2 * costStdDev 
          },
          timestamp: log.created_at,
          context: {
            provider: log.provider,
            model: log.model,
            feature: log.feature,
            promptTokens: log.prompt_tokens,
            completionTokens: log.completion_tokens,
          },
        });
      }
    });

    // 3. Detect token count anomalies
    const totalTokens = logs.map(log => log.prompt_tokens + log.completion_tokens);
    const tokenMean = calculateMean(totalTokens);
    const tokenStdDev = calculateStdDev(totalTokens, tokenMean);
    const tokenIQR = calculateIQR(totalTokens);

    logs.forEach(log => {
      const tokens = log.prompt_tokens + log.completion_tokens;
      const zScore = calculateZScore(tokens, tokenMean, tokenStdDev);
      const isAboveQ3 = tokens > (tokenIQR.q3 + iqrMultiplier * tokenIQR.iqr);

      if (Math.abs(zScore) > zScoreThreshold || isAboveQ3) {
        const severity = Math.abs(zScore) > 5 ? 'critical' : Math.abs(zScore) > 4 ? 'high' : 'medium';
        
        anomalies.push({
          type: 'token_anomaly',
          severity,
          description: `Unusual token count detected for ${log.provider}/${log.model}`,
          metric: 'total_tokens',
          value: tokens,
          expectedRange: { 
            min: Math.max(0, tokenMean - 2 * tokenStdDev), 
            max: tokenMean + 2 * tokenStdDev 
          },
          timestamp: log.created_at,
          context: {
            provider: log.provider,
            model: log.model,
            feature: log.feature,
            promptTokens: log.prompt_tokens,
            completionTokens: log.completion_tokens,
          },
        });
      }
    });

    // 4. Detect error rate spikes
    const errorRates: number[] = [];
    const windowSize = 10;
    
    for (let i = 0; i < logs.length - windowSize + 1; i++) {
      const window = logs.slice(i, i + windowSize);
      const errorCount = window.filter(log => !log.success).length;
      errorRates.push((errorCount / window.length) * 100);
    }

    if (errorRates.length > 0) {
      const errorRateMean = calculateMean(errorRates);
      const errorRateStdDev = calculateStdDev(errorRates, errorRateMean);

      errorRates.forEach((rate, index) => {
        const zScore = calculateZScore(rate, errorRateMean, errorRateStdDev);
        
        if (zScore > zScoreThreshold) {
          const windowStart = logs[index].created_at;
          const windowEnd = logs[index + windowSize - 1].created_at;
          const severity = zScore > 4 ? 'critical' : zScore > 3 ? 'high' : 'medium';
          
          anomalies.push({
            type: 'error_rate_spike',
            severity,
            description: `Error rate spike detected in time window`,
            metric: 'error_rate_percent',
            value: rate,
            expectedRange: { 
              min: 0, 
              max: errorRateMean + 2 * errorRateStdDev 
            },
            timestamp: windowStart,
            context: {
              windowStart,
              windowEnd,
              windowSize,
            },
          });
        }
      });
    }

    // 5. Detect usage volume anomalies (requests per hour)
    const hourlyRequests = new Map<string, number>();
    logs.forEach(log => {
      const hour = log.created_at.slice(0, 13); // YYYY-MM-DDTHH
      hourlyRequests.set(hour, (hourlyRequests.get(hour) || 0) + 1);
    });

    const requestCounts = Array.from(hourlyRequests.values());
    if (requestCounts.length > 0) {
      const requestMean = calculateMean(requestCounts);
      const requestStdDev = calculateStdDev(requestCounts, requestMean);

      hourlyRequests.forEach((count, hour) => {
        const zScore = calculateZScore(count, requestMean, requestStdDev);
        
        if (Math.abs(zScore) > zScoreThreshold) {
          const severity = Math.abs(zScore) > 4 ? 'critical' : Math.abs(zScore) > 3 ? 'high' : 'medium';
          
          anomalies.push({
            type: 'volume_anomaly',
            severity,
            description: zScore > 0 ? 'Unusual increase in request volume' : 'Unusual decrease in request volume',
            metric: 'requests_per_hour',
            value: count,
            expectedRange: { 
              min: Math.max(0, requestMean - 2 * requestStdDev), 
              max: requestMean + 2 * requestStdDev 
            },
            timestamp: hour + ':00:00Z',
            context: {
              hour,
            },
          });
        }
      });
    }

    // Sort anomalies by severity and timestamp
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    anomalies.sort((a, b) => {
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Calculate summary statistics
    const totalAnomalies = anomalies.length;
    const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
    const highCount = anomalies.filter(a => a.severity === 'high').length;
    const mediumCount = anomalies.filter(a => a.severity === 'medium').length;
    const lowCount = anomalies.filter(a => a.severity === 'low').length;

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      analysisPeriod: {
        start: cutoffDate,
        end: new Date().toISOString(),
        lookbackHours,
      },
      parameters: {
        zScoreThreshold,
        iqrMultiplier,
      },
      summary: {
        totalAnomalies,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
      },
      anomalies,
    });
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    return NextResponse.json(
      { error: 'Failed to detect anomalies', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
