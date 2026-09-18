import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ client_slug: string; keyword_id: string }> }
) {
  const { client_slug, keyword_id } = await params
  const supabase = await createClient()
  const body = await request.json()
  const { prompt } = body

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Prompt e obrigatorio" }, { status: 400 })
  }

  // Get client
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("slug", client_slug)
    .single()

  if (clientError || !client) {
    return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 })
  }

  // Get keyword
  const { data: keyword, error: keywordError } = await supabase
    .from("client_keywords")
    .select("*")
    .eq("id", keyword_id)
    .eq("client_id", client.id)
    .single()

  if (keywordError || !keyword) {
    return NextResponse.json({ error: "Palavra-chave nao encontrada" }, { status: 404 })
  }

  // Create prompt in client_ai_prompts
  const { data: newPrompt, error: promptError } = await supabase
    .from("client_ai_prompts")
    .insert({
      client_id: client.id,
      prompt: prompt,
      category: `keyword:${keyword.keyword}`,
      is_active: true,
      generated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (promptError) {
    console.error("Error creating prompt:", promptError)
    return NextResponse.json({ error: promptError.message }, { status: 500 })
  }

  // Update keyword to mark as monitored
  const { error: updateError } = await supabase
    .from("client_keywords")
    .update({
      is_monitored: true,
      monitored_prompt_id: newPrompt.id,
      updated_at: new Date().toISOString()
    })
    .eq("id", keyword_id)

  if (updateError) {
    console.error("Error updating keyword:", updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ 
    prompt: newPrompt,
    message: "Prompt adicionado para monitoramento com sucesso"
  })
}
