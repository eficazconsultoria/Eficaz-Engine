import { createClient } from "@/lib/supabase/server"
import type { AgentPrompt, GenerationLog } from "@/lib/types"

// Get agent prompt by key
export async function getAgentPrompt(key: string): Promise<AgentPrompt | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("agent_prompts").select("*").eq("key", key).single()

  if (error || !data) return null
  return data as AgentPrompt
}

// Update agent prompt (admin only)
export async function updateAgentPrompt(key: string, content: string, userId: string): Promise<AgentPrompt | null> {
  const supabase = await createClient()

  // Get current version
  const { data: current } = await supabase.from("agent_prompts").select("version").eq("key", key).single()

  const newVersion = (current?.version || 0) + 1

  const { data, error } = await supabase
    .from("agent_prompts")
    .update({
      content_md: content,
      version: newVersion,
      updated_by: userId,
    })
    .eq("key", key)
    .select()
    .single()

  if (error || !data) return null
  return data as AgentPrompt
}

// Log a generation
export async function logGeneration(
  userId: string,
  featureKey: string,
  input: Record<string, unknown>,
  output: Record<string, unknown> | null,
  status: "pending" | "processing" | "success" | "error",
  errorMessage?: string,
): Promise<GenerationLog | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("generation_logs")
    .insert({
      user_id: userId,
      feature_key: featureKey,
      input_json: input,
      output_json: output || {},
      status,
      error_message: errorMessage,
    })
    .select()
    .single()

  if (error || !data) return null
  return data as GenerationLog
}

// Get generation history for a user and feature
export async function getGenerationHistory(userId: string, featureKey: string, limit = 10): Promise<GenerationLog[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("generation_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("feature_key", featureKey)
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data as GenerationLog[]
}
