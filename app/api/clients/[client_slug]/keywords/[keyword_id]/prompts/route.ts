import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateObjectWithFallback } from "@/lib/services/ai"
import { z } from "zod"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ client_slug: string; keyword_id: string }> }
) {
  const { client_slug, keyword_id } = await params
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

  // Get keyword
  const { data: keyword, error: keywordError } = await supabase
    .from("client_keywords")
    .select("*")
    .eq("id", keyword_id)
    .eq("client_id", client.id)
    .single()

  if (keywordError || !keyword) {
    return NextResponse.json({ error: "Palavra-chave nao encontrada" }, { status: 404 })
  }

  // Generate suggested prompts using AI
  const prompt = `Voce e um especialista em comportamento do consumidor e SEO.

CONTEXTO:
- Empresa: ${client.name}
- Site: ${client.site || "Nao informado"}
- Segmento: ${client.segment}
- Tipo: ${client.type === "ecommerce" ? "E-commerce" : "Geracao de Leads"}
- Foco: ${client.focus}
- Publico-alvo: ${client.target_audience || "Nao especificado"}

PALAVRA-CHAVE ANALISADA: "${keyword.keyword}"
- Volume de busca: ${keyword.search_volume}
- Tendencia: ${keyword.trend}

TAREFA:
Gere EXATAMENTE 5 prompts/perguntas que usuarios reais fariam a uma IA (ChatGPT, Perplexity, etc) relacionados a esta palavra-chave.

Os prompts devem:
1. Ser perguntas REAIS que consumidores fariam
2. Variar entre diferentes intencoes:
   - Informacional: "O que e...", "Como funciona..."
   - Comparacao: "Qual a diferenca entre...", "X ou Y, qual melhor..."
   - Compra: "Onde comprar...", "Melhor preco de..."
   - Avaliacao: "Vale a pena...", "X e confiavel..."
   - Local: "Onde encontrar... em [cidade]"
3. Ser especificos para o mercado brasileiro
4. Ter potencial de mencionar a empresa ${client.name}

Para cada prompt, indique:
- O prompt em si (como o usuario digitaria)
- A intencao por tras da busca
- Relevancia (1-10) para a empresa`

  try {
    const { object: result } = await generateObjectWithFallback({
        schema: z.object({
        prompts: z.array(z.object({
          prompt: z.string().describe("O prompt/pergunta que o usuario faria"),
          intent: z.string().describe("A intencao do usuario (informacional, comparacao, compra, etc)"),
          relevance: z.number().min(1).max(10).describe("Relevancia para a empresa (1-10)")
        }))
      }),
      prompt,
    })

    // Limit to max 5 prompts and sort by relevance
    const limitedPrompts = result.prompts
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5)

    // Update keyword with suggested prompts
    const { error: updateError } = await supabase
      .from("client_keywords")
      .update({
        suggested_prompts: limitedPrompts,
        updated_at: new Date().toISOString()
      })
      .eq("id", keyword_id)

    if (updateError) {
      console.error("Error updating keyword:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      prompts: limitedPrompts,
      message: `${limitedPrompts.length} prompts sugeridos gerados com sucesso`
    })

  } catch (error) {
    console.error("Error generating prompts:", error)
    return NextResponse.json({ 
      error: "Erro ao gerar prompts sugeridos" 
    }, { status: 500 })
  }
}
