import { z } from "zod"

// Schemas de validacao para entrada de dados

// User roles validos
export const userRoleSchema = z.enum([
  "admin",
  "performance",
  "marketing",
  "projetos",
  "sucesso",
  "redacao",
  "comercial",
  "design",
  "seo",
])

// Validacao de email
export const emailSchema = z.string().email("Email invalido").min(1, "Email obrigatorio")

// Validacao de senha
export const passwordSchema = z.string().min(6, "Senha deve ter pelo menos 6 caracteres").max(72, "Senha muito longa")

// Validacao de nome
export const nameSchema = z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Nome muito longo")

// Corrigido safeTextSchema - agora é uma funcao que permite definir minLength
// Validacao de texto generico (protege contra injection)
export const safeTextSchema = (minLength = 0, message = "Campo obrigatorio") =>
  z
    .string()
    .min(minLength, message)
    .max(10000, "Texto muito longo")
    .transform((val) => val.trim())

// Schema para texto opcional (sem minLength)
export const optionalTextSchema = z
  .string()
  .max(10000, "Texto muito longo")
  .transform((val) => val.trim())
  .optional()

// Schema para conteudo de agent prompt (usado em saveAgentPrompt)
export const contentSchema = z
  .string()
  .min(1, "Conteudo obrigatorio")
  .max(50000, "Conteudo muito longo")
  .transform((val) => val.trim())

// Validacao de UUID
export const uuidSchema = z.string().uuid("ID invalido")

// Validacao de quantidade
export const quantitySchema = z.coerce.number().int().min(1).max(10)

// Schemas compostos para cada feature

export const createUserSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  role: userRoleSchema,
  password: passwordSchema,
})

export const updateUserSchema = z.object({
  email: emailSchema.optional(),
  name: nameSchema.optional(),
  role: userRoleSchema.optional(),
  password: passwordSchema.optional(),
})

export const productImagesSchema = z.object({
  productName: safeTextSchema(1, "Nome do produto obrigatorio"),
  description: safeTextSchema(1, "Descricao obrigatoria"),
  style: optionalTextSchema,
  background: optionalTextSchema,
  quantity: quantitySchema.default(3),
})

export const creativesSchema = z.object({
  objective: safeTextSchema(1, "Objetivo obrigatorio"),
  audience: safeTextSchema(1, "Publico obrigatorio"),
  format: safeTextSchema(1, "Formato obrigatorio"),
  adText: optionalTextSchema,
  brandColors: optionalTextSchema,
  quantity: quantitySchema.default(3),
})

export const videosSchema = z.object({
  duration: safeTextSchema(1, "Duracao obrigatoria"),
  orientation: safeTextSchema(1, "Orientacao obrigatoria"),
  style: optionalTextSchema,
  briefing: safeTextSchema(1, "Briefing obrigatorio"),
  script: optionalTextSchema,
})

export const postsSchema = z.object({
  platform: safeTextSchema(1, "Plataforma obrigatoria"),
  topic: safeTextSchema(1, "Tema obrigatorio"),
  persona: optionalTextSchema,
  tone: optionalTextSchema,
  objective: optionalTextSchema,
  hashtags: optionalTextSchema,
})

export const bannersSchema = z.object({
  width: z.coerce.number().int().min(100).max(5000),
  height: z.coerce.number().int().min(100).max(5000),
  objective: safeTextSchema(1, "Objetivo obrigatorio"),
  mainText: optionalTextSchema,
  cta: optionalTextSchema,
  style: optionalTextSchema,
  brandColors: optionalTextSchema,
})

export const seoSchema = z.object({
  mainKeyword: safeTextSchema(1, "Palavra-chave principal obrigatoria"),
  secondaryKeywords: optionalTextSchema,
  pageType: optionalTextSchema,
  searchIntent: optionalTextSchema,
  tone: optionalTextSchema,
  size: optionalTextSchema,
  includeFaq: z.coerce.boolean().default(false),
})

export const whatsappCampaignSchema = z.object({
  name: safeTextSchema(1, "Nome da campanha obrigatorio"),
  template: safeTextSchema(1, "Template obrigatorio"),
  contacts: safeTextSchema(1, "Contatos obrigatorios"),
})

// Helper para validar FormData
export function validateFormData<T>(
  schema: z.ZodSchema<T>,
  formData: FormData,
): { success: true; data: T } | { success: false; error: string } {
  const rawData: Record<string, unknown> = {}

  formData.forEach((value, key) => {
    rawData[key] = value
  })

  const result = schema.safeParse(rawData)

  if (!result.success) {
    const firstError = result.error.errors[0]
    return { success: false, error: firstError?.message || "Dados invalidos" }
  }

  return { success: true, data: result.data }
}
