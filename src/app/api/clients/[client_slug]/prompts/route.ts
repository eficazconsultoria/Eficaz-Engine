import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth, getProfile } from "@/lib/auth"
import { canManagePrompts, isClientUser } from "@/lib/rbac"
import { NextResponse } from "next/server"
import { generateText } from "ai"
import { gateway } from "@ai-sdk/gateway"

const MAX_PROMPTS = 8

export async function GET(
  request: Request,
  { params }: { params: Promise<{ client_slug: string }> }
) {
  try {
    await requireAuth()
    const profile = await getProfile()
    
    const { client_slug } = await params
    
    // Use admin client for client users to bypass RLS
    const supabase = (profile && isClientUser(profile.role)) 
      ? createAdminClient() 
      : await createClient()

    // First get the client by slug
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("slug", client_slug)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 })
    }

    // Verify client users can only access their linked client
    if (profile && isClientUser(profile.role)) {
      if (profile.linked_client_id !== client.id) {
        return NextResponse.json({ error: "Acesso nao permitido" }, { status: 403 })
      }
    }

    // Get prompts for this client (all prompts, not just active)
    const { data: prompts, error: promptsError } = await supabase
      .from("client_ai_prompts")
      .select("*")
      .eq("client_id", client.id)
      .order("created_at", { ascending: true })

    if (promptsError) {
      console.error("Error fetching prompts:", promptsError)
      return NextResponse.json({ error: promptsError.message }, { status: 500 })
    }

    // Fetch analytics summary for each prompt
    const promptIds = (prompts || []).map(p => p.id)
    
    const { data: analyticsSummaries } = await supabase
      .from("prompt_analytics_summary")
      .select("*")
      .in("prompt_id", promptIds)

    // Fetch first test result for each prompt (for comparison)
    const { data: firstTests } = await supabase
      .from("prompt_test_results")
      .select("prompt_id, visibility_score, tested_at")
      .in("prompt_id", promptIds)
      .order("tested_at", { ascending: true })

    // Create maps for quick lookup
    const analyticsMap = new Map(
      (analyticsSummaries || []).map(a => [a.prompt_id, a])
    )
    
    // Get first test per prompt
    const firstTestMap = new Map<string, { visibility_score: number; tested_at: string }>()
    for (const test of (firstTests || [])) {
      if (!firstTestMap.has(test.prompt_id)) {
        firstTestMap.set(test.prompt_id, {
          visibility_score: test.visibility_score,
          tested_at: test.tested_at
        })
      }
    }

    // Enhance prompts with analytics data
    const promptsWithAnalytics = (prompts || []).map(prompt => ({
      ...prompt,
      analytics: analyticsMap.get(prompt.id) || null,
      first_test: firstTestMap.get(prompt.id) || null,
    }))

    const userCanManage = profile ? canManagePrompts(profile.role) : false
    const userIsClient = profile ? isClientUser(profile.role) : false

    return NextResponse.json({ 
      prompts: promptsWithAnalytics, 
      clientId: client.id,
      canManage: userCanManage,
      isClientUser: userIsClient,
      maxPrompts: MAX_PROMPTS
    })
  } catch (error) {
    console.error("Error in GET prompts:", error)
    return NextResponse.json({ error: "Erro ao buscar prompts" }, { status: 500 })
  }
}

// POST - Add a new prompt manually or generate via AI
export async function POST(
  request: Request,
  { params }: { params: Promise<{ client_slug: string }> }
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

    const { client_slug } = await params
    const body = await request.json()
    const { prompt, category, generateWithAI } = body
    
    const supabase = await createClient()

    // Get client by slug with full data for AI generation
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("slug", client_slug)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 })
    }

    // Check current prompt count
    const { count, error: countError } = await supabase
      .from("client_ai_prompts")
      .select("*", { count: "exact", head: true })
      .eq("client_id", client.id)

    if (countError) {
      return NextResponse.json({ error: "Erro ao verificar prompts" }, { status: 500 })
    }

    if ((count || 0) >= MAX_PROMPTS) {
      return NextResponse.json({ error: `Limite de ${MAX_PROMPTS} prompts atingido` }, { status: 400 })
    }

    let finalPrompt = prompt
    let finalCategory = category || "solution"

    // Generate prompt with AI if requested
    if (generateWithAI) {
      const categories = ["reputation", "comparison", "solution", "pre_purchase"]
      const categoryLabels: Record<string, string> = {
        reputation: "Reputacao (avaliacoes, confiabilidade)",
        comparison: "Comparacao (vs concorrentes)",
        solution: "Busca de Solucao (resolver problema)",
        pre_purchase: "Pre-Compra (antes de comprar)"
      }

      const aiPrompt = `Voce e um especialista em marketing digital e comportamento do consumidor.

Gere UM UNICO prompt de busca que um potencial cliente faria em uma IA como ChatGPT ou Perplexity.

CONTEXTO DA EMPRESA:
- Nome: ${client.name}
- Segmento: ${client.segment}
- Tipo: ${client.type === "ecommerce" ? "E-commerce" : "Geracao de Leads"}
- Publico-alvo: ${client.target_audience || "Nao especificado"}
- Site: ${client.site || "Nao informado"}

CATEGORIAS DISPONIVEIS:
${categories.map(c => `- ${c}: ${categoryLabels[c]}`).join("\n")}

REGRAS:
1. Crie um prompt NATURAL, como uma pessoa real buscaria
2. NAO mencione o nome da empresa no prompt (a pessoa ainda nao conhece)
3. O prompt deve ter entre 10 e 30 palavras
4. Seja especifico para o segmento do cliente
5. Foque na intencao de busca do publico-alvo

Responda APENAS no formato JSON:
{"prompt": "texto do prompt aqui", "category": "categoria_escolhida"}`

      try {
        const result = await generateText({
          model: gateway("openai/gpt-4o-mini"),
          prompt: aiPrompt,
          maxTokens: 200,
        })

        const jsonMatch = result.text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          finalPrompt = parsed.prompt
          finalCategory = parsed.category || "solution"
        } else {
          return NextResponse.json({ error: "Erro ao gerar prompt com IA" }, { status: 500 })
        }
      } catch (aiError) {
        console.error("AI generation error:", aiError)
        return NextResponse.json({ error: "Erro ao gerar prompt com IA" }, { status: 500 })
      }
    }

    if (!finalPrompt || finalPrompt.trim().length < 10) {
      return NextResponse.json({ error: "Prompt muito curto (minimo 10 caracteres)" }, { status: 400 })
    }

    // Insert the new prompt
    const { data: newPrompt, error: insertError } = await supabase
      .from("client_ai_prompts")
      .insert({
        client_id: client.id,
        prompt: finalPrompt.trim(),
        category: finalCategory,
        is_active: true,
        generated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error("Error inserting prompt:", insertError)
      return NextResponse.json({ error: "Erro ao criar prompt" }, { status: 500 })
    }

    return NextResponse.json({ prompt: newPrompt, success: true })
  } catch (error) {
    console.error("Error in POST prompts:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
