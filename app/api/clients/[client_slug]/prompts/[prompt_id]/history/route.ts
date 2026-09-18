import { NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth, getProfile } from "@/lib/auth"
import { isClientUser } from "@/lib/rbac"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ client_slug: string; prompt_id: string }> }
) {
  try {
    await requireAuth()
    const profile = await getProfile()
    const { client_slug, prompt_id } = await params
    
    // Parse query params for date filtering
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get("from")
    const toDate = searchParams.get("to")
    const limit = parseInt(searchParams.get("limit") || "20", 10)
    
    // Use admin client for client users to bypass RLS
    const supabase = (profile && isClientUser(profile.role)) 
      ? createAdminClient() 
      : await createClient()

    // Verify client access for client users
    if (profile && isClientUser(profile.role)) {
      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .eq("slug", client_slug)
        .single()
      
      if (!client || profile.linked_client_id !== client.id) {
        return NextResponse.json({ error: "Acesso nao permitido" }, { status: 403 })
      }
    }

    let query = supabase
      .from("prompt_test_results")
      .select("*")
      .eq("prompt_id", prompt_id)
      .order("tested_at", { ascending: false })
      .limit(limit)

    // Apply date filters if provided
    if (fromDate) {
      query = query.gte("tested_at", fromDate)
    }
    if (toDate) {
      query = query.lte("tested_at", toDate)
    }

    const { data: tests, error } = await query

    if (error) {
      console.error("Error fetching test history:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      tests: tests || [],
      period: fromDate && toDate ? { from: fromDate, to: toDate } : null,
    })
  } catch (error) {
    console.error("Error in history route:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
