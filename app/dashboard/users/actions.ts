"use server"

import { requireAdmin } from "@/lib/auth"
import { getAllUsers, createUser, updateUser, toggleUserActive, deleteUser, getAuditLogs } from "@/lib/services/users"
import { createUserSchema, updateUserSchema, uuidSchema } from "@/lib/validation"

export async function fetchAllUsers() {
  await requireAdmin()
  const users = await getAllUsers()
  return { success: true, users }
}

export async function createNewUser(formData: FormData) {
  const profile = await requireAdmin()

  const rawData = {
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
    password: formData.get("password"),
  }

  const validation = createUserSchema.safeParse(rawData)
  if (!validation.success) {
    const firstError = validation.error.errors[0]
    return { success: false, error: firstError?.message || "Dados invalidos" }
  }

  const { email, name, role, password } = validation.data
  const result = await createUser(profile.id, email, name, role, password)
  return result
}

export async function updateExistingUser(userId: string, formData: FormData) {
  const profile = await requireAdmin()

  const uuidValidation = uuidSchema.safeParse(userId)
  if (!uuidValidation.success) {
    return { success: false, error: "ID de usuario invalido" }
  }

  const rawData = {
    email: formData.get("email") || undefined,
    name: formData.get("name") || undefined,
    role: formData.get("role") || undefined,
    password: formData.get("password") || undefined,
  }

  const cleanData = Object.fromEntries(Object.entries(rawData).filter(([, v]) => v !== undefined && v !== ""))

  const validation = updateUserSchema.safeParse(cleanData)
  if (!validation.success) {
    const firstError = validation.error.errors[0]
    return { success: false, error: firstError?.message || "Dados invalidos" }
  }

  const result = await updateUser(profile.id, userId, validation.data)
  return result
}

export async function toggleUserStatus(userId: string, active: boolean) {
  const profile = await requireAdmin()

  const uuidValidation = uuidSchema.safeParse(userId)
  if (!uuidValidation.success) {
    return { success: false, error: "ID de usuario invalido" }
  }

  if (typeof active !== "boolean") {
    return { success: false, error: "Status invalido" }
  }

  const result = await toggleUserActive(profile.id, userId, active)
  return result
}

export async function removeUser(userId: string) {
  const profile = await requireAdmin()

  const uuidValidation = uuidSchema.safeParse(userId)
  if (!uuidValidation.success) {
    return { success: false, error: "ID de usuario invalido" }
  }

  if (userId === profile.id) {
    return { success: false, error: "Voce nao pode deletar sua propria conta" }
  }

  const result = await deleteUser(profile.id, userId)
  return result
}

export async function fetchAuditLogs() {
  await requireAdmin()
  const logs = await getAuditLogs()
  return { success: true, logs }
}
