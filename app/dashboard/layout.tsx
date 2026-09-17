import type React from "react"
import { redirect } from "next/navigation"
import { getProfile } from "@/lib/auth"
import { Sidebar } from "@/components/dashboard/sidebar"
import { SidebarSpacerProvider, SidebarSpacer } from "@/components/dashboard/sidebar-spacer"

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
