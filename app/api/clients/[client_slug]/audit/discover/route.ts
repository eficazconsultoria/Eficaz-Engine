import { createClient } from "@/lib/supabase/server"
import { generateObjectWithFallback } from "@/lib/services/ai"
import { z } from "zod"
import { NextResponse } from "next/server"

const pagesSchema = z.object({
  pages: z.array(z.object({
    url: z.string(),
    title: z.string(),
    type: z.string(), // homepage, product, category, blog, about, contact, etc
    priority: z.enum(["alta", "media", "baixa"]),
  }))
})

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

  const discoverPrompt = `Voce e um especialista em SEO e arquitetura de sites.

Site: ${client.site}
Segmento: ${client.segment}
Tipo: ${client.type}
Nome: ${client.name}

TAREFA: Liste as PRINCIPAIS PAGINAS que este site PROVAVELMENTE possui, baseado no segmento e tipo.

Para um site ${client.type === "ecommerce" ? "e-commerce" : "de geração de leads"} do segmento ${client.segment}, liste:

1. Homepage (sempre incluir)
2. Paginas de categoria/servicos principais
3. Paginas de produto/servico mais importantes (se ecommerce)
4. Blog/conteudo (se existir)
5. Sobre/institucional
6. Contato
7. FAQ/Ajuda
8. Politicas (privacidade, termos)

REGRAS:
- Liste de 8 a 15 paginas
- Use URLs realistas baseadas no dominio ${client.site}
- Priorize paginas mais importantes para SEO e conversao
- Cada pagina deve ter: url, title, type, priority (alta/media/baixa)
- Paginas de alta prioridade: homepage, categorias principais, landing pages
- Paginas de media prioridade: produtos, blog posts importantes, sobre
- Paginas de baixa prioridade: politicas, termos, paginas secundarias`

  try {
    const { object: result } = await generateObjectWithFallback({
        schema: pagesSchema,
      prompt: discoverPrompt,
    })

    return NextResponse.json({ 
      pages: result.pages,
      site: client.site
    })
  } catch (error) {
    console.error("Error discovering pages:", error)
    return NextResponse.json({ error: "Erro ao descobrir páginas" }, { status: 500 })
  }
}
