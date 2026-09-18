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
    
    // Block client users from accessing competitors list API
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
      return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 })
    }

    // Get competitors
    const { data: competitors, error } = await supabase
      .from("client_competitors")
      .select("*")
      .eq("client_id", client.id)
      .order("name", { ascending: true })

    if (error) {
      console.error("Error fetching competitors:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ competitors: competitors || [] })
  } catch (error) {
    console.error("Error in GET competitors:", error)
    return NextResponse.json({ error: "Erro ao buscar concorrentes" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ client_slug: string }> }
) {
  try {
    await requireAuth()
    const profile = await getProfile()
    
    // Block client users from creating competitors
    if (profile && isClientUser(profile.role)) {
      return NextResponse.json({ error: "Acesso nao permitido" }, { status: 403 })
    }
    
    const { client_slug } = await params
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

    // Validate
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Nome e obrigatorio" }, { status: 400 })
    }

    // Insert competitor
    const { data: competitor, error } = await supabase
      .from("client_competitors")
      .insert({
        client_id: client.id,
        name: body.name.trim(),
        website: body.website || null,
        segment: body.segment || null,
        notes: body.notes || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating competitor:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ competitor })
  } catch (error) {
    console.error("Error in POST competitor:", error)
    return NextResponse.json({ error: "Erro ao criar concorrente" }, { status: 500 })
  }
}
