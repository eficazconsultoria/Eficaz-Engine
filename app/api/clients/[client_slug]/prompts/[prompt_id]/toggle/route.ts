"use server"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, getProfile } from "@/lib/auth"
import { canManagePrompts, isClientUser } from "@/lib/rbac"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ client_slug: string; prompt_id: string }> }
) {
  try {
    await requireAuth()
    const profile = await getProfile()
    
    // Block client users explicitly
    if (profile && isClientUser(profile.role)) {
      return NextResponse.json({ error: "Acesso nao permitido" }, { status: 403 })
    }
    
    if (!profile || !canManagePrompts(profile.role)) {
      return NextResponse.json(
        { error: "Sem permissao para alterar status de prompts" },
        { status: 403 }
      )
    }

    const { client_slug, prompt_id } = await params
    const { is_active } = await request.json()
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

    // Update prompt status
    const { error: updateError } = await supabase
      .from("client_ai_prompts")
      .update({ is_active })
      .eq("id", prompt_id)
      .eq("client_id", client.id)

    if (updateError) {
      console.error("Error updating prompt status:", updateError)
      return NextResponse.json({ error: "Erro ao alterar status" }, { status: 500 })
    }

    return NextResponse.json({ success: true, is_active })
  } catch (error) {
    console.error("Error toggling prompt status:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
