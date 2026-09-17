export type UserRole =
  | "admin"
  | "performance"
  | "marketing"
  | "projetos"
  | "sucesso"
  | "redacao"
  | "comercial"
  | "design"
  | "seo"

export interface Profile {
  id: string
  email: string
  name: string
  role: UserRole
  active: boolean
  created_at: string
  updated_at: string
}

export interface AgentPrompt {
  id: string
  key: string
  content_md: string
  version: number
  updated_by: string | null
  updated_at: string
  created_at: string
}

export interface GenerationLog {
  id: string
  user_id: string
  feature_key: string
  input_json: Record<string, unknown>
  output_json: Record<string, unknown>
  status: "pending" | "processing" | "success" | "error"
  error_message: string | null
  created_at: string
}

export interface WhatsAppCampaign {
  id: string
  user_id: string
  name: string
  template: string
  status: "draft" | "sending" | "completed" | "cancelled"
  total_messages: number
  sent_count: number
  error_count: number
  created_at: string
  updated_at: string
}

export interface WhatsAppMessage {
  id: string
  campaign_id: string
  phone: string
  name: string | null
  variables: Record<string, string>
  message_content: string
  status: "pending" | "sent" | "delivered" | "error"
  error_message: string | null
  sent_at: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  action: string
  actor_id: string
  target_id: string | null
  details: Record<string, unknown>
  created_at: string
}

export interface KeywordSuggestion {
  keyword: string
  searchVolume: number
  seoDifficulty: number
  intent: "commercial" | "informational" | "navigational" | "transactional"
  trend: "up" | "down" | "stable"
  score: number // ranking score for best choice
}
