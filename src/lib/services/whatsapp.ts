import { createClient } from "@/lib/supabase/server"
import type { WhatsAppCampaign, WhatsAppMessage } from "@/lib/types"

// Evolution API integration
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ""
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ""
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || ""

export interface ContactData {
  name: string
  phone: string
  variables?: Record<string, string>
}

// Parse CSV/Excel data into contacts
export function parseContacts(data: string): ContactData[] {
  const lines = data.trim().split("\n")
  if (lines.length === 0) return []

  // Try to detect header
  const firstLine = lines[0].toLowerCase()
  const hasHeader = firstLine.includes("nome") || firstLine.includes("name") || firstLine.includes("telefone")

  const startIndex = hasHeader ? 1 : 0
  const contacts: ContactData[] = []

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Split by comma, semicolon, or tab
    const parts = line.split(/[,;\t]/).map((p) => p.trim())

    if (parts.length >= 2) {
      const name = parts[0]
      const phone = normalizePhone(parts[1])

      // Additional fields become variables
      const variables: Record<string, string> = {}
      if (parts.length > 2) {
        parts.slice(2).forEach((val, idx) => {
          variables[`var${idx + 1}`] = val
        })
      }

      if (phone) {
        contacts.push({ name, phone, variables })
      }
    }
  }

  return contacts
}

// Normalize phone number to international format
export function normalizePhone(phone: string): string {
  // Remove all non-numeric characters
  const digits = phone.replace(/\D/g, "")

  // Brazilian phone: add 55 if not present
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`
  }

  // Already has country code
  if (digits.length === 12 || digits.length === 13) {
    return digits
  }

  return digits
}

// Replace template variables with actual values
export function processTemplate(template: string, contact: ContactData): string {
  let message = template

  // Replace {nome} or {name}
  message = message.replace(/\{nome\}/gi, contact.name)
  message = message.replace(/\{name\}/gi, contact.name)

  // Replace custom variables
  if (contact.variables) {
    Object.entries(contact.variables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`\\{${key}\\}`, "gi"), value)
    })
  }

  return message
}

// Create a new campaign
export async function createCampaign(
  userId: string,
  name: string,
  template: string,
  contacts: ContactData[],
): Promise<WhatsAppCampaign | null> {
  const supabase = await createClient()

  // Create campaign
  const { data: campaign, error: campaignError } = await supabase
    .from("whatsapp_campaigns")
    .insert({
      user_id: userId,
      name,
      template,
      status: "draft",
      total_messages: contacts.length,
    })
    .select()
    .single()

  if (campaignError || !campaign) return null

  // Create messages
  const messages = contacts.map((contact) => ({
    campaign_id: campaign.id,
    phone: contact.phone,
    name: contact.name,
    variables: contact.variables || {},
    message_content: processTemplate(template, contact),
    status: "pending",
  }))

  const { error: messagesError } = await supabase.from("whatsapp_messages").insert(messages)

  if (messagesError) {
    // Rollback campaign if messages fail
    await supabase.from("whatsapp_campaigns").delete().eq("id", campaign.id)
    return null
  }

  return campaign as WhatsAppCampaign
}

// Get campaign with messages
export async function getCampaignWithMessages(campaignId: string): Promise<{
  campaign: WhatsAppCampaign
  messages: WhatsAppMessage[]
} | null> {
  const supabase = await createClient()

  const { data: campaign, error: campaignError } = await supabase
    .from("whatsapp_campaigns")
    .select("*")
    .eq("id", campaignId)
    .single()

  if (campaignError || !campaign) return null

  const { data: messages, error: messagesError } = await supabase
    .from("whatsapp_messages")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true })

  if (messagesError) return null

  return {
    campaign: campaign as WhatsAppCampaign,
    messages: (messages || []) as WhatsAppMessage[],
  }
}

// Get user campaigns
export async function getUserCampaigns(userId: string): Promise<WhatsAppCampaign[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("whatsapp_campaigns")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error || !data) return []
  return data as WhatsAppCampaign[]
}

// Send message via Evolution API
export async function sendWhatsAppMessage(
  phone: string,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return { success: false, error: "Evolution API not configured" }
  }

  try {
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: phone,
        text: message,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.message || "Failed to send message" }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    }
  }
}

// Start campaign sending
export async function startCampaign(campaignId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Update campaign status
  const { error: updateError } = await supabase
    .from("whatsapp_campaigns")
    .update({ status: "sending" })
    .eq("id", campaignId)

  if (updateError) {
    return { success: false, error: "Failed to update campaign status" }
  }

  // Get pending messages
  const { data: messages, error: messagesError } = await supabase
    .from("whatsapp_messages")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("status", "pending")

  if (messagesError || !messages) {
    return { success: false, error: "Failed to fetch messages" }
  }

  let sentCount = 0
  let errorCount = 0

  // Send messages (in production, use queue/background job)
  for (const msg of messages) {
    const result = await sendWhatsAppMessage(msg.phone, msg.message_content)

    const updateData = result.success
      ? { status: "sent", sent_at: new Date().toISOString() }
      : { status: "error", error_message: result.error }

    await supabase.from("whatsapp_messages").update(updateData).eq("id", msg.id)

    if (result.success) {
      sentCount++
    } else {
      errorCount++
    }

    // Small delay between messages to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  // Update campaign final status
  await supabase
    .from("whatsapp_campaigns")
    .update({
      status: "completed",
      sent_count: sentCount,
      error_count: errorCount,
    })
    .eq("id", campaignId)

  return { success: true }
}

// Cancel campaign
export async function cancelCampaign(campaignId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase.from("whatsapp_campaigns").update({ status: "cancelled" }).eq("id", campaignId)

  return !error
}
