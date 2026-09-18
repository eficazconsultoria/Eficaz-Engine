import type { UserRole } from "./types"

// Feature keys that match database agent_prompts
export type FeatureKey =
  | "product_image_variations"
  | "creatives"
  | "marketing_videos"
  | "post_texts"
  | "site_banners"
  | "whatsapp_dispatcher"
  | "seo_texts"
  | "my_account"
  | "user_management"
  | "client_management"
  | "lead_prospecting"

// Role permissions for each feature
export const FEATURE_PERMISSIONS: Record<FeatureKey, UserRole[]> = {
  product_image_variations: ["admin", "performance", "marketing", "projetos", "sucesso", "redacao", "comercial"],
  creatives: ["admin", "marketing", "design"],
  marketing_videos: ["admin", "marketing", "redacao", "design"],
  post_texts: ["admin", "redacao", "marketing", "seo"],
  site_banners: ["admin", "projetos", "design"],
  whatsapp_dispatcher: ["admin", "comercial"],
  seo_texts: ["admin", "seo", "marketing", "redacao"],
  my_account: ["admin", "performance", "marketing", "projetos", "sucesso", "redacao", "comercial", "design", "seo"],
  user_management: ["admin"],
  client_management: ["admin", "seo", "marketing", "projetos"],
  lead_prospecting: ["admin", "comercial", "marketing"],
}

// Feature display names
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  product_image_variations: "Variações de Imagens",
  creatives: "Criativos",
  marketing_videos: "Vídeos de Marketing",
  post_texts: "Textos para Posts",
  site_banners: "Banners para Site",
  whatsapp_dispatcher: "Disparador WhatsApp",
  seo_texts: "Textos SEO",
  my_account: "Minha Conta",
  user_management: "Gerenciar Usuários",
  client_management: "Clientes",
  lead_prospecting: "Prospecção",
}

// Role display names
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  performance: "Performance",
  marketing: "Marketing",
  projetos: "Projetos",
  sucesso: "Sucesso do Cliente",
  redacao: "Redação",
  comercial: "Comercial",
  design: "Design",
  seo: "SEO",
  cliente: "Cliente",
}

// User class display names
export const USER_CLASS_LABELS: Record<string, string> = {
  internal: "Interno",
  client: "Cliente",
}

// Check if user is a client user (external)
export function isClientUser(role: UserRole): boolean {
  return role === "cliente"
}

// Check if a role has access to a feature
export function hasAccess(role: UserRole, feature: FeatureKey): boolean {
  return FEATURE_PERMISSIONS[feature].includes(role)
}

// Get all features a role has access to
export function getAccessibleFeatures(role: UserRole): FeatureKey[] {
  return (Object.keys(FEATURE_PERMISSIONS) as FeatureKey[]).filter((feature) => hasAccess(role, feature))
}

// Check if user is admin
export function isAdmin(role: UserRole): boolean {
  return role === "admin"
}

// Check if user can manage/test prompts (admin, seo, or marketing)
export function canManagePrompts(role: UserRole): boolean {
  return role === "admin" || role === "seo" || role === "marketing"
}
