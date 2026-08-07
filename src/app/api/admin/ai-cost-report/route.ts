import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasUserRole } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: Request) {
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user || !(await hasUserRole(user.id, "admin"))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const granularity = searchParams.get('granularity') || 'daily'; // daily, weekly, monthly

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Build query
    let query = supabase
      .from('ai_usage_logs')
      .select('*')
      .order('created_at', { ascending: true });

    // Apply date filters
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: logs, error } = await query;

    if (error) throw error;

    if (!logs || logs.length === 0) {
      return NextResponse.json({ error: 'No data found' }, { status: 404 });
    }

    // Calculate total cost
    const totalCost = logs.reduce((sum, log) => sum + (log.estimated_cost || 0), 0);

    // Group by time period
    const timeGroups = new Map<string, {
      totalCost: number;
      totalTokens: number;
      totalRequests: number;
      byProvider: Record<string, number>;
      byFeature: Record<string, number>;
      byModel: Record<string, number>;
    }>();

    logs.forEach(log => {
      const date = new Date(log.created_at);
      let key: string;

      switch (granularity) {
        case 'hourly':
          key = date.toISOString().slice(0, 13); // YYYY-MM-DDTHH
          break;
        case 'daily':
          key = date.toISOString().slice(0, 10); // YYYY-MM-DD
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().slice(0, 10);
          break;
        case 'monthly':
          key = date.toISOString().slice(0, 7); // YYYY-MM
          break;
        default:
          key = date.toISOString().slice(0, 10);
      }

      if (!timeGroups.has(key)) {
        timeGroups.set(key, {
          totalCost: 0,
          totalTokens: 0,
          totalRequests: 0,
          byProvider: {},
          byFeature: {},
          byModel: {},
        });
      }

      const group = timeGroups.get(key)!;
      group.totalCost += log.estimated_cost || 0;
      group.totalTokens += log.prompt_tokens + log.completion_tokens;
      group.totalRequests++;

      group.byProvider[log.provider] = (group.byProvider[log.provider] || 0) + (log.estimated_cost || 0);
      group.byFeature[log.feature] = (group.byFeature[log.feature] || 0) + (log.estimated_cost || 0);
      group.byModel[log.model] = (group.byModel[log.model] || 0) + (log.estimated_cost || 0);
    });

    // Convert to array and sort
    const timeSeriesData = Array.from(timeGroups.entries())
      .map(([period, data]) => ({
        period,
        totalCost: data.totalCost,
        totalTokens: data.totalTokens,
        totalRequests: data.totalRequests,
        avgCostPerRequest: data.totalRequests > 0 ? data.totalCost / data.totalRequests : 0,
        avgCostPerToken: data.totalTokens > 0 ? data.totalCost / data.totalTokens : 0,
        byProvider: data.byProvider,
        byFeature: data.byFeature,
        byModel: data.byModel,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    // Calculate cost breakdown by provider
    const providerBreakdown: Record<string, { cost: number; tokens: number; requests: number }> = logs.reduce((acc, log) => {
      if (!acc[log.provider]) {
        acc[log.provider] = { cost: 0, tokens: 0, requests: 0 };
      }
      acc[log.provider].cost += log.estimated_cost || 0;
      acc[log.provider].tokens += log.prompt_tokens + log.completion_tokens;
      acc[log.provider].requests++;
      return acc;
    }, {} as Record<string, { cost: number; tokens: number; requests: number }>);

    // Calculate cost breakdown by feature
    const featureBreakdown: Record<string, { cost: number; tokens: number; requests: number }> = logs.reduce((acc, log) => {
      if (!acc[log.feature]) {
        acc[log.feature] = { cost: 0, tokens: 0, requests: 0 };
      }
      acc[log.feature].cost += log.estimated_cost || 0;
      acc[log.feature].tokens += log.prompt_tokens + log.completion_tokens;
      acc[log.feature].requests++;
      return acc;
    }, {} as Record<string, { cost: number; tokens: number; requests: number }>);

    // Calculate cost breakdown by model
    const modelBreakdown: Record<string, { cost: number; tokens: number; requests: number }> = logs.reduce((acc, log) => {
      if (!acc[log.model]) {
        acc[log.model] = { cost: 0, tokens: 0, requests: 0 };
      }
      acc[log.model].cost += log.estimated_cost || 0;
      acc[log.model].tokens += log.prompt_tokens + log.completion_tokens;
      acc[log.model].requests++;
      return acc;
    }, {} as Record<string, { cost: number; tokens: number; requests: number }>);

    // Calculate cost efficiency metrics
    const totalTokens = logs.reduce((sum, log) => sum + log.prompt_tokens + log.completion_tokens, 0);
    const totalRequests = logs.length;
    const avgCostPerRequest = totalRequests > 0 ? totalCost / totalRequests : 0;
    const avgCostPerToken = totalTokens > 0 ? totalCost / totalTokens : 0;

    // Calculate cost trends
    const recentCost = timeSeriesData.slice(-7).reduce((sum, d) => sum + d.totalCost, 0);
    const previousCost = timeSeriesData.slice(-14, -7).reduce((sum, d) => sum + d.totalCost, 0);
    const costTrend = previousCost > 0 ? ((recentCost - previousCost) / previousCost) * 100 : 0;

    const report = {
      generatedAt: new Date().toISOString(),
      period: {
        start: startDate || logs[0]?.created_at,
        end: endDate || logs[logs.length - 1]?.created_at,
        granularity,
      },
      summary: {
        totalCost,
        totalTokens,
        totalRequests,
        avgCostPerRequest,
        avgCostPerToken,
        costTrend: costTrend.toFixed(2),
      },
      timeSeries: timeSeriesData,
      breakdowns: {
        byProvider: (Object.entries(providerBreakdown) as [string, { cost: number; tokens: number; requests: number }][]).map(([provider, data]) => ({
          provider,
          cost: data.cost,
          percentage: totalCost > 0 ? (data.cost / totalCost) * 100 : 0,
          tokens: data.tokens,
          requests: data.requests,
          avgCostPerRequest: data.requests > 0 ? data.cost / data.requests : 0,
          avgCostPerToken: data.tokens > 0 ? data.cost / data.tokens : 0,
        })).sort((a, b) => b.cost - a.cost),
        byFeature: (Object.entries(featureBreakdown) as [string, { cost: number; tokens: number; requests: number }][]).map(([feature, data]) => ({
          feature,
          cost: data.cost,
          percentage: totalCost > 0 ? (data.cost / totalCost) * 100 : 0,
          tokens: data.tokens,
          requests: data.requests,
          avgCostPerRequest: data.requests > 0 ? data.cost / data.requests : 0,
          avgCostPerToken: data.tokens > 0 ? data.cost / data.tokens : 0,
        })).sort((a, b) => b.cost - a.cost),
        byModel: (Object.entries(modelBreakdown) as [string, { cost: number; tokens: number; requests: number }][]).map(([model, data]) => ({
          model,
          cost: data.cost,
          percentage: totalCost > 0 ? (data.cost / totalCost) * 100 : 0,
          tokens: data.tokens,
          requests: data.requests,
          avgCostPerRequest: data.requests > 0 ? data.cost / data.requests : 0,
          avgCostPerToken: data.tokens > 0 ? data.cost / data.tokens : 0,
        })).sort((a, b) => b.cost - a.cost),
      },
      insights: {
        mostExpensiveProvider: (Object.entries(providerBreakdown) as [string, { cost: number; tokens: number; requests: number }][]).sort((a, b) => b[1].cost - a[1].cost)[0]?.[0] || 'N/A',
        mostExpensiveFeature: (Object.entries(featureBreakdown) as [string, { cost: number; tokens: number; requests: number }][]).sort((a, b) => b[1].cost - a[1].cost)[0]?.[0] || 'N/A',
        mostExpensiveModel: (Object.entries(modelBreakdown) as [string, { cost: number; tokens: number; requests: number }][]).sort((a, b) => b[1].cost - a[1].cost)[0]?.[0] || 'N/A',
        costEfficiency: {
          bestProvider: (Object.entries(providerBreakdown) as [string, { cost: number; tokens: number; requests: number }][])
            .filter(([_, data]) => data.tokens > 0)
            .sort((a, b) => (a[1].cost / a[1].tokens) - (b[1].cost / b[1].tokens))[0]?.[0] || 'N/A',
          bestModel: (Object.entries(modelBreakdown) as [string, { cost: number; tokens: number; requests: number }][])
            .filter(([_, data]) => data.tokens > 0)
            .sort((a, b) => (a[1].cost / a[1].tokens) - (b[1].cost / b[1].tokens))[0]?.[0] || 'N/A',
        },
      },
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error generating cost report:', error);
    return NextResponse.json(
      { error: 'Failed to generate cost report', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
