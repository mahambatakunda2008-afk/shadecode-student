"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface AIUsageLog {
  id: string;
  user_id: string | null;
  feature: string;
  subfeature: string | null;
  provider: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number;
  success: boolean;
  error_message: string | null;
  error_code: string | null;
  estimated_cost: number;
  created_at: string;
}

interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  successRate: number;
  avgLatency: number;
}

interface FeatureBreakdown {
  feature: string;
  requests: number;
  tokens: number;
  cost: number;
  successRate: number;
}

interface ProviderBreakdown {
  provider: string;
  requests: number;
  tokens: number;
  cost: number;
  successRate: number;
}

export default function AIUsageDashboard() {
  const supabase = createClient();
  const [logs, setLogs] = useState<AIUsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [featureBreakdown, setFeatureBreakdown] = useState<FeatureBreakdown[]>([]);
  const [providerBreakdown, setProviderBreakdown] = useState<ProviderBreakdown[]>([]);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');

  const fetchAIUsage = async () => {
    try {
      setLoading(true);
      
      // Calculate time filter
      const now = new Date();
      let timeFilter = '';
      switch (timeRange) {
        case '24h':
          timeFilter = `created_at >= '${new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()}'`;
          break;
        case '7d':
          timeFilter = `created_at >= '${new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()}'`;
          break;
        case '30d':
          timeFilter = `created_at >= '${new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()}'`;
          break;
        default:
          timeFilter = '';
      }

      // Fetch logs
      const { data: logsData, error } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(logsData || []);

      // Calculate stats
      const filteredLogs = timeFilter 
        ? (logsData || []).filter(log => {
            const logDate = new Date(log.created_at);
            switch (timeRange) {
              case '24h':
                return logDate >= new Date(now.getTime() - 24 * 60 * 60 * 1000);
              case '7d':
                return logDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              case '30d':
                return logDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              default:
                return true;
            }
          })
        : (logsData || []);

      const totalRequests = filteredLogs.length;
      const totalTokens = filteredLogs.reduce((sum, log) => sum + log.prompt_tokens + log.completion_tokens, 0);
      const totalCost = filteredLogs.reduce((sum, log) => sum + (log.estimated_cost || 0), 0);
      const successCount = filteredLogs.filter(log => log.success).length;
      const successRate = totalRequests > 0 ? (successCount / totalRequests) * 100 : 0;
      const avgLatency = totalRequests > 0 
        ? filteredLogs.reduce((sum, log) => sum + log.latency_ms, 0) / totalRequests 
        : 0;

      setStats({
        totalRequests,
        totalTokens,
        totalCost,
        successRate,
        avgLatency,
      });

      // Feature breakdown
      const featureMap = new Map<string, { requests: number; tokens: number; cost: number; success: number }>();
      filteredLogs.forEach(log => {
        const existing = featureMap.get(log.feature) || { requests: 0, tokens: 0, cost: 0, success: 0 };
        existing.requests++;
        existing.tokens += log.prompt_tokens + log.completion_tokens;
        existing.cost += log.estimated_cost || 0;
        if (log.success) existing.success++;
        featureMap.set(log.feature, existing);
      });

      setFeatureBreakdown(
        Array.from(featureMap.entries()).map(([feature, data]) => ({
          feature,
          requests: data.requests,
          tokens: data.tokens,
          cost: data.cost,
          successRate: data.requests > 0 ? (data.success / data.requests) * 100 : 0,
        }))
      );

      // Provider breakdown
      const providerMap = new Map<string, { requests: number; tokens: number; cost: number; success: number }>();
      filteredLogs.forEach(log => {
        const existing = providerMap.get(log.provider) || { requests: 0, tokens: 0, cost: 0, success: 0 };
        existing.requests++;
        existing.tokens += log.prompt_tokens + log.completion_tokens;
        existing.cost += log.estimated_cost || 0;
        if (log.success) existing.success++;
        providerMap.set(log.provider, existing);
      });

      setProviderBreakdown(
        Array.from(providerMap.entries()).map(([provider, data]) => ({
          provider,
          requests: data.requests,
          tokens: data.tokens,
          cost: data.cost,
          successRate: data.requests > 0 ? (data.success / data.requests) * 100 : 0,
        }))
      );

    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIUsage();
    const interval = setInterval(fetchAIUsage, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const cardStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 16,
    background: "white",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  };

  const tableRowStyle = {
    borderBottom: "1px solid #e5e7eb",
    padding: "8px 0",
  };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>
          AI Usage Dashboard 🤖
        </h1>
        <select 
          value={timeRange} 
          onChange={(e) => setTimeRange(e.target.value as any)}
          style={{ padding: 8, borderRadius: 6, border: "1px solid #e5e7eb" }}
        >
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="all">All time</option>
        </select>
      </div>

      {loading ? (
        <p>Loading AI usage data...</p>
      ) : (
        <>
          {/* Stats Overview */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
            <StatCard label="Total Requests" value={stats?.totalRequests || 0} />
            <StatCard label="Total Tokens" value={formatNumber(stats?.totalTokens || 0)} />
            <StatCard label="Total Cost" value={`$${(stats?.totalCost || 0).toFixed(4)}`} />
            <StatCard label="Success Rate" value={`${stats?.successRate.toFixed(1)}%`} />
            <StatCard label="Avg Latency" value={`${Math.round(stats?.avgLatency || 0)}ms`} />
          </div>

          {/* Feature Breakdown */}
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Usage by Feature</h2>
            <div style={cardStyle}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                    <th style={{ padding: "8px" }}>Feature</th>
                    <th style={{ padding: "8px" }}>Requests</th>
                    <th style={{ padding: "8px" }}>Tokens</th>
                    <th style={{ padding: "8px" }}>Cost</th>
                    <th style={{ padding: "8px" }}>Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {featureBreakdown.map((fb) => (
                    <tr key={fb.feature} style={tableRowStyle}>
                      <td style={{ padding: "8px", fontWeight: 600 }}>{fb.feature}</td>
                      <td style={{ padding: "8px" }}>{fb.requests}</td>
                      <td style={{ padding: "8px" }}>{formatNumber(fb.tokens)}</td>
                      <td style={{ padding: "8px" }}>${fb.cost.toFixed(4)}</td>
                      <td style={{ padding: "8px" }}>{fb.successRate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Provider Breakdown */}
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Usage by Provider</h2>
            <div style={cardStyle}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                    <th style={{ padding: "8px" }}>Provider</th>
                    <th style={{ padding: "8px" }}>Requests</th>
                    <th style={{ padding: "8px" }}>Tokens</th>
                    <th style={{ padding: "8px" }}>Cost</th>
                    <th style={{ padding: "8px" }}>Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {providerBreakdown.map((pb) => (
                    <tr key={pb.provider} style={tableRowStyle}>
                      <td style={{ padding: "8px", fontWeight: 600 }}>{pb.provider}</td>
                      <td style={{ padding: "8px" }}>{pb.requests}</td>
                      <td style={{ padding: "8px" }}>{formatNumber(pb.tokens)}</td>
                      <td style={{ padding: "8px" }}>${pb.cost.toFixed(4)}</td>
                      <td style={{ padding: "8px" }}>{pb.successRate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Logs */}
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Recent AI Requests</h2>
            <div style={cardStyle}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                    <th style={{ padding: "8px" }}>Time</th>
                    <th style={{ padding: "8px" }}>Feature</th>
                    <th style={{ padding: "8px" }}>Provider</th>
                    <th style={{ padding: "8px" }}>Model</th>
                    <th style={{ padding: "8px" }}>Tokens</th>
                    <th style={{ padding: "8px" }}>Cost</th>
                    <th style={{ padding: "8px" }}>Latency</th>
                    <th style={{ padding: "8px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 20).map((log) => (
                    <tr key={log.id} style={tableRowStyle}>
                      <td style={{ padding: "8px", fontSize: 12 }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: "8px" }}>{log.feature}</td>
                      <td style={{ padding: "8px" }}>{log.provider}</td>
                      <td style={{ padding: "8px", fontSize: 12 }}>{log.model}</td>
                      <td style={{ padding: "8px" }}>{formatNumber(log.prompt_tokens + log.completion_tokens)}</td>
                      <td style={{ padding: "8px" }}>${(log.estimated_cost || 0).toFixed(4)}</td>
                      <td style={{ padding: "8px" }}>{log.latency_ms}ms</td>
                      <td style={{ padding: "8px" }}>
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          background: log.success ? "#dcfce7" : "#fee2e2",
                          color: log.success ? "#166534" : "#991b1b",
                        }}>
                          {log.success ? "Success" : "Failed"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      border: "1px solid #e5e7eb",
      borderRadius: 8,
      padding: 16,
      background: "white",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    }}>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: "#111827" }}>{value}</div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}
