import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { gateway } from "@ai-sdk/gateway"
import { z } from "zod"

const contentIdeaSchema = z.object({
  title: z.string().describe("Titulo do conteudo"),
  keyword: z.string().describe("Palavra-chave principal"),
  reason: z.string().describe("Por que esse conteudo ajuda a melhorar o prompt")
})

const contentIdeasSchema = z.object({
  blog: z.array(contentIdeaSchema).length(5).describe("5 ideias para blog posts"),
  instagram: z.array(contentIdeaSchema).length(5).describe("5 ideias para Instagram"),
  linkedin: z.array(contentIdeaSchema).length(5).describe("5 ideias para LinkedIn"),
  twitter: z.array(contentIdeaSchema).length(5).describe("5 ideias para Twitter/X"),
  facebook: z.array(contentIdeaSchema).length(5).describe("5 ideias para Facebook")
})

// GET - Fetch existing content ideas
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ client_slug: string; prompt_id: string }> }
) {
  try {
    const { prompt_id } = await params
    const supabase = await createClient()

    // Check if ideas already exist for this prompt
    const { data: existingIdeas, error } = await supabase
      .from("prompt_content_ideas")
      .select("*")
      .eq("prompt_id", prompt_id)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found, which is fine
      throw error
    }

    if (existingIdeas) {
      return NextResponse.json({
        success: true,
        exists: true,
        ideas: {
          blog: existingIdeas.blog_ideas,
          instagram: existingIdeas.instagram_ideas,
          linkedin: existingIdeas.linkedin_ideas,
          twitter: existingIdeas.twitter_ideas,
          facebook: existingIdeas.facebook_ideas,
        },
        generated_at: existingIdeas.generated_at
      })
    }

    return NextResponse.json({
      success: true,
      exists: false,
      ideas: null
    })

  } catch (error) {
    console.error("Error fetching content ideas:", error)
    return NextResponse.json(
      { error: "Erro ao buscar ideias de conteudo" },
      { status: 500 }
    )
  }
}

// POST - Generate new content ideas and save to database
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ client_slug: string; prompt_id: string }> }
) {
  try {
    const { client_slug, prompt_id } = await params
    const supabase = await createClient()

    // Get client info
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name, segment, site")
      .eq("slug", client_slug)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 })
    }

    // Get prompt info
    const { data: prompt, error: promptError } = await supabase
      .from("client_ai_prompts")
      .select("*")
      .eq("id", prompt_id)
      .eq("client_id", client.id)
      .single()

    if (promptError || !prompt) {
      return NextResponse.json({ error: "Prompt nao encontrado" }, { status: 404 })
    }

    // Generate content ideas with AI
    const aiPrompt = `Voce e um especialista em marketing de conteudo e SEO para o segmento "${client.segment}".

CONTEXTO:
- Empresa: ${client.name}
- Site: ${client.site || "Nao informado"}
- Segmento: ${client.segment}

PROMPT DE BUSCA DO USUARIO:
"${prompt.prompt}"

TAREFA:
Gere ideias de conteudo que ajudariam a empresa ${client.name} a aparecer melhor quando usuarios fazem essa busca em IAs como ChatGPT, Claude ou Perplexity.

O objetivo e criar conteudos que:
1. Posicionem a empresa como autoridade no assunto
2. Respondam diretamente a intencao por tras do prompt
3. Gerem citacoes e referencias que IAs possam usar
4. Aumentem a visibilidade organica da marca

Para cada plataforma, gere 5 ideias com:
- Titulo atrativo e especifico
- Palavra-chave principal para SEO
- Explicacao de por que esse conteudo ajuda a melhorar a presenca no prompt

PLATAFORMAS:
- Blog: Conteudos longos e detalhados, otimizados para SEO
- Instagram: Carroseis, reels e posts visuais
- LinkedIn: Conteudo profissional e artigos de autoridade
- Twitter/X: Threads e posts curtos e impactantes
- Facebook: Posts para engajamento e comunidade`

    const { object } = await generateObject({
      model: gateway("openai/gpt-4o-mini"),
      schema: contentIdeasSchema,
      prompt: aiPrompt,
    })

    // Save to database (upsert - update if exists, insert if not)
    const { error: upsertError } = await supabase
      .from("prompt_content_ideas")
      .upsert({
        prompt_id: prompt_id,
        blog_ideas: object.blog,
        instagram_ideas: object.instagram,
        linkedin_ideas: object.linkedin,
        twitter_ideas: object.twitter,
        facebook_ideas: object.facebook,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "prompt_id"
      })

    if (upsertError) {
      console.error("Error saving content ideas:", upsertError)
      // Still return the ideas even if save fails
    }

    return NextResponse.json({
      success: true,
      ideas: object,
      prompt: prompt.prompt,
      client: client.name,
      generated_at: new Date().toISOString()
    })

  } catch (error: any) {
    console.error("Error generating content ideas:", error)
    
    // Check for specific error types
    if (error?.statusCode === 402 || error?.message?.includes("Insufficient funds")) {
      return NextResponse.json(
        { error: "Creditos insuficientes na API de IA. Por favor, adicione creditos para continuar." },
        { status: 402 }
      )
    }
    
    if (error?.statusCode === 429 || error?.message?.includes("rate limit")) {
      return NextResponse.json(
        { error: "Limite de requisicoes excedido. Aguarde alguns segundos e tente novamente." },
        { status: 429 }
      )
    }
    
    return NextResponse.json(
      { error: "Erro ao gerar ideias de conteudo. Tente novamente." },
      { status: 500 }
    )
  }
}
