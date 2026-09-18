import type React from "react"
import { Header } from "./header"
import type { Profile } from "@/lib/types"

interface FeatureLayoutProps {
  profile: Profile
  title: string
  description?: string
  children: React.ReactNode
}

export function FeatureLayout({ profile, title, description, children }: FeatureLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header profile={profile} title={title} description={description} />
      <div className="flex-1 p-4 lg:p-6 animate-fade-in">{children}</div>
    </div>
  )
}
