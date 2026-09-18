import { generateText } from "ai"
import { getTextModel, getTextModels } from "@/lib/providers"

export async function generateTextWithFallback(
  options: Omit<Parameters<typeof generateText>[0], "model">,
): Promise<any> {
  let lastError: unknown

  for (const modelId of getTextModels()) {
    try {
      return await generateText({ ...options, model: getTextModel(modelId) })
    } catch (error) {
      lastError = error
      console.error(`[v0] Falha no modelo ${modelId}; tentando fallback`, error)
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Nenhum modelo de IA disponível")
}
