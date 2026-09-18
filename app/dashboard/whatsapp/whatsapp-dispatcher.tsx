"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Loader2,
  Send,
  Upload,
  X,
  CheckCircle,
  XCircle,
  Clock,
  FileSpreadsheet,
  Users,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Trash2,
  User,
  FileText,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react"
import type { WhatsAppCampaign } from "@/lib/types"
import { createNewCampaign, previewMessages, sendCampaign, cancelCampaignAction } from "./actions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

interface WhatsAppDispatcherProps {
  campaigns: WhatsAppCampaign[]
}

interface PreviewMessage {
  name: string
  phone: string
  message: string
}

interface ParsedContact {
  name: string
  phone: string
  variables: Record<string, string>
  valid: boolean
  error?: string
}

const STATUS_CONFIG = {
  draft: { label: "Rascunho", variant: "secondary" as const, icon: Clock, color: "text-muted-foreground" },
  sending: { label: "Enviando", variant: "default" as const, icon: Loader2, color: "text-blue-500" },
  completed: { label: "Concluída", variant: "default" as const, icon: CheckCircle, color: "text-green-500" },
  cancelled: { label: "Cancelada", variant: "destructive" as const, icon: XCircle, color: "text-red-500" },
}

const STEPS = [
  { id: 1, title: "Importar Contatos", icon: Users, description: "Upload do arquivo com os contatos" },
  { id: 2, title: "Criar Mensagem", icon: MessageSquare, description: "Escreva o template da mensagem" },
  { id: 3, title: "Revisar e Enviar", icon: Send, description: "Confira e dispare a campanha" },
]

export function WhatsAppDispatcher({ campaigns: initialCampaigns }: WhatsAppDispatcherProps) {
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [activeView, setActiveView] = useState<"new" | "history">("new")
  const [currentStep, setCurrentStep] = useState(1)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previews, setPreviews] = useState<PreviewMessage[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    template: "",
    contacts: "",
  })

  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([])
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [detectedColumns, setDetectedColumns] = useState<string[]>([])

  const parseFileContent = (content: string, fileName: string) => {
    const lines = content.trim().split("\n")
    if (lines.length === 0) return

    // Detect delimiter (comma, semicolon, or tab)
    const firstLine = lines[0]
    const delimiter = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ","

    // Parse header
    const headers = firstLine.split(delimiter).map((h) => h.trim().toLowerCase().replace(/['"]/g, ""))
    setDetectedColumns(headers)

    // Find name and phone columns
    const nameIndex = headers.findIndex(
      (h) => h.includes("nome") || h.includes("name") || h.includes("cliente") || h.includes("contato"),
    )
    const phoneIndex = headers.findIndex(
      (h) =>
        h.includes("telefone") ||
        h.includes("phone") ||
        h.includes("celular") ||
        h.includes("whatsapp") ||
        h.includes("numero"),
    )

    if (nameIndex === -1 || phoneIndex === -1) {
      setError("Arquivo deve conter colunas de Nome e Telefone. Colunas detectadas: " + headers.join(", "))
      return
    }

    const contacts: ParsedContact[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const parts = line.split(delimiter).map((p) => p.trim().replace(/['"]/g, ""))
      const name = parts[nameIndex] || ""
      const rawPhone = parts[phoneIndex] || ""

      // Normalize phone
      const phone = normalizePhone(rawPhone)
      const isValid = phone.length >= 10 && name.length > 0

      // Collect extra variables
      const variables: Record<string, string> = {}
      headers.forEach((header, idx) => {
        if (idx !== nameIndex && idx !== phoneIndex && parts[idx]) {
          variables[header] = parts[idx]
        }
      })

      contacts.push({
        name,
        phone,
        variables,
        valid: isValid,
        error: !isValid ? (name.length === 0 ? "Nome vazio" : "Telefone inválido") : undefined,
      })
    }

    setParsedContacts(contacts)
    setUploadedFileName(fileName)

    // Convert to text format for the form
    const contactsText = contacts
      .filter((c) => c.valid)
      .map((c) => {
        const vars = Object.values(c.variables).join(", ")
        return `${c.name}, ${c.phone}${vars ? ", " + vars : ""}`
      })
      .join("\n")

    setFormData((prev) => ({ ...prev, contacts: contactsText }))
    setError(null)
  }

  const normalizePhone = (phone: string): string => {
    const digits = phone.replace(/\D/g, "")
    if (digits.length === 10 || digits.length === 11) {
      return `55${digits}`
    }
    return digits
  }

  const handleFileUpload = useCallback((file: File) => {
    const validTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
    ]

    const isValidType =
      validTypes.includes(file.type) ||
      file.name.endsWith(".csv") ||
      file.name.endsWith(".xlsx") ||
      file.name.endsWith(".xls") ||
      file.name.endsWith(".txt")

    if (!isValidType) {
      setError("Formato não suportado. Use arquivos .csv, .xlsx, .xls ou .txt")
      return
    }

    // For Excel files, we'd need a library like xlsx
    // For now, we'll handle CSV/TXT files directly
    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      setError(
        "Para arquivos Excel (.xlsx/.xls), por favor exporte como CSV primeiro. Vá em Arquivo > Salvar Como > CSV",
      )
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      parseFileContent(content, file.name)
    }
    reader.onerror = () => {
      setError("Erro ao ler o arquivo. Tente novamente.")
    }
    reader.readAsText(file)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFileUpload(file)
    },
    [handleFileUpload],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFileUpload(file)
    },
    [handleFileUpload],
  )

  // Clear uploaded file
  const clearUpload = () => {
    setParsedContacts([])
    setUploadedFileName(null)
    setDetectedColumns([])
    setFormData((prev) => ({ ...prev, contacts: "" }))
  }

  // Handle preview
  const handlePreview = async () => {
    if (!formData.template || !formData.contacts) {
      setError("Preencha o template e a lista de contatos")
      return
    }

    const result = await previewMessages(formData.template, formData.contacts)

    if (result.success && result.previews) {
      setPreviews(result.previews)
      setShowPreview(true)
      setError(null)
    } else {
      setError(result.error || "Erro ao gerar preview")
    }
  }

  // Handle campaign creation
  const handleCreate = async () => {
    setIsCreating(true)
    setError(null)

    const data = new FormData()
    data.set("name", formData.name)
    data.set("template", formData.template)
    data.set("contacts", formData.contacts)

    const result = await createNewCampaign(data)

    if (result.success && result.campaign) {
      setCampaigns([result.campaign, ...campaigns])
      setFormData({ name: "", template: "", contacts: "" })
      setParsedContacts([])
      setUploadedFileName(null)
      setCurrentStep(1)
      setShowPreview(false)
      setActiveView("history")
    } else {
      setError(result.error || "Erro ao criar campanha")
    }

    setIsCreating(false)
  }

  const handleSend = async (campaignId: string) => {
    const result = await sendCampaign(campaignId)
    if (result.success) {
      setCampaigns(campaigns.map((c) => (c.id === campaignId ? { ...c, status: "completed" as const } : c)))
    }
  }

  const handleCancel = async (campaignId: string) => {
    const result = await cancelCampaignAction(campaignId)
    if (result.success) {
      setCampaigns(campaigns.map((c) => (c.id === campaignId ? { ...c, status: "cancelled" as const } : c)))
    }
  }

  const validContactsCount = parsedContacts.filter((c) => c.valid).length
  const invalidContactsCount = parsedContacts.filter((c) => !c.valid).length

  const canProceedStep1 = parsedContacts.length > 0 && validContactsCount > 0
  const canProceedStep2 = formData.template.length > 0 && formData.name.length > 0

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button
          variant={activeView === "new" ? "default" : "outline"}
          onClick={() => setActiveView("new")}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Nova Campanha
        </Button>
        <Button
          variant={activeView === "history" ? "default" : "outline"}
          onClick={() => setActiveView("history")}
          className="gap-2"
        >
          <Clock className="h-4 w-4" />
          Histórico ({campaigns.length})
        </Button>
      </div>

      {activeView === "new" ? (
        <div className="space-y-6">
          <div className="flex items-center justify-center gap-4 py-4">
            {STEPS.map((step, index) => {
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id
              const StepIcon = step.icon

              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => {
                      if (
                        step.id === 1 ||
                        (step.id === 2 && canProceedStep1) ||
                        (step.id === 3 && canProceedStep1 && canProceedStep2)
                      ) {
                        setCurrentStep(step.id)
                      }
                    }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
                      isActive && "bg-primary text-primary-foreground shadow-lg scale-105",
                      isCompleted && "bg-green-500/20 text-green-500",
                      !isActive && !isCompleted && "bg-muted/50 text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full",
                        isActive && "bg-primary-foreground/20",
                        isCompleted && "bg-green-500/20",
                      )}
                    >
                      {isCompleted ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                    </div>
                    <div className="text-left hidden sm:block">
                      <p className="text-sm font-medium">{step.title}</p>
                      <p className="text-xs opacity-80">{step.description}</p>
                    </div>
                  </button>

                  {index < STEPS.length - 1 && (
                    <ChevronRight
                      className={cn(
                        "h-5 w-5 mx-2 transition-colors",
                        isCompleted ? "text-green-500" : "text-muted-foreground/30",
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {currentStep === 1 && (
            <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/80">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                    <FileSpreadsheet className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Importe sua lista de contatos</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Arraste um arquivo Excel ou CSV, ou clique para selecionar. O arquivo deve ter colunas de Nome e
                    Telefone.
                  </p>
                </div>

                {!uploadedFileName ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                      "relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer group",
                      isDragging
                        ? "border-primary bg-primary/5 scale-[1.02]"
                        : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50",
                    )}
                  >
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls,.txt"
                      onChange={handleFileInput}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />

                    <div
                      className={cn(
                        "inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 transition-all",
                        isDragging ? "bg-primary/20" : "bg-muted group-hover:bg-primary/10",
                      )}
                    >
                      <Upload
                        className={cn(
                          "h-10 w-10 transition-all",
                          isDragging ? "text-primary scale-110" : "text-muted-foreground group-hover:text-primary",
                        )}
                      />
                    </div>

                    <p className="text-lg font-medium mb-2">
                      {isDragging ? "Solte o arquivo aqui" : "Arraste o arquivo aqui"}
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">ou clique para selecionar</p>
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">.CSV</Badge>
                      <Badge variant="secondary">.TXT</Badge>
                      <span className="text-muted-foreground/50">|</span>
                      <span>Exportado do Excel ou Google Sheets</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Uploaded File Info */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-500/20">
                          <FileSpreadsheet className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                          <p className="font-medium text-green-500">{uploadedFileName}</p>
                          <p className="text-sm text-muted-foreground">{parsedContacts.length} contatos encontrados</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={clearUpload}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-muted/50 text-center">
                        <p className="text-3xl font-bold">{parsedContacts.length}</p>
                        <p className="text-sm text-muted-foreground">Total</p>
                      </div>
                      <div className="p-4 rounded-xl bg-green-500/10 text-center">
                        <p className="text-3xl font-bold text-green-500">{validContactsCount}</p>
                        <p className="text-sm text-muted-foreground">Válidos</p>
                      </div>
                      <div className="p-4 rounded-xl bg-red-500/10 text-center">
                        <p className="text-3xl font-bold text-red-500">{invalidContactsCount}</p>
                        <p className="text-sm text-muted-foreground">Inválidos</p>
                      </div>
                    </div>

                    {/* Detected Columns */}
                    {detectedColumns.length > 0 && (
                      <div className="p-4 rounded-xl bg-muted/30">
                        <p className="text-sm font-medium mb-2">Colunas detectadas:</p>
                        <div className="flex flex-wrap gap-2">
                          {detectedColumns.map((col, idx) => (
                            <Badge key={idx} variant="outline" className="capitalize">
                              {col}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Preview Table */}
                    <div className="rounded-xl border overflow-hidden">
                      <div className="p-3 bg-muted/50 border-b">
                        <p className="text-sm font-medium">Preview dos contatos (primeiros 5)</p>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">Status</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Telefone</TableHead>
                            <TableHead>Variáveis</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedContacts.slice(0, 5).map((contact, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                {contact.valid ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <AlertTriangle className="h-4 w-4 text-red-500" />
                                )}
                              </TableCell>
                              <TableCell className="font-medium">{contact.name || "-"}</TableCell>
                              <TableCell className="font-mono text-sm">{contact.phone || "-"}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {Object.entries(contact.variables).length > 0
                                  ? Object.entries(contact.variables)
                                      .map(([k, v]) => `${k}: ${v}`)
                                      .join(", ")
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {parsedContacts.length > 5 && (
                        <div className="p-3 bg-muted/30 text-center text-sm text-muted-foreground">
                          ...e mais {parsedContacts.length - 5} contatos
                        </div>
                      )}
                    </div>

                    {invalidContactsCount > 0 && (
                      <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          {invalidContactsCount} contatos serão ignorados por terem dados inválidos.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {error && (
                  <Alert variant="destructive" className="mt-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Navigation */}
                <div className="flex justify-end mt-8">
                  <Button onClick={() => setCurrentStep(2)} disabled={!canProceedStep1} className="gap-2" size="lg">
                    Próximo: Criar Mensagem
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/80">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                    <MessageSquare className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Escreva sua mensagem</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Use variáveis como {"{nome}"} para personalizar cada mensagem automaticamente.
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Form */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-base font-medium">
                        Nome da Campanha
                      </Label>
                      <Input
                        id="name"
                        placeholder="Ex: Promoção de Janeiro 2024"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="template" className="text-base font-medium">
                        Mensagem
                      </Label>
                      <Textarea
                        id="template"
                        placeholder="Olá {nome}! 👋

Temos uma oferta especial para você..."
                        rows={8}
                        value={formData.template}
                        onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                        className="resize-none"
                      />
                    </div>

                    {/* Variable Hints */}
                    <div className="p-4 rounded-xl bg-muted/50">
                      <p className="text-sm font-medium mb-3">Variáveis disponíveis:</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, template: prev.template + "{nome}" }))}
                          className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-mono hover:bg-primary/20 transition-colors"
                        >
                          {"{nome}"}
                        </button>
                        {detectedColumns
                          .filter(
                            (col) =>
                              !["nome", "name", "telefone", "phone", "celular", "whatsapp", "numero"].includes(
                                col.toLowerCase(),
                              ),
                          )
                          .map((col, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setFormData((prev) => ({ ...prev, template: prev.template + `{${col}}` }))}
                              className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-sm font-mono hover:bg-muted/80 transition-colors"
                            >
                              {`{${col}}`}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* Live Preview */}
                  <div className="space-y-4">
                    <p className="text-base font-medium">Preview em tempo real</p>
                    <div className="rounded-2xl bg-[#0b141a] p-4 min-h-[300px]">
                      <div className="flex items-center gap-3 pb-3 border-b border-white/10 mb-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{parsedContacts[0]?.name || "Nome do Contato"}</p>
                          <p className="text-xs text-white/50">{parsedContacts[0]?.phone || "+55 11 99999-9999"}</p>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#005c4b] px-4 py-2 text-white">
                          <p className="text-sm whitespace-pre-wrap">
                            {formData.template
                              ? formData.template
                                  .replace(/\{nome\}/gi, parsedContacts[0]?.name || "João")
                                  .replace(/\{name\}/gi, parsedContacts[0]?.name || "João")
                              : "Sua mensagem aparecerá aqui..."}
                          </p>
                          <p className="text-[10px] text-white/50 text-right mt-1">
                            {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>
                        Esta mensagem será enviada para{" "}
                        <strong className="text-foreground">{validContactsCount}</strong> contatos
                      </span>
                    </div>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="mt-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Navigation */}
                <div className="flex justify-between mt-8">
                  <Button variant="outline" onClick={() => setCurrentStep(1)} className="gap-2" size="lg">
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </Button>
                  <Button onClick={() => setCurrentStep(3)} disabled={!canProceedStep2} className="gap-2" size="lg">
                    Próximo: Revisar
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/80">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                    <Send className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Revise sua campanha</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Confira todos os detalhes antes de disparar as mensagens.
                  </p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="p-6 rounded-xl bg-muted/50 text-center">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground mb-1">Campanha</p>
                    <p className="font-semibold">{formData.name}</p>
                  </div>
                  <div className="p-6 rounded-xl bg-muted/50 text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p className="text-sm text-muted-foreground mb-1">Contatos</p>
                    <p className="font-semibold">{validContactsCount} destinatários</p>
                  </div>
                  <div className="p-6 rounded-xl bg-muted/50 text-center">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                    <p className="text-sm text-muted-foreground mb-1">Mensagem</p>
                    <p className="font-semibold">{formData.template.length} caracteres</p>
                  </div>
                </div>

                {/* Message Preview */}
                <div className="rounded-xl border p-6 mb-8">
                  <p className="text-sm font-medium mb-4">Preview da mensagem:</p>
                  <div className="p-4 rounded-lg bg-muted/50 whitespace-pre-wrap text-sm">
                    {formData.template
                      .replace(/\{nome\}/gi, parsedContacts[0]?.name || "João")
                      .replace(/\{name\}/gi, parsedContacts[0]?.name || "João")}
                  </div>
                </div>

                {/* Sample Contacts */}
                <div className="rounded-xl border overflow-hidden mb-8">
                  <div className="p-3 bg-muted/50 border-b">
                    <p className="text-sm font-medium">Amostra de destinatários</p>
                  </div>
                  <div className="divide-y">
                    {parsedContacts
                      .filter((c) => c.valid)
                      .slice(0, 3)
                      .map((contact, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-4">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{contact.name}</p>
                            <p className="text-sm text-muted-foreground font-mono">{contact.phone}</p>
                          </div>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                      ))}
                    {validContactsCount > 3 && (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        ...e mais {validContactsCount - 3} contatos
                      </div>
                    )}
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Navigation */}
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentStep(2)} className="gap-2" size="lg">
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={isCreating}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Criando campanha...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Criar e Disparar ({validContactsCount} mensagens)
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* History View */
        <Card className="border-0 shadow-xl">
          <CardContent className="p-6">
            {campaigns.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-4">
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">Nenhuma campanha ainda</h3>
                <p className="text-muted-foreground mb-6">
                  Crie sua primeira campanha para começar a enviar mensagens.
                </p>
                <Button onClick={() => setActiveView("new")} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Criar primeira campanha
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => {
                  const statusConfig = STATUS_CONFIG[campaign.status]
                  const StatusIcon = statusConfig.icon
                  const progress =
                    campaign.total_messages > 0 ? Math.round((campaign.sent_count / campaign.total_messages) * 100) : 0

                  return (
                    <div
                      key={campaign.id}
                      className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className={cn(
                          "flex items-center justify-center w-12 h-12 rounded-xl",
                          campaign.status === "completed" && "bg-green-500/10",
                          campaign.status === "sending" && "bg-blue-500/10",
                          campaign.status === "draft" && "bg-muted",
                          campaign.status === "cancelled" && "bg-red-500/10",
                        )}
                      >
                        <StatusIcon
                          className={cn("h-6 w-6", statusConfig.color, campaign.status === "sending" && "animate-spin")}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{campaign.name}</h3>
                          <Badge variant={statusConfig.variant} className="shrink-0">
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {campaign.total_messages} contatos
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                            {campaign.sent_count} enviadas
                          </span>
                          {campaign.error_count > 0 && (
                            <span className="flex items-center gap-1 text-red-500">
                              <XCircle className="h-3.5 w-3.5" />
                              {campaign.error_count} erros
                            </span>
                          )}
                        </div>

                        {campaign.status === "completed" && (
                          <div className="mt-2">
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-green-500 transition-all duration-500"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {new Date(campaign.created_at).toLocaleDateString("pt-BR")}
                        </span>

                        {campaign.status === "draft" && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSend(campaign.id)}
                              className="gap-1"
                            >
                              <Send className="h-3.5 w-3.5" />
                              Enviar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive bg-transparent"
                              onClick={() => handleCancel(campaign.id)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
