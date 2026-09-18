import type React from "react"
import { redirect } from "next/navigation"
import { getProfile } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/dashboard/sidebar"
import { SidebarSpacerProvider, SidebarSpacer } from "@/components/dashboard/sidebar-spacer"
import { isClientUser } from "@/lib/rbac"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

  // Block client users completely from /dashboard/* routes - redirect to their analytics
  if (isClientUser(profile.role)) {
    if (profile.linked_client_id) {
      // Use admin client to bypass RLS since client users can't access clients table directly
      const supabase = createAdminClient()
      
      const { data: client } = await supabase
        .from("clients")
        .select("slug")
        .eq("id", profile.linked_client_id)
        .single()
      
      if (client) {
        // Redirect client users to prompts list page
        redirect(`/${client.slug}/prompts`)
      }
    }
    // No linked client - redirect to login with error
    redirect("/login?error=no_client")
  }

  return (
    <SidebarSpacerProvider>
      <div className="flex min-h-screen bg-background">
        <div className="hidden lg:block">
          <Sidebar profile={profile} />
        </div>
        <SidebarSpacer className="hidden lg:block" />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </SidebarSpacerProvider>
  )
}
