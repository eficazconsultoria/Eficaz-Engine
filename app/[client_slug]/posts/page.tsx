import { redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth, getProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { getAgentPrompt } from "@/lib/services/generation"
import { isClientUser } from "@/lib/rbac"
import { ClientPostsForm } from "./posts-form"
import { Button } from "@/components/ui/button"
import { History } from "lucide-react"

export default async function ClientPostsPage({
  params,
}: {
  params: Promise<{ client_slug: string }>
}) {
  await requireAuth()
  const profile = await getProfile()
  if (!profile) redirect("/login")
  
  // Block client users from accessing this page
  if (isClientUser(profile.role)) {
    redirect("/dashboard")
  }

  const { client_slug } = await params
  const supabase = await createClient()

  // Get client
  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("slug", client_slug)
    .single()

  if (error || !client) {
    redirect("/dashboard")
  }

  // Get agent prompt
  const agent = await getAgentPrompt("post_texts")

  // Get content history for this client
  const { data: history } = await supabase
    .from("client_content_history")
    .select("*")
    .eq("client_id", client.id)
    .eq("content_type", "post")
    .order("created_at", { ascending: false })
    .limit(20)

  // Count total history
  const { count: historyCount } = await supabase
    .from("client_content_history")
    .select("*", { count: "exact", head: true })
    .eq("client_id", client.id)
    .eq("content_type", "post")

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Posts Sociais</h1>
          <p className="text-muted-foreground">
            Gere posts para redes sociais para {client.name}
          </p>
        </div>
        {(historyCount ?? 0) > 0 && (
          <Link href={`/${client_slug}/posts/history`}>
            <Button variant="outline" className="gap-2">
              <History className="h-4 w-4" />
              Ver Historico ({historyCount})
            </Button>
          </Link>
        )}
      </div>

      <ClientPostsForm
        profile={profile}
        client={client}
        agent={agent}
        history={history || []}
      />
    </div>
  )
}
