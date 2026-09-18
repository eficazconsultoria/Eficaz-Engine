import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ client_slug: string; audit_id: string }> }
) {
  const { audit_id } = await params
  const supabase = await createClient()
  const body = await request.json()

  const { status } = body

  if (!status || !["pendente", "em_progresso", "resolvido"].includes(status)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("site_audits")
    .update({ 
      status,
      updated_at: new Date().toISOString()
    })
    .eq("id", audit_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ audit: data })
}
