import { createClient } from "@/lib/supabase/server"
import { requireAuth, getProfile } from "@/lib/auth"
import { canManagePrompts, isClientUser } from "@/lib/rbac"
import { NextResponse } from "next/server"
import { regenerateClientAIPrompts } from "@/app/dashboard/clients/actions"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ client_slug: string }> }
) {
  try {
    await requireAuth()
    const profile = await getProfile()
    
    // Block client users explicitly
    if (profile && isClientUser(profile.role)) {
      return NextResponse.json({ error: "Acesso nao permitido" }, { status: 403 })
    }
    
    // Check if user can manage prompts (admin, seo, or marketing)
    if (!profile || !canManagePrompts(profile.role)) {
      return NextResponse.json({ error: "Sem permissao para regenerar prompts" }, { status: 403 })
    }
    
    const { client_slug } = await params
    const supabase = await createClient()

    // First get the client by slug
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("slug", client_slug)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 })
    }

    // Regenerate prompts
    const result = await regenerateClientAIPrompts(client.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in POST regenerate prompts:", error)
    return NextResponse.json({ error: "Erro ao regenerar prompts" }, { status: 500 })
  }
}
