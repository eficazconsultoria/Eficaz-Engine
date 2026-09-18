import { generateObject, generateText } from "ai"
import { getTextModel, getTextModels } from "@/lib/providers"

type Model = ReturnType<typeof getTextModel>

type TextOptions = Record<string, any>
type ObjectOptions = Record<string, any>

const callGenerateText = generateText as any
const callGenerateObject = generateObject as any

async function withTextFallback<T>(
  options: Record<string, any>,
  run: (model: Model) => Promise<T>,
): Promise<T> {
  let lastError: unknown

  for (const modelId of getTextModels()) {
    try {
      return await run(getTextModel(modelId))
    } catch (error) {
      lastError = error
      console.error(`[v0] Falha no modelo ${modelId}; tentando fallback`, error)
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Nenhum modelo de IA disponível")
}

export function generateTextWithFallback(options: TextOptions): Promise<any> {
  return withTextFallback(options, (model) => callGenerateText({ ...options, model }))
}

export function generateObjectWithFallback(options: ObjectOptions): Promise<any> {
  return withTextFallback(options, (model) => callGenerateObject({ ...options, model }))
}
