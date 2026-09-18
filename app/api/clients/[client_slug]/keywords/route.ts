import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateObjectWithFallback } from "@/lib/services/ai"
import { generateObject } from "ai"
import { z } from "zod"

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
    return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 })
  }

  // Get keywords for this client
  const { data: keywords, error } = await supabase
    .from("client_keywords")
    .select("*")
    .eq("client_id", client.id)
    .order("search_volume", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ keywords, client })
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
    return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 })
  }

  // Generate keywords using AI
  const prompt = `Voce e um especialista em SEO e marketing digital analisando o mercado para a empresa "${client.name}".

CONTEXTO:
- Empresa: ${client.name}
- Site: ${client.site || "Nao informado"}
- Segmento: ${client.segment}
- Tipo: ${client.type === "ecommerce" ? "E-commerce" : "Geracao de Leads"}
- Foco: ${client.focus}
- Publico-alvo: ${client.target_audience || "Nao especificado"}

TAREFA:
Analise o mercado e sugira 15-20 palavras-chave estrategicas que:
1. Sao relevantes para o negocio e segmento
2. Tem potencial de busca no Brasil
3. Incluem uma mistura de:
   - Keywords de marca/empresa
   - Keywords de produto/servico
   - Keywords de problema/solucao
   - Keywords de comparacao/alternativas
   - Keywords locais (se aplicavel)

Para cada keyword, avalie:
- Volume de busca: muito_alto (>100k/mes), alto (10k-100k), medio (1k-10k), baixo (<1k)
- Tendencia: crescimento, estavel, queda

IMPORTANTE: Base suas estimativas em dados realistas do mercado brasileiro.`

  try {
    const { object: result } = await generateObjectWithFallback({
        schema: z.object({
        keywords: z.array(z.object({
          keyword: z.string().describe("A palavra-chave sugerida"),
          search_volume: z.enum(["muito_alto", "alto", "medio", "baixo"]).describe("Volume de busca estimado"),
          trend: z.enum(["crescimento", "estavel", "queda"]).describe("Tendencia da keyword"),
          reasoning: z.string().describe("Breve justificativa para a sugestao")
        }))
      }),
      prompt,
    })

    // Get existing keywords to preserve previous values
    const { data: existingKeywords } = await supabase
      .from("client_keywords")
      .select("keyword, search_volume, trend")
      .eq("client_id", client.id)

    const existingMap = new Map(
      (existingKeywords || []).map(k => [k.keyword.toLowerCase(), k])
    )

    // Upsert keywords
    const keywordsToUpsert = result.keywords.map(k => {
      const existing = existingMap.get(k.keyword.toLowerCase())
      return {
        client_id: client.id,
        keyword: k.keyword,
        search_volume: k.search_volume,
        trend: k.trend,
        previous_volume: existing?.search_volume || null,
        previous_trend: existing?.trend || null,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    })

    const { data: upsertedKeywords, error: upsertError } = await supabase
      .from("client_keywords")
      .upsert(keywordsToUpsert, { 
        onConflict: "client_id,keyword",
        ignoreDuplicates: false 
      })
      .select()

    if (upsertError) {
      console.error("Error upserting keywords:", upsertError)
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    // Return all keywords
    const { data: allKeywords } = await supabase
      .from("client_keywords")
      .select("*")
      .eq("client_id", client.id)
      .order("search_volume", { ascending: false })
      .order("created_at", { ascending: false })

    return NextResponse.json({ 
      keywords: allKeywords,
      generated: result.keywords.length,
      message: `${result.keywords.length} palavras-chave geradas/atualizadas com sucesso`
    })

  } catch (error) {
    console.error("Error generating keywords:", error)
    return NextResponse.json({ 
      error: "Erro ao gerar palavras-chave" 
    }, { status: 500 })
  }
}
