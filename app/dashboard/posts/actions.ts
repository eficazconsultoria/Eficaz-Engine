"use server"

import { requireFeatureAccess } from "@/lib/auth"
import { getAgentPrompt, logGeneration, updateAgentPrompt } from "@/lib/services/generation"
import { generateText } from "ai"
import { getActiveModel } from "@/lib/providers"

export async function generatePostText(formData: FormData) {
  const profile = await requireFeatureAccess("post_texts")

  const type = formData.get("type") as string
  const topic = formData.get("topic") as string
  const tone = formData.get("tone") as string
  const persona = formData.get("persona") as string
  const objective = formData.get("objective") as string

  const input = { type, topic, tone, persona, objective }

  const agent = await getAgentPrompt("post_texts")
  const systemPrompt = agent?.content_md || "You are a content writing assistant."

  try {
    const { text } = await generateText({
      model: getActiveModel("text"),
      system: systemPrompt,
      prompt: `Crie um texto ${type === "blog" ? "para blog" : "para redes sociais"}.
      
Tema: ${topic}
Tom de voz: ${tone}
Persona: ${persona}
Objetivo: ${objective}

${type === "blog" ? "Inclua título, subtítulos, parágrafos bem estruturados e um CTA final." : "Crie um texto conciso e engajador com hashtags relevantes."}`,
    })

    await logGeneration(profile.id, "post_texts", input, { text }, "success")

    return { success: true, text }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed"
    await logGeneration(profile.id, "post_texts", input, null, "error", message)
    return { success: false, error: message }
  }
}

export async function saveAgentPrompt(content: string) {
  const profile = await requireFeatureAccess("post_texts")
  if (profile.role !== "admin") return { success: false, error: "Unauthorized" }
  const updated = await updateAgentPrompt("post_texts", content, profile.id)
  return updated ? { success: true, prompt: updated } : { success: false, error: "Failed to save" }
}
