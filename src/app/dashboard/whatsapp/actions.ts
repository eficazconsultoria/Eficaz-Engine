"use server"

import { requireFeatureAccess } from "@/lib/auth"
import {
  parseContacts,
  createCampaign,
  getCampaignWithMessages,
  getUserCampaigns,
  startCampaign,
  cancelCampaign,
  processTemplate,
} from "@/lib/services/whatsapp"
import type { ContactData } from "@/lib/services/whatsapp"
import { whatsappCampaignSchema, uuidSchema, contentSchema } from "@/lib/validation"

export async function createNewCampaign(formData: FormData) {
  const profile = await requireFeatureAccess("whatsapp_dispatcher")

  const rawData = {
    name: formData.get("name"),
    template: formData.get("template"),
    contacts: formData.get("contacts"),
  }

  const validation = whatsappCampaignSchema.safeParse(rawData)
  if (!validation.success) {
    const firstError = validation.error.errors[0]
    return { success: false, error: firstError?.message || "Dados invalidos" }
  }

  const { name, template, contacts: contactsData } = validation.data
  const contacts = parseContacts(contactsData)

  if (contacts.length === 0) {
    return { success: false, error: "Nenhum contato valido encontrado" }
  }

  if (contacts.length > 1000) {
    return { success: false, error: "Maximo de 1000 contatos por campanha" }
  }

  const campaign = await createCampaign(profile.id, name, template, contacts)

  if (!campaign) {
    return { success: false, error: "Erro ao criar campanha" }
  }

  return { success: true, campaign }
}

export async function getCampaignDetails(campaignId: string) {
  const profile = await requireFeatureAccess("whatsapp_dispatcher")

  const uuidValidation = uuidSchema.safeParse(campaignId)
  if (!uuidValidation.success) {
    return { success: false, error: "ID de campanha invalido" }
  }

  const result = await getCampaignWithMessages(campaignId)

  if (!result) {
    return { success: false, error: "Campanha nao encontrada" }
  }

  if (result.campaign.user_id !== profile.id && profile.role !== "admin") {
    return { success: false, error: "Acesso negado" }
  }

  return { success: true, ...result }
}

export async function fetchUserCampaigns() {
  const profile = await requireFeatureAccess("whatsapp_dispatcher")
  const campaigns = await getUserCampaigns(profile.id)
  return { success: true, campaigns }
}

export async function sendCampaign(campaignId: string) {
  const profile = await requireFeatureAccess("whatsapp_dispatcher")

  const uuidValidation = uuidSchema.safeParse(campaignId)
  if (!uuidValidation.success) {
    return { success: false, error: "ID de campanha invalido" }
  }

  const campaignResult = await getCampaignWithMessages(campaignId)
  if (!campaignResult) {
    return { success: false, error: "Campanha nao encontrada" }
  }
  if (campaignResult.campaign.user_id !== profile.id && profile.role !== "admin") {
    return { success: false, error: "Acesso negado" }
  }

  const result = await startCampaign(campaignId)
  return result
}

export async function cancelCampaignAction(campaignId: string) {
  const profile = await requireFeatureAccess("whatsapp_dispatcher")

  const uuidValidation = uuidSchema.safeParse(campaignId)
  if (!uuidValidation.success) {
    return { success: false, error: "ID de campanha invalido" }
  }

  const campaignResult = await getCampaignWithMessages(campaignId)
  if (!campaignResult) {
    return { success: false, error: "Campanha nao encontrada" }
  }
  if (campaignResult.campaign.user_id !== profile.id && profile.role !== "admin") {
    return { success: false, error: "Acesso negado" }
  }

  const success = await cancelCampaign(campaignId)
  return { success }
}

export async function previewMessages(template: string, contactsData: string) {
  await requireFeatureAccess("whatsapp_dispatcher")

  const templateValidation = contentSchema.safeParse(template)
  const contactsValidation = contentSchema.safeParse(contactsData)

  if (!templateValidation.success || !contactsValidation.success) {
    return { success: false, error: "Dados invalidos", previews: [] }
  }

  const contacts = parseContacts(contactsValidation.data)

  if (contacts.length === 0) {
    return { success: false, error: "Nenhum contato valido", previews: [] }
  }

  const previews = contacts.slice(0, 3).map((contact: ContactData) => ({
    name: contact.name,
    phone: contact.phone,
    message: processTemplate(templateValidation.data, contact),
  }))

  return { success: true, previews, totalContacts: contacts.length }
}
