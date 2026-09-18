"use server"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateText, Output } from "ai"
import { z } from "zod"

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface CNPJData {
  razao_social?: string
  nome_fantasia?: string
  descricao_situacao_cadastral?: string
  cnae_fiscal?: number
  cnae_fiscal_descricao?: string
  data_inicio_atividade?: string
  capital_social?: number
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  municipio?: string
  uf?: string
  cep?: string
  ddd_telefone_1?: string
  ddd_telefone_2?: string
  email?: string
  porte?: string
  natureza_juridica?: string
  cnaes_secundarios?: Array<{ codigo: number; descricao: string }>
  qsa?: Array<{
    nome_socio: string
    cnpj_cpf_do_socio?: string
    qualificacao_socio?: string
    codigo_qualificacao_socio?: number
    percentual_capital_social?: number
    data_entrada_sociedade?: string
    cpf_representante_legal?: string
    nome_representante_legal?: string
    codigo_qualificacao_representante_legal?: string
  }>
}

interface SiteContacts {
  emails: string[]
  telefones: string[]
  whatsapp?: string
  endereco_completo?: string
}

interface SocialNetwork {
  rede: string
  url: string
  seguidores?: number
}

interface Director {
  nome: string
  cargo?: string
  qualificacao?: string
  linkedin?: string
  email?: string
  telefone?: string
}

interface AgentContext {
  cnpj: string
  cnpjData: CNPJData | null
  lead: Record<string, unknown>
  siteUrl: string | null
  siteHtml: string | null
  siteContacts: SiteContacts | null
  redesSociais: SocialNetwork[]
  diretores: Director[]
  plataforma: string | null
  nomeEmpresa: string
  nomeFantasiaSite: string | null  // Nome fantasia extraído do site
  // Sites
  siteTipo: string | null  // 'institucional' | 'ecommerce' | 'blog' | 'landing_page'
  siteEcommerce: string | null
  plataformaEcommerce: string | null
  siteBlog: string | null
  // Dados de análise compartilhados entre agentes
  classificacao: string | null
  modeloNegocio: string | null
  segmento: string | null
  atuacao: string | null
}

// ============================================================================
// UTILITÁRIOS DE TELEFONE
// ============================================================================

function normalizeTelefone(telefone: string): string {
  // Remove tudo que não é dígito
  return telefone.replace(/\D/g, '')
}

function formatarTelefone(telefone: string): string {
  const numeros = normalizeTelefone(telefone)
  
  // Telefone com 11 dígitos (celular com DDD)
  if (numeros.length === 11) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`
  }
  // Telefone com 10 dígitos (fixo com DDD)
  if (numeros.length === 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`
  }
  // Telefone com 9 dígitos (celular sem DDD)
  if (numeros.length === 9) {
    return `${numeros.slice(0, 5)}-${numeros.slice(5)}`
  }
  // Telefone com 8 dígitos (fixo sem DDD)
  if (numeros.length === 8) {
    return `${numeros.slice(0, 4)}-${numeros.slice(4)}`
  }
  
  return telefone
}

function isValidBrazilianPhone(telefone: string): boolean {
  const numeros = normalizeTelefone(telefone)
  
  // Deve ter entre 10 e 11 dígitos (com DDD)
  if (numeros.length < 10 || numeros.length > 11) return false
  
  // DDD válido (11-99)
  const ddd = parseInt(numeros.slice(0, 2))
  if (ddd < 11 || ddd > 99) return false
  
  // DDDs válidos no Brasil
  const dddsValidos = [
    11, 12, 13, 14, 15, 16, 17, 18, 19, // SP
    21, 22, 24, // RJ
    27, 28, // ES
    31, 32, 33, 34, 35, 37, 38, // MG
    41, 42, 43, 44, 45, 46, // PR
    47, 48, 49, // SC
    51, 53, 54, 55, // RS
    61, // DF
    62, 64, // GO
    63, // TO
    65, 66, // MT
    67, // MS
    68, // AC
    69, // RO
    71, 73, 74, 75, 77, // BA
    79, // SE
    81, 87, // PE
    82, // AL
    83, // PB
    84, // RN
    85, 88, // CE
    86, 89, // PI
    91, 93, 94, // PA
    92, 97, // AM
    95, // RR
    96, // AP
    98, 99, // MA
  ]
  
  if (!dddsValidos.includes(ddd)) return false
  
  // Se celular (11 dígitos), deve começar com 9
  if (numeros.length === 11 && numeros[2] !== '9') return false
  
  return true
}

function deduplicateTelefones(telefones: string[]): string[] {
  const normalized = new Map<string, string>()
  
  for (const tel of telefones) {
    const norm = normalizeTelefone(tel)
    if (norm.length >= 10 && isValidBrazilianPhone(tel)) {
      // Usar o número normalizado como chave, mas guardar o formatado
      if (!normalized.has(norm)) {
        normalized.set(norm, formatarTelefone(tel))
      }
    }
  }
  
  return Array.from(normalized.values())
}

function formatWhatsApp(telefone: string): string {
  const numeros = normalizeTelefone(telefone)
  
  // Se já tem 13 dígitos (55 + DDD + 9 + número), está correto
  if (numeros.length === 13 && numeros.startsWith('55')) {
    return numeros
  }
  
  // Se tem 11 dígitos (DDD + 9 + número), adicionar 55
  if (numeros.length === 11) {
    return `55${numeros}`
  }
  
  // Se tem 10 dígitos (DDD + número sem 9), adicionar 55 e 9
  if (numeros.length === 10) {
    return `55${numeros.slice(0, 2)}9${numeros.slice(2)}`
  }
  
  // Fallback
  return `55${numeros}`
}

// ============================================================================
// PARSE DE CAPITAL SOCIAL (FUNCIONA PARA BRASILAPI E RECEITAWS)
// ============================================================================

function parseCapitalSocial(valor: string | number | null | undefined): number {
  if (valor === null || valor === undefined) return 0
  
  // Se já é número, retornar direto
  if (typeof valor === 'number') {
    // BrasilAPI retorna o valor em reais como número
    // Verificar se parece estar em centavos (valor muito alto)
    // Capital de 50 mil reais = 50000, não 5000000
    return valor
  }
  
  // Se é string (ReceitaWS retorna formatado tipo "50.000,00")
  if (typeof valor === 'string') {
    // Remover "R$" e espaços
    let str = valor.replace(/R\$\s*/gi, '').trim()
    
    // Formato brasileiro: 50.000,00 (ponto = milhar, vírgula = decimal)
    // Formato americano: 50,000.00 (vírgula = milhar, ponto = decimal)
    
    // Detectar formato pelo último separador
    const lastDot = str.lastIndexOf('.')
    const lastComma = str.lastIndexOf(',')
    
    if (lastComma > lastDot) {
      // Formato brasileiro (50.000,00)
      // Remover pontos de milhar, trocar vírgula por ponto
      str = str.replace(/\./g, '').replace(',', '.')
    } else if (lastDot > lastComma) {
      // Formato americano (50,000.00)
      // Remover vírgulas de milhar
      str = str.replace(/,/g, '')
    } else {
      // Apenas um ou nenhum separador
      str = str.replace(',', '.')
    }
    
    const parsed = parseFloat(str)
    return isNaN(parsed) ? 0 : parsed
  }
  
  return 0
}

// ============================================================================
// BUSCA NO GOOGLE (SCRAPING REAL)
// ============================================================================

async function searchGoogle(query: string): Promise<string[]> {
  try {
    const encodedQuery = encodeURIComponent(query)
    const url = `https://www.google.com/search?q=${encodedQuery}&hl=pt-BR&gl=BR&num=20`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) return []

    const html = await response.text()
    
    // Extrair URLs dos resultados
    const urls: string[] = []
    
    // Padrão 1: href="/url?q=URL"
    const pattern1 = /href="\/url\?q=([^"&]+)/g
    let match
    while ((match = pattern1.exec(html)) !== null) {
      try {
        const decodedUrl = decodeURIComponent(match[1])
        if (decodedUrl.startsWith('http') && !decodedUrl.includes('google.com')) {
          urls.push(decodedUrl)
        }
      } catch {
        // Ignore
      }
    }
    
    // Padrão 2: href="https://..." direto
    const pattern2 = /href="(https?:\/\/(?!www\.google\.)[^"]+)"/g
    while ((match = pattern2.exec(html)) !== null) {
      const url = match[1]
      if (!url.includes('google.com') && !url.includes('gstatic.com') && !url.includes('googleapis.com')) {
        urls.push(url)
      }
    }
    
    return [...new Set(urls)]
  } catch (error) {
    console.warn("Erro ao buscar no Google:", error)
    return []
  }
}

// ============================================================================
// MAPEAMENTO DETERMINÍSTICO DE CNAE → MODELO DE NEGÓCIO
// ============================================================================

function getModeloNegocioPorCNAE(cnaeCodigo: string, cnaeDescricao: string): {
  modeloNegocio: string
  classificacao: string
  segmento: string
  atuacao: string
} {
  const codigo = cnaeCodigo.substring(0, 2)
  const descLower = cnaeDescricao.toLowerCase()
  
  // INDÚSTRIA (10-33) - SEMPRE B2B
  if (['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33'].includes(codigo)) {
    return {
      modeloNegocio: 'B2B',
      classificacao: 'Indústria',
      segmento: getSegmentoIndustria(codigo, descLower),
      atuacao: 'Fabricação e produção'
    }
  }
  
  // COMÉRCIO ATACADISTA (45-46) - SEMPRE B2B
  if (codigo === '45' || codigo === '46') {
    return {
      modeloNegocio: 'B2B',
      classificacao: 'Atacado',
      segmento: getSegmentoComercio(descLower),
      atuacao: 'Distribuição e revenda'
    }
  }
  
  // COMÉRCIO VAREJISTA (47) - SEMPRE B2C
  if (codigo === '47') {
    if (descLower.includes('internet') || descLower.includes('eletrônico') || descLower.includes('correspondência')) {
      return {
        modeloNegocio: 'B2C',
        classificacao: 'E-commerce',
        segmento: getSegmentoComercio(descLower),
        atuacao: 'Venda online'
      }
    }
    return {
      modeloNegocio: 'B2C',
      classificacao: 'Varejo',
      segmento: getSegmentoComercio(descLower),
      atuacao: 'Venda ao consumidor final'
    }
  }
  
  // TECNOLOGIA E SOFTWARE (62-63)
  if (codigo === '62' || codigo === '63') {
    // Desenvolvimento sob encomenda, consultoria, suporte = B2B
    if (descLower.includes('sob encomenda') || 
        descLower.includes('consultoria') || 
        descLower.includes('suporte técnico') ||
        descLower.includes('desenvolvimento de programas') ||
        descLower.includes('análise') ||
        descLower.includes('customizável')) {
      return {
        modeloNegocio: 'B2B',
        classificacao: 'Serviços',
        segmento: 'Tecnologia da Informação',
        atuacao: 'Desenvolvimento e consultoria de software'
      }
    }
    // Portais, plataformas web, aplicativos = B2C ou B2B2C
    if (descLower.includes('portal') || descLower.includes('plataforma') || descLower.includes('aplicativo')) {
      return {
        modeloNegocio: 'B2C',
        classificacao: 'Tecnologia',
        segmento: 'Tecnologia da Informação',
        atuacao: 'Plataforma digital'
      }
    }
    // Default TI = B2B
    return {
      modeloNegocio: 'B2B',
      classificacao: 'Serviços',
      segmento: 'Tecnologia da Informação',
      atuacao: 'Serviços de tecnologia'
    }
  }
  
  // SERVIÇOS PROFISSIONAIS (69-74) - SEMPRE B2B
  if (['69', '70', '71', '72', '73', '74'].includes(codigo)) {
    return {
      modeloNegocio: 'B2B',
      classificacao: 'Serviços',
      segmento: getSegmentoServicosProfissionais(codigo, descLower),
      atuacao: 'Consultoria e serviços especializados'
    }
  }
  
  // CONSTRUÇÃO (41-43) - B2B
  if (['41', '42', '43'].includes(codigo)) {
    return {
      modeloNegocio: 'B2B',
      classificacao: 'Construção Civil',
      segmento: 'Construção Civil',
      atuacao: 'Obras e construção'
    }
  }
  
  // TRANSPORTE E LOGÍSTICA (49-53) - B2B
  if (['49', '50', '51', '52', '53'].includes(codigo)) {
    return {
      modeloNegocio: 'B2B',
      classificacao: 'Logística',
      segmento: 'Logística e Transporte',
      atuacao: 'Transporte e armazenagem'
    }
  }
  
  // ALIMENTAÇÃO E HOSPEDAGEM (55-56) - B2C
  if (codigo === '55' || codigo === '56') {
    return {
      modeloNegocio: 'B2C',
      classificacao: 'Serviços',
      segmento: 'Alimentação e Hospedagem',
      atuacao: 'Serviços de alimentação'
    }
  }
  
  // SAÚDE (86) - B2C
  if (codigo === '86') {
    return {
      modeloNegocio: 'B2C',
      classificacao: 'Serviços',
      segmento: 'Saúde',
      atuacao: 'Serviços de saúde'
    }
  }
  
  // EDUCAÇÃO (85) - B2C
  if (codigo === '85') {
    return {
      modeloNegocio: 'B2C',
      classificacao: 'Serviços',
      segmento: 'Educação',
      atuacao: 'Serviços educacionais'
    }
  }
  
  // AGROPECUÁRIA (01-03) - B2B
  if (['01', '02', '03'].includes(codigo)) {
    return {
      modeloNegocio: 'B2B',
      classificacao: 'Agronegócio',
      segmento: 'Agropecuária',
      atuacao: 'Produção agropecuária'
    }
  }
  
  // DEFAULT: Serviços B2B
  return {
    modeloNegocio: 'B2B',
    classificacao: 'Serviços',
    segmento: 'Serviços Diversos',
    atuacao: 'Prestação de serviços'
  }
}

function getSegmentoIndustria(codigo: string, descLower: string): string {
  const segmentos: Record<string, string> = {
    '10': 'Alimentos e Bebidas',
    '11': 'Alimentos e Bebidas',
    '12': 'Tabaco',
    '13': 'Têxtil',
    '14': 'Moda e Vestuário',
    '15': 'Couro e Calçados',
    '16': 'Madeira',
    '17': 'Celulose e Papel',
    '18': 'Impressão e Reprodução',
    '19': 'Petróleo e Derivados',
    '20': 'Química',
    '21': 'Farmacêutica',
    '22': 'Borracha e Plástico',
    '23': 'Minerais não Metálicos',
    '24': 'Metalurgia',
    '25': 'Produtos de Metal',
    '26': 'Eletrônicos e Informática',
    '27': 'Máquinas Elétricas',
    '28': 'Máquinas e Equipamentos',
    '29': 'Automotivo',
    '30': 'Equipamentos de Transporte',
    '31': 'Móveis',
    '32': 'Produtos Diversos',
    '33': 'Manutenção Industrial',
  }
  return segmentos[codigo] || 'Indústria Geral'
}

function getSegmentoComercio(descLower: string): string {
  if (descLower.includes('aliment') || descLower.includes('bebida')) return 'Alimentos e Bebidas'
  if (descLower.includes('roupa') || descLower.includes('vestuário') || descLower.includes('calçado')) return 'Moda e Vestuário'
  if (descLower.includes('eletrônico') || descLower.includes('informática') || descLower.includes('computador')) return 'Eletrônicos e Informática'
  if (descLower.includes('medicament') || descLower.includes('farmácia') || descLower.includes('cosmético')) return 'Farmácia e Cosméticos'
  if (descLower.includes('móveis') || descLower.includes('decoração') || descLower.includes('eletrodoméstico')) return 'Casa e Decoração'
  if (descLower.includes('veículo') || descLower.includes('automóvel') || descLower.includes('peça')) return 'Automotivo'
  if (descLower.includes('construção') || descLower.includes('material')) return 'Materiais de Construção'
  if (descLower.includes('combustível') || descLower.includes('posto')) return 'Combustíveis'
  if (descLower.includes('supermercado') || descLower.includes('mercearia') || descLower.includes('hipermercado')) return 'Supermercados'
  return 'Comércio Geral'
}

function getSegmentoServicosProfissionais(codigo: string, descLower: string): string {
  const segmentos: Record<string, string> = {
    '69': 'Jurídico e Contábil',
    '70': 'Gestão e Consultoria',
    '71': 'Arquitetura e Engenharia',
    '72': 'Pesquisa e Desenvolvimento',
    '73': 'Publicidade e Pesquisa de Mercado',
    '74': 'Design e Atividades Técnicas',
  }
  return segmentos[codigo] || 'Serviços Profissionais'
}

// ============================================================================
// POSSÍVEIS DORES POR SEGMENTO
// ============================================================================

function getDoresPorSegmento(segmento: string, classificacao: string, modeloNegocio: string): string[] {
  const doresMap: Record<string, string[]> = {
    'Tecnologia da Informação': [
      'Dificuldade em escalar a equipe técnica rapidamente',
      'Gestão de projetos com prazos apertados',
      'Retenção de talentos em TI',
      'Processos de desenvolvimento desorganizados',
      'Dificuldade em precificar projetos de software'
    ],
    'Alimentos e Bebidas': [
      'Controle de estoque e validade de produtos',
      'Gestão de fornecedores e matéria-prima',
      'Rastreabilidade e conformidade sanitária',
      'Logística de distribuição refrigerada',
      'Sazonalidade nas vendas'
    ],
    'Eletrônicos e Informática': [
      'Margens apertadas pela concorrência',
      'Gestão de garantia e assistência técnica',
      'Obsolescência rápida de produtos',
      'Concorrência com grandes marketplaces',
      'Importação e variação cambial'
    ],
    'Moda e Vestuário': [
      'Gestão de coleções e tendências',
      'Controle de grade de tamanhos',
      'Integração de canais físico e digital',
      'Gestão de trocas e devoluções',
      'Produção sob demanda vs estoque'
    ],
    'Saúde': [
      'Gestão de agenda e cancelamentos',
      'Conformidade com regulamentações (ANVISA, CFM)',
      'Relacionamento de longo prazo com pacientes',
      'Integração de prontuários eletrônicos',
      'Glosas de convênios médicos'
    ],
    'Construção Civil': [
      'Gestão de múltiplas obras simultâneas',
      'Controle de materiais e desperdício',
      'Mão de obra qualificada',
      'Fluxo de caixa irregular',
      'Atrasos e retrabalhos'
    ],
    'Logística e Transporte': [
      'Otimização de rotas e combustível',
      'Manutenção de frota',
      'Rastreamento e visibilidade de entregas',
      'Gestão de motoristas e turnos',
      'Custos com pedágios e seguros'
    ],
    'Jurídico e Contábil': [
      'Gestão de prazos processuais',
      'Atualização constante de legislação',
      'Automação de tarefas repetitivas',
      'Comunicação com clientes',
      'Precificação de honorários'
    ],
    'Publicidade e Pesquisa de Mercado': [
      'Comprovação de ROI para clientes',
      'Retenção de contas',
      'Gestão de múltiplos projetos criativos',
      'Acompanhamento de tendências digitais',
      'Prazos apertados de campanhas'
    ],
  }
  
  const doresB2B = [
    'Ciclo de vendas longo e complexo',
    'Dependência de poucos clientes grandes',
    'Processos de licitação e compliance',
    'Gestão de contratos de longo prazo',
    'Integração de sistemas com clientes'
  ]
  
  const doresB2C = [
    'Atração e retenção de clientes',
    'Competição por preço',
    'Gestão de experiência do cliente',
    'Logística de última milha',
    'Sazonalidade de vendas'
  ]
  
  const doresIndustria = [
    'Gestão de capacidade produtiva',
    'Manutenção de equipamentos',
    'Gestão de matéria-prima e fornecedores',
    'Controle de qualidade',
    'Custos de energia e insumos'
  ]
  
  const doresVarejo = [
    'Gestão de estoque multicanal',
    'Experiência omnichannel',
    'Concorrência com marketplaces',
    'Fidelização de clientes',
    'Margens cada vez menores'
  ]
  
  let dores = doresMap[segmento] || []
  
  if (classificacao === 'Indústria') {
    dores = [...dores, ...doresIndustria].slice(0, 5)
  } else if (classificacao === 'Varejo') {
    dores = [...dores, ...doresVarejo].slice(0, 5)
  }
  
  if (dores.length < 5) {
    const doresModelo = modeloNegocio.includes('B2B') ? doresB2B : doresB2C
    dores = [...dores, ...doresModelo].slice(0, 5)
  }
  
  return dores.slice(0, 5)
}

// ============================================================================
// API ROUTE
// ============================================================================

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { lead_ids } = body

    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return NextResponse.json({ error: "IDs de leads inválidos" }, { status: 400 })
    }

    await supabase
      .from("leads")
      .update({ status: "processando", enrichment_progress: 0 })
      .in("id", lead_ids)

    processLeadsWithAgents(lead_ids, supabase)

    return NextResponse.json({ 
      success: true, 
      message: `Processamento iniciado para ${lead_ids.length} leads` 
    })
  } catch (error) {
    console.error("Erro interno:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// ============================================================================
// ORQUESTRADOR DE AGENTES
// ============================================================================

async function processLeadsWithAgents(leadIds: string[], supabase: Awaited<ReturnType<typeof createClient>>) {
  for (const leadId of leadIds) {
    try {
      const { data: lead, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", leadId)
        .single()

      if (error || !lead) continue

      const cnpjLimpo = lead.cnpj.replace(/[^\d]/g, '')

const context: AgentContext = {
  cnpj: cnpjLimpo,
  cnpjData: null,
  lead,
  siteUrl: lead.site || null,
  siteHtml: null,
  siteContacts: null,
  redesSociais: [],
  diretores: [],
  plataforma: null,
  nomeEmpresa: '',
  nomeFantasiaSite: null,
  siteTipo: lead.site_tipo || null,
  siteEcommerce: lead.site_ecommerce || null,
  plataformaEcommerce: lead.plataforma_ecommerce || null,
  siteBlog: lead.site_blog || null,
  classificacao: null,
  modeloNegocio: null,
  segmento: null,
  atuacao: null,
}

      // ============================================
      // AGENTE 1: Dados da Receita Federal
      // ============================================
      await updateProgress(supabase, leadId, 5, "Consultando Receita Federal...")
      const cnpjData = await AgentReceitaFederal.execute(context)
      context.cnpjData = cnpjData
      
      if (!cnpjData) {
        await supabase.from("leads").update({ 
          status: "erro", 
          enrichment_error: "CNPJ não encontrado na Receita Federal.",
          enrichment_progress: 0,
        }).eq("id", leadId)
        continue
      }

      context.nomeEmpresa = cnpjData.nome_fantasia || cnpjData.razao_social || ''
      context.diretores = AgentReceitaFederal.extractDirectors(cnpjData)
      
      // DETERMINAR CLASSIFICAÇÃO PELO CNAE
      if (cnpjData.cnae_fiscal && cnpjData.cnae_fiscal_descricao) {
        const cnaeCodigo = String(cnpjData.cnae_fiscal).padStart(7, '0')
        const analise = getModeloNegocioPorCNAE(cnaeCodigo, cnpjData.cnae_fiscal_descricao)
        context.classificacao = analise.classificacao
        context.modeloNegocio = analise.modeloNegocio
        context.segmento = analise.segmento
        context.atuacao = analise.atuacao
      } else {
        context.classificacao = 'Serviços'
        context.modeloNegocio = 'B2B'
        context.segmento = 'Serviços Diversos'
        context.atuacao = 'Prestação de serviços'
      }

      // ============================================
      // AGENTE 2: Descoberta de Site
      // ============================================
      await updateProgress(supabase, leadId, 15, "Buscando site oficial...")
  const siteResult = await AgentDescobertaSite.execute(context)
  context.siteUrl = siteResult.siteUrl
  context.siteHtml = siteResult.siteHtml
  context.plataforma = siteResult.plataforma
  context.nomeFantasiaSite = siteResult.nomeFantasiaSite
  context.siteEcommerce = siteResult.siteEcommerce
  context.plataformaEcommerce = siteResult.plataformaEcommerce
  
  // ============================================
  // AGENTE 2.5: Classificação de Tipo de Site e Blog
  // ============================================
  await updateProgress(supabase, leadId, 25, "Classificando tipo de site e buscando blog...")
  const classificacaoSiteResult = await AgentClassificacaoSite.execute(context)
  context.siteTipo = classificacaoSiteResult.siteTipo
  context.siteBlog = classificacaoSiteResult.siteBlog
  
  // AJUSTAR MODELO DE NEGÓCIO SE ENCONTROU E-COMMERCE
  // Se a empresa tem loja virtual/e-commerce, provavelmente vende para consumidor final (B2C)
  if (context.siteEcommerce || context.plataformaEcommerce) {
    // Se é plataforma de e-commerce conhecida, é B2C
    const ecommercePlatforms = ['Shopify', 'VTEX', 'WooCommerce', 'Magento', 'Nuvemshop', 'Loja Integrada', 'Tray', 'PrestaShop', 'OpenCart', 'Mercado Shops']
    const isEcommerce = ecommercePlatforms.some(p => 
      context.plataforma?.includes(p) || context.plataformaEcommerce?.includes(p)
    )
    
    if (isEcommerce && context.modeloNegocio === 'B2B') {
      // Empresa de servi��os/indústria que tem e-commerce = vende para consumidor também
      context.modeloNegocio = 'B2B e B2C'
      context.atuacao = context.atuacao ? `${context.atuacao} + Venda online` : 'Venda online'
    }
  }
  
  // Se o site principal é e-commerce e não tem site institucional separado = provavelmente B2C puro
  if (context.plataforma && !context.siteEcommerce) {
    const ecommercePlatforms = ['Shopify', 'VTEX', 'WooCommerce', 'Magento', 'Nuvemshop', 'Loja Integrada', 'Tray', 'PrestaShop', 'OpenCart']
    if (ecommercePlatforms.some(p => context.plataforma?.includes(p))) {
      // O site principal é e-commerce
      context.siteEcommerce = context.siteUrl
      context.plataformaEcommerce = context.plataforma
      if (context.modeloNegocio === 'B2B') {
        context.modeloNegocio = 'B2C'
        context.classificacao = 'E-commerce'
        context.atuacao = 'Venda online ao consumidor'
      }
    }
  }

  // ============================================
      // AGENTE 3: Extração de Contatos do Site
      // ============================================
      await updateProgress(supabase, leadId, 30, "Extraindo contatos do site...")
      const contatosResult = await AgentContatosSite.execute(context)
      context.siteContacts = contatosResult.siteContacts
      context.diretores = contatosResult.diretores

      // ============================================
      // AGENTE 4: Redes Sociais
      // ============================================
      await updateProgress(supabase, leadId, 45, "Buscando redes sociais...")
      const redesResult = await AgentRedesSociais.execute(context)
      context.redesSociais = redesResult.redesSociais

      // ============================================
      // AGENTE 5: Marketing Digital (Google/Meta Ads)
      // ============================================
      await updateProgress(supabase, leadId, 60, "Analisando marketing digital...")
      const marketingResult = await AgentMarketingDigital.execute(context)

      // ============================================
      // AGENTE 6: Marketplaces
      // ============================================
      await updateProgress(supabase, leadId, 75, "Verificando marketplaces...")
      const marketplaceResult = await AgentMarketplaces.execute(context)

      // ============================================
      // AGENTE 7: Resumo Inteligente (IA analisa TUDO)
      // ============================================
      await updateProgress(supabase, leadId, 85, "Gerando resumo executivo...")
      const analiseResult = await AgentResumoInteligente.execute(context, {
        marketingResult,
        marketplaceResult,
      })

      // ============================================
      // SALVAR DADOS NO BANCO
      // ============================================
      await updateProgress(supabase, leadId, 95, "Salvando dados...")

      const dadosOficiais = extractOfficialData(cnpjData)
      const possiveis_dores = getDoresPorSegmento(
        context.segmento || 'Serviços Diversos',
        context.classificacao || 'Serviços',
        context.modeloNegocio || 'B2B'
      )

  const updateData = {
  ...dadosOficiais,
  site: context.siteUrl || lead.site,
  site_tipo: context.siteTipo,
  site_ecommerce: context.siteEcommerce,
  site_blog: context.siteBlog,
  plataforma: context.plataforma,
  plataforma_ecommerce: context.plataformaEcommerce,
  classificacao: context.classificacao,
        modelo_negocio: context.modeloNegocio,
        segmento: context.segmento,
        atuacao: context.atuacao,
        possiveis_dores: possiveis_dores,
        resumo: analiseResult.resumo,
        canais_vendas: analiseResult.canais_vendas,
        diretores: context.diretores,
        contatos_site: context.siteContacts,
        redes_sociais: context.redesSociais,
        campanhas_google: marketingResult.campanhas_google,
        campanhas_meta: marketingResult.campanhas_meta,
        marketplace: marketplaceResult.marketplace,
        status: "enriquecido",
        enrichment_progress: 100,
        last_enriched_at: new Date().toISOString(),
        enrichment_error: null,
      }

      await supabase.from("leads").update(updateData).eq("id", leadId)

    } catch (error) {
      console.error(`Erro ao processar lead ${leadId}:`, error)
      await supabase.from("leads").update({
        status: "erro",
        enrichment_error: error instanceof Error ? error.message : "Erro desconhecido",
        enrichment_progress: 0,
      }).eq("id", leadId)
    }
  }
}

async function updateProgress(
  supabase: Awaited<ReturnType<typeof createClient>>, 
  leadId: string, 
  progress: number,
  message?: string
) {
  await supabase.from("leads").update({ 
    enrichment_progress: progress,
    enrichment_error: message || null,
  }).eq("id", leadId)
}

// ============================================================================
// AGENTE 1: RECEITA FEDERAL
// ============================================================================

const AgentReceitaFederal = {
  async execute(context: AgentContext): Promise<CNPJData | null> {
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${context.cnpj}`, {
        signal: AbortSignal.timeout(15000),
      })
      if (response.ok) {
        return await response.json()
      }
    } catch (e) {
      console.warn("BrasilAPI falhou:", e)
    }

    try {
      const response = await fetch(`https://receitaws.com.br/v1/cnpj/${context.cnpj}`, {
        signal: AbortSignal.timeout(15000),
      })
      if (response.ok) {
        const data = await response.json()
        if (data.status !== 'ERROR') {
          return {
            razao_social: data.nome,
            nome_fantasia: data.fantasia,
            cnae_fiscal: parseInt(data.atividade_principal?.[0]?.code?.replace(/[^\d]/g, '') || '0'),
            cnae_fiscal_descricao: data.atividade_principal?.[0]?.text,
            data_inicio_atividade: data.abertura,
            capital_social: parseCapitalSocial(data.capital_social),
            logradouro: data.logradouro,
            numero: data.numero,
            complemento: data.complemento,
            bairro: data.bairro,
            municipio: data.municipio,
            uf: data.uf,
            cep: data.cep,
            email: data.email,
            ddd_telefone_1: data.telefone,
            qsa: data.qsa?.map((s: { nome: string; qual: string }) => ({
              nome_socio: s.nome,
              qualificacao_socio: s.qual,
            })),
            cnaes_secundarios: data.atividades_secundarias?.map((a: { code: string; text: string }) => ({
              codigo: parseInt(a.code?.replace(/[^\d]/g, '') || '0'),
              descricao: a.text,
            })),
          }
        }
      }
    } catch (e) {
      console.warn("ReceitaWS falhou:", e)
    }

    return null
  },

  extractDirectors(cnpjData: CNPJData): Director[] {
    if (!cnpjData.qsa || cnpjData.qsa.length === 0) return []

    return cnpjData.qsa.map(socio => {
      const nome = socio.nome_socio
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')

      return {
        nome,
        qualificacao: socio.qualificacao_socio || undefined,
        cargo: socio.qualificacao_socio?.includes('Administrador') ? 'Sócio-Administrador' : 'Sócio',
      }
    })
  },
}

// ============================================================================
// AGENTE 2: DESCOBERTA DE SITE (INSTITUCIONAL E E-COMMERCE)
// ============================================================================

const AgentDescobertaSite = {
  async execute(context: AgentContext): Promise<{
    siteUrl: string | null
    siteHtml: string | null
    plataforma: string | null
    nomeFantasiaSite: string | null
    siteEcommerce: string | null
    plataformaEcommerce: string | null
  }> {
    let siteUrl = context.siteUrl
    let siteHtml: string | null = null
    let plataforma: string | null = null
    let nomeFantasiaSite: string | null = null
    let siteEcommerce: string | null = null
    let plataformaEcommerce: string | null = null

    const nomeEmpresa = context.cnpjData?.nome_fantasia || context.cnpjData?.razao_social || ''

    // Se já tem site válido
    if (siteUrl) {
      const result = await this.fetchSiteWithRedirect(siteUrl)
      if (result.html) {
        nomeFantasiaSite = this.extractNomeFantasiaSite(result.html)
        siteUrl = result.finalUrl
        siteHtml = result.html
        plataforma = result.plataforma
        
        // Se o site encontrado é e-commerce, buscar também o institucional
        if (this.isEcommercePlatform(result.plataforma)) {
          siteEcommerce = result.finalUrl
          plataformaEcommerce = result.plataforma
          // Buscar site institucional
          const institucional = await this.searchInstitucionalSite(nomeEmpresa, context.cnpjData?.uf)
          if (institucional && institucional.url !== siteEcommerce) {
            siteUrl = institucional.url
            siteHtml = institucional.html
            plataforma = institucional.plataforma
          }
        } else {
          // Se é institucional, buscar e-commerce
          const ecommerce = await this.searchEcommerceSite(nomeEmpresa, context.cnpjData?.uf)
          if (ecommerce) {
            siteEcommerce = ecommerce.url
            plataformaEcommerce = ecommerce.plataforma
          }
        }
        
        return { siteUrl, siteHtml, plataforma, nomeFantasiaSite, siteEcommerce, plataformaEcommerce }
      }
    }

    if (!nomeEmpresa) return { siteUrl: null, siteHtml: null, plataforma: null, nomeFantasiaSite: null, siteEcommerce: null, plataformaEcommerce: null }

    // ETAPA 1: Inferir do email da Receita
    if (context.cnpjData?.email) {
      const emailDomain = this.extractDomainFromEmail(context.cnpjData.email)
      if (emailDomain) {
        const result = await this.fetchSiteWithRedirect(`https://${emailDomain}`)
        if (result.html) {
          nomeFantasiaSite = this.extractNomeFantasiaSite(result.html)
          siteUrl = result.finalUrl
          siteHtml = result.html
          plataforma = result.plataforma
          
          // Buscar e-commerce se este não é
          if (this.isEcommercePlatform(result.plataforma)) {
            siteEcommerce = result.finalUrl
            plataformaEcommerce = result.plataforma
          } else {
            const ecommerce = await this.searchEcommerceSite(nomeEmpresa, context.cnpjData?.uf)
            if (ecommerce) {
              siteEcommerce = ecommerce.url
              plataformaEcommerce = ecommerce.plataforma
            }
          }
          
          return { siteUrl, siteHtml, plataforma, nomeFantasiaSite, siteEcommerce, plataformaEcommerce }
        }
        const resultWww = await this.fetchSiteWithRedirect(`https://www.${emailDomain}`)
        if (resultWww.html) {
          nomeFantasiaSite = this.extractNomeFantasiaSite(resultWww.html)
          siteUrl = resultWww.finalUrl
          siteHtml = resultWww.html
          plataforma = resultWww.plataforma
          
          if (this.isEcommercePlatform(resultWww.plataforma)) {
            siteEcommerce = resultWww.finalUrl
            plataformaEcommerce = resultWww.plataforma
          } else {
            const ecommerce = await this.searchEcommerceSite(nomeEmpresa, context.cnpjData?.uf)
            if (ecommerce) {
              siteEcommerce = ecommerce.url
              plataformaEcommerce = ecommerce.plataforma
            }
          }
          
          return { siteUrl, siteHtml, plataforma, nomeFantasiaSite, siteEcommerce, plataformaEcommerce }
        }
      }
    }

    // ETAPA 2: Buscar no Google - site principal com múltiplas queries inteligentes
    const nomeFantasia = context.cnpjData?.nome_fantasia || ''
    const razaoSocial = context.cnpjData?.razao_social || ''
    const uf = context.cnpjData?.uf || ''
    
    const queries = [
      // Busca pelo nome fantasia (preferencial)
      nomeFantasia ? `site ${nomeFantasia}` : null,
      nomeFantasia ? `"${nomeFantasia}" site oficial` : null,
      nomeFantasia ? `loja ${nomeFantasia}` : null,
      // Busca pela razão social
      `site ${razaoSocial}`,
      `"${razaoSocial}" site`,
      `loja ${razaoSocial}`,
      // Variações
      `${nomeEmpresa} ${uf}`,
      `${nomeEmpresa} loja virtual`,
      `${nomeEmpresa} ecommerce`,
      `blog ${nomeEmpresa}`,
    ].filter(Boolean) as string[]
    
    for (const query of queries) {
      const googleResults = await searchGoogle(query)
      const candidatos = this.filterCandidates(googleResults, nomeEmpresa)
      
      for (const url of candidatos.slice(0, 5)) {
        try {
          const urlObj = new URL(url)
          const siteCandidate = `${urlObj.protocol}//${urlObj.hostname}`
          const result = await this.fetchSiteWithRedirect(siteCandidate)
          
          if (result.html) {
            nomeFantasiaSite = this.extractNomeFantasiaSite(result.html)
            siteUrl = result.finalUrl
            siteHtml = result.html
            plataforma = result.plataforma
            
            // Buscar e-commerce se este não é
            if (!this.isEcommercePlatform(result.plataforma)) {
              const ecommerce = await this.searchEcommerceSite(nomeEmpresa, context.cnpjData?.uf)
              if (ecommerce) {
                siteEcommerce = ecommerce.url
                plataformaEcommerce = ecommerce.plataforma
              }
            } else {
              siteEcommerce = result.finalUrl
              plataformaEcommerce = result.plataforma
            }
            
            return { siteUrl, siteHtml, plataforma, nomeFantasiaSite, siteEcommerce, plataformaEcommerce }
          }
        } catch {
          continue
        }
      }
    }
    
    // ETAPA 3: Domínios comuns
    const dominiosComuns = this.gerarDominiosComuns(nomeEmpresa)
    
    for (const dominio of dominiosComuns) {
      const result = await this.fetchSiteWithRedirect(`https://${dominio}`)
      if (result.html) {
        nomeFantasiaSite = this.extractNomeFantasiaSite(result.html)
        return {
          siteUrl: result.finalUrl,
          siteHtml: result.html,
          plataforma: result.plataforma,
          nomeFantasiaSite,
          siteEcommerce: null,
          plataformaEcommerce: null,
        }
      }
      const resultWww = await this.fetchSiteWithRedirect(`https://www.${dominio}`)
      if (resultWww.html) {
        nomeFantasiaSite = this.extractNomeFantasiaSite(resultWww.html)
        return {
          siteUrl: resultWww.finalUrl,
          siteHtml: resultWww.html,
          plataforma: resultWww.plataforma,
          nomeFantasiaSite,
          siteEcommerce: null,
          plataformaEcommerce: null,
        }
      }
    }

    return { siteUrl: null, siteHtml: null, plataforma: null, nomeFantasiaSite: null, siteEcommerce: null, plataformaEcommerce: null }
  },

  isEcommercePlatform(plataforma: string | null): boolean {
    if (!plataforma) return false
    const ecommercePlatforms = [
      'Shopify', 'VTEX', 'WooCommerce', 'Magento', 'Nuvemshop', 
      'Loja Integrada', 'Tray', 'PrestaShop', 'OpenCart', 'Mercado Shops'
    ]
    return ecommercePlatforms.some(p => plataforma.toLowerCase().includes(p.toLowerCase()))
  },

  async searchEcommerceSite(nomeEmpresa: string, uf?: string): Promise<{ url: string; plataforma: string | null; html: string | null } | null> {
    // Buscar especificamente por loja virtual / e-commerce com queries inteligentes
    const queries = [
      `loja ${nomeEmpresa}`,
      `"${nomeEmpresa}" loja virtual`,
      `"${nomeEmpresa}" loja online`,
      `site ${nomeEmpresa} comprar`,
      `"${nomeEmpresa}" e-commerce`,
      `"${nomeEmpresa}" produtos`,
      uf ? `loja ${nomeEmpresa} ${uf}` : null,
    ].filter(Boolean) as string[]

    for (const query of queries) {
      const results = await searchGoogle(query)
      
      // Filtrar para plataformas de e-commerce conhecidas
      for (const url of results.slice(0, 5)) {
        try {
          const urlObj = new URL(url)
          const domain = urlObj.hostname.toLowerCase()
          
          // Verificar se é loja em plataforma conhecida
          if (domain.includes('lojaintegrada.com.br') ||
              domain.includes('nuvemshop.com.br') ||
              domain.includes('tray.com.br') ||
              domain.includes('loja.com.br') ||
              domain.includes('myshopify.com')) {
            const result = await this.fetchSiteWithRedirect(url)
            if (result.html) {
              return { url: result.finalUrl, plataforma: result.plataforma, html: result.html }
            }
          }
          
          // Verificar se domínio próprio é e-commerce
          const excluidos = ['facebook.com', 'instagram.com', 'linkedin.com', 'mercadolivre.com', 'amazon.com']
          if (!excluidos.some(e => domain.includes(e))) {
            const result = await this.fetchSiteWithRedirect(url)
            if (result.html && this.isEcommercePlatform(result.plataforma)) {
              return { url: result.finalUrl, plataforma: result.plataforma, html: result.html }
            }
          }
        } catch {
          continue
        }
      }
    }

    return null
  },

  async searchInstitucionalSite(nomeEmpresa: string, uf?: string): Promise<{ url: string; plataforma: string | null; html: string | null } | null> {
    // Buscar especificamente por site institucional
    const queries = [
      `"${nomeEmpresa}" site institucional`,
      `"${nomeEmpresa}" sobre a empresa`,
      `"${nomeEmpresa}" quem somos ${uf || ''}`,
    ]

    for (const query of queries) {
      const results = await searchGoogle(query)
      
      for (const url of results.slice(0, 5)) {
        try {
          const urlObj = new URL(url)
          const domain = urlObj.hostname.toLowerCase()
          
          const excluidos = ['facebook.com', 'instagram.com', 'linkedin.com', 'mercadolivre.com', 'amazon.com']
          if (excluidos.some(e => domain.includes(e))) continue
          
          const result = await this.fetchSiteWithRedirect(url)
          if (result.html && !this.isEcommercePlatform(result.plataforma)) {
            return { url: result.finalUrl, plataforma: result.plataforma, html: result.html }
          }
        } catch {
          continue
        }
      }
    }

    return null
  },

  extractDomainFromEmail(email: string): string | null {
    if (!email || !email.includes('@')) return null
    
    const domain = email.split('@')[1]?.toLowerCase()
    if (!domain) return null
    
    const provedoresGenericos = [
      'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.com.br',
      'bol.com.br', 'uol.com.br', 'ig.com.br', 'terra.com.br', 'globo.com',
      'live.com', 'msn.com', 'icloud.com', 'me.com', 'protonmail.com'
    ]
    
    if (provedoresGenericos.includes(domain)) return null
    
    return domain
  },

  filterCandidates(urls: string[], nomeEmpresa: string): string[] {
    const nomeSlug = nomeEmpresa.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .split(' ')
      .filter(w => w.length > 2)
    
    const excluidos = [
      'facebook.com', 'instagram.com', 'linkedin.com', 'twitter.com', 
      'youtube.com', 'tiktok.com', 'reclameaqui.com', 'wikipedia.org', 
      'mercadolivre.com', 'amazon.com', 'magazineluiza.com', 'americanas.com',
      'econodata.com', 'cnpj.info', 'cnpj.biz', 'consultasocio.com',
      'google.com', 'bing.com', 'jusbrasil.com', 'glassdoor.com',
      'infojobs.com', 'catho.com', 'indeed.com', 'gupy.io'
    ]
    
    return urls.filter(url => {
      try {
        const urlObj = new URL(url)
        const domain = urlObj.hostname.toLowerCase().replace('www.', '')
        
        if (excluidos.some(e => domain.includes(e))) return false
        return nomeSlug.some(palavra => palavra.length >= 3 && domain.includes(palavra))
      } catch {
        return false
      }
    })
  },

  gerarDominiosComuns(nomeEmpresa: string): string[] {
    const slug = nomeEmpresa.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')

    const palavras = nomeEmpresa.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !['ltda', 'eireli', 'mei', 'epp', 'sa'].includes(w))
    
    const primeira = palavras[0] || slug

    return [
      `${slug}.com.br`,
      `${slug}.com`,
      `${primeira}.com.br`,
      `${primeira}.com`,
    ].filter(Boolean)
  },

  async fetchSiteWithRedirect(url: string): Promise<{
    html: string | null
    plataforma: string | null
    finalUrl: string
  }> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) return { html: null, plataforma: null, finalUrl: url }

      const finalUrl = response.url
      const html = await response.text()
      
      if (html.length < 1000) return { html: null, plataforma: null, finalUrl }

      const plataforma = this.detectPlatform(html)

      return { html: html.substring(0, 100000), plataforma, finalUrl }
    } catch {
      return { html: null, plataforma: null, finalUrl: url }
    }
  },

  detectPlatform(html: string): string | null {
    const htmlLower = html.toLowerCase()
    
    // Shopify
    if (htmlLower.includes('shopify') || htmlLower.includes('cdn.shopify.com')) return 'Shopify'
    
    // VTEX
    if (htmlLower.includes('vtex') || htmlLower.includes('vteximg') || htmlLower.includes('vtexcommercestable')) return 'VTEX'
    
    // WooCommerce
    if (htmlLower.includes('woocommerce') || htmlLower.includes('wp-content/plugins/woocommerce')) return 'WooCommerce'
    
    // Magento
    if (htmlLower.includes('magento') || htmlLower.includes('mage/') || htmlLower.includes('/static/version')) return 'Magento'
    
    // Nuvemshop
    if (htmlLower.includes('nuvemshop') || htmlLower.includes('tiendanube')) return 'Nuvemshop'
    
    // Loja Integrada
    if (htmlLower.includes('lojaintegrada') || htmlLower.includes('loja integrada')) return 'Loja Integrada'
    
    // Tray
    if (htmlLower.includes('tray.com') || htmlLower.includes('tray commerce')) return 'Tray'
    
    // WordPress
    if (htmlLower.includes('wp-content') || htmlLower.includes('wordpress')) return 'WordPress'
    
    // Wix
    if (htmlLower.includes('wix.com') || htmlLower.includes('wixstatic')) return 'Wix'
    
    // Squarespace
    if (htmlLower.includes('squarespace')) return 'Squarespace'
    
    // PrestaShop
    if (htmlLower.includes('prestashop')) return 'PrestaShop'
    
    // OpenCart
    if (htmlLower.includes('opencart')) return 'OpenCart'
    
    return null
  },

  extractNomeFantasiaSite(html: string): string | null {
    // Tentar extrair do <title>
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch) {
      const title = titleMatch[1].trim()
      // Limpar sufixos comuns
      const cleaned = title
        .replace(/\s*[-–|]\s*.+$/, '')
        .replace(/\s*-\s*(Loja Virtual|E-commerce|Site Oficial|Home).*$/i, '')
        .trim()
      if (cleaned.length > 2 && cleaned.length < 50) {
        return cleaned
      }
    }
    
    // Tentar og:site_name
    const ogMatch = html.match(/property="og:site_name"\s+content="([^"]+)"/i)
    if (ogMatch) {
      return ogMatch[1].trim()
    }
    
    return null
  },
}

// ============================================================================
// AGENTE 3: EXTRAÇÃO DE CONTATOS DO SITE
// ============================================================================

const AgentContatosSite = {
  async execute(context: AgentContext): Promise<{
    siteContacts: SiteContacts | null
    diretores: Director[]
  }> {
    const diretores = [...context.diretores]
    
    if (!context.siteHtml) {
      return { siteContacts: null, diretores }
    }

    const html = context.siteHtml
    
    // Extrair emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    const emailsRaw = html.match(emailRegex) || []
    const emails = [...new Set(emailsRaw)]
      .filter(email => {
        const lower = email.toLowerCase()
        // Filtrar emails inválidos
        return !lower.includes('.png') && 
               !lower.includes('.jpg') && 
               !lower.includes('.gif') &&
               !lower.includes('.css') &&
               !lower.includes('.js') &&
               !lower.includes('example.com') &&
               !lower.includes('sentry.io') &&
               !lower.includes('wixpress') &&
               lower.includes('.')
      })
      .slice(0, 5)

    // Extrair telefones (brasileiro)
    const telefoneRegex = /(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\s?)?\d{4,5}[-.\s]?\d{4}/g
    const telefonesRaw = html.match(telefoneRegex) || []
    
    // Validar e desduplicar telefones
    const telefonesValidos = deduplicateTelefones(telefonesRaw)

    // Extrair WhatsApp
    let whatsapp: string | undefined
    const whatsappMatch = html.match(/wa\.me\/(\d+)/i) || html.match(/whatsapp[^"]*(\d{10,13})/i)
    if (whatsappMatch) {
      whatsapp = formatWhatsApp(whatsappMatch[1])
    } else if (telefonesValidos.length > 0) {
      // Usar primeiro celular como WhatsApp
      const celular = telefonesValidos.find(t => {
        const nums = normalizeTelefone(t)
        return nums.length === 11 && nums[2] === '9'
      })
      if (celular) {
        whatsapp = formatWhatsApp(celular)
      }
    }

    // Vincular contatos ao primeiro diretor (Sócio-Administrador)
    if (diretores.length > 0 && (emails.length > 0 || telefonesValidos.length > 0)) {
      const adminIndex = diretores.findIndex(d => 
        d.qualificacao?.toLowerCase().includes('administrador') || 
        d.cargo?.toLowerCase().includes('administrador')
      )
      const targetIndex = adminIndex >= 0 ? adminIndex : 0
      
      if (emails.length > 0 && !diretores[targetIndex].email) {
        diretores[targetIndex].email = emails[0]
      }
      if (telefonesValidos.length > 0 && !diretores[targetIndex].telefone) {
        diretores[targetIndex].telefone = telefonesValidos[0]
      }
    }

    const siteContacts: SiteContacts = {
      emails,
      telefones: telefonesValidos,
      whatsapp,
    }

    return { siteContacts, diretores }
  },
}

// ============================================================================
// AGENTE 4: REDES SOCIAIS (BUSCA AGRESSIVA NO GOOGLE)
// ============================================================================

const AgentRedesSociais = {
  async execute(context: AgentContext): Promise<{
    redesSociais: SocialNetwork[]
  }> {
    const redesSociais: SocialNetwork[] = []
    const nomeEmpresa = context.nomeFantasiaSite || context.nomeEmpresa
    const nomeFantasia = context.cnpjData?.nome_fantasia || ''
    const razaoSocial = context.cnpjData?.razao_social || ''
    
    // Primeiro extrair do HTML do site - BUSCA ABRANGENTE
    if (context.siteHtml) {
      // Patterns com href
      const patternsHref = [
        { rede: 'Instagram', pattern: /href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'?\s]+)/gi },
        { rede: 'Facebook', pattern: /href=["'](https?:\/\/(?:www\.)?facebook\.com\/[^"'?\s]+)/gi },
        { rede: 'LinkedIn', pattern: /href=["'](https?:\/\/(?:www\.)?linkedin\.com\/[^"'?\s]+)/gi },
        { rede: 'YouTube', pattern: /href=["'](https?:\/\/(?:www\.)?youtube\.com\/[^"'?\s]+)/gi },
        { rede: 'Twitter', pattern: /href=["'](https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^"'?\s]+)/gi },
        { rede: 'TikTok', pattern: /href=["'](https?:\/\/(?:www\.)?tiktok\.com\/[^"'?\s]+)/gi },
      ]
      
      for (const { rede, pattern } of patternsHref) {
        const matches = [...context.siteHtml.matchAll(pattern)]
        for (const match of matches) {
          const url = match[1]
          if (url && this.validateSocialUrl(url, rede)) {
            if (!redesSociais.find(r => r.rede === rede)) {
              redesSociais.push({ rede, url: this.cleanUrl(url) })
            }
            break
          }
        }
      }
      
      // Busca adicional: procurar qualquer menção de URL de rede social no HTML
      // Isso pega casos onde o link está em onclick, data-href, ou texto
      const patternsDiretos = [
        { rede: 'Instagram', pattern: /(https?:\/\/(?:www\.)?instagram\.com\/[\w.-]+)/gi },
        { rede: 'Facebook', pattern: /(https?:\/\/(?:www\.)?facebook\.com\/[\w.-]+)/gi },
        { rede: 'LinkedIn', pattern: /(https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in|showcase)\/[\w.-]+)/gi },
        { rede: 'YouTube', pattern: /(https?:\/\/(?:www\.)?youtube\.com\/(?:channel|c|user|@)[\w.-]+)/gi },
        { rede: 'Twitter', pattern: /(https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[\w.-]+)/gi },
        { rede: 'TikTok', pattern: /(https?:\/\/(?:www\.)?tiktok\.com\/@[\w.-]+)/gi },
      ]
      
      for (const { rede, pattern } of patternsDiretos) {
        if (redesSociais.find(r => r.rede === rede)) continue // Já encontrou
        
        const matches = [...context.siteHtml.matchAll(pattern)]
        for (const match of matches) {
          const url = match[1]
          if (url && this.validateSocialUrl(url, rede)) {
            redesSociais.push({ rede, url: this.cleanUrl(url) })
            break
          }
        }
      }
      
      // Busca ainda mais agressiva para LinkedIn: procurar qualquer link com "linkedin.com"
      if (!redesSociais.find(r => r.rede === 'LinkedIn')) {
        const linkedinPattern = /["'](https?:\/\/(?:www\.)?linkedin\.com\/[^"'\s<>]+)["']/gi
        const matches = [...context.siteHtml.matchAll(linkedinPattern)]
        for (const match of matches) {
          const url = match[1]
          // Validar que não é um link genérico (share, login, etc)
          if (url && 
              !url.includes('/share') && 
              !url.includes('/login') && 
              !url.includes('/signup') &&
              !url.includes('/pulse') &&
              !url.includes('/learning')) {
            redesSociais.push({ rede: 'LinkedIn', url: this.cleanUrl(url) })
            break
          }
        }
      }
    }

    // Buscar no Google as redes que não foram encontradas - COM MÚLTIPLAS QUERIES
    const redesParaBuscar = ['Instagram', 'Facebook', 'LinkedIn', 'YouTube', 'Twitter']
      .filter(rede => !redesSociais.find(r => r.rede === rede))

    for (const rede of redesParaBuscar) {
      const url = await this.searchSocialNetwork(rede, nomeEmpresa, nomeFantasia, razaoSocial, context.cnpjData?.uf)
      if (url) {
        redesSociais.push({ rede, url })
      }
    }

    return { redesSociais }
  },

  async searchSocialNetwork(
    rede: string, 
    nomeEmpresa: string, 
    nomeFantasia: string, 
    razaoSocial: string,
    uf?: string
  ): Promise<string | null> {
    const domain = rede === 'Twitter' ? 'twitter.com OR x.com' : `${rede.toLowerCase()}.com`
    
    // Tentar múltiplas queries para aumentar chances
    const queries = [
      `"${nomeEmpresa}" site:${domain}`,
      nomeFantasia ? `"${nomeFantasia}" site:${domain}` : null,
      `${nomeEmpresa} ${rede === 'LinkedIn' ? 'empresa' : 'oficial'} site:${domain}`,
      uf ? `"${nomeEmpresa}" ${uf} site:${domain}` : null,
    ].filter(Boolean) as string[]

    for (const query of queries) {
      const results = await searchGoogle(query)
      
      for (const url of results.slice(0, 3)) {
        if (this.validateSocialUrl(url, rede)) {
          return this.cleanUrl(url)
        }
      }
    }

    // Para LinkedIn, tentar busca específica por página de empresa
    if (rede === 'LinkedIn') {
      const linkedInQueries = [
        `site:linkedin.com/company "${nomeEmpresa}"`,
        `site:linkedin.com/company "${nomeFantasia}"`,
        `linkedin.com/company ${nomeEmpresa.split(' ').slice(0, 2).join(' ')}`,
      ].filter(q => !q.includes('""'))

      for (const query of linkedInQueries) {
        const results = await searchGoogle(query)
        for (const url of results.slice(0, 3)) {
          if (url.includes('linkedin.com/company/')) {
            return this.cleanUrl(url)
          }
        }
      }
    }

    return null
  },

  cleanUrl(url: string): string {
    // Remover parâmetros de query e trailing slashes
    try {
      const urlObj = new URL(url)
      let clean = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`
      // Remover trailing slash exceto para root
      if (clean.endsWith('/') && clean.split('/').length > 4) {
        clean = clean.slice(0, -1)
      }
      return clean
    } catch {
      return url
    }
  },

  validateSocialUrl(url: string, rede: string): boolean {
    const urlLower = url.toLowerCase()
    
    switch (rede) {
      case 'Instagram':
        return urlLower.includes('instagram.com/') && 
               !urlLower.includes('/p/') && 
               !urlLower.includes('/reel/') &&
               !urlLower.includes('/stories/')
      case 'Facebook':
        return urlLower.includes('facebook.com/') && 
               !urlLower.includes('/posts/') && 
               !urlLower.includes('/photos/') &&
               !urlLower.includes('/videos/')
      case 'LinkedIn':
        return urlLower.includes('linkedin.com/company/') || 
               urlLower.includes('linkedin.com/in/')
      case 'YouTube':
        return urlLower.includes('youtube.com/') && 
               (urlLower.includes('/channel/') || 
                urlLower.includes('/c/') || 
                urlLower.includes('/@') ||
                urlLower.includes('/user/'))
      case 'Twitter':
        return (urlLower.includes('twitter.com/') || urlLower.includes('x.com/')) && 
               !urlLower.includes('/status/') &&
               !urlLower.includes('/i/')
      case 'TikTok':
        return urlLower.includes('tiktok.com/@')
      default:
        return true
    }
  },
}

// ============================================================================
// AGENTE 5: MARKETING DIGITAL (GOOGLE/META ADS)
// ============================================================================

const AgentMarketingDigital = {
  async execute(context: AgentContext): Promise<{
    campanhas_google: number | null
    campanhas_meta: number | null
  }> {
    let campanhas_google: number | null = null
    let campanhas_meta: number | null = null

    // Buscar no Google Ads Transparency
    if (context.siteUrl) {
      try {
        const domain = new URL(context.siteUrl).hostname.replace('www.', '')
        
        // Buscar na página de transparência do Google
        const googleAdsUrl = `https://adstransparency.google.com/?region=BR&domain=${domain}`
        const searchResults = await searchGoogle(`site:adstransparency.google.com "${domain}"`)
        
        if (searchResults.length > 0) {
          // Se encontrou resultados, a empresa provavelmente tem anúncios
          campanhas_google = 1 // Indicador de que tem anúncios ativos
        }
      } catch {
        // Ignore
      }
    }

    // Verificar presença de pixels no site
    if (context.siteHtml) {
      const html = context.siteHtml.toLowerCase()
      
      // Google Ads
      if (html.includes('googleadservices') || 
          html.includes('googletag') || 
          html.includes('gtag') ||
          html.includes('google_conversion') ||
          html.includes('ads/ga-audiences')) {
        campanhas_google = campanhas_google || 1
      }
      
      // Meta/Facebook Ads
      if (html.includes('fbq(') || 
          html.includes('facebook.net/') ||
          html.includes('fb-pixel') ||
          html.includes('connect.facebook.net') ||
          html.includes('facebook-jssdk')) {
        campanhas_meta = 1
      }
    }

    // Buscar na biblioteca de anúncios do Meta
    const nomeParaBuscar = context.nomeFantasiaSite || context.nomeEmpresa
    if (nomeParaBuscar) {
      const metaResults = await searchGoogle(`site:facebook.com/ads/library "${nomeParaBuscar}"`)
      if (metaResults.length > 0) {
        campanhas_meta = campanhas_meta || 1
      }
    }

    return { campanhas_google, campanhas_meta }
  },
}

// ============================================================================
// AGENTE 6: MARKETPLACES (BUSCA AGRESSIVA EM MÚLTIPLOS CANAIS)
// ============================================================================

const AgentMarketplaces = {
  async execute(context: AgentContext): Promise<{
    marketplace: { presente: boolean; lojas: Array<{ nome: string; url: string }> } | null
  }> {
    const lojas: Array<{ nome: string; url: string }> = []
    const nomeEmpresa = context.nomeFantasiaSite || context.nomeEmpresa
    const nomeFantasia = context.cnpjData?.nome_fantasia || ''
    const razaoSocial = context.cnpjData?.razao_social || ''

    const marketplaces = [
      { 
        nome: 'Mercado Livre', 
        domain: 'mercadolivre.com.br',
        lojaPatterns: ['/perfil/', '/vendedor/', 'lista.mercadolivre.com.br', '/MLB-'],
        queries: [
          // Busca direta pela razão social
          `site:mercadolivre.com.br ${razaoSocial}`,
          // Busca pelo nome fantasia
          nomeFantasia ? `site:mercadolivre.com.br ${nomeFantasia}` : null,
          // Busca pelo nome da empresa
          `site:mercadolivre.com.br ${nomeEmpresa}`,
          // Busca por vendedor específico
          `site:mercadolivre.com.br vendedor "${nomeEmpresa}"`,
          `site:lista.mercadolivre.com.br "${nomeEmpresa}"`,
        ]
      },
      { 
        nome: 'Amazon', 
        domain: 'amazon.com.br',
        lojaPatterns: ['/sp?seller=', '/stores/', '/gp/help/seller/'],
        queries: [
          `site:amazon.com.br ${razaoSocial}`,
          nomeFantasia ? `site:amazon.com.br ${nomeFantasia}` : null,
          `site:amazon.com.br/sp ${nomeEmpresa}`,
          `site:amazon.com.br/stores ${nomeEmpresa}`,
        ]
      },
      { 
        nome: 'Shopee', 
        domain: 'shopee.com.br',
        lojaPatterns: ['/shop/', 'shopee.com.br/'],
        queries: [
          `site:shopee.com.br ${razaoSocial}`,
          nomeFantasia ? `site:shopee.com.br ${nomeFantasia}` : null,
          `site:shopee.com.br ${nomeEmpresa}`,
        ]
      },
      { 
        nome: 'Magazine Luiza', 
        domain: 'magazineluiza.com.br',
        lojaPatterns: ['/lojista/', '/seller/', '/parceiro/'],
        queries: [
          `site:magazineluiza.com.br ${razaoSocial}`,
          nomeFantasia ? `site:magazineluiza.com.br ${nomeFantasia}` : null,
          `site:magazineluiza.com.br parceiro ${nomeEmpresa}`,
        ]
      },
      { 
        nome: 'Americanas', 
        domain: 'americanas.com.br',
        lojaPatterns: ['/lojista/', '/seller/', '/parceiro/'],
        queries: [
          `site:americanas.com.br ${razaoSocial}`,
          nomeFantasia ? `site:americanas.com.br ${nomeFantasia}` : null,
        ]
      },
      { 
        nome: 'Casas Bahia', 
        domain: 'casasbahia.com.br',
        lojaPatterns: ['/parceiro/', '/seller/'],
        queries: [
          `site:casasbahia.com.br ${razaoSocial}`,
          nomeFantasia ? `site:casasbahia.com.br ${nomeFantasia}` : null,
        ]
      },
      { 
        nome: 'Elo7', 
        domain: 'elo7.com.br',
        lojaPatterns: ['/loja/'],
        queries: [
          `site:elo7.com.br ${razaoSocial}`,
          nomeFantasia ? `site:elo7.com.br ${nomeFantasia}` : null,
        ]
      },
      { 
        nome: 'OLX', 
        domain: 'olx.com.br',
        lojaPatterns: ['/perfil/', '/u/'],
        queries: [
          `site:olx.com.br ${razaoSocial}`,
          nomeFantasia ? `site:olx.com.br ${nomeFantasia}` : null,
        ]
      },
    ]

    for (const mp of marketplaces) {
      // Tentar múltiplas queries para cada marketplace
      const queries = mp.queries.filter(Boolean) as string[]
      
      for (const query of queries) {
        const results = await searchGoogle(query)
        
        // Verificar se é uma loja (não apenas um produto)
        const lojaUrl = results.find(url => {
          const urlLower = url.toLowerCase()
          // Verificar patterns específicos de loja
          const isLoja = mp.lojaPatterns.some(pattern => urlLower.includes(pattern.toLowerCase()))
          // Para Mercado Livre, qualquer lista pode ser uma loja
          if (mp.nome === 'Mercado Livre' && urlLower.includes('lista.mercadolivre.com.br')) {
            return true
          }
          // Para Shopee, qualquer /shop/ é uma loja
          if (mp.nome === 'Shopee' && urlLower.includes('shopee.com.br/')) {
            return !urlLower.includes('/product/') && !urlLower.includes('/i.')
          }
          return isLoja
        })
        
        if (lojaUrl && !lojas.find(l => l.nome === mp.nome)) {
          lojas.push({ nome: mp.nome, url: lojaUrl })
          break // Encontrou para este marketplace, ir para o próximo
        }
      }
    }

    // Busca adicional: verificar no HTML do site se menciona marketplaces
    if (context.siteHtml) {
      const htmlLower = context.siteHtml.toLowerCase()
      const marketplaceMentions = [
        { nome: 'Mercado Livre', patterns: ['mercadolivre.com', 'mercadolibre.com', 'meli.com'] },
        { nome: 'Amazon', patterns: ['amazon.com.br', 'amzn.to'] },
        { nome: 'Shopee', patterns: ['shopee.com.br'] },
        { nome: 'Magazine Luiza', patterns: ['magazineluiza.com.br', 'magalu.com'] },
      ]
      
      for (const mention of marketplaceMentions) {
        if (lojas.find(l => l.nome === mention.nome)) continue
        
        for (const pattern of mention.patterns) {
          const regex = new RegExp(`href=["'](https?://[^"']*${pattern.replace('.', '\\.')}[^"']*)["']`, 'gi')
          const match = context.siteHtml.match(regex)
          if (match) {
            const url = match[0].match(/href=["']([^"']+)["']/)?.[1]
            if (url) {
              lojas.push({ nome: mention.nome, url })
              break
            }
          }
        }
      }
    }

    return {
      marketplace: lojas.length > 0 ? { presente: true, lojas } : { presente: false, lojas: [] }
    }
  },
}

// ============================================================================
// AGENTE 7: CLASSIFICAÇÃO DE TIPO DE SITE E BUSCA DE BLOG
// ============================================================================

const AgentClassificacaoSite = {
  async execute(context: AgentContext): Promise<{
    siteTipo: string | null
    siteBlog: string | null
  }> {
    let siteTipo: string | null = null
    let siteBlog: string | null = null

    const nomeEmpresa = context.nomeFantasiaSite || context.cnpjData?.nome_fantasia || context.cnpjData?.razao_social || ''

    // ETAPA 1: Classificar o tipo do site principal
    if (context.siteHtml && context.siteUrl) {
      siteTipo = this.classifySiteType(context.siteHtml, context.plataforma, context.siteUrl)
    }

    // ETAPA 2: Buscar blog da empresa
    if (nomeEmpresa) {
      const blog = await this.searchBlogSite(nomeEmpresa, context.cnpjData?.uf)
      if (blog && blog.url !== context.siteUrl && blog.url !== context.siteEcommerce) {
        siteBlog = blog.url
      }
    }

    return { siteTipo, siteBlog }
  },

  classifySiteType(html: string, plataforma: string | null, url: string): string {
    const htmlLower = html.toLowerCase()
    const urlLower = url.toLowerCase()
    
    // Verificar se é e-commerce pela plataforma
    const ecommercePlatforms = [
      'Shopify', 'VTEX', 'WooCommerce', 'Magento', 'Nuvemshop', 
      'Loja Integrada', 'Tray', 'PrestaShop', 'OpenCart', 'Mercado Shops'
    ]
    if (plataforma && ecommercePlatforms.some(p => plataforma.toLowerCase().includes(p.toLowerCase()))) {
      return 'ecommerce'
    }
    
    // Indicadores de e-commerce no HTML
    const ecommerceIndicators = [
      'add-to-cart', 'adicionar ao carrinho', 'comprar agora', 'buy now',
      'shopping-cart', 'carrinho de compras', 'checkout', 'finalizar compra',
      'product-price', 'preco', 'frete', 'shipping', 'parcelamento',
      'woocommerce', 'shopify', 'vtex', 'magento', 'nuvemshop', 'loja integrada'
    ]
    
    const ecommerceScore = ecommerceIndicators.filter(i => htmlLower.includes(i)).length
    if (ecommerceScore >= 3) {
      return 'ecommerce'
    }
    
    // Indicadores de blog
    const blogIndicators = [
      '/blog', 'blog.', 'artigos', 'articles', 'posts', 'noticias', 'news',
      'publicado em', 'published', 'autor:', 'author:', 'categoria:', 'category:',
      'wordpress', 'wp-content', 'blogger', 'medium.com', 'substack',
      'comentarios', 'comments', 'leia mais', 'read more', 'continue lendo'
    ]
    
    const blogScore = blogIndicators.filter(i => htmlLower.includes(i) || urlLower.includes(i)).length
    if (blogScore >= 3 || urlLower.includes('/blog') || urlLower.includes('blog.')) {
      return 'blog'
    }
    
    // Indicadores de landing page
    const landingIndicators = [
      'hero-section', 'cta-button', 'call-to-action', 'cadastre-se', 'sign up',
      'comece agora', 'get started', 'solicite', 'request demo', 'free trial'
    ]
    
    const landingScore = landingIndicators.filter(i => htmlLower.includes(i)).length
    const linksCount = (html.match(/<a[^>]+href/gi) || []).length
    if (landingScore >= 2 && linksCount < 20) {
      return 'landing_page'
    }
    
    // Indicadores de site institucional
    const institucionalIndicators = [
      'sobre nos', 'about us', 'quem somos', 'nossa historia', 'our history',
      'missao', 'mission', 'visao', 'vision', 'valores', 'values',
      'contato', 'contact', 'fale conosco', 'trabalhe conosco', 'careers',
      'servicos', 'services', 'solucoes', 'solutions', 'clientes', 'clients'
    ]
    
    const institucionalScore = institucionalIndicators.filter(i => htmlLower.includes(i)).length
    if (institucionalScore >= 2) {
      return 'institucional'
    }
    
    // Default: institucional (mais comum)
    return 'institucional'
  },

  async searchBlogSite(nomeEmpresa: string, uf?: string): Promise<{ url: string; html: string | null } | null> {
    const queries = [
      `blog ${nomeEmpresa}`,
      `"${nomeEmpresa}" blog`,
      `"${nomeEmpresa}" artigos`,
      `"${nomeEmpresa}" noticias`,
      uf ? `blog ${nomeEmpresa} ${uf}` : null,
    ].filter(Boolean) as string[]

    for (const query of queries) {
      const results = await searchGoogle(query)
      
      for (const url of results.slice(0, 5)) {
        try {
          const urlObj = new URL(url)
          const domain = urlObj.hostname.toLowerCase()
          const path = urlObj.pathname.toLowerCase()
          
          const excluidos = ['facebook.com', 'instagram.com', 'linkedin.com', 'twitter.com', 'youtube.com', 'medium.com']
          if (excluidos.some(e => domain.includes(e))) continue
          
          // Verificar se é blog pelo URL ou subdomínio
          if (domain.includes('blog.') || path.includes('/blog') || path.includes('/artigos') || path.includes('/noticias')) {
            // Fazer fetch para confirmar que é um blog
            try {
              const controller = new AbortController()
              const timeoutId = setTimeout(() => controller.abort(), 5000)
              
              const response = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadEnricher/1.0)' },
                signal: controller.signal,
                redirect: 'follow',
              })
              
              clearTimeout(timeoutId)
              
              if (response.ok) {
                const html = await response.text()
                const tipo = this.classifySiteType(html, null, url)
                if (tipo === 'blog') {
                  return { url, html }
                }
              }
            } catch {
              continue
            }
          }
        } catch {
          continue
        }
      }
    }

    return null
  },
}

// ============================================================================
// AGENTE 7: RESUMO INTELIGENTE (IA ANALISA TUDO)
// ============================================================================

const AgentResumoInteligente = {
  async execute(
    context: AgentContext, 
    extras: { 
      marketingResult: { campanhas_google: number | null; campanhas_meta: number | null }
      marketplaceResult: { marketplace: { presente: boolean; lojas: Array<{ nome: string; url: string }> } | null }
    }
  ): Promise<{
    resumo: string | null
    canais_vendas: string[] | null
  }> {
    try {
      // Preparar contexto completo para a IA
      const dadosCompletos = {
        empresa: {
          razao_social: context.cnpjData?.razao_social,
          nome_fantasia: context.cnpjData?.nome_fantasia || context.nomeFantasiaSite,
          cnae: context.cnpjData?.cnae_fiscal_descricao,
          porte: context.cnpjData?.porte,
          capital_social: context.cnpjData?.capital_social,
          tempo_mercado: context.cnpjData?.data_inicio_atividade,
          cidade_uf: `${context.cnpjData?.municipio || ''}/${context.cnpjData?.uf || ''}`,
        },
        analise: {
          classificacao: context.classificacao,
          modelo_negocio: context.modeloNegocio,
          segmento: context.segmento,
          atuacao: context.atuacao,
        },
        presenca_digital: {
          site: context.siteUrl,
          plataforma: context.plataforma,
          redes_sociais: context.redesSociais.map(r => r.rede).join(', '),
          tem_google_ads: extras.marketingResult.campanhas_google ? 'Sim' : 'Não detectado',
          tem_meta_ads: extras.marketingResult.campanhas_meta ? 'Sim' : 'Não detectado',
        },
        marketplace: {
          presente: extras.marketplaceResult.marketplace?.presente ? 'Sim' : 'Não',
          lojas: extras.marketplaceResult.marketplace?.lojas.map(l => l.nome).join(', ') || 'Nenhuma',
        },
        contatos: {
          diretores: context.diretores.length,
          emails_encontrados: context.siteContacts?.emails?.length || 0,
          telefones_encontrados: context.siteContacts?.telefones?.length || 0,
        },
      }

      const result = await generateText({
        model: "openai/gpt-4o-mini",
        temperature: 0.3,
        maxOutputTokens: 1000,
        output: Output.object({
          schema: z.object({
            resumo: z.string().describe("Resumo executivo de 2-3 parágrafos sobre a empresa"),
            canais_vendas: z.array(z.string()).describe("Lista de canais de venda identificados"),
          })
        }),
        prompt: `Você é um analista de inteligência comercial B2B. Analise os dados abaixo e gere:

1. RESUMO EXECUTIVO: Um texto profissional de 2-3 parágrafos descrevendo a empresa, seu mercado de atuação, presença digital e potencial como lead.

2. CANAIS DE VENDA: Liste os canais de venda identificados (ex: "Site próprio", "Mercado Livre", "Loja física", "Representantes", etc)

DADOS DA EMPRESA:
${JSON.stringify(dadosCompletos, null, 2)}

REGRAS:
- Seja objetivo e profissional
- Use os dados fornecidos, não invente informações
- O resumo deve ser útil para um vendedor B2B que vai prospectar esta empresa
- Mencione pontos relevantes como tempo de mercado, porte, presença digital
- Se a empresa tem presença em marketplaces, mencione
- Se tem anúncios ativos (Google/Meta), mencione que investe em marketing digital`,
      })

      const resumoGerado = result.object?.resumo ?? null
      const canaisVenda = result.object?.canais_vendas ?? null
      
      // Se não conseguiu gerar resumo, criar um básico
      if (!resumoGerado) {
        const nomeEmpresa = context.cnpjData?.nome_fantasia || context.cnpjData?.razao_social || 'Empresa'
        const resumoBasico = `${nomeEmpresa} é uma empresa do segmento de ${context.segmento || 'serviços'}, classificada como ${context.classificacao || 'empresa'} com modelo de negócio ${context.modeloNegocio || 'B2B'}. ${context.cnpjData?.municipio ? `Localizada em ${context.cnpjData.municipio}/${context.cnpjData.uf}.` : ''} ${context.siteUrl ? `Possui presença digital através do site ${context.siteUrl}.` : 'Não foi identificado site oficial.'}`
        
        return {
          resumo: resumoBasico,
          canais_vendas: canaisVenda || [context.siteUrl ? 'Site próprio' : 'Não identificado'],
        }
      }

      return {
        resumo: resumoGerado,
        canais_vendas: canaisVenda,
      }
    } catch (error) {
      console.error("Erro no resumo inteligente:", error)
      // Gerar resumo básico como fallback
      const nomeEmpresa = context.cnpjData?.nome_fantasia || context.cnpjData?.razao_social || 'Empresa'
      const resumoBasico = `${nomeEmpresa} é uma empresa do segmento de ${context.segmento || 'serviços'}, classificada como ${context.classificacao || 'empresa'} com modelo de negócio ${context.modeloNegocio || 'B2B'}. ${context.cnpjData?.municipio ? `Localizada em ${context.cnpjData.municipio}/${context.cnpjData.uf}.` : ''}`
      return { 
        resumo: resumoBasico, 
        canais_vendas: [context.siteUrl ? 'Site próprio' : 'Não identificado'] 
      }
    }
  },
}

// ============================================================================
// EXTRAÇÃO DE DADOS OFICIAIS
// ============================================================================

function extractOfficialData(cnpjData: CNPJData) {
  // Calcular tempo de mercado
  let tempoMercado: string | null = null
  if (cnpjData.data_inicio_atividade) {
    const inicio = new Date(cnpjData.data_inicio_atividade)
    const hoje = new Date()
    const anos = Math.floor((hoje.getTime() - inicio.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    if (anos >= 1) {
      tempoMercado = `${anos} ano${anos > 1 ? 's' : ''}`
    } else {
      const meses = Math.floor((hoje.getTime() - inicio.getTime()) / (30 * 24 * 60 * 60 * 1000))
      tempoMercado = `${meses} ${meses > 1 ? 'meses' : 'mês'}`
    }
  }

  // Formatar capital social CORRETAMENTE
  // A BrasilAPI retorna o valor em CENTAVOS, então dividir por 100
  let capitalSocial: string | null = null
  if (cnpjData.capital_social && cnpjData.capital_social > 0) {
    // Converter de centavos para reais
    const valorEmReais = cnpjData.capital_social / 100
    capitalSocial = `R$ ${valorEmReais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Extrair CNAE
  const cnaeCodigo = cnpjData.cnae_fiscal ? String(cnpjData.cnae_fiscal) : null

  return {
    razao_social: cnpjData.razao_social || null,
    nome_fantasia: cnpjData.nome_fantasia || null,
    tempo_mercado: tempoMercado,
    capital_social: capitalSocial,
    cnae_codigo: cnaeCodigo,
    cnae_descricao: cnpjData.cnae_fiscal_descricao || null,
    cnaes_secundarios: cnpjData.cnaes_secundarios?.map(c => ({
      codigo: String(c.codigo),
      descricao: c.descricao,
    })) || null,
    endereco_logradouro: cnpjData.logradouro || null,
    endereco_numero: cnpjData.numero || null,
    endereco_complemento: cnpjData.complemento || null,
    endereco_bairro: cnpjData.bairro || null,
    endereco_cidade: cnpjData.municipio || null,
    endereco_estado: cnpjData.uf || null,
    endereco_cep: cnpjData.cep || null,
    endereco_pais: 'Brasil',
  }
}
