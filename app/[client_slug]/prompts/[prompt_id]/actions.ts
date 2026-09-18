"use server"

import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth"
import { generateTextWithFallback } from "@/lib/services/ai"
import type { PromptTestResult, PromptAnalyticsSummary, Client, ClientAIPrompt, SearchType, Sentiment } from "@/lib/types"

// Get prompt details with client info
export async function getPromptWithClient(
  promptId: string
): Promise<{ prompt: ClientAIPrompt | null; client: Client | null; error: string | null }> {
  try {
    await requireAuth()
    const supabase = await createSupabaseClient()

    const { data: prompt, error: promptError } = await supabase
      .from("client_ai_prompts")
      .select("*")
      .eq("id", promptId)
      .single()

    if (promptError || !prompt) {
      return { prompt: null, client: null, error: "Prompt nao encontrado" }
    }

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", prompt.client_id)
      .single()

    if (clientError || !client) {
      return { prompt: null, client: null, error: "Cliente nao encontrado" }
    }

    return { prompt, client, error: null }
  } catch (error) {
    console.error("Error fetching prompt with client:", error)
    return { prompt: null, client: null, error: "Erro ao buscar dados" }
  }
}

// Get analytics summary for a prompt
export async function getPromptAnalytics(
  promptId: string
): Promise<{ summary: PromptAnalyticsSummary | null; error: string | null }> {
  try {
    await requireAuth()
    const supabase = await createSupabaseClient()

    const { data, error } = await supabase
      .from("prompt_analytics_summary")
      .select("*")
      .eq("prompt_id", promptId)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching analytics:", error)
      return { summary: null, error: error.message }
    }

    return { summary: data, error: null }
  } catch (error) {
    console.error("Error in getPromptAnalytics:", error)
    return { summary: null, error: "Erro ao buscar analytics" }
  }
}

// Get test history for a prompt
export async function getPromptTestHistory(
  promptId: string,
  limit: number = 10
): Promise<{ tests: PromptTestResult[]; error: string | null }> {
  try {
    await requireAuth()
    const supabase = await createSupabaseClient()

    const { data, error } = await supabase
      .from("prompt_test_results")
      .select("*")
      .eq("prompt_id", promptId)
      .order("tested_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching test history:", error)
      return { tests: [], error: error.message }
    }

    return { tests: data || [], error: null }
  } catch (error) {
    console.error("Error in getPromptTestHistory:", error)
    return { tests: [], error: "Erro ao buscar historico" }
  }
}

// Run a new test for a prompt
export async function runPromptTest(
  promptId: string
): Promise<{ success: boolean; result?: PromptTestResult; error?: string }> {
  try {
    await requireAuth()
    const supabase = await createSupabaseClient()

    // Get prompt and client info
    const { prompt, client, error: fetchError } = await getPromptWithClient(promptId)
    if (fetchError || !prompt || !client) {
      return { success: false, error: fetchError || "Dados nao encontrados" }
    }

    // Build the analysis prompt for AI
    const analysisPrompt = `Voce e um assistente de IA que simula como o ChatGPT responderia a uma busca de usuario.

CONTEXTO:
- Empresa analisada: ${client.name}
- Site da empresa: ${client.site || "Nao informado"}
- Segmento: ${client.segment}

PROMPT DO USUARIO:
"${prompt.prompt}"

TAREFA:
Simule como o ChatGPT (com acesso a web) responderia a esse prompt. Depois, analise a resposta e retorne um JSON com os seguintes dados:

{
  "ai_response": "A resposta completa que o ChatGPT daria ao usuario (seja detalhado e realista, como se fosse uma resposta real do GPT)",
  
  "visibility_score": [0-100, porcentagem de chance da empresa ${client.name} aparecer nessa resposta],
  "client_mentioned": [true/false, se a empresa ${client.name} ou site ${client.site} foi mencionada],
  "client_position": [1, 2, 3... ou null se nao apareceu - posicao entre as empresas/opcoes mencionadas],
  
  "reputation_score": [0-100, nivel de confianca/reputacao que a resposta passa sobre a empresa],
  "sentiment": ["positive", "neutral" ou "negative" - sentimento geral sobre a empresa na resposta],
  
  "shopping_score": [0-100, porcentagem de chance de mostrar produtos/vitrine da loja],
  "products_shown": [true/false, se produtos especificos seriam mostrados],
  
  "competitors_found": ["array de nomes de concorrentes mencionados"],
  "competitor_positions": {"nome_concorrente": posicao, ...},
  
  "search_type": ["web", "local" ou "mixed" - tipo de busca mais adequado],
  "search_terms_used": ["termos que o GPT usaria para pesquisar no Google"],
  "sources_cited": ["URLs de sites que seriam usados como referencia"],
  "local_businesses_shown": ["negocios locais que apareceriam em vez da empresa analisada"]
}

IMPORTANTE:
- Seja realista sobre se a empresa ${client.name} realmente apareceria
- Considere o segmento ${client.segment} e o tipo de busca
- Liste concorrentes reais do mercado brasileiro
- Retorne APENAS o JSON, sem explicacoes adicionais`

    // Call AI
    const result = await generateTextWithFallback({
        prompt: analysisPrompt,
      temperature: 0.7,
    })

    // Parse the JSON response
    const jsonMatch = result.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { success: false, error: "Erro ao processar resposta da IA" }
    }

    const analysis = JSON.parse(jsonMatch[0])

    // Insert test result
    const testResult = {
      prompt_id: promptId,
      client_id: client.id,
      visibility_score: analysis.visibility_score || 0,
      client_mentioned: analysis.client_mentioned || false,
      client_position: analysis.client_position || null,
      reputation_score: analysis.reputation_score || 0,
      sentiment: (analysis.sentiment || "neutral") as Sentiment,
      shopping_score: analysis.shopping_score || 0,
      products_shown: analysis.products_shown || false,
      competitors_found: analysis.competitors_found || [],
      competitor_positions: analysis.competitor_positions || {},
      search_type: (analysis.search_type || "web") as SearchType,
      search_terms_used: analysis.search_terms_used || [],
      sources_cited: analysis.sources_cited || [],
      local_businesses_shown: analysis.local_businesses_shown || [],
      ai_response: analysis.ai_response || "",
      ai_model: "gpt-4o",
      tested_at: new Date().toISOString(),
    }

    const { data: insertedResult, error: insertError } = await supabase
      .from("prompt_test_results")
      .insert(testResult)
      .select()
      .single()

    if (insertError) {
      console.error("Error inserting test result:", insertError)
      return { success: false, error: insertError.message }
    }

    // Update analytics summary
    await updateAnalyticsSummary(promptId, client.id)

    return { success: true, result: insertedResult }
  } catch (error) {
    console.error("Error in runPromptTest:", error)
    return { success: false, error: "Erro ao executar teste" }
  }
}

// Update analytics summary after a new test
async function updateAnalyticsSummary(promptId: string, clientId: string): Promise<void> {
  const supabase = await createSupabaseClient()

  // Get all test results for this prompt
  const { data: tests } = await supabase
    .from("prompt_test_results")
    .select("*")
    .eq("prompt_id", promptId)
    .order("tested_at", { ascending: false })

  if (!tests || tests.length === 0) return

  // Calculate averages and aggregations
  const totalTests = tests.length
  const avgVisibility = tests.reduce((sum, t) => sum + t.visibility_score, 0) / totalTests
  const avgReputation = tests.reduce((sum, t) => sum + t.reputation_score, 0) / totalTests
  const avgShopping = tests.reduce((sum, t) => sum + t.shopping_score, 0) / totalTests
  
  const positionedTests = tests.filter(t => t.client_position !== null)
  const avgPosition = positionedTests.length > 0 
    ? positionedTests.reduce((sum, t) => sum + (t.client_position || 0), 0) / positionedTests.length 
    : null

  const timesMentioned = tests.filter(t => t.client_mentioned).length
  const timesInTop3 = tests.filter(t => t.client_position !== null && t.client_position <= 3).length

  // Aggregate competitors
  const competitorCounts: Record<string, number> = {}
  tests.forEach(t => {
    (t.competitors_found || []).forEach((comp: string) => {
      competitorCounts[comp] = (competitorCounts[comp] || 0) + 1
    })
  })

  // Find best search type
  const searchTypeCounts: Record<string, number> = { web: 0, local: 0, mixed: 0 }
  tests.forEach(t => {
    if (t.search_type) searchTypeCounts[t.search_type]++
  })
  const bestSearchType = Object.entries(searchTypeCounts)
    .sort(([,a], [,b]) => b - a)[0][0] as SearchType

  // Aggregate sources
  const sourceCounts: Record<string, number> = {}
  tests.forEach(t => {
    (t.sources_cited || []).forEach((source: string) => {
      sourceCounts[source] = (sourceCounts[source] || 0) + 1
    })
  })
  const commonSources = Object.entries(sourceCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([source]) => source)

  const summaryData = {
    prompt_id: promptId,
    client_id: clientId,
    avg_visibility_score: Math.round(avgVisibility * 100) / 100,
    avg_reputation_score: Math.round(avgReputation * 100) / 100,
    avg_shopping_score: Math.round(avgShopping * 100) / 100,
    avg_position: avgPosition ? Math.round(avgPosition * 100) / 100 : null,
    total_tests: totalTests,
    times_mentioned: timesMentioned,
    times_in_top3: timesInTop3,
    top_competitors: competitorCounts,
    best_search_type: bestSearchType,
    common_sources: commonSources,
    last_test_at: tests[0].tested_at,
    updated_at: new Date().toISOString(),
  }

  // Upsert summary
  const { error } = await supabase
    .from("prompt_analytics_summary")
    .upsert(summaryData, { onConflict: "prompt_id" })

  if (error) {
    console.error("Error updating analytics summary:", error)
  }
}
