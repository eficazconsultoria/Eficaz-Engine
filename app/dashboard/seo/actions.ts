"use server"

import { requireFeatureAccess } from "@/lib/auth"
import { getAgentPrompt, logGeneration, updateAgentPrompt } from "@/lib/services/generation"
import { generateTextWithFallback } from "@/lib/services/ai"
import type { KeywordSuggestion } from "@/lib/types"

export async function researchKeywords(seedKeyword: string): Promise<{
  success: boolean
  keywords?: KeywordSuggestion[]
  error?: string
}> {
  const profile = await requireFeatureAccess("seo_texts")

  const agent = await getAgentPrompt("keyword_research")
  const systemPrompt = agent?.content_md || `Você é um especialista em SEO e pesquisa de palavras-chave.
Analise o nicho e retorne dados precisos baseados nas tendências atuais do último mês.`

  try {
    const { text } = await generateTextWithFallback({
        system: systemPrompt,
      prompt: `Analise a palavra-chave/produto: "${seedKeyword}"

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

    await logGeneration(profile.id, "keyword_research", { seedKeyword }, { keywords }, "success")

    return { success: true, keywords }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Keyword research failed"
    await logGeneration(profile.id, "keyword_research", { seedKeyword }, null, "error", message)
    return { success: false, error: message }
  }
}

export async function generateSeoText(formData: FormData) {
  const profile = await requireFeatureAccess("seo_texts")

  const type = formData.get("type") as string
  const mainKeyword = formData.get("mainKeyword") as string
  const secondaryKeywords = formData.get("secondaryKeywords") as string
  const searchIntent = formData.get("searchIntent") as string
  const tone = formData.get("tone") as string
  const length = formData.get("length") as string
  const includeFaq = formData.get("includeFaq") === "on"

  const input = { type, mainKeyword, secondaryKeywords, searchIntent, tone, length, includeFaq }

  const agent = await getAgentPrompt("seo_texts")
  const systemPrompt = agent?.content_md || "You are an SEO content specialist."

  try {
    const { text } = await generateTextWithFallback({
        system: systemPrompt,
      prompt: `Crie um texto SEO otimizado para ${type === "category" ? "página de categoria" : "página de produto"}.
      
Palavra-chave principal: ${mainKeyword}
Palavras-chave secundárias: ${secondaryKeywords}
Intenção de busca: ${searchIntent}
Tom de voz: ${tone}
Tamanho aproximado: ${length}
${includeFaq ? "Inclua uma seção de FAQ." : ""}

O texto deve ter:
- Título H1 otimizado
- Subtítulos H2 e H3 estratégicos
- Parágrafos bem estruturados
- Meta description sugerida
- Densidade de palavras-chave adequada`,
    })

    await logGeneration(profile.id, "seo_texts", input, { text }, "success")

    return { success: true, text }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed"
    await logGeneration(profile.id, "seo_texts", input, null, "error", message)
    return { success: false, error: message }
  }
}

export async function saveAgentPrompt(content: string) {
  const profile = await requireFeatureAccess("seo_texts")
  if (profile.role !== "admin") return { success: false, error: "Unauthorized" }
  const updated = await updateAgentPrompt("seo_texts", content, profile.id)
  return updated ? { success: true, prompt: updated } : { success: false, error: "Failed to save" }
}

export async function saveKeywordAgentPrompt(content: string) {
  const profile = await requireFeatureAccess("seo_texts")
  if (profile.role !== "admin") return { success: false, error: "Unauthorized" }
  const updated = await updateAgentPrompt("keyword_research", content, profile.id)
  return updated ? { success: true, prompt: updated } : { success: false, error: "Failed to save" }
}
