import type React from "react"
import { redirect, notFound } from "next/navigation"
import { getProfile } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/server"
import { ClientSidebar } from "@/components/dashboard/client-sidebar"
import { SidebarSpacerProvider, SidebarSpacer } from "@/components/dashboard/sidebar-spacer"
import { isClientUser } from "@/lib/rbac"

interface ClientLayoutProps {
  children: React.ReactNode
  params: Promise<{ client_slug: string }>
}

export default async function ClientLayout({
  children,
  params,
}: ClientLayoutProps) {
  const { client_slug } = await params
  
  // Check if this is a reserved route that should not be handled by this layout
  const reservedRoutes = ["dashboard", "login", "api", "_next", "favicon.ico"]
  if (reservedRoutes.includes(client_slug)) {
    notFound()
  }

  let profile
  try {
    profile = await getProfile()
  } catch {
    redirect("/login")
  }

  if (!profile) {
    redirect("/login")
  }

  if (!profile.active) {
    redirect("/login?error=inactive")
  }

  // Fetch the client by slug - use admin client to bypass RLS for client users
  const adminClient = createAdminClient()
  const { data: client, error } = await adminClient
    .from("clients")
    .select("*")
    .eq("slug", client_slug)
    .eq("active", true)
    .single()

  if (error || !client) {
    notFound()
  }

  // Check if user is a client user - strict access control
  if (isClientUser(profile.role)) {
    if (profile.linked_client_id !== client.id) {
      // Client user trying to access a different client - redirect to their own prompts list
      const { data: correctClient } = await adminClient
        .from("clients")
        .select("slug")
        .eq("id", profile.linked_client_id)
        .single()
      
      redirect(`/${correctClient?.slug || client_slug}/prompts`)
    }
    // Client users can ONLY access:
    // - /[client_slug]/prompts (list)
    // - /[client_slug]/prompts/[prompt_id]/analytics
    // All other pages under /[client_slug]/* are blocked and redirect to prompts list
  }

  // Determine if sidebar should be shown (not for client users)
  const showSidebar = !isClientUser(profile.role)

  return (
    <SidebarSpacerProvider>
      <div className="flex min-h-screen bg-background">
        {showSidebar && (
          <>
            <div className="hidden lg:block">
              <ClientSidebar profile={profile} client={client} />
            </div>
            <SidebarSpacer className="hidden lg:block" />
          </>
        )}
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </SidebarSpacerProvider>
  )
}
