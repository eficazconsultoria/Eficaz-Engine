import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateTextWithFallback } from "@/lib/services/ai"
import type { SearchType } from "@/lib/types"

// This route is called by Vercel Cron at 09:00 AM daily
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/daily-prompt-tests", "schedule": "0 9 * * *" }] }

export const dynamic = "force-dynamic"
export const maxDuration = 300 // 5 minutes max

export async function GET(request: Request) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // In development, allow without secret
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const supabase = await createClient()

    // Get all active prompts with their client info
    const { data: prompts, error: promptsError } = await supabase
      .from("client_ai_prompts")
      .select(`
        id,
        prompt,
        client_id,
        clients!inner (
          id,
          name,
          site,
          segment,
          active
        )
      `)
      .eq("is_active", true)
      .eq("clients.active", true)

    if (promptsError) {
      console.error("Error fetching prompts:", promptsError)
      return NextResponse.json({ error: "Erro ao buscar prompts" }, { status: 500 })
    }

    if (!prompts || prompts.length === 0) {
      return NextResponse.json({ message: "Nenhum prompt ativo encontrado", tested: 0 })
    }

    let testedCount = 0
    const errors: string[] = []

    // Process each prompt
    for (const promptData of prompts) {
      try {
        const client = promptData.clients as any

        // Build the analysis prompt
        const analysisPrompt = buildAnalysisPrompt(client, promptData.prompt)

        // Call AI
        const result = await generateTextWithFallback({
                prompt: analysisPrompt,
          temperature: 0.7,
        })

        // Parse the JSON response
        const jsonMatch = result.text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          errors.push(`Prompt ${promptData.id}: Erro ao processar resposta da IA`)
          continue
        }

        let analysis
        try {
          analysis = JSON.parse(jsonMatch[0])
        } catch {
          errors.push(`Prompt ${promptData.id}: Erro ao parsear JSON`)
          continue
        }

        // Insert test result
        const testResult = {
          prompt_id: promptData.id,
          client_id: client.id,
          visibility_score: analysis.visibility_score || 0,
          reputation_score: analysis.reputation_score || 0,
          shopping_score: analysis.shopping_score || 0,
          position_rank: analysis.position_rank || null,
          shopping_presence: analysis.shopping_presence || false,
          competitors_found: analysis.competitors_found || {},
          local_competitors: analysis.local_competitors || [],
          search_type: (analysis.search_type || "web") as SearchType,
          search_terms_used: analysis.search_terms_used || [],
          sources_cited: analysis.sources_cited || [],
          analysis_metadata: {
            sentiment: analysis.sentiment || "neutral",
            client_mentioned: analysis.client_mentioned || false,
          },
          ai_response: analysis.ai_response || "",
          ai_model: "gpt-4o",
          tested_at: new Date().toISOString(),
        }

        const { error: insertError } = await supabase
          .from("prompt_test_results")
          .insert(testResult)

        if (insertError) {
          errors.push(`Prompt ${promptData.id}: ${insertError.message}`)
          continue
        }

        // Update analytics summary
        await updateAnalyticsSummary(supabase, promptData.id, client.id)

        testedCount++

        // Add a small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (err) {
        errors.push(`Prompt ${promptData.id}: ${err instanceof Error ? err.message : "Erro desconhecido"}`)
      }
    }

    return NextResponse.json({
      message: `Testes diarios concluidos`,
      tested: testedCount,
      total: prompts.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("Error in daily prompt tests:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

function buildAnalysisPrompt(client: any, prompt: string): string {
  return `Voce e um assistente de IA que simula como o ChatGPT responderia a uma busca de usuario.

CONTEXTO:
- Empresa analisada: ${client.name}
- Site da empresa: ${client.site || "Nao informado"}
- Segmento: ${client.segment}

PROMPT DO USUARIO:
"${prompt}"

TAREFA:
Simule como o ChatGPT (com acesso a web) responderia a esse prompt. Depois, analise a resposta e retorne um JSON com os seguintes dados:

{
  "ai_response": "A resposta completa que o ChatGPT daria ao usuario (seja detalhado e realista, como se fosse uma resposta real do GPT com pelo menos 200 palavras)",
  
  "visibility_score": [0-100, porcentagem de chance da empresa ${client.name} aparecer nessa resposta],
  "position_rank": [1, 2, 3... ou null se nao apareceu - posicao entre as empresas/opcoes mencionadas],
  
  "reputation_score": [0-100, nivel de confianca/reputacao que a resposta passa sobre a empresa],
  
  "shopping_score": [0-100, porcentagem de chance de mostrar produtos/vitrine da loja],
  "shopping_presence": [true/false, se produtos especificos seriam mostrados],
  
  "competitors_found": {"nome_concorrente": posicao_numero, ...} (objeto com nome do concorrente e posicao),
  "local_competitors": ["negocios locais que apareceriam em vez da empresa analisada"],
  
  "search_type": ["web", "local" ou "mixed" - tipo de busca mais adequado para este prompt],
  "search_terms_used": ["termos exatos que o GPT usaria para pesquisar no Google"],
  "sources_cited": ["URLs reais de sites que seriam usados como referencia (reclameaqui, google reviews, sites de noticias, etc)"],
  
  "sentiment": ["positive", "neutral" ou "negative" - sentimento geral sobre a empresa na resposta],
  "client_mentioned": [true/false, se a empresa ${client.name} ou site ${client.site} foi mencionada]
}

IMPORTANTE:
- Seja realista sobre se a empresa ${client.name} realmente apareceria
- Considere o segmento ${client.segment} e o tipo de busca
- Liste concorrentes REAIS do mercado brasileiro para o segmento
- Use URLs reais de sites conhecidos nas sources
- A resposta da IA deve ser detalhada e realista
- Retorne APENAS o JSON, sem explicacoes adicionais`
}

// Update analytics summary after a new test
async function updateAnalyticsSummary(supabase: any, promptId: string, clientId: string): Promise<void> {
  // Get all test results for this prompt
  const { data: tests } = await supabase
    .from("prompt_test_results")
    .select("*")
    .eq("prompt_id", promptId)
    .order("tested_at", { ascending: false })

  if (!tests || tests.length === 0) return

  // Calculate averages and aggregations
  const totalTests = tests.length
  const avgVisibility = tests.reduce((sum: number, t: any) => sum + (t.visibility_score || 0), 0) / totalTests
  const avgReputation = tests.reduce((sum: number, t: any) => sum + (t.reputation_score || 0), 0) / totalTests
  const avgShopping = tests.reduce((sum: number, t: any) => sum + (t.shopping_score || 0), 0) / totalTests

  // Position calculations
  const positionedTests = tests.filter((t: any) => t.position_rank !== null)
  const avgPositionRank =
    positionedTests.length > 0
      ? positionedTests.reduce((sum: number, t: any) => sum + (t.position_rank || 0), 0) / positionedTests.length
      : null

  const positions = positionedTests.map((t: any) => t.position_rank)
  const bestPosition = positions.length > 0 ? Math.min(...positions) : null
  const worstPosition = positions.length > 0 ? Math.max(...positions) : null

  // Count tests where client was actually mentioned (not just visibility score)
  const testsWithVisibility = tests.filter((t: any) => 
    t.analysis_metadata?.client_mentioned === true
  ).length
  const testsWithShopping = tests.filter((t: any) => t.shopping_presence).length

  // Aggregate competitors with detailed tracking
  const competitorCounts: Record<string, number> = {}
  const competitorDetails: Record<string, { appearances: number; tests: string[]; avg_position: number | null }> = {}
  
  tests.forEach((t: any) => {
    const competitors = t.competitors_found || {}
    Object.entries(competitors).forEach(([comp, position]) => {
      competitorCounts[comp] = (competitorCounts[comp] || 0) + 1
      
      if (!competitorDetails[comp]) {
        competitorDetails[comp] = { appearances: 0, tests: [], avg_position: null }
      }
      competitorDetails[comp].appearances++
      competitorDetails[comp].tests.push(t.tested_at)
      
      // Calculate average position for this competitor
      const positionsForComp = tests
        .filter((test: any) => test.competitors_found?.[comp] !== undefined)
        .map((test: any) => test.competitors_found[comp])
        .filter((pos: any) => typeof pos === 'number')
      
      if (positionsForComp.length > 0) {
        competitorDetails[comp].avg_position = 
          positionsForComp.reduce((sum: number, pos: number) => sum + pos, 0) / positionsForComp.length
      }
    })
  })

  // Calculate search type scores
  const webTests = tests.filter((t: any) => t.search_type === "web")
  const localTests = tests.filter((t: any) => t.search_type === "local")
  const webSearchScore = webTests.length > 0 
    ? webTests.reduce((sum: number, t: any) => sum + (t.visibility_score || 0), 0) / webTests.length 
    : 0
  const localSearchScore = localTests.length > 0 
    ? localTests.reduce((sum: number, t: any) => sum + (t.visibility_score || 0), 0) / localTests.length 
    : 0

  const summaryData = {
    prompt_id: promptId,
    client_id: clientId,
    avg_visibility_score: Math.round(avgVisibility * 100) / 100,
    avg_reputation_score: Math.round(avgReputation * 100) / 100,
    avg_shopping_score: Math.round(avgShopping * 100) / 100,
    avg_position_rank: avgPositionRank ? Math.round(avgPositionRank * 100) / 100 : null,
    total_tests: totalTests,
    tests_with_visibility: testsWithVisibility,
    tests_with_shopping: testsWithShopping,
    best_position: bestPosition,
    worst_position: worstPosition,
    top_competitors: competitorCounts,
    web_search_score: Math.round(webSearchScore * 100) / 100,
    local_search_score: Math.round(localSearchScore * 100) / 100,
    last_tested_at: tests[0].tested_at,
    updated_at: new Date().toISOString(),
  }

  // Upsert summary
  const { error } = await supabase.from("prompt_analytics_summary").upsert(summaryData, { onConflict: "prompt_id" })

  if (error) {
    console.error("Error updating analytics summary:", error)
  }
}
