import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, getProfile } from "@/lib/auth"
import { isClientUser } from "@/lib/rbac"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ client_slug: string }> }
) {
  try {
    await requireAuth()
    const profile = await getProfile()
    const { client_slug } = await params

    // Block client users
    if (profile && isClientUser(profile.role)) {
      return NextResponse.json({ error: "Acesso nao permitido" }, { status: 403 })
    }

    const supabase = await createClient()

    // Get client
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name")
      .eq("slug", client_slug)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 })
    }

    // Get all post history for this client
    const { data: history, error: historyError } = await supabase
      .from("client_content_history")
      .select("*")
      .eq("client_id", client.id)
      .eq("content_type", "post")
      .order("created_at", { ascending: false })

    if (historyError) {
      return NextResponse.json({ error: "Erro ao buscar historico" }, { status: 500 })
    }

    return NextResponse.json({ 
      history: history || [],
      clientName: client.name 
    })
  } catch (error) {
    console.error("Error fetching posts history:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
