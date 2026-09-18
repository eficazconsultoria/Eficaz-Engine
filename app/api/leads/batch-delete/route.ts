import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { ids } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "IDs inválidos" },
        { status: 400 }
      )
    }

    // Deletar leads em lote
    const { error, count } = await supabase
      .from("leads")
      .delete()
      .in("id", ids)

    if (error) {
      console.error("Erro ao deletar leads em lote:", error)
      return NextResponse.json(
        { error: "Erro ao excluir leads" },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      deleted: count || ids.length 
    })
  } catch (error) {
    console.error("Erro no batch delete:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
