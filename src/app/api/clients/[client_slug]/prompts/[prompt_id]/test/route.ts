import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, getProfile } from "@/lib/auth"
import { canManagePrompts, isClientUser } from "@/lib/rbac"
import { generateText } from "ai"
import { getActiveModel } from "@/lib/providers"
import type { SearchType } from "@/lib/types"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ client_slug: string; prompt_id: string }> }
) {
  try {
    await requireAuth()
    const profile = await getProfile()
    
    // Block client users explicitly
    if (profile && isClientUser(profile.role)) {
      return NextResponse.json({ error: "Acesso nao permitido" }, { status: 403 })
    }
    
    // Check permission - admin, seo, or marketing can run tests
    if (!profile || !canManagePrompts(profile.role)) {
      return NextResponse.json(
        { error: "Sem permissao para executar testes" },
        { status: 403 }
      )
    }

    const { client_slug, prompt_id } = await params
    const supabase = await createClient()

    // Get client by slug
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("slug", client_slug)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 })
    }

    // Get prompt
    const { data: prompt, error: promptError } = await supabase
      .from("client_ai_prompts")
      .select("*")
      .eq("id", prompt_id)
      .eq("client_id", client.id)
      .single()

    if (promptError || !prompt) {
      return NextResponse.json({ error: "Prompt nao encontrado" }, { status: 404 })
    }

    // Build the analysis prompt for AI
    const analysisPrompt = `Voce e um ESPECIALISTA SENIOR no segmento "${client.segment}" respondendo a uma pergunta real de um usuario.

=== SUA MISSAO PRINCIPAL ===
RESPONDER ao prompt do usuario de forma ASSERTIVA, COMPLETA e UTIL. Esta e sua PRIORIDADE NUMERO 1.
Voce deve responder como se fosse um assistente de IA (ChatGPT/Perplexity) respondendo a uma busca real.

=== FOCO DA RESPOSTA ===
1. RESPONDA DIRETAMENTE ao que o usuario perguntou
2. Use sua base de conhecimento sobre o segmento "${client.segment}"
3. Inclua dados concretos, recomendacoes claras e conclusoes uteis
4. Mencione a empresa ${client.name} SE for relevante para o prompt (nao force mencoes)

=== DADOS AGREGADORES EXTRAS (COLETA SECUNDARIA) ===
ALEM de responder ao prompt, colete dados extras para analytics. Estes dados sao COMPLEMENTARES, nao o foco principal:

- GOOGLE SHOPPING: Se o prompt envolver compras/produtos, liste produtos que apareceriam na vitrine
- GOOGLE MEU NEGOCIO: Busque dados da empresa ${client.name} no Maps (se existirem - use null se nao souber)
- CONCORRENTES: Identifique empresas que apareceriam nos resultados
- FONTES: Liste sites que seriam consultados

IMPORTANTE: Estes dados extras NAO devem dominar sua resposta. Sao apenas para enriquecer o analytics.

=== REGRAS DE COMPORTAMENTO ===

1. SEJA ASSERTIVO E DIRETO - Nunca diga "voce precisa verificar", "depende", "e importante pesquisar". DE A RESPOSTA.
2. USE DADOS CONCRETOS - Numeros, porcentagens, notas, precos reais ou realistas.
3. DE RECOMENDACOES CLARAS - "Recomendo X porque [dados]" em vez de "considere avaliar".
4. NUNCA JOGUE A PERGUNTA DE VOLTA - O usuario quer respostas, nao tarefas.
5. SEJA NATURAL - Responda como um assistente util, nao como um coletor de dados.

=== O QUE VOCE NAO PODE FAZER ===
- "Para saber se e confiavel, voce deve verificar..." -> PROIBIDO
- "Existem varios fatores a considerar..." -> PROIBIDO
- "Recomendo que voce pesquise mais sobre..." -> PROIBIDO

=== CONTEXTO ===
- Empresa analisada: ${client.name}
- Site da empresa: ${client.site || "Nao informado"}
- Segmento: ${client.segment}

=== PROMPT DO USUARIO ===
"${prompt.prompt}"

=== TAREFA ===
1. RESPONDA ao prompt de forma natural, completa e assertiva (PRIORIDADE MAXIMA)
2. Colete dados extras de GMB e Shopping como COMPLEMENTO (se relevantes)
3. Preencha o JSON com todos os dados

RETORNE o seguinte JSON com os dados da sua pesquisa:

{
  "ai_response": "A resposta ASSERTIVA e ESPECIALIZADA que voce daria (minimo 250 palavras). INCLUA: dados especificos, notas de avaliacoes, recomendacoes claras, e conclusoes diretas. NUNCA diga 'voce deve verificar' ou 'pesquise mais'.",
  
  "visibility_score": [0-100, porcentagem de chance da empresa ${client.name} aparecer nessa resposta],
  "position_rank": [1, 2, 3... ou null se nao apareceu - posicao entre as empresas/opcoes mencionadas],
  
  "reputation_score": [0-100, nivel de confianca/reputacao que a resposta passa sobre a empresa],
  
  "shopping_score": [0-100, porcentagem de chance de mostrar produtos/vitrine da loja],
  "shopping_presence": [true/false, se produtos especificos seriam mostrados em uma vitrine/carousel de shopping],
  "shopping_products": [
    {
      "name": "Nome completo do produto",
      "price": "R$ 199,90",
      "brand": "Marca do produto",
      "store": "Nome da loja que vende",
      "url": "URL COMPLETA do produto (ex: https://www.loja.com.br/produto/nome-do-produto-123456) - NAO use apenas o dominio, use a URL COMPLETA da pagina do produto",
      "rating": 4.5,
      "reviews_count": 1250
    }
  ] (lista de produtos que apareceriam na vitrine/shopping, maximo 8 produtos, deixe [] se shopping_presence=false),
  
  "competitors_found": {"nome_concorrente": posicao_numero, ...} (objeto com nome do concorrente e posicao),
  "local_competitors": ["negocios locais que apareceriam em vez da empresa analisada"],
  
  "search_type": ["web", "local" ou "mixed" - tipo de busca mais adequado para este prompt],
  "search_terms_used": ["termos exatos que o GPT usaria para pesquisar no Google"],
  "sources_cited": ["URLs reais de sites que seriam usados como referencia (reclameaqui, google reviews, sites de noticias, etc)"],
  
  "sentiment": ["positive", "neutral" ou "negative" - sentimento geral sobre a empresa na resposta],
  "sentiment_words": [
    {"word": "confiavel", "sentiment": "positive", "intensity": 8},
    {"word": "caro", "sentiment": "negative", "intensity": 5},
    {"word": "popular", "sentiment": "neutral", "intensity": 6}
  ] (lista de 5-15 palavras/adjetivos que descrevem o sentimento sobre a empresa, com intensidade de 1-10),
  "client_mentioned": [true/false, se a empresa ${client.name} ou site ${client.site} foi mencionada],
  
  "google_business": {
    "found": true ou false,
    "name": "Nome do negocio REAL ou null se nao encontrado",
    "rating": 4.5 ou null (nota REAL do Google),
    "total_reviews": 150 ou null (numero REAL),
    "address": "Endereco REAL e VERIFICAVEL ou null - NUNCA invente enderecos",
    "phone": "Telefone REAL ou null - NUNCA invente telefones como (11) 9999-9999",
    "website": "URL REAL do site ou null",
    "hours": "Horario REAL de funcionamento ou null - NUNCA invente horarios",
    "category": "Categoria REAL do Google ou null",
    "price_level": "$$" ou null (SOMENTE se o Google mostrar),
    "maps_url": "URL REAL do Google Maps ou null",
    "coordinates": {"lat": -23.5505, "lng": -46.6333} ou null (SOMENTE se souber),
    "photos_count": 50 ou null (SOMENTE se souber),
    "rating_breakdown": {"five_star": 80, "four_star": 15, "three_star": 3, "two_star": 1, "one_star": 1} ou null,
    "recent_reviews": []
  }
}

NOTA SOBRE recent_reviews: Se found=true, inclua ate 5 reviews representativas no formato: [{"author": "Nome", "rating": 5, "text": "Texto da avaliacao", "date": "Jan 2024", "helpful_count": 10}]. Se found=false, deixe array vazio [].

=== REGRAS PARA O JSON ===

RESPOSTA (ai_response) - PRIORIDADE MAXIMA:
- Esta e a parte mais importante. Responda ao prompt de forma completa e util.
- Minimo 200 palavras, maximo 400 palavras
- Seja natural, como um assistente de IA respondendo a uma pergunta real
- Inclua dados especificos e recomendacoes quando apropriado
- NUNCA diga "voce deve verificar" ou "pesquise mais"

DADOS COMPLEMENTARES (nao devem afetar a qualidade da resposta):

SHOPPING (se o prompt envolver produtos/compras):
- Liste produtos reais do mercado brasileiro
- Use URLs COMPLETAS dos produtos (ex: https://www.magazineluiza.com.br/produto/abc123)
- Se o prompt NAO envolver compras, deixe shopping_presence=false e shopping_products=[]

GOOGLE MEU NEGOCIO (dados extras):
- Se conhecer dados reais da empresa ${client.name}, inclua
- Se NAO souber dados reais (endereco, telefone, horario), use null - NUNCA invente
- E aceitavel ter found=false se nao tiver informacoes confiaveis
- NAO force dados inventados so para preencher o JSON

CONCORRENTES:
- Liste concorrentes reais do segmento "${client.segment}"
- Use nomes de empresas brasileiras reais

FONTES:
- Use URLs reais quando possivel (reclameaqui.com.br, google.com/maps, etc)

SENTIMENTO:
- Analise o tom geral da sua resposta em relacao a empresa ${client.name}
- Liste 5-15 palavras que descrevem como a empresa e percebida

Retorne APENAS o JSON, sem explicacoes antes ou depois.`

    // Call AI
    const result = await generateText({
      model: getActiveModel("text"),
      prompt: analysisPrompt,
      temperature: 0.7,
    })

    // Parse the JSON response
    const jsonMatch = result.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error("[v0] No JSON found in AI response:", result.text.substring(0, 500))
      return NextResponse.json({ error: "Erro ao processar resposta da IA" }, { status: 500 })
    }

    let analysis
    try {
      // Clean up the JSON string before parsing
      let jsonStr = jsonMatch[0]
      // Remove any trailing commas before closing braces/brackets
      jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1')
      // Try to parse
      analysis = JSON.parse(jsonStr)
    } catch (parseError) {
      console.error("[v0] JSON parse error:", parseError)
      console.error("[v0] Raw JSON string:", jsonMatch[0].substring(0, 1000))
      
      // Try a more aggressive cleanup
      try {
        let cleanJson = jsonMatch[0]
          .replace(/[\x00-\x1F\x7F]/g, ' ') // Remove control characters
          .replace(/,(\s*[}\]])/g, '$1')    // Remove trailing commas
          .replace(/\n/g, ' ')              // Replace newlines with spaces
          .replace(/\t/g, ' ')              // Replace tabs with spaces
        analysis = JSON.parse(cleanJson)
      } catch {
        return NextResponse.json({ error: "Erro ao parsear resposta da IA" }, { status: 500 })
      }
    }

    // Insert test result
    const testResult = {
      prompt_id: prompt_id,
      client_id: client.id,
      visibility_score: analysis.visibility_score || 0,
      reputation_score: analysis.reputation_score || 0,
      shopping_score: analysis.shopping_score || 0,
      position_rank: analysis.position_rank || null,
      shopping_presence: analysis.shopping_presence || false,
      shopping_products: Array.isArray(analysis.shopping_products) 
        ? analysis.shopping_products.slice(0, 8).map((p: any) => ({
            name: p.name || "Produto",
            price: p.price || null,
            brand: p.brand || null,
            store: p.store || null,
            url: p.url || null,
            image_url: p.image_url || null,
            rating: typeof p.rating === 'number' ? p.rating : null,
            reviews_count: typeof p.reviews_count === 'number' ? p.reviews_count : null,
          }))
        : [],
      competitors_found: analysis.competitors_found || {},
      local_competitors: analysis.local_competitors || [],
      search_type: (analysis.search_type || "web") as SearchType,
      search_terms_used: analysis.search_terms_used || [],
      sources_cited: analysis.sources_cited || [],
      analysis_metadata: {
        sentiment: analysis.sentiment || "neutral",
        sentiment_words: Array.isArray(analysis.sentiment_words)
          ? analysis.sentiment_words.slice(0, 15).map((w: any) => ({
              word: String(w.word || "").substring(0, 50),
              sentiment: ["positive", "neutral", "negative"].includes(w.sentiment) ? w.sentiment : "neutral",
              intensity: typeof w.intensity === 'number' ? Math.min(10, Math.max(1, w.intensity)) : 5
            }))
          : [],
        client_mentioned: analysis.client_mentioned || false,
        google_business: analysis.google_business && typeof analysis.google_business === 'object' 
          ? {
              found: analysis.google_business.found || false,
              name: analysis.google_business.name || null,
              rating: typeof analysis.google_business.rating === 'number' ? analysis.google_business.rating : null,
              total_reviews: typeof analysis.google_business.total_reviews === 'number' ? analysis.google_business.total_reviews : null,
              address: analysis.google_business.address || null,
              phone: analysis.google_business.phone || null,
              website: analysis.google_business.website || null,
              hours: analysis.google_business.hours || null,
              category: analysis.google_business.category || null,
              price_level: analysis.google_business.price_level || null,
              maps_url: analysis.google_business.maps_url || null,
              coordinates: analysis.google_business.coordinates && typeof analysis.google_business.coordinates === 'object'
                ? {
                    lat: typeof analysis.google_business.coordinates.lat === 'number' ? analysis.google_business.coordinates.lat : 0,
                    lng: typeof analysis.google_business.coordinates.lng === 'number' ? analysis.google_business.coordinates.lng : 0
                  }
                : null,
              photos_count: typeof analysis.google_business.photos_count === 'number' ? analysis.google_business.photos_count : null,
              rating_breakdown: analysis.google_business.rating_breakdown && typeof analysis.google_business.rating_breakdown === 'object'
                ? {
                    five_star: analysis.google_business.rating_breakdown.five_star || 0,
                    four_star: analysis.google_business.rating_breakdown.four_star || 0,
                    three_star: analysis.google_business.rating_breakdown.three_star || 0,
                    two_star: analysis.google_business.rating_breakdown.two_star || 0,
                    one_star: analysis.google_business.rating_breakdown.one_star || 0
                  }
                : null,
              recent_reviews: Array.isArray(analysis.google_business.recent_reviews) 
                ? analysis.google_business.recent_reviews.slice(0, 5).map((r: any) => ({
                    author: r.author || "Anonimo",
                    rating: typeof r.rating === 'number' ? r.rating : 5,
                    text: r.text || "",
                    date: r.date || "",
                    helpful_count: typeof r.helpful_count === 'number' ? r.helpful_count : 0
                  }))
                : []
            }
          : null,
      },
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
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Update analytics summary
    await updateAnalyticsSummary(supabase, prompt_id, client.id)

    return NextResponse.json({ success: true, result: insertedResult })
  } catch (error) {
    console.error("Error in test route:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
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
