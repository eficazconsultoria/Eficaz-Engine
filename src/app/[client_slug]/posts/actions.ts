"use server"

import { getProfile } from "@/lib/auth"
import { getAgentPrompt, logGeneration, updateAgentPrompt, replacePlaceholders, type PromptVariables } from "@/lib/services/generation"
import { generateSingleImage } from "@/lib/services/image-generation"
import { generateText } from "ai"
import { getActiveModel } from "@/lib/providers"
import { createClient } from "@/lib/supabase/server"
import { put } from "@vercel/blob"

// Map tone IDs to readable labels
const toneLabels: Record<string, string> = {
  professional: "Profissional",
  casual: "Casual",
  friendly: "Amigavel",
  authoritative: "Autoritativo",
  inspirational: "Inspiracional",
  humorous: "Bem-humorado",
}

// Map objective IDs to readable labels
const objectiveLabels: Record<string, string> = {
  educate: "Educar",
  convert: "Converter",
  authority: "Posicionar como autoridade",
  engage: "Engajar",
}

// Map content type IDs to readable labels
const typeLabels: Record<string, string> = {
  blog: "Blog Post",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  twitter: "Twitter/X",
  facebook: "Facebook",
}

export async function generatePostText(
  clientSlug: string,
  formData: FormData
): Promise<{
  success: boolean
  text?: string
  contentHistoryId?: string
  error?: string
}> {
  const profile = await getProfile()
  if (!profile) return { success: false, error: "Nao autorizado" }

  const supabase = await createClient()

  // Get client info for context
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, name, segment, site, target_audience, focus")
    .eq("slug", clientSlug)
    .single()

  if (clientError || !client) {
    return { success: false, error: "Cliente nao encontrado" }
  }

  const type = formData.get("type") as string
  const keywords = formData.get("keywords") as string
  const topic = formData.get("topic") as string
  const tone = formData.get("tone") as string
  const persona = formData.get("persona") as string
  const objective = formData.get("objective") as string
  const additionalInfo = formData.get("additionalInfo") as string
  const hashtags = formData.get("hashtags") as string

  const input = { type, keywords, topic, tone, persona, objective, additionalInfo, hashtags, clientSlug }

  const agent = await getAgentPrompt("post_texts")
  
  // Build variables for placeholder replacement
  const variables: PromptVariables = {
    // Client context
    client_name: client.name,
    client_segment: client.segment,
    client_site: client.site || "",
    client_target_audience: client.target_audience || "",
    client_focus: client.focus,
    
    // Form fields with readable labels
    type: typeLabels[type] || type,
    type_raw: type,
    keywords: keywords || "",
    topic,
    tone: toneLabels[tone] || tone,
    tone_raw: tone,
    persona,
    objective: objectiveLabels[objective] || objective,
    objective_raw: objective,
    additionalInfo: additionalInfo || "",
    hashtags: hashtags || "",
  }
  
  // Process the agent prompt with dynamic placeholders
  const rawPrompt = agent?.content_md || ""
  const processedPrompt = replacePlaceholders(rawPrompt, variables)
  
  // Use processed prompt as system if it has content, otherwise use default
  const systemPrompt = processedPrompt.trim() || "Voce e um assistente especializado em criacao de conteudo para redes sociais e blogs."

  try {
    const { text } = await generateText({
      model: getActiveModel("text"),
      system: systemPrompt,
      prompt: `Crie um texto ${type === "blog" ? "para blog" : `para ${type}`}.

CONTEXTO DO CLIENTE:
- Empresa: ${client.name}
- Segmento: ${client.segment}
- Site: ${client.site || "Nao informado"}
- Publico-alvo: ${client.target_audience || persona || "Nao informado"}
- Foco: ${client.focus}

CONFIGURACOES DO POST:
- Tema: ${topic}
${keywords ? `- Palavras-chave: ${keywords}` : ""}
- Tom de voz: ${toneLabels[tone] || tone}
- Persona do publico: ${persona}
- Objetivo: ${objectiveLabels[objective] || objective}
${additionalInfo ? `\nINFORMACAOES ADICIONAIS:\n${additionalInfo}` : ""}
${hashtags ? `\nHashtags sugeridas: ${hashtags}` : ""}

${type === "blog" ? "Inclua titulo, subtitulos, paragrafos bem estruturados e um CTA final." : "Crie um texto conciso e engajador adequado para " + type + " com hashtags relevantes."}

O conteudo deve estar alinhado com a marca ${client.name} e seu segmento de ${client.segment}.`,
    })

    await logGeneration(profile.id, "post_texts", input, { text }, "success")

    // Save to content history
    const { data: contentHistory } = await supabase.from("client_content_history").insert({
      client_id: client.id,
      user_id: profile.id,
      content_type: "post",
      title: `${type.charAt(0).toUpperCase() + type.slice(1)}: ${topic.slice(0, 50)}${topic.length > 50 ? "..." : ""}`,
      content: text,
      platform: type,
      input_params: input,
      ai_model: "gpt-4o",
    }).select("id").single()

    return { success: true, text, contentHistoryId: contentHistory?.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed"
    await logGeneration(profile.id, "post_texts", input, null, "error", message)
    return { success: false, error: message }
  }
}

export async function saveAgentPrompt(content: string) {
  const profile = await getProfile()
  if (!profile || profile.role !== "admin") return { success: false, error: "Unauthorized" }
  const updated = await updateAgentPrompt("post_texts", content, profile.id)
  return updated ? { success: true, prompt: updated } : { success: false, error: "Failed to save" }
}

export async function generateBlogSummary(
  blogContent: string,
  contentHistoryId?: string
): Promise<{
  success: boolean
  summary?: string
  error?: string
}> {
  const profile = await getProfile()
  if (!profile) return { success: false, error: "Nao autorizado" }

  try {
    const { text } = await generateText({
      model: getActiveModel("text"),
      system: `Voce e um especialista em criar resumos concisos e atraentes para artigos de blog.
Seu objetivo e criar um resumo que:
- Seja curto e direto (maximo 2-3 frases ou 150 caracteres)
- Capture a essencia do conteudo
- Seja atraente para fazer o leitor querer ler mais
- Funcione como um "leia mais" ou meta description
- Nao inclua titulos, apenas o texto do resumo`,
      prompt: `Crie um resumo curto e atraente para o seguinte artigo de blog. O resumo deve funcionar como um "leia mais" que aparece em listagens de posts.

CONTEUDO DO ARTIGO:
${blogContent}

Retorne APENAS o texto do resumo, sem titulos ou formatacao adicional.`,
    })

    const summary = text.trim()

    // Save summary to content history if ID provided
    if (contentHistoryId) {
      const supabase = await createClient()
      await supabase
        .from("client_content_history")
        .update({ summary })
        .eq("id", contentHistoryId)
    }

    return { success: true, summary }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao gerar resumo"
    return { success: false, error: message }
  }
}

export async function saveBlogSummary(
  contentHistoryId: string,
  summary: string
): Promise<{
  success: boolean
  error?: string
}> {
  const profile = await getProfile()
  if (!profile) return { success: false, error: "Nao autorizado" }

  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from("client_content_history")
      .update({ summary })
      .eq("id", contentHistoryId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao salvar resumo"
    return { success: false, error: message }
  }
}

export async function generateBlogCoverImage(
  blogContent: string,
  topic: string,
  contentHistoryId?: string
): Promise<{
  success: boolean
  imageUrl?: string
  error?: string
}> {
  const profile = await getProfile()
  if (!profile) return { success: false, error: "Nao autorizado" }

  try {
    console.log("[v0] Starting cover image generation for topic:", topic)
    
    // First, generate a prompt for the image based on the blog content
    const { text: imagePrompt } = await generateText({
      model: getActiveModel("text"),
      system: `Voce e um especialista em criar prompts para geracao de imagens.
Seu objetivo e criar um prompt que gere uma imagem de capa profissional para um artigo de blog.
O prompt deve:
- Descrever uma imagem HORIZONTAL em formato paisagem (landscape) com aspect ratio 16:9
- Ser visualmente atraente e profissional
- Ser adequada para uso como banner/capa de blog no topo da pagina
- Ter estilo moderno e clean
- Nao incluir texto, palavras ou letras na imagem
- Usar cores e elementos que combinem com o tema do artigo
- Sempre especificar "horizontal wide banner, 16:9 aspect ratio, landscape orientation" no prompt`,
      prompt: `Crie um prompt curto e eficaz para gerar uma imagem de capa HORIZONTAL (landscape, 16:9) para o seguinte artigo de blog:

TEMA: ${topic}

CONTEUDO DO ARTIGO (resumo):
${blogContent.substring(0, 1000)}

IMPORTANTE: A imagem DEVE ser horizontal (landscape), formato wide banner 16:9, NAO vertical.

Retorne APENAS o prompt para geracao de imagem, sem explicacoes. O prompt deve ser em ingles, ter no maximo 250 caracteres e DEVE incluir "horizontal wide banner, 16:9 aspect ratio, landscape orientation".`,
    })

    console.log("[v0] Generated image prompt:", imagePrompt.trim())

    // Generate the image with 16:9 aspect ratio for horizontal banner
    const image = await generateSingleImage(imagePrompt.trim(), "banner", "16:9")
    
    console.log("[v0] Image generation result:", image ? "success" : "failed", image ? { hasBase64: !!image.base64, mediaType: image.mediaType } : null)

    if (!image) {
      return { success: false, error: "Falha ao gerar imagem" }
    }

    // Convert base64 to buffer for upload
    const imageBuffer = Buffer.from(image.base64, "base64")
    const fileName = `blog-covers/${Date.now()}-${Math.random().toString(36).substring(7)}.png`

    // Upload to Vercel Blob
    const blob = await put(fileName, imageBuffer, {
      access: "public",
      contentType: image.mediaType || "image/png",
    })

    // Save to content history if ID provided
    if (contentHistoryId) {
      const supabase = await createClient()
      await supabase
        .from("client_content_history")
        .update({ cover_image_url: blob.url })
        .eq("id", contentHistoryId)
    }

    return { success: true, imageUrl: blob.url }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao gerar imagem de capa"
    return { success: false, error: message }
  }
}

export async function saveBlogCoverImage(
  contentHistoryId: string,
  coverImageUrl: string
): Promise<{
  success: boolean
  error?: string
}> {
  const profile = await getProfile()
  if (!profile) return { success: false, error: "Nao autorizado" }

  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from("client_content_history")
      .update({ cover_image_url: coverImageUrl })
      .eq("id", contentHistoryId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao salvar imagem de capa"
    return { success: false, error: message }
  }
}
