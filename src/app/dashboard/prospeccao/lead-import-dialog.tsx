"use client"

import { useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Download } from "lucide-react"
import { toast } from "sonner"
import * as XLSX from "xlsx"

interface LeadImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface PreviewLead {
  cnpj: string
  razao_social?: string
  nome_fantasia?: string
  site?: string
  segmento?: string
  cidade?: string
  estado?: string
  valid: boolean
  error?: string
}

export function LeadImportDialog({ open, onOpenChange, onSuccess }: LeadImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<PreviewLead[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [step, setStep] = useState<"upload" | "preview" | "importing">("upload")

  const validateCNPJ = (cnpj: string): boolean => {
    const cleaned = cnpj.replace(/\D/g, "")
    return cleaned.length === 14
  }

  const processFile = useCallback(async (file: File) => {
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data)
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][]

    if (json.length < 2) {
      toast.error("Planilha vazia ou sem dados")
      return
    }

    // Encontrar índices das colunas
    const headers = json[0].map((h) => String(h).toLowerCase().trim())
    const cnpjIndex = headers.findIndex((h) => h.includes("cnpj"))
    const razaoIndex = headers.findIndex((h) => h.includes("razao") || h.includes("razão"))
    const fantasiaIndex = headers.findIndex((h) => h.includes("fantasia") || h.includes("nome"))
    const siteIndex = headers.findIndex((h) => h.includes("site") || h.includes("url"))
    const segmentoIndex = headers.findIndex((h) => h.includes("segmento") || h.includes("setor"))
    const cidadeIndex = headers.findIndex((h) => h.includes("cidade") || h.includes("municipio"))
    const estadoIndex = headers.findIndex((h) => h.includes("estado") || h.includes("uf"))

    if (cnpjIndex === -1) {
      toast.error("Coluna CNPJ não encontrada na planilha")
      return
    }

    const leads: PreviewLead[] = []
    const seenCNPJs = new Set<string>()

    for (let i = 1; i < json.length; i++) {
      const row = json[i]
      const cnpjRaw = String(row[cnpjIndex] || "").trim()
      const cnpj = cnpjRaw.replace(/\D/g, "")

      if (!cnpj) continue

      const valid = validateCNPJ(cnpj)
      let error: string | undefined

      if (!valid) {
        error = "CNPJ inválido"
      } else if (seenCNPJs.has(cnpj)) {
        error = "CNPJ duplicado"
      }

      if (valid && !seenCNPJs.has(cnpj)) {
        seenCNPJs.add(cnpj)
      }

      leads.push({
        cnpj,
        razao_social: razaoIndex >= 0 ? String(row[razaoIndex] || "").trim() || undefined : undefined,
        nome_fantasia: fantasiaIndex >= 0 ? String(row[fantasiaIndex] || "").trim() || undefined : undefined,
        site: siteIndex >= 0 ? String(row[siteIndex] || "").trim() || undefined : undefined,
        segmento: segmentoIndex >= 0 ? String(row[segmentoIndex] || "").trim() || undefined : undefined,
        cidade: cidadeIndex >= 0 ? String(row[cidadeIndex] || "").trim() || undefined : undefined,
        estado: estadoIndex >= 0 ? String(row[estadoIndex] || "").trim() || undefined : undefined,
        valid: valid && !error,
        error,
      })
    }

    setPreviewData(leads)
    setStep("preview")
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error("Formato inválido. Use .xlsx, .xls ou .csv")
      return
    }

    setFile(selectedFile)
    processFile(selectedFile)
  }

  const handleImport = async () => {
    const validLeads = previewData.filter((l) => l.valid)
    if (validLeads.length === 0) {
      toast.error("Nenhum lead válido para importar")
      return
    }

    setStep("importing")
    setUploadProgress(0)

    try {
      const batchSize = 50
      const batches = Math.ceil(validLeads.length / batchSize)

      for (let i = 0; i < batches; i++) {
        const batch = validLeads.slice(i * batchSize, (i + 1) * batchSize)
        
        const response = await fetch("/api/leads/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leads: batch }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || "Erro ao importar")
        }

        setUploadProgress(Math.round(((i + 1) / batches) * 100))
      }

      toast.success(`${validLeads.length} leads importados com sucesso!`)
      onSuccess()
      handleClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao importar leads")
      setStep("preview")
    }
  }

  const handleClose = () => {
    setFile(null)
    setPreviewData([])
    setStep("upload")
    setUploadProgress(0)
    onOpenChange(false)
  }

  const validCount = previewData.filter((l) => l.valid).length
  const invalidCount = previewData.filter((l) => !l.valid).length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importar Leads</DialogTitle>
          <DialogDescription>
            Importe leads a partir de uma planilha Excel ou CSV
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-dashed p-8 text-center">
              <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 font-semibold">Arraste sua planilha aqui</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Ou clique para selecionar um arquivo
              </p>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="mt-4 mx-auto max-w-xs"
              />
            </div>

            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Formato esperado</h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    A planilha deve conter uma coluna <strong>CNPJ</strong> (obrigatório).
                    Colunas opcionais: Razao Social, Nome Fantasia, Site, Telefone, Email.
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href="/exemplo-importacao-leads.csv" download="exemplo-importacao-leads.csv">
                    <Download className="mr-2 h-4 w-4" />
                    Baixar Exemplo
                  </a>
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {validCount} válidos
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <AlertCircle className="h-3 w-3 text-red-500" />
                  {invalidCount} inválidos
                </Badge>
              )}
            </div>

            <ScrollArea className="h-[400px] rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Razão Social</TableHead>
                    <TableHead>Nome Fantasia</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((lead, index) => (
                    <TableRow key={index} className={!lead.valid ? "bg-red-50/50" : ""}>
                      <TableCell>
                        {lead.valid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <span className="text-xs text-red-500">{lead.error}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{lead.cnpj}</TableCell>
                      <TableCell>{lead.razao_social || "-"}</TableCell>
                      <TableCell>{lead.nome_fantasia || "-"}</TableCell>
                      <TableCell>
                        {[lead.cidade, lead.estado].filter(Boolean).join("/") || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Voltar
              </Button>
              <Button onClick={handleImport} disabled={validCount === 0}>
                Importar {validCount} leads
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="space-y-4 py-8 text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <div>
              <p className="font-medium">Importando leads...</p>
              <p className="text-sm text-muted-foreground">
                Isso pode levar alguns segundos
              </p>
            </div>
            <Progress value={uploadProgress} className="mx-auto max-w-xs" />
            <p className="text-sm text-muted-foreground">{uploadProgress}%</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
