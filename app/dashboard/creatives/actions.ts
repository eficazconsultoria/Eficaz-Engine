"use server"

import { requireFeatureAccess } from "@/lib/auth"
import { getAgentPrompt, logGeneration, updateAgentPrompt } from "@/lib/services/generation"
import { generateImages } from "@/lib/services/image-generation"
import { generateTextWithFallback } from "@/lib/services/ai"
import { getImageModel } from "@/lib/providers"

export async function generateCreatives(formData: FormData) {
  const profile = await requireFeatureAccess("creatives")

  const objective = formData.get("objective") as string
  const audience = formData.get("audience") as string
  const format = formData.get("format") as string
  const adText = formData.get("adText") as string
  const brandColors = formData.get("brandColors") as string
  const quantity = Number.parseInt(formData.get("quantity") as string) || 3

  const input = { objective, audience, format, adText, brandColors, quantity }

  const agent = await getAgentPrompt("creatives")
  const systemPrompt = agent?.content_md || "You are a creative design assistant."

  try {
    // Step 1: Generate creative concepts and image prompts
    const { text } = await generateTextWithFallback({
        system: systemPrompt,
      prompt: `Crie ${quantity} conceitos de criativos para a campanha.
      
Objetivo: ${objective}
Público: ${audience}
Formato: ${format}
Texto do anúncio: ${adText || "A definir"}
Cores da marca: ${brandColors || "A definir"}

Para cada conceito, forneça:
1. Descrição do conceito
2. Um prompt detalhado para gerar a imagem (em inglês, otimizado para IA de geração de imagens)

Formato de resposta:
CONCEITO 1:
Descrição: [descrição]
Prompt: [prompt para imagem]

CONCEITO 2:
...`,
    })

    // Step 2: Parse prompts from the response
    const promptMatches = text.match(/Prompt:\s*(.+?)(?=\n|CONCEITO|$)/gi) || []
    const imagePrompts = promptMatches
      .map(match => match.replace(/Prompt:\s*/i, "").trim())
      .filter(p => p.length > 0)
      .slice(0, quantity)

    // Step 3: Generate actual images
    const imageModel = getImageModel("creatives")
    const generatedImages: { url: string; base64?: string; mediaType?: string }[] = []
    
    for (let i = 0; i < quantity; i++) {
      const prompt = imagePrompts[i] || `Creative ad for ${objective} targeting ${audience}, format: ${format}`
      try {
        const result = await generateImages(prompt, "creatives", 1)
        if (result.images.length > 0) {
          generatedImages.push({
            url: result.images[0].url,
            base64: result.images[0].base64,
            mediaType: result.images[0].mediaType,
          })
        }
      } catch (imgError) {
        console.error("Error generating creative image:", imgError)
        generatedImages.push({
          url: `/placeholder.svg?height=512&width=512&query=${encodeURIComponent(prompt)}`,
        })
      }
    }

    await logGeneration(profile.id, "creatives", input, { 
      concepts: text, 
      images: generatedImages,
      model: imageModel 
    }, "success")

    return { success: true, images: generatedImages, concepts: text, model: imageModel }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed"
    await logGeneration(profile.id, "creatives", input, null, "error", message)
    return { success: false, error: message }
  }
}

export async function saveAgentPrompt(content: string) {
  const profile = await requireFeatureAccess("creatives")
  if (profile.role !== "admin") return { success: false, error: "Unauthorized" }
  const updated = await updateAgentPrompt("creatives", content, profile.id)
  return updated ? { success: true, prompt: updated } : { success: false, error: "Failed to save" }
}
