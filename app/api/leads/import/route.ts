import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST - Importa múltiplos leads
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { leads } = body

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: "Lista de leads inválida" }, { status: 400 })
    }

    // Preparar leads para inserção
    const leadsToInsert = leads.map((lead: {
      cnpj: string
      razao_social?: string
      nome_fantasia?: string
      site?: string
      segmento?: string
      cidade?: string
      estado?: string
    }) => ({
      cnpj: lead.cnpj.replace(/\D/g, ""),
      razao_social: lead.razao_social || null,
      nome_fantasia: lead.nome_fantasia || null,
      site: lead.site || null,
      segmento: lead.segmento || null,
      endereco_cidade: lead.cidade || null,
      endereco_estado: lead.estado || null,
      created_by: user.id,
      status: "pendente",
    }))

    // Inserir em lote, ignorando duplicatas
    const { data: insertedLeads, error } = await supabase
      .from("leads")
      .upsert(leadsToInsert, {
        onConflict: "cnpj",
        ignoreDuplicates: true,
      })
      .select()

    if (error) {
      console.error("Erro ao importar leads:", error)
      return NextResponse.json({ error: "Erro ao importar leads" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      imported: insertedLeads?.length || 0,
      total: leads.length,
    })
  } catch (error) {
    console.error("Erro interno:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
