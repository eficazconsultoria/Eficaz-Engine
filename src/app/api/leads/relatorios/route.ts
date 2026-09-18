import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Buscar todos os leads para análise
    const { data: leads, error } = await supabase
      .from("leads")
      .select("*")

    if (error) {
      console.error("Erro ao buscar leads:", error)
      return NextResponse.json({ error: "Erro ao buscar leads" }, { status: 500 })
    }

    const allLeads = leads || []
    const total = allLeads.length

    // Contagens por status
    const statusCounts = {
      pendente: allLeads.filter(l => l.status === 'pendente').length,
      processando: allLeads.filter(l => l.status === 'processando').length,
      enriquecido: allLeads.filter(l => l.status === 'enriquecido').length,
      erro: allLeads.filter(l => l.status === 'erro').length,
    }

    // Contagens por modelo de negócio
    const modeloNegocioCounts: Record<string, number> = {}
    allLeads.forEach(l => {
      const modelo = l.modelo_negocio || 'Não identificado'
      modeloNegocioCounts[modelo] = (modeloNegocioCounts[modelo] || 0) + 1
    })

    // Contagens por classificação
    const classificacaoCounts: Record<string, number> = {}
    allLeads.forEach(l => {
      const classificacao = l.classificacao || 'Não identificado'
      classificacaoCounts[classificacao] = (classificacaoCounts[classificacao] || 0) + 1
    })

    // Contagens por segmento (top 10)
    const segmentoCounts: Record<string, number> = {}
    allLeads.forEach(l => {
      const segmento = l.segmento || 'Não identificado'
      segmentoCounts[segmento] = (segmentoCounts[segmento] || 0) + 1
    })
    const topSegmentos = Object.entries(segmentoCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([nome, count]) => ({ nome, count }))

    // Contagens por estado
    const estadoCounts: Record<string, number> = {}
    allLeads.forEach(l => {
      const estado = l.endereco_estado || 'Não informado'
      estadoCounts[estado] = (estadoCounts[estado] || 0) + 1
    })
    const topEstados = Object.entries(estadoCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([nome, count]) => ({ nome, count }))

    // Contagens por cidade (top 10)
    const cidadeCounts: Record<string, number> = {}
    allLeads.forEach(l => {
      const cidade = l.endereco_cidade ? `${l.endereco_cidade}/${l.endereco_estado || ''}` : 'Não informado'
      cidadeCounts[cidade] = (cidadeCounts[cidade] || 0) + 1
    })
    const topCidades = Object.entries(cidadeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([nome, count]) => ({ nome, count }))

    // Métricas de presença digital
    const comSite = allLeads.filter(l => l.site).length
    const comEcommerce = allLeads.filter(l => l.site_ecommerce).length
    const comRedesSociais = allLeads.filter(l => l.redes_sociais && Array.isArray(l.redes_sociais) && l.redes_sociais.length > 0).length
    const comMarketplace = allLeads.filter(l => l.marketplace?.presente).length
    const comTelefone = allLeads.filter(l => l.telefone).length
    const comWhatsapp = allLeads.filter(l => l.whatsapp).length
    const comEmail = allLeads.filter(l => l.email).length

    // Contagens de redes sociais
    const redesSociaisCounts: Record<string, number> = {
      Instagram: 0,
      Facebook: 0,
      LinkedIn: 0,
      YouTube: 0,
      Twitter: 0,
      TikTok: 0,
    }
    allLeads.forEach(l => {
      if (l.redes_sociais && Array.isArray(l.redes_sociais)) {
        l.redes_sociais.forEach((rede: { rede: string }) => {
          if (redesSociaisCounts[rede.rede] !== undefined) {
            redesSociaisCounts[rede.rede]++
          }
        })
      }
    })

    // Contagens de marketplaces
    const marketplaceCounts: Record<string, number> = {}
    allLeads.forEach(l => {
      if (l.marketplace?.lojas && Array.isArray(l.marketplace.lojas)) {
        l.marketplace.lojas.forEach((loja: { nome: string }) => {
          marketplaceCounts[loja.nome] = (marketplaceCounts[loja.nome] || 0) + 1
        })
      }
    })
    const topMarketplaces = Object.entries(marketplaceCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([nome, count]) => ({ nome, count }))

    // Contagens de plataformas
    const plataformaCounts: Record<string, number> = {}
    allLeads.forEach(l => {
      if (l.plataforma) {
        plataformaCounts[l.plataforma] = (plataformaCounts[l.plataforma] || 0) + 1
      }
    })
    const topPlataformas = Object.entries(plataformaCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([nome, count]) => ({ nome, count }))

    // Contagens de dores (top 15)
    const doresCounts: Record<string, number> = {}
    allLeads.forEach(l => {
      if (l.possiveis_dores && Array.isArray(l.possiveis_dores)) {
        l.possiveis_dores.forEach((dor: string) => {
          if (dor && dor.trim()) {
            doresCounts[dor.trim()] = (doresCounts[dor.trim()] || 0) + 1
          }
        })
      }
    })
    const topDores = Object.entries(doresCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([nome, count]) => ({ nome, count }))

    // Leads por data de criação (últimos 30 dias)
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const leadsPorDia: Record<string, number> = {}
    
    // Inicializar os últimos 30 dias
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      leadsPorDia[dateStr] = 0
    }
    
    allLeads.forEach(l => {
      if (l.created_at) {
        const dateStr = new Date(l.created_at).toISOString().split('T')[0]
        if (leadsPorDia[dateStr] !== undefined) {
          leadsPorDia[dateStr]++
        }
      }
    })

    const evolucaoLeads = Object.entries(leadsPorDia)
      .map(([data, count]) => ({ data, count }))

    return NextResponse.json({
      total,
      statusCounts,
      modeloNegocioCounts,
      classificacaoCounts,
      topSegmentos,
      topEstados,
      topCidades,
      presencaDigital: {
        comSite,
        comEcommerce,
        comRedesSociais,
        comMarketplace,
        comTelefone,
        comWhatsapp,
        comEmail,
      },
      redesSociaisCounts,
      topMarketplaces,
      topPlataformas,
      topDores,
      evolucaoLeads,
    })
  } catch (error) {
    console.error("Erro interno:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
