import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, getProfile } from "@/lib/auth"
import { isClientUser } from "@/lib/rbac"
import type { ContentType } from "@/lib/types"

// GET - List content history for a client
export async function GET(
  request: Request,
  { params }: { params: Promise<{ client_slug: string }> }
) {
  try {
    await requireAuth()
    const profile = await getProfile()
    
    // Block client users from accessing content API
    if (profile && isClientUser(profile.role)) {
      return NextResponse.json({ error: "Acesso nao permitido" }, { status: 403 })
    }
    
    const { client_slug } = await params
    const supabase = await createClient()

    // Get client by slug
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("slug", client_slug)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
    }

    // Get query params for filtering
    const url = new URL(request.url)
    const contentType = url.searchParams.get("type") as ContentType | null
    const limit = parseInt(url.searchParams.get("limit") || "50")

    let query = supabase
      .from("client_content_history")
      .select("*")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (contentType) {
      query = query.eq("content_type", contentType)
    }

    const { data: contents, error } = await query

    if (error) {
      console.error("Error fetching content history:", error)
      return NextResponse.json({ error: "Erro ao buscar histórico" }, { status: 500 })
    }

    return NextResponse.json({ contents })
  } catch (error) {
    console.error("Content history error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// POST - Save new content to history
export async function POST(
  request: Request,
  { params }: { params: Promise<{ client_slug: string }> }
) {
  try {
    const user = await requireAuth()
    const profile = await getProfile()
    
    // Block client users from saving content
    if (profile && isClientUser(profile.role)) {
      return NextResponse.json({ error: "Acesso nao permitido" }, { status: 403 })
    }
    
    const { client_slug } = await params
    const supabase = await createClient()

    // Get client by slug
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("slug", client_slug)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
    }

    const body = await request.json()
    const { content_type, title, content, input_params, ai_model } = body

    if (!content_type || !title || !content) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 })
    }

    // Save content
    const { data: newContent, error } = await supabase
      .from("client_content_history")
      .insert({
        client_id: client.id,
        user_id: user.id,
        content_type,
        title,
        content,
        input_params: input_params || {},
        ai_model: ai_model || "gpt-4o",
      })
      .select()
      .single()

    if (error) {
      console.error("Error saving content:", error)
      return NextResponse.json({ error: "Erro ao salvar conteúdo" }, { status: 500 })
    }

    return NextResponse.json({ content: newContent })
  } catch (error) {
    console.error("Save content error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
