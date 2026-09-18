import { NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth, getProfile } from "@/lib/auth"
import { isClientUser } from "@/lib/rbac"

interface AnalyticsSummary {
  total_tests: number
  tests_with_visibility: number
  tests_with_shopping: number
  avg_visibility_score: number
  avg_reputation_score: number
  avg_shopping_score: number
  avg_position_rank: number | null
  best_position: number | null
  worst_position: number | null
  top_competitors: Record<string, number>
  web_search_score: number
  local_search_score: number
}

function calculateSummaryFromTests(tests: Array<{
  visibility_score: number
  reputation_score: number
  shopping_score: number
  position_rank: number | null
  shopping_presence: boolean
  competitors_found: Record<string, number>
  search_type: string
  analysis_metadata: { client_mentioned?: boolean }
}>): AnalyticsSummary {
  if (tests.length === 0) {
    return {
      total_tests: 0,
      tests_with_visibility: 0,
      tests_with_shopping: 0,
      avg_visibility_score: 0,
      avg_reputation_score: 0,
      avg_shopping_score: 0,
      avg_position_rank: null,
      best_position: null,
      worst_position: null,
      top_competitors: {},
      web_search_score: 0,
      local_search_score: 0,
    }
  }

  const testsWithVisibility = tests.filter(t => 
    t.visibility_score > 0 || t.analysis_metadata?.client_mentioned
  ).length

  const testsWithShopping = tests.filter(t => t.shopping_presence).length

  const avgVisibility = tests.reduce((acc, t) => acc + t.visibility_score, 0) / tests.length
  const avgReputation = tests.reduce((acc, t) => acc + t.reputation_score, 0) / tests.length
  const avgShopping = tests.reduce((acc, t) => acc + t.shopping_score, 0) / tests.length

  const positionRanks = tests
    .map(t => t.position_rank)
    .filter((p): p is number => p !== null && p > 0)

  const avgPosition = positionRanks.length > 0
    ? positionRanks.reduce((a, b) => a + b, 0) / positionRanks.length
    : null

  const bestPosition = positionRanks.length > 0 ? Math.min(...positionRanks) : null
  const worstPosition = positionRanks.length > 0 ? Math.max(...positionRanks) : null

  // Aggregate competitors
  const competitorCounts: Record<string, number> = {}
  tests.forEach(t => {
    if (t.competitors_found) {
      Object.keys(t.competitors_found).forEach(comp => {
        competitorCounts[comp] = (competitorCounts[comp] || 0) + 1
      })
    }
  })

  // Get top 10 competitors
  const topCompetitors = Object.fromEntries(
    Object.entries(competitorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
  )

  // Web vs Local scores
  const webTests = tests.filter(t => t.search_type === "web")
  const localTests = tests.filter(t => t.search_type === "local")

  const webSearchScore = webTests.length > 0
    ? webTests.reduce((acc, t) => acc + t.visibility_score, 0) / webTests.length
    : 0

  const localSearchScore = localTests.length > 0
    ? localTests.reduce((acc, t) => acc + t.visibility_score, 0) / localTests.length
    : 0

  return {
    total_tests: tests.length,
    tests_with_visibility: testsWithVisibility,
    tests_with_shopping: testsWithShopping,
    avg_visibility_score: avgVisibility,
    avg_reputation_score: avgReputation,
    avg_shopping_score: avgShopping,
    avg_position_rank: avgPosition,
    best_position: bestPosition,
    worst_position: worstPosition,
    top_competitors: topCompetitors,
    web_search_score: webSearchScore,
    local_search_score: localSearchScore,
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ client_slug: string; prompt_id: string }> }
) {
  try {
    await requireAuth()
    const profile = await getProfile()
    const { client_slug, prompt_id } = await params
    
    // Parse query params for date filtering
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get("from")
    const toDate = searchParams.get("to")
    const compareFromDate = searchParams.get("compare_from")
    const compareToDate = searchParams.get("compare_to")
    
    // Use admin client for client users to bypass RLS
    const supabase = (profile && isClientUser(profile.role)) 
      ? createAdminClient() 
      : await createClient()

    // Verify client access for client users
    if (profile && isClientUser(profile.role)) {
      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .eq("slug", client_slug)
        .single()
      
      if (!client || profile.linked_client_id !== client.id) {
        return NextResponse.json({ error: "Acesso nao permitido" }, { status: 403 })
      }
    }

    // If date range is provided, calculate summary from test results
    if (fromDate && toDate) {
      // Fetch tests for primary period
      let primaryQuery = supabase
        .from("prompt_test_results")
        .select("*")
        .eq("prompt_id", prompt_id)
        .gte("tested_at", fromDate)
        .lte("tested_at", toDate)
        .order("tested_at", { ascending: false })

      const { data: primaryTests, error: primaryError } = await primaryQuery

      if (primaryError) {
        console.error("Error fetching primary tests:", primaryError)
        return NextResponse.json({ error: primaryError.message }, { status: 500 })
      }

      const primarySummary = calculateSummaryFromTests(primaryTests || [])

      // If comparison period is provided
      let comparisonSummary: AnalyticsSummary | null = null
      if (compareFromDate && compareToDate) {
        const { data: comparisonTests, error: comparisonError } = await supabase
          .from("prompt_test_results")
          .select("*")
          .eq("prompt_id", prompt_id)
          .gte("tested_at", compareFromDate)
          .lte("tested_at", compareToDate)
          .order("tested_at", { ascending: false })

        if (comparisonError) {
          console.error("Error fetching comparison tests:", comparisonError)
        } else {
          comparisonSummary = calculateSummaryFromTests(comparisonTests || [])
        }
      }

      return NextResponse.json({ 
        summary: primarySummary,
        comparison: comparisonSummary,
        period: { from: fromDate, to: toDate },
        comparisonPeriod: compareFromDate && compareToDate 
          ? { from: compareFromDate, to: compareToDate } 
          : null,
      })
    }

    // Fallback to stored summary (all time)
    const { data: summary, error } = await supabase
      .from("prompt_analytics_summary")
      .select("*")
      .eq("prompt_id", prompt_id)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching analytics:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      summary: summary || null,
      comparison: null,
      period: null,
      comparisonPeriod: null,
    })
  } catch (error) {
    console.error("Error in analytics route:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
