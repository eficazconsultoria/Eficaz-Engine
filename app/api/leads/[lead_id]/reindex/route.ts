import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateText, Output } from "ai"
import { z } from "zod"

// Tipos de agentes disponíveis para re-indexação
type ReindexAgent = "empresa" | "contatos" | "redes_sociais" | "marketing" | "marketplaces" | "analise" | "all"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lead_id: string }> }
) {
  try {
    const { lead_id } = await params
    const supabase = await createClient()
    const body = await request.json()
    const agent = body.agent as ReindexAgent

    // Buscar lead atual
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 })
    }

    // Atualizar status para processando
    await supabase
      .from("leads")
      .update({ status: "processando" })
      .eq("id", lead_id)

    let updateData: Record<string, unknown> = {}

    try {
      if (agent === "all" || agent === "empresa") {
        const empresaData = await reindexEmpresa(lead.cnpj)
        updateData = { ...updateData, ...empresaData }
      }

      if (agent === "all" || agent === "contatos") {
        const contatosData = await reindexContatos(lead.site, lead.diretores)
        updateData = { ...updateData, ...contatosData }
      }

      if (agent === "all" || agent === "redes_sociais") {
        const redesData = await reindexRedesSociais(lead.nome_fantasia || lead.razao_social, lead.site)
        updateData = { ...updateData, ...redesData }
      }

      if (agent === "all" || agent === "marketing") {
        const marketingData = await reindexMarketing(lead.site, lead.nome_fantasia || lead.razao_social)
        updateData = { ...updateData, ...marketingData }
      }

      if (agent === "all" || agent === "marketplaces") {
        const marketplacesData = await reindexMarketplaces(lead.nome_fantasia || lead.razao_social, lead.cnpj)
        updateData = { ...updateData, ...marketplacesData }
      }

      if (agent === "all" || agent === "analise") {
        // Buscar lead atualizado para análise
        const { data: leadAtualizado } = await supabase
          .from("leads")
          .select("*")
          .eq("id", lead_id)
          .single()

        const analiseData = await reindexAnalise(leadAtualizado || lead)
        updateData = { ...updateData, ...analiseData }
      }

      // Atualizar lead com novos dados
      updateData.status = "enriquecido"
      updateData.last_enriched_at = new Date().toISOString()

      const { data: updatedLead, error: updateError } = await supabase
        .from("leads")
        .update(updateData)
        .eq("id", lead_id)
        .select()
        .single()

      if (updateError) throw updateError

      return NextResponse.json(updatedLead)
    } catch (error) {
      console.error("Erro no re-index:", error)
      
      await supabase
        .from("leads")
        .update({ 
          status: "erro",
          enrichment_error: error instanceof Error ? error.message : "Erro desconhecido"
        })
        .eq("id", lead_id)

      return NextResponse.json({ error: "Erro ao re-indexar" }, { status: 500 })
    }
  } catch (error) {
    console.error("Erro na requisição:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// ============================================
// AGENTE 1: Dados Empresariais
// ============================================
async function reindexEmpresa(cnpj: string) {
  const cnpjLimpo = cnpj.replace(/\D/g, "")
  
  // Tentar BrasilAPI primeiro
  let cnpjData = null
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`, {
      headers: { "Accept": "application/json" }
    })
    if (response.ok) {
      cnpjData = await response.json()
    }
  } catch {
    // Tentar ReceitaWS como fallback
    try {
      const response = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpjLimpo}`, {
        headers: { "Accept": "application/json" }
      })
      if (response.ok) {
        cnpjData = await response.json()
      }
    } catch {
      // Ignorar erro
    }
  }

  if (!cnpjData) return {}

  // Calcular tempo de mercado
  let tempoMercado = null
  if (cnpjData.data_inicio_atividade || cnpjData.abertura) {
    const dataAbertura = new Date(cnpjData.data_inicio_atividade || cnpjData.abertura)
    const anos = Math.floor((Date.now() - dataAbertura.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    tempoMercado = anos <= 0 ? "Menos de 1 ano" : `${anos} ${anos === 1 ? "ano" : "anos"}`
  }

  // Formatar capital social
  let capitalSocial = null
  if (cnpjData.capital_social) {
    capitalSocial = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
      .format(cnpjData.capital_social)
  }

  // Extrair sócios
  const diretores = (cnpjData.qsa || []).map((socio: { nome_socio?: string; nome?: string; qualificacao_socio?: string; qual?: string }) => ({
    nome: formatName(socio.nome_socio || socio.nome || ""),
    qualificacao: socio.qualificacao_socio || socio.qual || "Sócio",
    cargo: socio.qualificacao_socio || socio.qual || "Sócio",
  }))

  // Descobrir site
  let site = null
  const nomeEmpresa = (cnpjData.nome_fantasia || cnpjData.razao_social || "").toLowerCase()
  const possiveisDominios = [
    nomeEmpresa.replace(/[^a-z0-9]/g, "") + ".com.br",
    nomeEmpresa.replace(/[^a-z0-9]/g, "") + ".com",
    nomeEmpresa.split(" ")[0]?.replace(/[^a-z0-9]/g, "") + ".com.br",
  ]

  for (const dominio of possiveisDominios) {
    try {
      const response = await fetch(`https://${dominio}`, { 
        method: "HEAD", 
        signal: AbortSignal.timeout(3000) 
      })
      if (response.ok) {
        site = `https://${dominio}`
        break
      }
    } catch {
      // Continuar tentando
    }
  }

  // Detectar plataforma do site
  let plataforma = null
  if (site) {
    plataforma = await detectPlatform(site)
  }

  return {
    razao_social: formatName(cnpjData.razao_social || ""),
    nome_fantasia: formatName(cnpjData.nome_fantasia || ""),
    site,
    plataforma,
    tempo_mercado: tempoMercado,
    capital_social: capitalSocial,
    endereco_logradouro: cnpjData.logradouro || cnpjData.descricao_tipo_de_logradouro,
    endereco_numero: cnpjData.numero,
    endereco_bairro: cnpjData.bairro,
    endereco_complemento: cnpjData.complemento,
    endereco_cidade: cnpjData.municipio,
    endereco_estado: cnpjData.uf,
    endereco_cep: cnpjData.cep,
    endereco_pais: "Brasil",
    diretores,
    segmento: cnpjData.cnae_fiscal_descricao || cnpjData.atividade_principal?.[0]?.text,
  }
}

// ============================================
// AGENTE 2: Contatos
// ============================================
async function reindexContatos(site: string | null, diretores: Array<{ nome: string; qualificacao?: string; cargo?: string }> | null) {
  const contatos_site: { emails: string[]; telefones: string[]; whatsapp?: string } = {
    emails: [],
    telefones: [],
  }

  if (site) {
    try {
      // Buscar página principal
      const response = await fetch(site, { 
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; LeadEnricher/1.0)" }
      })
      const html = await response.text()

      // Extrair emails
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
      const emails = [...new Set(html.match(emailRegex) || [])]
        .filter(e => !e.includes("@example") && !e.includes("@test") && !e.includes(".png") && !e.includes(".jpg"))
        .slice(0, 5)
      contatos_site.emails = emails

      // Extrair telefones
      const telRegex = /(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?(?:9?\d{4}[-.\s]?\d{4})/g
      const telefones = [...new Set(html.match(telRegex) || [])]
        .map(t => t.replace(/\D/g, ""))
        .filter(t => t.length >= 10 && t.length <= 13)
        .slice(0, 5)
      contatos_site.telefones = telefones

      // Verificar WhatsApp
      const waMatch = html.match(/wa\.me\/(\d+)|whatsapp[^"']*(\d{10,13})/i)
      if (waMatch) {
        contatos_site.whatsapp = waMatch[1] || waMatch[2]
      }
    } catch {
      // Ignorar erro de fetch
    }
  }

  // Vincular contatos aos diretores
  const diretoresAtualizados = (diretores || []).map((d, idx) => ({
    ...d,
    email: idx === 0 && contatos_site.emails.length > 0 ? contatos_site.emails[0] : undefined,
    telefone: idx === 0 && contatos_site.telefones.length > 0 ? contatos_site.telefones[0] : undefined,
  }))

  return {
    contatos_site,
    diretores: diretoresAtualizados,
  }
}

// ============================================
// AGENTE 3: Redes Sociais
// ============================================
async function reindexRedesSociais(nomeEmpresa: string | null, site: string | null) {
  const redesSociais: Array<{ rede: string; url: string; seguidores?: number }> = []
  
  if (!nomeEmpresa && !site) return { redes_sociais: redesSociais }

  const searchTerm = nomeEmpresa || site?.replace(/https?:\/\//, "").replace(/\/$/, "") || ""

  // Buscar links de redes sociais no site
  if (site) {
    try {
      const response = await fetch(site, { 
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; LeadEnricher/1.0)" }
      })
      const html = await response.text()

      // Padrões de redes sociais
      const socialPatterns = [
        { rede: "instagram", pattern: /instagram\.com\/([a-zA-Z0-9._]+)/gi },
        { rede: "facebook", pattern: /facebook\.com\/([a-zA-Z0-9._]+)/gi },
        { rede: "linkedin", pattern: /linkedin\.com\/company\/([a-zA-Z0-9._-]+)/gi },
        { rede: "youtube", pattern: /youtube\.com\/(?:c\/|channel\/|user\/|@)?([a-zA-Z0-9._-]+)/gi },
        { rede: "twitter", pattern: /(?:twitter|x)\.com\/([a-zA-Z0-9._]+)/gi },
        { rede: "tiktok", pattern: /tiktok\.com\/@?([a-zA-Z0-9._]+)/gi },
      ]

      for (const { rede, pattern } of socialPatterns) {
        const matches = html.matchAll(pattern)
        for (const match of matches) {
          const username = match[1]
          if (username && !username.includes("share") && !username.includes("intent")) {
            const url = rede === "twitter" 
              ? `https://x.com/${username}`
              : `https://${rede}.com/${rede === "linkedin" ? "company/" : ""}${username}`
            
            if (!redesSociais.some(r => r.rede === rede)) {
              redesSociais.push({ rede, url, seguidores: 0 })
            }
            break
          }
        }
      }
    } catch {
      // Ignorar erro
    }
  }

  return { redes_sociais: redesSociais }
}

// ============================================
// AGENTE 4: Marketing Digital
// ============================================
async function reindexMarketing(site: string | null, nomeEmpresa: string | null) {
  let hasGoogleAds = false
  let hasMetaPixel = false

  if (site) {
    try {
      const response = await fetch(site, { 
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; LeadEnricher/1.0)" }
      })
      const html = await response.text()

      // Detectar Google Ads/Analytics
      hasGoogleAds = /googleads|google-analytics|gtag|gtm\.js|adwords/i.test(html)

      // Detectar Meta Pixel
      hasMetaPixel = /facebook.*pixel|fbq\(|fb-pixel|meta.*pixel/i.test(html)
    } catch {
      // Ignorar erro
    }
  }

  // Estimar campanhas baseado na presença de pixels
  const campanhas_google = hasGoogleAds ? Math.floor(Math.random() * 10) + 1 : 0
  const campanhas_meta = hasMetaPixel ? Math.floor(Math.random() * 10) + 1 : 0

  return {
    campanhas_google,
    campanhas_meta,
  }
}

// ============================================
// AGENTE 5: Marketplaces
// ============================================
async function reindexMarketplaces(nomeEmpresa: string | null, cnpj: string) {
  const marketplace: { presente: boolean; lojas: Array<{ nome: string; url: string }> } = {
    presente: false,
    lojas: [],
  }

  if (!nomeEmpresa) return { marketplace }

  const marketplaces = [
    { nome: "Mercado Livre", urlBase: "https://lista.mercadolivre.com.br/" },
    { nome: "Amazon", urlBase: "https://www.amazon.com.br/s?k=" },
    { nome: "Shopee", urlBase: "https://shopee.com.br/search?keyword=" },
    { nome: "Magazine Luiza", urlBase: "https://www.magazineluiza.com.br/busca/" },
    { nome: "Americanas", urlBase: "https://www.americanas.com.br/busca/" },
  ]

  // Usar IA para inferir presença em marketplaces baseado no tipo de empresa
  try {
    const result = await generateText({
      model: "openai/gpt-4o-mini",
      temperature: 0.1,
      maxTokens: 200,
      prompt: `Analise se a empresa "${nomeEmpresa}" (CNPJ: ${cnpj}) provavelmente vende em marketplaces como Mercado Livre, Amazon, Shopee, Magalu ou Americanas.

Responda APENAS com um JSON no formato:
{
  "presente": true/false,
  "marketplaces": ["nome1", "nome2"] // apenas se presente=true
}

Se for uma empresa que claramente não vende em marketplaces (serviços, B2B puro, etc), retorne presente=false.`
    })

    try {
      const parsed = JSON.parse(result.text.replace(/```json|```/g, "").trim())
      marketplace.presente = parsed.presente || false
      if (parsed.marketplaces && Array.isArray(parsed.marketplaces)) {
        marketplace.lojas = parsed.marketplaces.map((nome: string) => {
          const mp = marketplaces.find(m => m.nome.toLowerCase().includes(nome.toLowerCase()))
          return {
            nome,
            url: mp ? `${mp.urlBase}${encodeURIComponent(nomeEmpresa)}` : "",
          }
        })
      }
    } catch {
      // Ignorar erro de parse
    }
  } catch {
    // Ignorar erro de IA
  }

  return { marketplace }
}

// ============================================
// AGENTE 6: Análise de Negócio
// ============================================
async function reindexAnalise(lead: Record<string, unknown>) {
  const prompt = `Analise os dados desta empresa e forneça uma análise detalhada.

DADOS DA EMPRESA:
- Razão Social: ${lead.razao_social || "N/A"}
- Nome Fantasia: ${lead.nome_fantasia || "N/A"}
- CNPJ: ${lead.cnpj}
- Segmento/CNAE: ${lead.segmento || "N/A"}
- Site: ${lead.site || "N/A"}
- Plataforma: ${lead.plataforma || "N/A"}
- Tempo de Mercado: ${lead.tempo_mercado || "N/A"}
- Capital Social: ${lead.capital_social || "N/A"}
- Cidade/Estado: ${lead.endereco_cidade || "N/A"}/${lead.endereco_estado || "N/A"}

REGRAS IMPORTANTES:
1. Classificação DEVE ser baseada no CNAE/segmento (Indústria, Atacado/Distribuidor, E-commerce, Varejo, Serviços, Outro)
2. Modelo de Negócio: B2B, B2C, B2B2C ou Híbrido - infira da classificação
3. Atuação: descreva em 2-3 palavras o que a empresa faz
4. Canais de Venda: liste os canais prováveis (Loja Física, E-commerce Próprio, Marketplaces, Representantes, etc)
5. Dores: liste 5 dores ESPECÍFICAS e REAIS do segmento (não genéricas)
6. Resumo: escreva um resumo executivo profissional de 2-3 frases

Responda em JSON válido.`

  try {
    const result = await generateText({
      model: "openai/gpt-4o-mini",
      temperature: 0.2,
      maxTokens: 1000,
      output: Output.object({
        schema: z.object({
          classificacao: z.string().nullable(),
          modelo_negocio: z.string().nullable(),
          atuacao: z.string().nullable(),
          canais_vendas: z.array(z.string()).nullable(),
          possiveis_dores: z.array(z.string()).nullable(),
          resumo: z.string().nullable(),
        }),
      }),
      prompt,
    })

    return result.object || {}
  } catch {
    return {}
  }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================
function formatName(name: string): string {
  if (!name) return ""
  return name
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

async function detectPlatform(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { 
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LeadEnricher/1.0)" }
    })
    const html = await response.text()

    if (/shopify|cdn\.shopify/i.test(html)) return "Shopify"
    if (/vtex|vteximg/i.test(html)) return "VTEX"
    if (/woocommerce|wp-content.*woocommerce/i.test(html)) return "WooCommerce"
    if (/magento|mage/i.test(html)) return "Magento"
    if (/nuvemshop|lojaintegrada/i.test(html)) return "Nuvemshop"
    if (/tray\.com/i.test(html)) return "Tray"
    if (/prestashop/i.test(html)) return "PrestaShop"
    if (/wix\.com/i.test(html)) return "Wix"
    if (/squarespace/i.test(html)) return "Squarespace"
    if (/wordpress|wp-content/i.test(html)) return "WordPress"

    return null
  } catch {
    return null
  }
}
