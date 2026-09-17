import { createAdminClient } from "@/lib/supabase/server"
import type { Profile, AuditLog, UserRole } from "@/lib/types"

// Get all users (admin only) - uses admin client to bypass RLS
export async function getAllUsers(): Promise<Profile[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })

  if (error || !data) return []
  return data as Profile[]
}

// Get single user by ID - uses admin client for admin operations
export async function getUserById(userId: string): Promise<Profile | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

  if (error || !data) return null
  return data as Profile
}

// Create new user (admin only) - uses Supabase Auth Admin API
export async function createUser(
  adminId: string,
  email: string,
  name: string,
  role: UserRole,
  password: string,
): Promise<{ success: boolean; user?: Profile; error?: string }> {
  const supabase = createAdminClient()

  // Create auth user with admin API (requires service role)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email for admin-created users
    user_metadata: {
      name,
      role,
    },
  })

  if (authError || !authData.user) {
    return { success: false, error: authError?.message || "Failed to create user" }
  }

  // Profile will be auto-created via trigger, but let's update with correct data
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      email,
      name,
      role,
      active: true,
    })
    .eq("id", authData.user.id)

  if (profileError) {
    // Try to clean up auth user if profile update fails
    await supabase.auth.admin.deleteUser(authData.user.id)
    return { success: false, error: "Failed to create profile" }
  }

  // Log audit
  await createAuditLog(adminId, "user_created", authData.user.id, { email, name, role })

  const user = await getUserById(authData.user.id)
  return { success: true, user: user || undefined }
}

// Update user (admin only)
export async function updateUser(
  adminId: string,
  userId: string,
  updates: { email?: string; name?: string; role?: UserRole; password?: string },
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Update profile
  const profileUpdates: Partial<Profile> = {}
  if (updates.email) profileUpdates.email = updates.email
  if (updates.name) profileUpdates.name = updates.name
  if (updates.role) profileUpdates.role = updates.role

  if (Object.keys(profileUpdates).length > 0) {
    const { error: profileError } = await supabase.from("profiles").update(profileUpdates).eq("id", userId)

    if (profileError) {
      return { success: false, error: "Failed to update profile" }
    }
  }

  // Update auth user if email or password changed
  if (updates.email || updates.password) {
    const authUpdates: { email?: string; password?: string } = {}
    if (updates.email) authUpdates.email = updates.email
    if (updates.password) authUpdates.password = updates.password

    const { error: authError } = await supabase.auth.admin.updateUserById(userId, authUpdates)

    if (authError) {
      return { success: false, error: "Failed to update auth credentials" }
    }
  }

  // Log audit
  await createAuditLog(adminId, "user_updated", userId, updates)

  return { success: true }
}

// Toggle user active status
export async function toggleUserActive(
  adminId: string,
  userId: string,
  active: boolean,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  const { error } = await supabase.from("profiles").update({ active }).eq("id", userId)

  if (error) {
    return { success: false, error: "Failed to update user status" }
  }

  // Log audit
  await createAuditLog(adminId, active ? "user_reactivated" : "user_deactivated", userId, { active })

  return { success: true }
}

// Delete user (admin only, cannot delete admins)
export async function deleteUser(adminId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Check if target is admin
  const targetUser = await getUserById(userId)
  if (!targetUser) {
    return { success: false, error: "User not found" }
  }

  if (targetUser.role === "admin") {
    return { success: false, error: "Cannot delete admin users" }
  }

  // Delete auth user (will cascade to profile)
  const { error } = await supabase.auth.admin.deleteUser(userId)

  if (error) {
    return { success: false, error: "Failed to delete user" }
  }

  // Log audit
  await createAuditLog(adminId, "user_deleted", userId, { email: targetUser.email, name: targetUser.name })

  return { success: true }
}

// Create audit log entry
export async function createAuditLog(
  actorId: string,
  action: string,
  targetId: string | null,
  details: Record<string, unknown>,
): Promise<AuditLog | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("audit_logs")
    .insert({
      actor_id: actorId,
      action,
      target_id: targetId,
      details,
    })
    .select()
    .single()

  if (error || !data) return null
  return data as AuditLog
}

// Get audit logs (admin only)
export async function getAuditLogs(limit = 50): Promise<AuditLog[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data as AuditLog[]
}
