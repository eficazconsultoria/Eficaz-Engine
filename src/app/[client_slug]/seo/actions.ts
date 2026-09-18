"use server"

import { requireAuth, getProfile } from "@/lib/auth"
import { getAgentPrompt, logGeneration, updateAgentPrompt, replacePlaceholders, type PromptVariables } from "@/lib/services/generation"
import { generateText } from "ai"
import { getActiveModel } from "@/lib/providers"
import { createClient } from "@/lib/supabase/server"
import type { KeywordSuggestion } from "@/lib/types"

export async function researchKeywords(
  clientSlug: string,
  seedKeyword: string
): Promise<{
  success: boolean
  keywords?: KeywordSuggestion[]
  error?: string
}> {
  const profile = await getProfile()
  if (!profile) return { success: false, error: "Não autorizado" }

  const agent = await getAgentPrompt("keyword_research")

  // Get client info for context
  const supabase = await createClient()
  const { data: client } = await supabase
    .from("clients")
    .select("name, segment, site")
    .eq("slug", clientSlug)
    .single()

  // Build variables for placeholder replacement
  const variables: PromptVariables = {
    client_name: client?.name || "",
    client_segment: client?.segment || "",
    client_site: client?.site || "",
    seedKeyword,
  }

  // Process the agent prompt with dynamic placeholders
  const rawPrompt = agent?.content_md || ""
  const processedPrompt = replacePlaceholders(rawPrompt, variables)
  
  const systemPrompt = processedPrompt.trim() || `Voce e um especialista em SEO e pesquisa de palavras-chave.
Analise o nicho e retorne dados precisos baseados nas tendencias atuais do ultimo mes.`

  try {
    const { text } = await generateText({
      model: getActiveModel("text"),
      system: systemPrompt,
      prompt: `Analise a palavra-chave/produto: "${seedKeyword}"
${client ? `\nContexto do cliente:\n- Nome: ${client.name}\n- Segmento: ${client.segment}\n- Site: ${client.site || "Não informado"}` : ""}

Gere exatamente 15 sugestões de palavras-chave relacionadas para e-commerce/SEO.

Para cada palavra-chave, forneça dados ESTIMADOS do último mês (dados realistas para o mercado brasileiro):
- Volume de pesquisa mensal (número entre 100 e 100000)
- SEO Difficulty (0-100, onde 100 é mais difícil)
- Intenção: commercial, informational, navigational ou transactional
- Tendência: up, down ou stable

IMPORTANTE: Ranqueie as palavras-chave da melhor para a pior escolha considerando:
- Maior volume de pesquisa
- Menor dificuldade SEO
- Intenção comercial/transacional tem prioridade

Retorne APENAS um JSON válido no formato:
{
  "keywords": [
    {
      "keyword": "palavra-chave aqui",
      "searchVolume": 5000,
      "seoDifficulty": 35,
      "intent": "commercial",
      "trend": "up",
      "score": 95
    }
  ]
}

As 15 palavras-chave devem estar ordenadas por score (maior para menor).`,
    })

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*"keywords"[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Invalid response format")
    }

    const parsed = JSON.parse(jsonMatch[0])
    const keywords: KeywordSuggestion[] = parsed.keywords.slice(0, 15)

    await logGeneration(profile.id, "keyword_research", { seedKeyword, clientSlug }, { keywords }, "success")

    return { success: true, keywords }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Keyword research failed"
    await logGeneration(profile.id, "keyword_research", { seedKeyword, clientSlug }, null, "error", message)
    return { success: false, error: message }
  }
}

export async function generateSeoText(
  clientSlug: string,
  formData: FormData
): Promise<{
  success: boolean
  text?: string
  error?: string
}> {
  const profile = await getProfile()
  if (!profile) return { success: false, error: "Não autorizado" }

  const supabase = await createClient()

  // Get client info for context
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, name, segment, site, target_audience")
    .eq("slug", clientSlug)
    .single()

  if (clientError || !client) {
    return { success: false, error: "Cliente não encontrado" }
  }

  const type = formData.get("type") as string
  const mainKeyword = formData.get("mainKeyword") as string
  const secondaryKeywords = formData.get("secondaryKeywords") as string
  const searchIntent = formData.get("searchIntent") as string
  const tone = formData.get("tone") as string
  const length = formData.get("length") as string
  const includeFaq = formData.get("includeFaq") === "on"
  const additionalInfo = formData.get("additionalInfo") as string

  const input = { type, mainKeyword, secondaryKeywords, searchIntent, tone, length, includeFaq, additionalInfo, clientSlug }

  const agent = await getAgentPrompt("seo_texts")

  // Map values to readable labels
  const pageTypeLabels: Record<string, string> = {
    category: "Pagina de Categoria",
    product: "Pagina de Produto",
  }

  const searchIntentLabels: Record<string, string> = {
    informational: "Informacional",
    transactional: "Transacional",
    navigational: "Navegacional",
    commercial: "Comercial",
  }

  const toneLabels: Record<string, string> = {
    professional: "Profissional",
    casual: "Casual",
    technical: "Tecnico",
    persuasive: "Persuasivo",
  }

  const lengthLabels: Record<string, string> = {
    short: "Curto (~300 palavras)",
    medium: "Medio (~600 palavras)",
    long: "Longo (~1000 palavras)",
    extensive: "Extenso (~1500+ palavras)",
  }

  // Build variables for placeholder replacement
  const variables: PromptVariables = {
    // Client context
    client_name: client.name,
    client_segment: client.segment,
    client_site: client.site || "",
    client_target_audience: client.target_audience || "",
    
    // SEO form fields
    keyword: mainKeyword,
    secondaryKeywords: secondaryKeywords || "",
    pageType: pageTypeLabels[type] || type,
    pageType_raw: type,
    searchIntent: searchIntentLabels[searchIntent] || searchIntent,
    searchIntent_raw: searchIntent,
    tone: toneLabels[tone] || tone,
    tone_raw: tone,
    contentLength: lengthLabels[length] || length,
    contentLength_raw: length,
    additionalContext: additionalInfo || "",
    includeFaq: includeFaq ? "Sim" : "Nao",
  }

  // Process the agent prompt with dynamic placeholders
  const rawPrompt = agent?.content_md || ""
  const processedPrompt = replacePlaceholders(rawPrompt, variables)
  
  const systemPrompt = processedPrompt.trim() || "Voce e um especialista em conteudo SEO."

  try {
    const { text } = await generateText({
      model: getActiveModel("text"),
      system: systemPrompt,
      prompt: `Crie um texto SEO otimizado para ${pageTypeLabels[type] || type}.

CONTEXTO DO CLIENTE:
- Empresa: ${client.name}
- Segmento: ${client.segment}
- Site: ${client.site || "Não informado"}
- Público-alvo: ${client.target_audience || "Não informado"}

CONFIGURAÇÕES DO TEXTO:
- Palavra-chave principal: ${mainKeyword}
- Palavras-chave secundárias: ${secondaryKeywords}
- Intenção de busca: ${searchIntent}
- Tom de voz: ${tone}
- Tamanho aproximado: ${length}
${includeFaq ? "- Inclua uma seção de FAQ." : ""}
${additionalInfo ? `\nINFORMAÇÕES ADICIONAIS:\n${additionalInfo}` : ""}

O texto deve ter:
- Título H1 otimizado para a marca ${client.name}
- Subtítulos H2 e H3 estratégicos
- Parágrafos bem estruturados
- Meta description sugerida
- Densidade de palavras-chave adequada
- Linguagem adequada ao segmento ${client.segment}`,
    })

    await logGeneration(profile.id, "seo_texts", input, { text }, "success")

    // Save to content history
    await supabase.from("client_content_history").insert({
      client_id: client.id,
      user_id: profile.id,
      content_type: "seo",
      title: `SEO: ${mainKeyword}`,
      content: text,
      main_keyword: mainKeyword,
      secondary_keywords: secondaryKeywords ? secondaryKeywords.split(",").map(k => k.trim()).filter(Boolean) : [],
      platform: type,
      input_params: input,
      ai_model: "gpt-4o",
    })

    return { success: true, text }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed"
    await logGeneration(profile.id, "seo_texts", input, null, "error", message)
    return { success: false, error: message }
  }
}

export async function saveAgentPrompt(content: string) {
  const profile = await getProfile()
  if (!profile || profile.role !== "admin") return { success: false, error: "Unauthorized" }
  const updated = await updateAgentPrompt("seo_texts", content, profile.id)
  return updated ? { success: true, prompt: updated } : { success: false, error: "Failed to save" }
}

export async function saveKeywordAgentPrompt(content: string) {
  const profile = await getProfile()
  if (!profile || profile.role !== "admin") return { success: false, error: "Unauthorized" }
  const updated = await updateAgentPrompt("keyword_research", content, profile.id)
  return updated ? { success: true, prompt: updated } : { success: false, error: "Failed to save" }
}
