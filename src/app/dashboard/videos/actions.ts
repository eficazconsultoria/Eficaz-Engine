"use server"

import { requireFeatureAccess } from "@/lib/auth"
import { getAgentPrompt, logGeneration, updateAgentPrompt } from "@/lib/services/generation"
import { generateText } from "ai"
import { getActiveModel } from "@/lib/providers"

export async function generateVideos(formData: FormData) {
  const profile = await requireFeatureAccess("marketing_videos")

  const briefing = formData.get("briefing") as string
  const duration = formData.get("duration") as string
  const format = formData.get("format") as string
  const script = formData.get("script") as string
  const style = formData.get("style") as string

  const input = { briefing, duration, format, script, style }

  const agent = await getAgentPrompt("marketing_videos")
  const systemPrompt = agent?.content_md || "You are a video production assistant."

  try {
    const { text } = await generateText({
      model: getActiveModel("text"),
      system: systemPrompt,
      prompt: `Crie um conceito de vídeo de marketing.
      
Briefing: ${briefing}
Duração: ${duration}
Formato: ${format}
Roteiro: ${script || "A desenvolver"}
Estilo: ${style}

Retorne um roteiro detalhado com cenas, transições e sugestões visuais.`,
    })

    // In production, this would generate actual video
    const videoUrl = `/placeholder.svg?height=720&width=1280&query=${encodeURIComponent(`marketing video ${style}`)}`

    await logGeneration(profile.id, "marketing_videos", input, { script: text, video: videoUrl }, "success")

    return { success: true, script: text, videoUrl }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed"
    await logGeneration(profile.id, "marketing_videos", input, null, "error", message)
    return { success: false, error: message }
  }
}

export async function saveAgentPrompt(content: string) {
  const profile = await requireFeatureAccess("marketing_videos")
  if (profile.role !== "admin") return { success: false, error: "Unauthorized" }
  const updated = await updateAgentPrompt("marketing_videos", content, profile.id)
  return updated ? { success: true, prompt: updated } : { success: false, error: "Failed to save" }
}
