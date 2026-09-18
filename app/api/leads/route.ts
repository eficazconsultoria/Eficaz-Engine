import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET - Lista leads com paginação
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Parâmetros de paginação
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "50")
    const all = searchParams.get("all") === "true" // Para exportação
    
    // Se "all=true", buscar todos sem paginação (para exportação)
    if (all) {
      const { data: leads, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Erro ao buscar leads:", error)
        return NextResponse.json({ error: "Erro ao buscar leads" }, { status: 500 })
      }

      return NextResponse.json({
        leads,
        total: leads?.length || 0,
        page: 1,
        pageSize: leads?.length || 0,
        totalPages: 1,
      })
    }

    // Calcular offset
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Buscar total de registros
    const { count, error: countError } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })

    if (countError) {
      console.error("Erro ao contar leads:", countError)
    }

    // Buscar leads paginados
    const { data: leads, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) {
      console.error("Erro ao buscar leads:", error)
      return NextResponse.json({ error: "Erro ao buscar leads" }, { status: 500 })
    }

    const total = count || 0
    const totalPages = Math.ceil(total / pageSize)

    return NextResponse.json({
      leads,
      total,
      page,
      pageSize,
      totalPages,
    })
  } catch (error) {
    console.error("Erro interno:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// POST - Cria um novo lead
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { cnpj, razao_social, nome_fantasia, site, segmento, endereco_cidade, endereco_estado } = body

    // Validação do CNPJ
    if (!cnpj) {
      return NextResponse.json({ error: "CNPJ é obrigatório" }, { status: 400 })
    }

    const cleanedCNPJ = cnpj.replace(/\D/g, "")
    if (cleanedCNPJ.length !== 14) {
      return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 })
    }

    // Verificar se já existe
    const { data: existing } = await supabase
      .from("leads")
      .select("id")
      .eq("cnpj", cleanedCNPJ)
      .single()

    if (existing) {
      return NextResponse.json({ error: "CNPJ já cadastrado" }, { status: 409 })
    }

    // Criar lead
    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        cnpj: cleanedCNPJ,
        razao_social: razao_social || null,
        nome_fantasia: nome_fantasia || null,
        site: site || null,
        segmento: segmento || null,
        endereco_cidade: endereco_cidade || null,
        endereco_estado: endereco_estado || null,
        created_by: user.id,
        status: "pendente",
      })
      .select()
      .single()

    if (error) {
      console.error("Erro ao criar lead:", error)
      return NextResponse.json({ error: "Erro ao criar lead" }, { status: 500 })
    }

    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    console.error("Erro interno:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
