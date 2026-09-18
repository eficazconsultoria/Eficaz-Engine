import { createClient } from "@/lib/supabase/server"
import type { AgentPrompt, GenerationLog } from "@/lib/types"

// Available placeholder variables for dynamic prompts
export interface PromptVariables {
  // Client context
  client_name?: string
  client_segment?: string
  client_site?: string
  client_target_audience?: string
  client_focus?: string
  
  // Form fields (posts)
  type?: string
  topic?: string
  tone?: string
  persona?: string
  objective?: string
  additionalInfo?: string
  hashtags?: string
  
  // SEO fields
  keyword?: string
  searchIntent?: string
  contentLength?: string
  targetUrl?: string
  
  // Generic
  [key: string]: string | undefined
}

/**
 * Replace placeholders in a prompt template with actual values.
 * Placeholders format: {{variable_name}}
 * 
 * Example usage in agent prompt:
 * "Crie um post para {{client_name}} sobre {{topic}} usando tom {{tone}}"
 */
export function replacePlaceholders(template: string, variables: PromptVariables): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key]
    return value !== undefined && value !== null && value !== "" 
      ? value 
      : `[${key} nao informado]`
  })
}

/**
 * Extract all placeholder names from a template
 */
export function extractPlaceholders(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g) || []
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))]
}

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
