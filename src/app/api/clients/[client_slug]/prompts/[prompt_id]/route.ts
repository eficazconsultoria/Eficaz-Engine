import { NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth, getProfile } from "@/lib/auth"
import { canManagePrompts, isClientUser } from "@/lib/rbac"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ client_slug: string; prompt_id: string }> }
) {
  try {
    await requireAuth()
    const profile = await getProfile()
    const { client_slug, prompt_id } = await params
    
    // Use admin client for client users to bypass RLS
    const supabase = (profile && isClientUser(profile.role)) 
      ? createAdminClient() 
      : await createClient()

    // Get client by slug
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("slug", client_slug)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 })
    }

    // If client user, verify they can only access their linked client
    if (profile && isClientUser(profile.role)) {
      if (profile.linked_client_id !== client.id) {
        return NextResponse.json({ error: "Acesso nao permitido" }, { status: 403 })
      }
    }

    // Get prompt
    const { data: prompt, error: promptError } = await supabase
      .from("client_ai_prompts")
      .select("*")
      .eq("id", prompt_id)
      .eq("client_id", client.id)
      .single()

    if (promptError || !prompt) {
      return NextResponse.json({ error: "Prompt nao encontrado" }, { status: 404 })
    }

    const userCanManage = profile ? canManagePrompts(profile.role) : false
    const userIsClient = profile ? isClientUser(profile.role) : false

    return NextResponse.json({ prompt, client, canManage: userCanManage, isClientUser: userIsClient })
  } catch (error) {
    console.error("Error fetching prompt:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// DELETE prompt and all related data
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ client_slug: string; prompt_id: string }> }
) {
  try {
    await requireAuth()
    const profile = await getProfile()
    
    if (!profile || !canManagePrompts(profile.role)) {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 })
    }

    const { client_slug, prompt_id } = await params
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

    // Verify prompt belongs to client
    const { data: prompt, error: promptError } = await supabase
      .from("client_ai_prompts")
      .select("id")
      .eq("id", prompt_id)
      .eq("client_id", client.id)
      .single()

    if (promptError || !prompt) {
      return NextResponse.json({ error: "Prompt nao encontrado" }, { status: 404 })
    }

    // Delete related test results
    await supabase
      .from("prompt_test_results")
      .delete()
      .eq("prompt_id", prompt_id)

    // Delete related analytics summary
    await supabase
      .from("prompt_analytics_summary")
      .delete()
      .eq("prompt_id", prompt_id)

    // Delete the prompt itself
    const { error: deleteError } = await supabase
      .from("client_ai_prompts")
      .delete()
      .eq("id", prompt_id)

    if (deleteError) {
      console.error("Error deleting prompt:", deleteError)
      return NextResponse.json({ error: "Erro ao deletar prompt" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting prompt:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
