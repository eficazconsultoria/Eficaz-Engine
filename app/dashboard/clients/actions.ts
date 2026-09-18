"use server"

import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { getUser, requireAuth, requireClientManagement } from "@/lib/auth"
import type { Client, ClientSegment, ClientType, ClientFocus, ClientAIPrompt } from "@/lib/types"
import { generateText } from "ai"
import { getActiveModel } from "@/lib/providers"

export async function getClients(): Promise<{ clients: Client[]; error: string | null }> {
  try {
    await requireAuth()
    const supabase = await createSupabaseClient()

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching clients:", error)
      return { clients: [], error: error.message }
    }

    return { clients: data || [], error: null }
  } catch (error) {
    console.error("Error in getClients:", error)
    return { clients: [], error: "Erro ao buscar clientes" }
  }
}

export async function createNewClient(formData: FormData): Promise<{ success: boolean; client?: Client; error?: string }> {
  try {
    await requireClientManagement()
    const user = await getUser()
    const supabase = await createSupabaseClient()

    const name = formData.get("name") as string
    const slug = formData.get("slug") as string
    const site = formData.get("site") as string | null
    const segment = formData.get("segment") as ClientSegment
    const type = formData.get("type") as ClientType
    const focus = formData.get("focus") as ClientFocus
    const target_audience = formData.get("target_audience") as string | null

    // Validate required fields
    if (!name || !slug || !segment || !type || !focus || !target_audience) {
      return { success: false, error: "Todos os campos obrigatorios devem ser preenchidos" }
    }

    // Validate slug format (lowercase, no spaces, alphanumeric with hyphens)
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    if (!slugRegex.test(slug)) {
      return { success: false, error: "O slug deve conter apenas letras minusculas, numeros e hifens" }
    }

    // Check if slug already exists
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("slug", slug)
      .single()

    if (existingClient) {
      return { success: false, error: "Este slug ja esta em uso" }
    }

    const { data, error } = await supabase
      .from("clients")
      .insert({
        name,
        slug,
        site: site || null,
        segment,
        type,
        focus,
        target_audience,
        active: true,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating client:", error)
      return { success: false, error: error.message }
    }

    // Log audit
    await supabase.from("audit_logs").insert({
      action: "client_created",
      actor_id: user?.id,
      target_id: data.id,
      details: { name, slug },
    })

    // Generate AI prompts for this client
    try {
      await generateClientAIPrompts(data.id, {
        name,
        segment,
        type,
        focus,
        target_audience,
        site: site || undefined,
      })
    } catch (promptError) {
      console.error("Error generating AI prompts:", promptError)
      // Don't fail the client creation if prompt generation fails
    }

    return { success: true, client: data }
  } catch (error) {
    console.error("Error in createClient:", error)
    return { success: false, error: "Erro ao criar cliente" }
  }
}

export async function updateExistingClient(
  clientId: string,
  formData: FormData
): Promise<{ success: boolean; client?: Client; error?: string }> {
  try {
    await requireClientManagement()
    const user = await getUser()
    const supabase = await createSupabaseClient()

    const name = formData.get("name") as string
    const slug = formData.get("slug") as string
    const site = formData.get("site") as string | null
    const segment = formData.get("segment") as ClientSegment
    const type = formData.get("type") as ClientType
    const focus = formData.get("focus") as ClientFocus
    const target_audience = formData.get("target_audience") as string | null

    // Validate required fields
    if (!name || !slug || !segment || !type || !focus || !target_audience) {
      return { success: false, error: "Todos os campos obrigatorios devem ser preenchidos" }
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    if (!slugRegex.test(slug)) {
      return { success: false, error: "O slug deve conter apenas letras minusculas, numeros e hifens" }
    }

    // Check if slug already exists (except for current client)
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("slug", slug)
      .neq("id", clientId)
      .single()

    if (existingClient) {
      return { success: false, error: "Este slug ja esta em uso" }
    }

    const { data, error } = await supabase
      .from("clients")
      .update({
        name,
        slug,
        site: site || null,
        segment,
        type,
        focus,
        target_audience,
        updated_at: new Date().toISOString(),
      })
      .eq("id", clientId)
      .select()
      .single()

    if (error) {
      console.error("Error updating client:", error)
      return { success: false, error: error.message }
    }

    // Log audit
    await supabase.from("audit_logs").insert({
      action: "client_updated",
      actor_id: user?.id,
      target_id: clientId,
      details: { name, slug },
    })

    return { success: true, client: data }
  } catch (error) {
    console.error("Error in updateClient:", error)
    return { success: false, error: "Erro ao atualizar cliente" }
  }
}

export async function toggleClientStatus(
  clientId: string,
  active: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireClientManagement()
    const user = await getUser()
    const supabase = await createSupabaseClient()

    const { error } = await supabase
      .from("clients")
      .update({
        active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", clientId)

    if (error) {
      console.error("Error toggling client status:", error)
      return { success: false, error: error.message }
    }

    // Log audit
    await supabase.from("audit_logs").insert({
      action: active ? "client_reactivated" : "client_deactivated",
      actor_id: user?.id,
      target_id: clientId,
      details: { active },
    })

    return { success: true }
  } catch (error) {
    console.error("Error in toggleClientStatus:", error)
    return { success: false, error: "Erro ao alterar status do cliente" }
  }
}

export async function removeClient(clientId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireClientManagement()
    const user = await getUser()
    const supabase = await createSupabaseClient()

    // Get client info before deletion for audit log
    const { data: clientData } = await supabase
      .from("clients")
      .select("name, slug")
      .eq("id", clientId)
      .single()

    // Delete associated prompts first
    await supabase.from("client_ai_prompts").delete().eq("client_id", clientId)

    const { error } = await supabase.from("clients").delete().eq("id", clientId)

    if (error) {
      console.error("Error deleting client:", error)
      return { success: false, error: error.message }
    }

    // Log audit
    await supabase.from("audit_logs").insert({
      action: "client_deleted",
      actor_id: user?.id,
      target_id: clientId,
      details: clientData || {},
    })

    return { success: true }
  } catch (error) {
    console.error("Error in deleteClient:", error)
    return { success: false, error: "Erro ao remover cliente" }
  }
}

// Generate AI search prompts for a client
async function generateClientAIPrompts(
  clientId: string,
  clientInfo: {
    name: string
    segment: ClientSegment
    type: ClientType
    focus: ClientFocus
    target_audience: string
    site?: string
  }
): Promise<void> {
  const supabase = await createSupabaseClient()

  const segmentLabels: Record<ClientSegment, string> = {
    imobiliario: "Imobiliario",
    moda: "Moda",
    automotivo: "Automotivo",
    tecnologia: "Tecnologia",
    saude: "Saude",
    educacao: "Educacao",
    alimentacao: "Alimentacao",
    servicos: "Servicos",
    varejo: "Varejo",
    industria: "Industria",
    financeiro: "Financeiro",
    turismo: "Turismo",
    beleza: "Beleza",
    esportes: "Esportes",
    pets: "Pets",
    outro: "Outro",
  }

  const typeLabels: Record<ClientType, string> = {
    ecommerce: "E-commerce (vendas online)",
    lead_generation: "Geracao de leads",
  }

  const focusLabels: Record<ClientFocus, string> = {
    autoridade: "Construir autoridade no mercado",
    venda: "Aumentar vendas",
    coleta_leads: "Coletar leads qualificados",
    branding: "Fortalecer branding",
    engajamento: "Aumentar engajamento",
    trafego: "Gerar trafego",
  }

  const prompt = `Voce e um especialista em comportamento do consumidor e busca de informacoes em IAs (como ChatGPT, Claude, Perplexity).

Sua tarefa e gerar prompts que USUARIOS FINAIS (potenciais clientes) fariam em uma IA quando estivessem PESQUISANDO SOBRE A EMPRESA ou buscando solucoes no segmento dela. Esses prompts simulam o que pessoas reais perguntariam a uma IA antes de contratar/comprar.

INFORMACOES DA EMPRESA:
- Nome da empresa: ${clientInfo.name}
- Segmento de atuacao: ${segmentLabels[clientInfo.segment]}
- Tipo de negocio: ${typeLabels[clientInfo.type]}
- Foco principal: ${focusLabels[clientInfo.focus]}
- Publico-alvo: ${clientInfo.target_audience}
${clientInfo.site ? `- Site: ${clientInfo.site}` : ""}

TIPOS DE PROMPTS QUE VOCE DEVE GERAR (exatamente 8 prompts variados):

1. REPUTACAO E CONFIABILIDADE (2 prompts):
   - "A empresa ${clientInfo.name} e confiavel?"
   - "O que as pessoas falam sobre ${clientInfo.name}?"
   - "Vale a pena comprar/contratar ${clientInfo.name}?"

2. COMPARACOES E RANKING (2 prompts):
   - "Qual a melhor empresa de [segmento] em [regiao]?"
   - "Quais sao as melhores opcoes de [produto/servico] no Brasil?"
   - "${clientInfo.name} ou [concorrente], qual escolher?"

3. BUSCA POR SOLUCOES (2 prompts):
   - "Preciso de [solucao relacionada ao segmento], o que voce recomenda?"
   - "Quem oferece [produto/servico do segmento] com melhor custo-beneficio?"

4. DUVIDAS PRE-COMPRA (2 prompts):
   - "Como funciona [servico/produto do segmento]?"
   - "O que devo considerar antes de contratar [tipo de servico]?"
   - "Quais os cuidados ao escolher [produto/servico do segmento]?"

REGRAS:
- Use linguagem natural e coloquial como um usuario real usaria
- Considere o perfil do publico-alvo descrito
- Varie entre perguntas diretas sobre a empresa e perguntas genericas do segmento
- Inclua referencias geograficas quando fizer sentido (Brasil, cidade, regiao)
- Os prompts devem ser perguntas que uma pessoa faria ao ChatGPT/Claude/Perplexity

FORMATO DE RESPOSTA:
Retorne APENAS um JSON array com 8 objetos:
[
  {"prompt": "A empresa ${clientInfo.name} e confiavel? Vale a pena?", "category": "reputation"},
  {"prompt": "Qual a melhor empresa de ${segmentLabels[clientInfo.segment].toLowerCase()} do Brasil?", "category": "comparison"}
]

Categorias permitidas: reputation, comparison, solution, pre_purchase

Retorne APENAS o JSON, sem explicacoes.`

  try {
    const result = await generateText({
      model: getActiveModel("text"),
      prompt,
      temperature: 0.7,
    })

    // Parse the JSON response
    const jsonMatch = result.text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error("Could not parse AI response as JSON")
    }

    const prompts = JSON.parse(jsonMatch[0]) as Array<{ prompt: string; category: string }>

    // Insert prompts into database
    const promptsToInsert = prompts.map((p) => ({
      client_id: clientId,
      prompt: p.prompt,
      category: p.category,
      is_active: true,
    }))

    const { error } = await supabase.from("client_ai_prompts").insert(promptsToInsert)

    if (error) {
      console.error("Error inserting AI prompts:", error)
      throw error
    }
  } catch (error) {
    console.error("Error generating AI prompts:", error)
    throw error
  }
}

// Get AI prompts for a specific client
export async function getClientAIPrompts(
  clientId: string
): Promise<{ prompts: ClientAIPrompt[]; error: string | null }> {
  try {
    await requireAuth()
    const supabase = await createSupabaseClient()

    const { data, error } = await supabase
      .from("client_ai_prompts")
      .select("*")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching client AI prompts:", error)
      return { prompts: [], error: error.message }
    }

    return { prompts: data || [], error: null }
  } catch (error) {
    console.error("Error in getClientAIPrompts:", error)
    return { prompts: [], error: "Erro ao buscar prompts" }
  }
}

// Regenerate AI prompts for a client
export async function regenerateClientAIPrompts(
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireClientManagement()
    const supabase = await createSupabaseClient()

    // Get client info
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single()

    if (clientError || !client) {
      return { success: false, error: "Cliente nao encontrado" }
    }

    // Delete old prompts
    await supabase
      .from("client_ai_prompts")
      .delete()
      .eq("client_id", clientId)

    // Generate new prompts
    await generateClientAIPrompts(clientId, {
      name: client.name,
      segment: client.segment,
      type: client.type,
      focus: client.focus,
      target_audience: client.target_audience || "",
      site: client.site || undefined,
    })

    return { success: true }
  } catch (error) {
    console.error("Error regenerating AI prompts:", error)
    return { success: false, error: "Erro ao regenerar prompts" }
  }
}
