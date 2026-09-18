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
  | "cliente"

export type UserClass = "internal" | "client"

export interface Profile {
  id: string
  email: string
  name: string
  role: UserRole
  user_class: UserClass
  linked_client_id: string | null
  active: boolean
  created_at: string
  updated_at: string
  // Joined field for display
  linked_client?: Client | null
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

// Client types for multi-tenant support
export type ClientSegment = 
  | "imobiliario"
  | "moda"
  | "automotivo"
  | "tecnologia"
  | "saude"
  | "educacao"
  | "alimentacao"
  | "servicos"
  | "varejo"
  | "industria"
  | "financeiro"
  | "turismo"
  | "beleza"
  | "esportes"
  | "pets"
  | "outro"

export type ClientType = "ecommerce" | "lead_generation"

export type ClientFocus = "autoridade" | "venda" | "coleta_leads" | "branding" | "engajamento" | "trafego"

export interface Client {
  id: string
  name: string
  slug: string
  site: string | null
  segment: ClientSegment
  type: ClientType
  focus: ClientFocus
  target_audience: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface ClientAIPrompt {
  id: string
  client_id: string
  prompt: string
  category: string | null
  is_active: boolean
  generated_at: string
  created_at: string
  // Joined analytics data
  analytics?: PromptAnalyticsSummary | null
  first_test?: {
    visibility_score: number
    tested_at: string
  } | null
}

export type SearchType = "web" | "local" | "mixed"
export type Sentiment = "positive" | "neutral" | "negative"

export interface PromptTestResult {
  id: string
  prompt_id: string
  client_id: string
  
  // Scores
  visibility_score: number
  reputation_score: number
  shopping_score: number
  position_rank: number | null
  
  // Shopping / Vitrine
  shopping_presence: boolean
  shopping_products?: Array<{
    name: string
    price?: string
    brand?: string
    store?: string
    url?: string
    image_url?: string
    rating?: number
    reviews_count?: number
  }>
  
  // Concorrentes
  competitors_found: Record<string, number> // {nome: posicao}
  local_competitors: string[]
  
  // Metadados da busca
  search_type: SearchType
  search_terms_used: string[]
  sources_cited: string[]
  
  // Metadados extras (sentiment, etc)
  analysis_metadata: {
    sentiment?: Sentiment
    sentiment_words?: Array<{
      word: string
      sentiment: Sentiment
      intensity: number // 1-10, quanto maior mais forte o sentimento
    }>
    client_mentioned?: boolean
    search_query_used?: string
    // Google Meu Negócio & Maps
    google_business?: {
      found: boolean
      name?: string
      rating?: number
      total_reviews?: number
      address?: string
      phone?: string
      website?: string
      hours?: string
      category?: string
      price_level?: string // "$", "$$", "$$$", "$$$$"
      // Google Maps specific
      maps_url?: string
      coordinates?: {
        lat: number
        lng: number
      }
      photos_count?: number
      // Reviews
      recent_reviews?: Array<{
        author: string
        rating: number
        text: string
        date: string
        helpful_count?: number
      }>
      // Review summary
      rating_breakdown?: {
        five_star: number
        four_star: number
        three_star: number
        two_star: number
        one_star: number
      }
    }
  }
  
  // Resposta completa
  ai_response: string
  ai_model: string
  
  tested_at: string
  created_at: string
}

export interface PromptAnalyticsSummary {
  id: string
  prompt_id: string
  client_id: string
  
  // Medias calculadas
  avg_visibility_score: number
  avg_reputation_score: number
  avg_shopping_score: number
  avg_position_rank: number | null
  
  // Contadores
  total_tests: number
  tests_with_visibility: number
  tests_with_shopping: number
  best_position: number | null
  worst_position: number | null
  
  // Concorrentes mais frequentes
  top_competitors: Record<string, number>
  
  // Search scores
  web_search_score: number
  local_search_score: number
  
  last_tested_at: string | null
  updated_at: string
}

export interface ClientCompetitor {
  id: string
  client_id: string
  name: string
  website: string | null
  segment: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ContentType = "seo" | "post"

// Keywords types
export type SearchVolume = "muito_alto" | "alto" | "medio" | "baixo"
export type KeywordTrend = "crescimento" | "estavel" | "queda"

export interface SuggestedPrompt {
  prompt: string
  intent: string
  relevance: number // 1-10
}

export interface ClientKeyword {
  id: string
  client_id: string
  keyword: string
  search_volume: SearchVolume
  trend: KeywordTrend
  previous_volume: SearchVolume | null
  previous_trend: KeywordTrend | null
  suggested_prompts: SuggestedPrompt[]
  is_monitored: boolean
  monitored_prompt_id: string | null
  generated_at: string
  updated_at: string
  created_at: string
}

export interface ClientContentHistory {
  id: string
  client_id: string
  user_id: string
  content_type: ContentType
  title: string
  content: string
  summary: string | null
  cover_image_url: string | null
  main_keyword: string | null
  secondary_keywords: string[] | null
  platform: string | null
  status: string | null
  input_params: Record<string, unknown>
  ai_model: string
  created_at: string
  updated_at: string
}

// Site Audit types
export type AuditPriority = "critico" | "alto" | "medio" | "baixo"
export type AuditStatus = "pendente" | "em_progresso" | "resolvido"

export interface AuditItem {
  id: string
  title: string
  description: string
  status: "passed" | "warning" | "error"
  priority: AuditPriority
  recommendation?: string
  current_value?: string
  expected_value?: string
}

export interface SEOAudit {
  title_tag: AuditItem
  meta_description: AuditItem
  h1_tag: AuditItem
  heading_structure: AuditItem
  canonical_url: AuditItem
  robots_meta: AuditItem
  sitemap: AuditItem
  page_speed: AuditItem
  mobile_friendly: AuditItem
  https: AuditItem
  structured_data: AuditItem
  internal_links: AuditItem
  image_alt: AuditItem
  url_structure: AuditItem
}

export interface ContentAudit {
  content_length: AuditItem
  keyword_usage: AuditItem
  readability: AuditItem
  uniqueness: AuditItem
  media_usage: AuditItem
  content_freshness: AuditItem
  cta_presence: AuditItem
  content_structure: AuditItem
}

export interface AEOAudit {
  ai_crawlability: AuditItem
  structured_answers: AuditItem
  faq_schema: AuditItem
  conversational_content: AuditItem
  entity_clarity: AuditItem
  source_authority: AuditItem
  content_depth: AuditItem
  llm_friendly_format: AuditItem
}

export interface SiteAudit {
  id: string
  client_id: string
  page_url: string
  page_title: string | null
  page_type: string | null
  overall_score: number
  seo_score: number
  content_score: number
  aeo_score: number
  priority: AuditPriority
  status: AuditStatus
  seo_audit: Partial<SEOAudit>
  content_audit: Partial<ContentAudit>
  aeo_audit: Partial<AEOAudit>
  issues_count: number
  critical_issues: number
  warnings: number
  passed: number
  last_audit_at: string
  created_at: string
  updated_at: string
}

// Lead/Prospecção types
export type LeadStatus = "pendente" | "processando" | "enriquecido" | "erro"

export interface LeadRedeSocial {
  rede: string
  url: string
  seguidores?: number
}

export interface LeadCanalVenda {
  canal: string
  url?: string
}

export interface LeadMarketplace {
  presente: boolean
  lojas: Array<{
    nome: string
    url: string
  }>
}

export interface LeadDiretor {
  nome: string
  cargo?: string
  qualificacao?: string  // Qualificação do sócio (ex: "Sócio-Administrador")
  linkedin?: string
  email?: string
  telefone?: string
}

export interface LeadContatoSite {
  emails: string[]
  telefones: string[]
  whatsapp?: string
  endereco_completo?: string
}

export interface LeadCNAESecundario {
  codigo: string
  descricao: string
}

export interface Lead {
  id: string
  cnpj: string
  razao_social: string | null
  nome_fantasia: string | null
  
  // CNAE - Atividade Econômica
  cnae_codigo: string | null
  cnae_descricao: string | null
  cnaes_secundarios: LeadCNAESecundario[] | null
  
  // Dados enriquecidos
  site: string | null
  site_tipo: string | null  // 'institucional' | 'ecommerce' | 'blog' | 'landing_page'
  site_ecommerce: string | null  // Site de e-commerce (se diferente do institucional)
  site_blog: string | null  // Blog da empresa (se encontrado)
  plataforma: string | null
  plataforma_ecommerce: string | null  // Plataforma do e-commerce
  segmento: string | null
  classificacao: string | null
  atuacao: string | null
  modelo_negocio: string | null
  tempo_mercado: string | null
  capital_social: string | null
  
  // Localização
  endereco_cidade: string | null
  endereco_estado: string | null
  endereco_pais: string | null
  endereco_cep: string | null
  endereco_logradouro: string | null
  endereco_numero: string | null
  endereco_bairro: string | null
  endereco_complemento: string | null
  
  // Canais e presença digital
  canais_vendas: LeadCanalVenda[]
  redes_sociais: LeadRedeSocial[]
  marketplace: LeadMarketplace | null
  
  // Marketing
  campanhas_google: number | null
  campanhas_meta: number | null
  
  // Contatos/Diretores (da Receita Federal)
  diretores: LeadDiretor[]
  
  // Contatos extraídos do site (scraping)
  contatos_site: LeadContatoSite | null
  
  // Análise
  possiveis_dores: string[] | null
  resumo: string | null
  
  // Metadados
  status: LeadStatus
  enrichment_progress: number
  last_enriched_at: string | null
  enrichment_error: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface LeadEnrichmentLog {
  id: string
  lead_id: string
  source: string
  data_found: Record<string, unknown>
  tokens_used: number | null
  created_at: string
}
