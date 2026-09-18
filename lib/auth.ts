import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { Profile } from "./types"
import { type FeatureKey, hasAccess } from "./rbac"

export async function getUser() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return user
  } catch {
    return null
  }
}

export async function getProfile(): Promise<Profile | null> {
  try {
    const supabase = await createClient()

    let user
    try {
      const { data, error: authError } = await supabase.auth.getUser()
      if (authError || !data.user) {
        return null
      }
      user = data.user
    } catch {
      // Network error or other failure - return null
      return null
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return null
    }

    return profile as Profile
  } catch {
    return null
  }
}

export async function requireAuth(): Promise<Profile> {
  const profile = await getProfile()

  if (!profile) {
    redirect("/login")
  }

  if (!profile.active) {
    redirect("/login?error=inactive")
  }

  return profile
}

export async function requireFeatureAccess(feature: FeatureKey): Promise<Profile> {
  const profile = await requireAuth()

  if (!hasAccess(profile.role, feature)) {
    redirect("/dashboard?error=unauthorized")
  }

  return profile
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireAuth()

  if (profile.role !== "admin") {
    redirect("/dashboard?error=unauthorized")
  }

  return profile
}

export async function requireClientManagement(): Promise<Profile> {
  return requireFeatureAccess("client_management")
}
