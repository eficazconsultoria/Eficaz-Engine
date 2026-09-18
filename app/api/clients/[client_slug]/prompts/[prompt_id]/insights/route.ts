import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, getProfile } from "@/lib/auth"
import { canManagePrompts, isClientUser } from "@/lib/rbac"
import { generateText } from "ai"
import { generateTextWithFallback } from "@/lib/services/ai"

export async function GET(
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
    
    if (!profile || !canManagePrompts(profile.role)) {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 })
    }

    const { client_slug, prompt_id } = await params
    const supabase = await createClient()

    // Get client
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("slug", client_slug)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 })
    }

    // Get latest insight for this prompt
    const { data: insight, error: insightError } = await supabase
      .from("prompt_insights")
      .select("*")
      .eq("prompt_id", prompt_id)
      .eq("client_id", client.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (insightError && insightError.code !== "PGRST116") {
      console.error("Error fetching insight:", insightError)
      return NextResponse.json({ error: "Erro ao buscar insights" }, { status: 500 })
    }

    return NextResponse.json({ insight: insight || null })
  } catch (error) {
    console.error("Error in GET insights:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

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
    
    if (!profile || !canManagePrompts(profile.role)) {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 })
    }

    const { client_slug, prompt_id } = await params
    const supabase = await createClient()

    // Get client with full data
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

    // Get analytics summary
    const { data: analytics } = await supabase
      .from("prompt_analytics_summary")
      .select("*")
      .eq("prompt_id", prompt_id)
      .single()

    // Get recent test results
    const { data: testResults } = await supabase
      .from("prompt_test_results")
      .select("*")
      .eq("prompt_id", prompt_id)
      .order("tested_at", { ascending: false })
      .limit(10)

    // Get competitors
    const { data: competitors } = await supabase
      .from("client_competitors")
      .select("*")
      .eq("client_id", client.id)
      .eq("is_active", true)

    // Calculate metrics for AI context
    const visibilityRate = analytics?.total_tests > 0 
      ? Math.round((analytics.tests_with_visibility / analytics.total_tests) * 100) 
      : 0
    
    const reputationScore = analytics?.avg_reputation_score || 0
    const avgPosition = analytics?.avg_position_rank || 0
    const shoppingRate = analytics?.total_tests > 0 && analytics?.tests_with_shopping
      ? Math.round((analytics.tests_with_shopping / analytics.total_tests) * 100)
      : 0

    // Analyze competitor mentions from test results
    const competitorMentions: Record<string, number> = {}
    testResults?.forEach(test => {
      if (test.competitors_found && Array.isArray(test.competitors_found)) {
        test.competitors_found.forEach((comp: string) => {
          competitorMentions[comp] = (competitorMentions[comp] || 0) + 1
        })
      }
    })

    const topCompetitors = Object.entries(competitorMentions)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => `${name} (${count} mencoes)`)

    // Build AI prompt
    const aiPrompt = `Voce e um especialista em marketing digital, SEO e presenca de marca em ferramentas de IA (como ChatGPT, Perplexity, Google AI Overview).

CONTEXTO DA EMPRESA:
- Nome: ${client.name}
- Segmento: ${client.segment}
- Tipo: ${client.type === "ecommerce" ? "E-commerce" : "Geracao de Leads"}
- Publico-alvo: ${client.target_audience || "Nao especificado"}
- Site: ${client.site || "Nao informado"}
- Foco do negocio: ${client.business_focus || "Nao especificado"}

PROMPT ANALISADO:
"${prompt.prompt}"
Categoria: ${prompt.category}

METRICAS ATUAIS:
- Taxa de Visibilidade: ${visibilityRate}% (a empresa foi mencionada em ${analytics?.tests_with_visibility || 0} de ${analytics?.total_tests || 0} testes)
- Score de Reputacao: ${reputationScore}/100 (qualidade das mencoes)
- Posicao Media: ${avgPosition > 0 ? avgPosition.toFixed(1) : "Nao ranqueado"} (quando listada entre opcoes)
- Taxa de Vitrine/Shopping: ${shoppingRate}% (produtos exibidos em carroseis)

CONCORRENTES MAIS MENCIONADOS:
${topCompetitors.length > 0 ? topCompetitors.join("\n") : "Nenhum concorrente identificado ainda"}

CONCORRENTES MONITORADOS:
${competitors?.map(c => c.name).join(", ") || "Nenhum cadastrado"}

EXEMPLOS DE RESPOSTAS RECENTES DA IA:
${testResults?.slice(0, 3).map((t, i) => `
Teste ${i + 1}:
- Mencionado: ${t.was_mentioned ? "Sim" : "Nao"}
- Posicao: ${t.position_rank || "N/A"}
- Resumo: ${t.ai_response?.substring(0, 300) || "N/A"}...
`).join("\n") || "Nenhum teste disponivel"}

---

Com base nesses dados, gere:

1. **INSIGHTS** (3-5 pontos): Analise critica da situacao atual. O que os dados revelam? Por que a empresa esta ou nao sendo mencionada? Quais padroes voce identifica?

2. **PLANO DE ACAO** (5-8 acoes concretas): Acoes especificas e praticas para melhorar as metricas. Inclua:
   - Acoes de conteudo para o site (paginas, artigos, FAQs)
   - Acoes de SEO tecnico
   - Acoes de presenca digital (redes sociais, reviews, mencoes)
   - Acoes de autoridade (backlinks, parcerias, PR)
   - Acoes especificas para este tipo de busca

Seja especifico e pratico. Nao de conselhos genericos. Baseie-se nos dados fornecidos.

Responda em JSON no formato:
{
  "insights": ["insight 1", "insight 2", ...],
  "action_plan": [
    {"title": "Titulo da acao", "description": "Descricao detalhada", "priority": "alta|media|baixa", "category": "conteudo|seo|presenca|autoridade"},
    ...
  ]
}`

    // Generate insights with AI
    const result = await generateTextWithFallback({
        prompt: aiPrompt,
      maxTokens: 2000,
    })

    // Parse AI response
    let insights: string[] = []
    let actionPlan: Array<{ title: string; description: string; priority: string; category: string }> = []

    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        insights = parsed.insights || []
        actionPlan = parsed.action_plan || []
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError)
      return NextResponse.json({ error: "Erro ao processar resposta da IA" }, { status: 500 })
    }

    if (insights.length === 0 && actionPlan.length === 0) {
      return NextResponse.json({ error: "IA nao gerou insights validos" }, { status: 500 })
    }

    // Save to database
    const metricsSnapshot = {
      visibility_rate: visibilityRate,
      reputation_score: reputationScore,
      avg_position: avgPosition,
      shopping_rate: shoppingRate,
      total_tests: analytics?.total_tests || 0,
      top_competitors: topCompetitors,
    }

    const { data: savedInsight, error: saveError } = await supabase
      .from("prompt_insights")
      .insert({
        prompt_id: prompt_id,
        client_id: client.id,
        generated_by: profile.id,
        insights_text: JSON.stringify(insights),
        action_plan: JSON.stringify(actionPlan),
        metrics_snapshot: metricsSnapshot,
      })
      .select()
      .single()

    if (saveError) {
      console.error("Error saving insight:", saveError)
      return NextResponse.json({ error: "Erro ao salvar insights" }, { status: 500 })
    }

    return NextResponse.json({ 
      insight: savedInsight,
      insights,
      actionPlan,
    })
  } catch (error) {
    console.error("Error generating insights:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
