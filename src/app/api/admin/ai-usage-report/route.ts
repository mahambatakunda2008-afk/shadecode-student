import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasUserRole } from "@/lib/auth/rbac";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: Request) {
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user || !(await hasUserRole(user.id, "admin"))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') || 'json';
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const feature = searchParams.get('feature');
  const provider = searchParams.get('provider');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Build query
    let query = supabase
      .from('ai_usage_logs')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    if (feature) {
      query = query.eq('feature', feature);
    }
    if (provider) {
      query = query.eq('provider', provider);
    }

    const { data: logs, error } = await query;

    if (error) throw error;

    if (!logs || logs.length === 0) {
      return NextResponse.json({ error: 'No data found' }, { status: 404 });
    }

    // Calculate summary statistics
    const totalRequests = logs.length;
    const totalTokens = logs.reduce((sum, log) => sum + log.prompt_tokens + log.completion_tokens, 0);
    const totalCost = logs.reduce((sum, log) => sum + (log.estimated_cost || 0), 0);
    const successCount = logs.filter(log => log.success).length;
    const successRate = (successCount / totalRequests) * 100;
    const avgLatency = logs.reduce((sum, log) => sum + log.latency_ms, 0) / totalRequests;

    // Feature breakdown
    const featureBreakdown: Record<string, { requests: number; tokens: number; cost: number; success: number; failures: number }> = logs.reduce((acc, log) => {
      if (!acc[log.feature]) {
        acc[log.feature] = { requests: 0, tokens: 0, cost: 0, success: 0, failures: 0 };
      }
      acc[log.feature].requests++;
      acc[log.feature].tokens += log.prompt_tokens + log.completion_tokens;
      acc[log.feature].cost += log.estimated_cost || 0;
      if (log.success) acc[log.feature].success++;
      else acc[log.feature].failures++;
      return acc;
    }, {} as Record<string, { requests: number; tokens: number; cost: number; success: number; failures: number }>);

    // Provider breakdown
    const providerBreakdown: Record<string, { requests: number; tokens: number; cost: number; success: number; failures: number }> = logs.reduce((acc, log) => {
      if (!acc[log.provider]) {
        acc[log.provider] = { requests: 0, tokens: 0, cost: 0, success: 0, failures: 0 };
      }
      acc[log.provider].requests++;
      acc[log.provider].tokens += log.prompt_tokens + log.completion_tokens;
      acc[log.provider].cost += log.estimated_cost || 0;
      if (log.success) acc[log.provider].success++;
      else acc[log.provider].failures++;
      return acc;
    }, {} as Record<string, { requests: number; tokens: number; cost: number; success: number; failures: number }>);

    // Model breakdown
    const modelBreakdown: Record<string, { requests: number; tokens: number; cost: number; success: number; failures: number }> = logs.reduce((acc, log) => {
      if (!acc[log.model]) {
        acc[log.model] = { requests: 0, tokens: 0, cost: 0, success: 0, failures: 0 };
      }
      acc[log.model].requests++;
      acc[log.model].tokens += log.prompt_tokens + log.completion_tokens;
      acc[log.model].cost += log.estimated_cost || 0;
      if (log.success) acc[log.model].success++;
      else acc[log.model].failures++;
      return acc;
    }, {} as Record<string, { requests: number; tokens: number; cost: number; success: number; failures: number }>);

    const report = {
      generatedAt: new Date().toISOString(),
      period: {
        start: startDate || logs[logs.length - 1]?.created_at,
        end: endDate || logs[0]?.created_at,
      },
      summary: {
        totalRequests,
        totalTokens,
        totalCost,
        successRate: successRate.toFixed(2),
        avgLatency: Math.round(avgLatency),
      },
      breakdowns: {
        byFeature: (Object.entries(featureBreakdown) as [string, { requests: number; tokens: number; cost: number; success: number; failures: number }][]).map(([feature, data]) => ({
          feature,
          requests: data.requests,
          tokens: data.tokens,
          cost: data.cost,
          successRate: ((data.success / data.requests) * 100).toFixed(2),
          failureRate: ((data.failures / data.requests) * 100).toFixed(2),
        })),
        byProvider: (Object.entries(providerBreakdown) as [string, { requests: number; tokens: number; cost: number; success: number; failures: number }][]).map(([provider, data]) => ({
          provider,
          requests: data.requests,
          tokens: data.tokens,
          cost: data.cost,
          successRate: ((data.success / data.requests) * 100).toFixed(2),
          failureRate: ((data.failures / data.requests) * 100).toFixed(2),
        })),
        byModel: (Object.entries(modelBreakdown) as [string, { requests: number; tokens: number; cost: number; success: number; failures: number }][]).map(([model, data]) => ({
          model,
          requests: data.requests,
          tokens: data.tokens,
          cost: data.cost,
          successRate: ((data.success / data.requests) * 100).toFixed(2),
          failureRate: ((data.failures / data.requests) * 100).toFixed(2),
        })),
      },
      logs: logs.map(log => ({
        id: log.id,
        timestamp: log.created_at,
        userId: log.user_id,
        feature: log.feature,
        subfeature: log.subfeature,
        provider: log.provider,
        model: log.model,
        promptTokens: log.prompt_tokens,
        completionTokens: log.completion_tokens,
        totalTokens: log.prompt_tokens + log.completion_tokens,
        latencyMs: log.latency_ms,
        success: log.success,
        errorMessage: log.error_message,
        errorCode: log.error_code,
        estimatedCost: log.estimated_cost,
      })),
    };

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Timestamp',
        'User ID',
        'Feature',
        'Subfeature',
        'Provider',
        'Model',
        'Prompt Tokens',
        'Completion Tokens',
        'Total Tokens',
        'Latency (ms)',
        'Success',
        'Error Message',
        'Error Code',
        'Estimated Cost ($)',
      ];

      const rows = logs.map(log => [
        log.created_at,
        log.user_id || '',
        log.feature,
        log.subfeature || '',
        log.provider,
        log.model,
        log.prompt_tokens,
        log.completion_tokens,
        log.prompt_tokens + log.completion_tokens,
        log.latency_ms,
        log.success ? 'Yes' : 'No',
        log.error_message || '',
        log.error_code || '',
        (log.estimated_cost || 0).toFixed(6),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="ai-usage-report-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // Default to JSON
    return NextResponse.json(report);
  } catch (error) {
    console.error('Error generating usage report:', error);
    return NextResponse.json(
      { error: 'Failed to generate usage report', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
