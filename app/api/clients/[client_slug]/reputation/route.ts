import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateObjectWithFallback } from "@/lib/services/ai"
import { z } from "zod"

const analysisItemSchema = z.object({
  aspect: z.string(),
  score: z.number().min(0).max(100),
  status: z.enum(["excellent", "good", "average", "poor"]),
  description: z.string(),
  evidence: z.array(z.string()),
})

const competitorSchema = z.object({
  name: z.string(),
  overall_score: z.number().min(0).max(100),
  branding: z.number().min(0).max(100),
  authority: z.number().min(0).max(100),
  comparison: z.string(),
})

const reputationSchema = z.object({
  overall_score: z.number().min(0).max(100),
  branding_score: z.number().min(0).max(100),
  authority_score: z.number().min(0).max(100),
  representativeness_score: z.number().min(0).max(100),
  relevance_score: z.number().min(0).max(100),
  
  branding_analysis: z.object({
    items: z.array(analysisItemSchema),
    summary: z.string(),
  }),
  authority_analysis: z.object({
    items: z.array(analysisItemSchema),
    summary: z.string(),
  }),
  representativeness_analysis: z.object({
    items: z.array(analysisItemSchema),
    summary: z.string(),
  }),
  relevance_analysis: z.object({
    items: z.array(analysisItemSchema),
    summary: z.string(),
  }),
  
  executive_summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  opportunities: z.array(z.string()),
  threats: z.array(z.string()),
  recommendations: z.array(z.object({
    title: z.string(),
    description: z.string(),
    priority: z.enum(["alta", "media", "baixa"]),
    impact: z.string(),
  })),
  
  competitors_analysis: z.array(competitorSchema),
})

// GET - Fetch existing reputation analysis
export async function GET(
  request: Request,
  { params }: { params: Promise<{ client_slug: string }> }
) {
  const { client_slug } = await params
  const supabase = await createClient()

  // Get client
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("slug", client_slug)
    .single()

  if (!client) {
    return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 })
  }

  // Get existing analysis
  const { data: reputation } = await supabase
    .from("brand_reputation")
    .select("*")
    .eq("client_id", client.id)
    .single()

  if (!reputation) {
    return NextResponse.json({ exists: false })
  }

  return NextResponse.json({ exists: true, reputation })
}

// POST - Generate new reputation analysis
export async function POST(
  request: Request,
  { params }: { params: Promise<{ client_slug: string }> }
) {
  const { client_slug } = await params
  const supabase = await createClient()

  // Get client with full info
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("slug", client_slug)
    .single()

  if (!client) {
    return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 })
  }

  // Get competitors
  const { data: competitors } = await supabase
    .from("client_competitors")
    .select("*")
    .eq("client_id", client.id)
    .limit(5)

  const competitorsList = competitors?.map(c => c.name).join(", ") || "Nao informados"

  try {
    const { object } = await generateObjectWithFallback({
        schema: reputationSchema,
      prompt: `Voce e um especialista em analise de reputacao de marcas e branding.

EMPRESA A SER ANALISADA:
- Nome: ${client.name}
- Site: ${client.site || "Nao informado"}
- Segmento: ${client.segment}
- Descricao: ${client.description || "Nao informado"}
- Concorrentes: ${competitorsList}

ANALISE COMPLETA DE REPUTACAO DA MARCA

Faca uma analise profunda e detalhada da reputacao desta marca, avaliando:

1. BRANDING (Identidade Visual e Posicionamento)
   - Consistencia da identidade visual
   - Clareza do posicionamento
   - Diferenciacao no mercado
   - Memorabilidade da marca
   - Tom de voz e comunicacao

2. AUTORIDADE (Credibilidade e Expertise)
   - Reconhecimento no setor
   - Presenca em midia especializada
   - Parcerias estrategicas
   - Premios e certificacoes
   - Historico e tradicao

3. REPRESENTATIVIDADE (Presenca e Alcance)
   - Presenca digital (site, redes sociais)
   - Presenca fisica (se aplicavel)
   - Alcance geografico
   - Diversidade de canais
   - Engajamento com publico

4. RELEVANCIA (Importancia no Mercado)
   - Share of voice no segmento
   - Inovacao e tendencias
   - Impacto no mercado
   - Conexao com publico-alvo
   - Valor percebido

ANALISE SWOT:
- Liste 3-5 pontos fortes
- Liste 3-5 pontos fracos
- Liste 3-5 oportunidades
- Liste 3-5 ameacas

RECOMENDACOES:
- Forneca 5-7 recomendacoes praticas com prioridade e impacto esperado

COMPARACAO COM CONCORRENTES:
- Compare brevemente com os principais concorrentes do segmento

Seja especifico e baseie-se em dados realistas do mercado brasileiro.`,
    })

    // Upsert reputation analysis
    const { data: reputation, error } = await supabase
      .from("brand_reputation")
      .upsert({
        client_id: client.id,
        overall_score: object.overall_score,
        branding_score: object.branding_score,
        authority_score: object.authority_score,
        representativeness_score: object.representativeness_score,
        relevance_score: object.relevance_score,
        branding_analysis: object.branding_analysis,
        authority_analysis: object.authority_analysis,
        representativeness_analysis: object.representativeness_analysis,
        relevance_analysis: object.relevance_analysis,
        executive_summary: object.executive_summary,
        strengths: object.strengths,
        weaknesses: object.weaknesses,
        opportunities: object.opportunities,
        threats: object.threats,
        recommendations: object.recommendations,
        competitors_analysis: object.competitors_analysis,
        last_analysis_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "client_id",
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ reputation })
  } catch (error: any) {
    console.error("Error generating reputation analysis:", error)
    
    if (error?.statusCode === 402 || error?.message?.includes("Insufficient funds")) {
      return NextResponse.json(
        { error: "Creditos insuficientes na API de IA." },
        { status: 402 }
      )
    }
    
    return NextResponse.json(
      { error: "Erro ao gerar analise de reputacao" },
      { status: 500 }
    )
  }
}
