import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, getProfile } from "@/lib/auth"
import { isClientUser } from "@/lib/rbac"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ client_slug: string; competitor_id: string }> }
) {
  try {
    await requireAuth()
    const profile = await getProfile()
    
    // Block client users from modifying competitors
    if (profile && isClientUser(profile.role)) {
      return NextResponse.json({ error: "Acesso nao permitido" }, { status: 403 })
    }
    
    const { client_slug, competitor_id } = await params
    const supabase = await createClient()
    const body = await request.json()

    // Get client by slug
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("slug", client_slug)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 })
    }

    // Build update object
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    
    if (body.name !== undefined) updates.name = body.name.trim()
    if (body.website !== undefined) updates.website = body.website || null
    if (body.segment !== undefined) updates.segment = body.segment || null
    if (body.notes !== undefined) updates.notes = body.notes || null
    if (body.is_active !== undefined) updates.is_active = body.is_active

    // Update competitor
    const { data: competitor, error } = await supabase
      .from("client_competitors")
      .update(updates)
      .eq("id", competitor_id)
      .eq("client_id", client.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating competitor:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ competitor })
  } catch (error) {
    console.error("Error in PATCH competitor:", error)
    return NextResponse.json({ error: "Erro ao atualizar concorrente" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ client_slug: string; competitor_id: string }> }
) {
  try {
    await requireAuth()
    const profile = await getProfile()
    
    // Block client users from deleting competitors
    if (profile && isClientUser(profile.role)) {
      return NextResponse.json({ error: "Acesso nao permitido" }, { status: 403 })
    }
    
    const { client_slug, competitor_id } = await params
    const supabase = await createClient()

    // Get client by slug
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("slug", client_slug)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 })
    }

    // Delete competitor
    const { error } = await supabase
      .from("client_competitors")
      .delete()
      .eq("id", competitor_id)
      .eq("client_id", client.id)

    if (error) {
      console.error("Error deleting competitor:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE competitor:", error)
    return NextResponse.json({ error: "Erro ao excluir concorrente" }, { status: 500 })
  }
}
