"use server"

import { requireFeatureAccess } from "@/lib/auth"
import { getAgentPrompt, logGeneration, updateAgentPrompt } from "@/lib/services/generation"
import { generateImages } from "@/lib/services/image-generation"
import { generateText } from "ai"
import { getActiveModel, getImageModel } from "@/lib/providers"
import { productImagesSchema, validateFormData, contentSchema } from "@/lib/validation"

export async function generateProductImages(formData: FormData) {
  const profile = await requireFeatureAccess("product_image_variations")

  const validation = validateFormData(productImagesSchema, formData)
  if (!validation.success) {
    return { success: false, error: validation.error }
  }

  const { productName, description, style, background, quantity } = validation.data
  const input = { productName, description, style, background, quantity }

  const agent = await getAgentPrompt("product_image_variations")
  const systemPrompt = agent?.content_md || "You are a product image generation assistant."

  try {
    // Step 1: Generate detailed prompts for each image variation
    const { text: promptsText } = await generateText({
      model: getActiveModel("text"),
      system: systemPrompt,
      prompt: `Crie ${quantity} prompts detalhados para gerar imagens do produto "${productName}".
      
Descrição: ${description}
Estilo: ${style || "Profissional"}
Fundo: ${background || "Branco"}

Retorne apenas os prompts, um por linha, numerados.`,
    })

    // Step 2: Parse the generated prompts
    const prompts = promptsText
      .split("\n")
      .map(line => line.replace(/^\d+\.\s*/, "").trim())
      .filter(line => line.length > 0)
      .slice(0, quantity)

    // Step 3: Generate actual images using the image model
    const imageModel = getImageModel("product_variations")
    const generatedImages: { url: string; base64?: string; mediaType?: string }[] = []
    
    for (const prompt of prompts) {
      try {
        const result = await generateImages(prompt, "product_variations", 1)
        if (result.images.length > 0) {
          generatedImages.push({
            url: result.images[0].url || `data:${result.images[0].mediaType};base64,${result.images[0].base64}`,
            base64: result.images[0].base64,
            mediaType: result.images[0].mediaType,
          })
        }
      } catch (imgError) {
        console.error("Error generating image:", imgError)
        // Fallback to placeholder if image generation fails
        generatedImages.push({
          url: `/placeholder.svg?height=512&width=512&query=${encodeURIComponent(prompt)}`,
        })
      }
    }

    await logGeneration(profile.id, "product_image_variations", input, { 
      prompts: promptsText, 
      images: generatedImages,
      model: imageModel 
    }, "success")

    return { 
      success: true, 
      images: generatedImages, 
      prompts: promptsText, 
      model: imageModel 
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed"
    await logGeneration(profile.id, "product_image_variations", input, null, "error", message)
    return { success: false, error: message }
  }
}

export async function saveAgentPrompt(content: string) {
  const profile = await requireFeatureAccess("product_image_variations")
  if (profile.role !== "admin") {
    return { success: false, error: "Unauthorized" }
  }

  const validation = contentSchema.safeParse(content)
  if (!validation.success) {
    return { success: false, error: "Conteudo invalido" }
  }

  const updated = await updateAgentPrompt("product_image_variations", validation.data, profile.id)
  return updated ? { success: true, prompt: updated } : { success: false, error: "Failed to save" }
}
