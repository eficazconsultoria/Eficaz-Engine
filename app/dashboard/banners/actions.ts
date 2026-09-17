"use server"

import { requireFeatureAccess } from "@/lib/auth"
import { getAgentPrompt, logGeneration, updateAgentPrompt } from "@/lib/services/generation"
import { generateImages } from "@/lib/services/image-generation"
import { generateText } from "ai"
import { getActiveModel, getImageModel } from "@/lib/providers"

export async function generateBanners(formData: FormData) {
  const profile = await requireFeatureAccess("site_banners")

  const objective = formData.get("objective") as string
  const mainText = formData.get("mainText") as string
  const ctaText = formData.get("ctaText") as string
  const ratio = formData.get("ratio") as string
  const width = formData.get("width") as string
  const height = formData.get("height") as string
  const style = formData.get("style") as string

  const input = { objective, mainText, ctaText, ratio, width, height, style }

  const agent = await getAgentPrompt("site_banners")
  const systemPrompt = agent?.content_md || "You are a banner design assistant."

  try {
    // Step 1: Generate banner concept and image prompt
    const { text } = await generateText({
      model: getActiveModel("text"),
      system: systemPrompt,
      prompt: `Crie um conceito de banner para e-commerce.
      
Objetivo: ${objective}
Texto principal: ${mainText}
CTA: ${ctaText}
Proporção: ${ratio}
Dimensões: ${width}x${height}
Estilo: ${style}

Forneça:
1. Descrição detalhada do layout e elementos visuais
2. Um prompt em inglês otimizado para IA de geração de imagens

Formato:
CONCEITO:
[descrição detalhada]

PROMPT PARA IMAGEM:
[prompt em inglês]`,
    })

    // Step 2: Extract image prompt from response
    const promptMatch = text.match(/PROMPT PARA IMAGEM:\s*(.+?)$/is)
    const imagePrompt = promptMatch?.[1]?.trim() || 
      `E-commerce banner, ${style} style, ${objective}, ${width}x${height}px, professional design, high quality`

    // Step 3: Generate actual banner image
    const imageModel = getImageModel("banners")
    let imageData: { url: string; base64?: string; mediaType?: string }

    try {
      const result = await generateImages(imagePrompt, "banners", 1)
      if (result.images.length > 0) {
        imageData = {
          url: result.images[0].url,
          base64: result.images[0].base64,
          mediaType: result.images[0].mediaType,
        }
      } else {
        imageData = {
          url: `/placeholder.svg?height=${height}&width=${width}&query=${encodeURIComponent(imagePrompt)}`,
        }
      }
    } catch (imgError) {
      console.error("Error generating banner image:", imgError)
      imageData = {
        url: `/placeholder.svg?height=${height}&width=${width}&query=${encodeURIComponent(`ecommerce banner ${style} ${objective}`)}`,
      }
    }

    await logGeneration(profile.id, "site_banners", input, { 
      concept: text, 
      image: imageData,
      model: imageModel 
    }, "success")

    return { success: true, concept: text, image: imageData, model: imageModel }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed"
    await logGeneration(profile.id, "site_banners", input, null, "error", message)
    return { success: false, error: message }
  }
}

export async function saveAgentPrompt(content: string) {
  const profile = await requireFeatureAccess("site_banners")
  if (profile.role !== "admin") return { success: false, error: "Unauthorized" }
  const updated = await updateAgentPrompt("site_banners", content, profile.id)
  return updated ? { success: true, prompt: updated } : { success: false, error: "Failed to save" }
}
