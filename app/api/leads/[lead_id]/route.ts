import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET - Busca um lead específico
export async function GET(
  request: Request,
  { params }: { params: Promise<{ lead_id: string }> }
) {
  try {
    const { lead_id } = await params
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { data: lead, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .single()

    if (error || !lead) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 })
    }

    return NextResponse.json(lead)
  } catch (error) {
    console.error("Erro interno:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// DELETE - Remove um lead
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ lead_id: string }> }
) {
  try {
    const { lead_id } = await params
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", lead_id)

    if (error) {
      console.error("Erro ao excluir lead:", error)
      return NextResponse.json({ error: "Erro ao excluir lead" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro interno:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// PATCH - Atualiza um lead
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ lead_id: string }> }
) {
  try {
    const { lead_id } = await params
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()

    const { data: lead, error } = await supabase
      .from("leads")
      .update(body)
      .eq("id", lead_id)
      .select()
      .single()

    if (error) {
      console.error("Erro ao atualizar lead:", error)
      return NextResponse.json({ error: "Erro ao atualizar lead" }, { status: 500 })
    }

    return NextResponse.json(lead)
  } catch (error) {
    console.error("Erro interno:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
