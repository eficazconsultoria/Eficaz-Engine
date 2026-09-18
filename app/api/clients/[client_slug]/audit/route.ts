import { createClient } from "@/lib/supabase/server"
import { generateObject } from "ai"
import { gateway } from "@ai-sdk/gateway"
import { z } from "zod"
import { NextResponse } from "next/server"

const auditItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(["passed", "warning", "error"]),
  priority: z.enum(["critico", "alto", "medio", "baixo"]),
  recommendation: z.string().optional(),
  current_value: z.string().optional(),
  expected_value: z.string().optional(),
})

const auditResultSchema = z.object({
  page_title: z.string(),
  page_type: z.string(),
  seo_audit: z.object({
    title_tag: auditItemSchema,
    meta_description: auditItemSchema,
    h1_tag: auditItemSchema,
    heading_structure: auditItemSchema,
    canonical_url: auditItemSchema,
    robots_meta: auditItemSchema,
    sitemap: auditItemSchema,
    page_speed: auditItemSchema,
    mobile_friendly: auditItemSchema,
    https: auditItemSchema,
    structured_data: auditItemSchema,
    internal_links: auditItemSchema,
    image_alt: auditItemSchema,
    url_structure: auditItemSchema,
  }),
  content_audit: z.object({
    content_length: auditItemSchema,
    keyword_usage: auditItemSchema,
    readability: auditItemSchema,
    uniqueness: auditItemSchema,
    media_usage: auditItemSchema,
    content_freshness: auditItemSchema,
    cta_presence: auditItemSchema,
    content_structure: auditItemSchema,
  }),
  aeo_audit: z.object({
    ai_crawlability: auditItemSchema,
    structured_answers: auditItemSchema,
    faq_schema: auditItemSchema,
    conversational_content: auditItemSchema,
    entity_clarity: auditItemSchema,
    source_authority: auditItemSchema,
    content_depth: auditItemSchema,
    llm_friendly_format: auditItemSchema,
  }),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ client_slug: string }> }
) {
  const { client_slug } = await params
  const supabase = await createClient()

  // Get client
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("slug", client_slug)
    .single()

  if (clientError || !client) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
  }

  // Get audits
  const { data: audits, error } = await supabase
    .from("site_audits")
    .select("*")
    .eq("client_id", client.id)
    .order("priority", { ascending: true })
    .order("overall_score", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ audits, client })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ client_slug: string }> }
) {
  const { client_slug } = await params
  const supabase = await createClient()

  // Get client
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("slug", client_slug)
    .single()

  if (clientError || !client) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
  }

  if (!client.site) {
    return NextResponse.json({ error: "Cliente não tem site cadastrado" }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const pagesToAudit = body.pages || [client.site]

  const results = []

  for (const pageUrl of pagesToAudit.slice(0, 10)) { // Max 10 pages
    try {
      const auditPrompt = `Voce e um especialista em SEO, Conteudo e AEO (Answer Engine Optimization).

Analise a pagina: ${pageUrl}
Site da empresa: ${client.site}
Segmento: ${client.segment}
Tipo: ${client.type}

TAREFA: Realize uma auditoria COMPLETA e REALISTA da pagina, avaliando:

=== SEO TECNICO ===
1. title_tag: Tag title (60 caracteres ideal, contem keyword principal?)
2. meta_description: Meta description (155 caracteres ideal, call-to-action?)
3. h1_tag: H1 unico e relevante?
4. heading_structure: Hierarquia H1>H2>H3 correta?
5. canonical_url: URL canonica definida?
6. robots_meta: Robots meta tag correta?
7. sitemap: Pagina no sitemap?
8. page_speed: Velocidade de carregamento
9. mobile_friendly: Mobile responsivo?
10. https: SSL/HTTPS ativo?
11. structured_data: Schema markup presente?
12. internal_links: Links internos adequados?
13. image_alt: Imagens com alt text?
14. url_structure: URL amigavel e semantica?

=== QUALIDADE DE CONTEUDO ===
1. content_length: Tamanho adequado (min 300 palavras)
2. keyword_usage: Uso natural de keywords
3. readability: Legibilidade (Flesch score)
4. uniqueness: Conteudo original?
5. media_usage: Imagens/videos de qualidade?
6. content_freshness: Conteudo atualizado?
7. cta_presence: CTAs claros?
8. content_structure: Estrutura logica?

=== AEO (Otimizacao para IA) ===
1. ai_crawlability: IA consegue extrair informacoes facilmente?
2. structured_answers: Respostas estruturadas para perguntas comuns?
3. faq_schema: FAQ Schema implementado?
4. conversational_content: Conteudo em formato conversacional?
5. entity_clarity: Entidades (empresa, produtos) bem definidas?
6. source_authority: Sinais de autoridade (autor, fontes)?
7. content_depth: Profundidade do conteudo?
8. llm_friendly_format: Formato amigavel para LLMs?

REGRAS:
- Cada item deve ter: id, title, description, status (passed/warning/error), priority (critico/alto/medio/baixo)
- Inclua recommendation para items com warning ou error
- current_value: valor atual encontrado
- expected_value: valor ideal esperado
- Seja REALISTA - base sua analise no que uma pagina desse segmento normalmente tem
- Se nao conseguir verificar algo, use warning com descricao explicando`

      const { object: auditResult } = await generateObject({
        model: gateway("openai/gpt-4o-mini"),
        schema: auditResultSchema,
        prompt: auditPrompt,
      })

      // Calculate scores
      const countItems = (audit: Record<string, { status: string; priority: string }>) => {
        let passed = 0, warnings = 0, errors = 0, criticalErrors = 0
        let totalWeight = 0, weightedScore = 0
        
        const priorityWeights = { critico: 4, alto: 3, medio: 2, baixo: 1 }
        
        Object.values(audit).forEach(item => {
          const weight = priorityWeights[item.priority as keyof typeof priorityWeights] || 1
          totalWeight += weight
          
          if (item.status === "passed") {
            passed++
            weightedScore += weight * 100
          } else if (item.status === "warning") {
            warnings++
            weightedScore += weight * 50
          } else {
            errors++
            if (item.priority === "critico") criticalErrors++
            weightedScore += weight * 0
          }
        })
        
        return {
          passed,
          warnings,
          errors,
          criticalErrors,
          score: totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0
        }
      }

      const seoStats = countItems(auditResult.seo_audit)
      const contentStats = countItems(auditResult.content_audit)
      const aeoStats = countItems(auditResult.aeo_audit)

      const overallScore = Math.round((seoStats.score + contentStats.score + aeoStats.score) / 3)
      const totalCritical = seoStats.criticalErrors + contentStats.criticalErrors + aeoStats.criticalErrors
      const totalWarnings = seoStats.warnings + contentStats.warnings + aeoStats.warnings
      const totalPassed = seoStats.passed + contentStats.passed + aeoStats.passed
      const totalIssues = (seoStats.errors + contentStats.errors + aeoStats.errors) + totalWarnings

      // Determine priority based on critical issues and score
      let priority: "critico" | "alto" | "medio" | "baixo" = "baixo"
      if (totalCritical > 3 || overallScore < 30) priority = "critico"
      else if (totalCritical > 0 || overallScore < 50) priority = "alto"
      else if (overallScore < 70) priority = "medio"

      // Upsert audit result
      const { data: audit, error: upsertError } = await supabase
        .from("site_audits")
        .upsert({
          client_id: client.id,
          page_url: pageUrl,
          page_title: auditResult.page_title,
          page_type: auditResult.page_type,
          overall_score: overallScore,
          seo_score: seoStats.score,
          content_score: contentStats.score,
          aeo_score: aeoStats.score,
          priority,
          status: "pendente",
          seo_audit: auditResult.seo_audit,
          content_audit: auditResult.content_audit,
          aeo_audit: auditResult.aeo_audit,
          issues_count: totalIssues,
          critical_issues: totalCritical,
          warnings: totalWarnings,
          passed: totalPassed,
          last_audit_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "client_id,page_url",
        })
        .select()
        .single()

      if (upsertError) {
        console.error("Error upserting audit:", upsertError)
      } else {
        results.push(audit)
      }
    } catch (err) {
      console.error(`Error auditing ${pageUrl}:`, err)
    }
  }

  return NextResponse.json({ 
    audits: results,
    message: `${results.length} página(s) auditada(s) com sucesso`
  })
}
