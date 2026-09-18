import { gateway } from "@ai-sdk/gateway"
import type { LanguageModel } from "ai"

// AI Provider abstraction layer
// Providers are configured via environment variables

const DEFAULT_TEXT_MODELS = [
  "openai/gpt-4o-mini",
  "google/gemini-2.5-flash",
] as const

export function getTextModels(): string[] {
  const configured = process.env.TEXT_MODEL?.trim()
  return configured ? [configured, ...DEFAULT_TEXT_MODELS.filter((model) => model !== configured)] : [...DEFAULT_TEXT_MODELS]
}

export function getTextModel(modelId: string): LanguageModel {
  return gateway(modelId)
}

export type ContentType = "text" | "image" | "video"

// Image generation use cases - allows different models for different purposes
export type ImageUseCase = "product_variations" | "creatives" | "banners" | "general"

export interface GenerationInput {
  prompt: string
  systemPrompt?: string
  options?: Record<string, unknown>
}

export interface GenerationOutput {
  content: string | string[]
  metadata?: Record<string, unknown>
}

// Get active provider for content type from environment
export function getActiveProvider(type: ContentType, useCase?: ImageUseCase): string {
  if (type === "image" && useCase === "product_variations") {
    return process.env.PRODUCT_IMAGE_PROVIDER || process.env.IMAGE_PROVIDER || "openai"
  }
  
  const providers: Record<ContentType, string> = {
    text: process.env.TEXT_PROVIDER || "openai",
    image: process.env.IMAGE_PROVIDER || "openai",
    video: process.env.VIDEO_PROVIDER || "fal",
  }
  return providers[type]
}

// Get model for content type from environment
// For images, supports different models based on use case
export function getActiveModel(type: ContentType, useCase?: ImageUseCase): string {
  // Special case for product image variations
  if (type === "image" && useCase === "product_variations") {
    return process.env.PRODUCT_IMAGE_MODEL || "openai/dall-e-3"
  }
  
  // Default models for each content type
  const models: Record<ContentType, string> = {
    text: getTextModels()[0],
    image: process.env.IMAGE_MODEL || "openai/dall-e-3",
    video: process.env.VIDEO_MODEL || "fal-ai/minimax/video-01",
  }
  return models[type]
}

// Get image model by use case - convenience function
export function getImageModel(useCase: ImageUseCase = "general"): string {
  switch (useCase) {
    case "product_variations":
      // Uses BFL Flux Kontext for product image variations (image-only model)
      // Configure via PRODUCT_IMAGE_MODEL env var
      // Default: bfl/flux-kontext-pro - great for product photos and variations
      return process.env.PRODUCT_IMAGE_MODEL || "bfl/flux-kontext-pro"
    
    case "creatives":
    case "banners":
    case "general":
    default:
      // Uses Gemini for marketing creatives (multimodal LLM)
      // Configure via IMAGE_MODEL env var
      // Default: google/gemini-2.5-flash-image - fast and efficient
      return process.env.IMAGE_MODEL || "google/gemini-2.5-flash-image"
  }
}
