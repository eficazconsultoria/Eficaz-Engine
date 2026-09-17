import { generateText, experimental_generateImage as generateImage } from "ai"
import { getImageModel } from "@/lib/providers"
import type { ImageUseCase } from "@/lib/providers"

export interface GeneratedImage {
  base64: string
  mediaType: string
  url: string
}

export interface ImageGenerationResult {
  images: GeneratedImage[]
  text?: string
  model: string
}

/**
 * Generate images using AI SDK
 * 
 * For product variations: Uses bfl/flux-kontext-pro (image-only model via generateImage)
 * For creatives/banners: Uses google/gemini-2.5-flash-image (multimodal LLM via generateText)
 */
export async function generateImages(
  prompt: string,
  useCase: ImageUseCase = "general",
  count: number = 1
): Promise<ImageGenerationResult> {
  const model = getImageModel(useCase)
  const images: GeneratedImage[] = []

  // Check if this is a BFL/Flux model (image-only) or Gemini model (multimodal)
  const isImageOnlyModel = model.startsWith("bfl/")

  if (isImageOnlyModel) {
    // Use generateImage for BFL/Flux models (image-only models)
    // These return images in result.images array with base64 and mediaType
    for (let i = 0; i < count; i++) {
      try {
        const result = await generateImage({
          model: model,
          prompt: count > 1 ? `${prompt} (variation ${i + 1} of ${count})` : prompt,
        })

        if (result.images && result.images.length > 0) {
          for (const image of result.images) {
            const mediaType = image.mediaType || "image/png"
            images.push({
              base64: image.base64,
              mediaType: mediaType,
              url: `data:${mediaType};base64,${image.base64}`,
            })
          }
        }
      } catch (error) {
        console.error(`[v0] Error generating image ${i + 1} with ${model}:`, error)
      }
    }
  } else {
    // Use generateText for multimodal LLMs (Gemini models)
    // These return images in result.files array with base64, mediaType, and uint8Array
    for (let i = 0; i < count; i++) {
      try {
        const result = await generateText({
          model: model,
          prompt: count > 1 ? `${prompt} (variation ${i + 1} of ${count})` : prompt,
        })

        // Extract images from result.files
        if (result.files && result.files.length > 0) {
          for (const file of result.files) {
            if (file.mediaType?.startsWith("image/")) {
              images.push({
                base64: file.base64,
                mediaType: file.mediaType,
                url: `data:${file.mediaType};base64,${file.base64}`,
              })
            }
          }
        }
      } catch (error) {
        console.error(`[v0] Error generating image ${i + 1} with ${model}:`, error)
      }
    }
  }

  return {
    images,
    model,
  }
}

/**
 * Generate a single image
 */
export async function generateSingleImage(
  prompt: string,
  useCase: ImageUseCase = "general"
): Promise<GeneratedImage | null> {
  const result = await generateImages(prompt, useCase, 1)
  return result.images[0] || null
}

/**
 * Convert base64 image to data URL for display
 */
export function base64ToDataUrl(base64: string, mediaType: string): string {
  return `data:${mediaType};base64,${base64}`
}
