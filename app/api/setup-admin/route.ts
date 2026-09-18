import { NextResponse } from "next/server"

// Esta rota é temporária - deve ser removida após criar o admin
export async function POST() {
  // Rota desabilitada por seguranca
  return NextResponse.json(
    {
      error:
        "Esta rota foi desabilitada por seguranca. Para criar um admin, use o Supabase Dashboard ou contate o administrador do sistema.",
    },
    { status: 403 },
  )
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}
