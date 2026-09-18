"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Upload,
  Plus,
  Sparkles,
  Search,
  Building2,
  MoreHorizontal,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Trash2,
  RefreshCw,
  Download,
  FileDown,
  X,
  CheckSquare,
  BarChart3,
} from "lucide-react"
import type { Lead, LeadStatus } from "@/lib/types"
import { LeadImportDialog } from "./lead-import-dialog"
import { LeadFormDialog } from "./lead-form-dialog"
import { LeadDetailDialog } from "./lead-detail-dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"

interface ProspeccaoContentProps {
  initialLeads: Lead[]
  initialTotal?: number
  initialTotalPages?: number
}

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; icon: typeof Clock }> = {
  pendente: { label: "Pendente", color: "bg-muted text-muted-foreground", icon: Clock },
  processando: { label: "Processando", color: "bg-blue-500/10 text-blue-600", icon: Loader2 },
  enriquecido: { label: "Enriquecido", color: "bg-green-500/10 text-green-600", icon: CheckCircle2 },
  erro: { label: "Erro", color: "bg-red-500/10 text-red-600", icon: AlertCircle },
}

export function ProspeccaoContent({ initialLeads, initialTotal = 0, initialTotalPages = 1 }: ProspeccaoContentProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all")
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)
  const [isDeletingBatch, setIsDeletingBatch] = useState(false)
  
  // Estado de paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [totalLeads, setTotalLeads] = useState(initialTotal)
  const [pageSize] = useState(50)
  const [isLoading, setIsLoading] = useState(false)

  const fetchLeads = useCallback(async (page: number = 1) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/leads?page=${page}&pageSize=${pageSize}`)
      if (!response.ok) throw new Error("Erro ao buscar leads")
      const data = await response.json()
      setLeads(data.leads || [])
      setTotalPages(data.totalPages || 1)
      setTotalLeads(data.total || 0)
      setCurrentPage(data.page || 1)
    } catch {
      toast.error("Erro ao carregar leads")
    } finally {
      setIsLoading(false)
    }
  }, [pageSize])

  // Polling para atualização em tempo real durante processamento
  useEffect(() => {
    if (!isProcessing) return

    const interval = setInterval(async () => {
      const response = await fetch(`/api/leads?page=${currentPage}&pageSize=${pageSize}`)
      if (response.ok) {
        const data = await response.json()
        setLeads(data.leads || [])
        setTotalLeads(data.total || 0)

        // Verificar progresso
        const processing = (data.leads || []).filter((l: Lead) => l.status === "processando")
        const pending = (data.leads || []).filter((l: Lead) => l.status === "pendente")
        
        if (processing.length === 0 && pending.length === 0) {
          setIsProcessing(false)
          toast.success("Processamento concluído!")
        } else {
          const total = processingProgress.total
          const done = total - processing.length - pending.length
          setProcessingProgress({ current: done, total })
        }
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [isProcessing, processingProgress.total, currentPage, pageSize])

  const handleEnrichAll = async () => {
    const pendingLeads = leads.filter((l) => l.status === "pendente")
    if (pendingLeads.length === 0) {
      toast.info("Nenhum lead pendente para processar")
      return
    }

    setIsProcessing(true)
    setProcessingProgress({ current: 0, total: pendingLeads.length })

    try {
      const response = await fetch("/api/leads/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_ids: pendingLeads.map((l) => l.id) }),
      })

      if (!response.ok) throw new Error("Erro ao iniciar enriquecimento")
      
      toast.success(`Iniciando enriquecimento de ${pendingLeads.length} leads...`)
    } catch {
      toast.error("Erro ao iniciar enriquecimento")
      setIsProcessing(false)
    }
  }

  const handleEnrichSingle = async (leadId: string) => {
    try {
      const response = await fetch("/api/leads/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_ids: [leadId] }),
      })

      if (!response.ok) throw new Error("Erro ao enriquecer lead")
      
      toast.success("Enriquecimento iniciado")
      
      // Atualiza o lead localmente para mostrar "processando"
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: "processando" as LeadStatus } : l))
      )
      
      // Inicia polling para este lead
      const pollInterval = setInterval(async () => {
        const res = await fetch(`/api/leads/${leadId}`)
        if (res.ok) {
          const updatedLead = await res.json()
          setLeads((prev) => prev.map((l) => (l.id === leadId ? updatedLead : l)))
          
          if (updatedLead.status !== "processando") {
            clearInterval(pollInterval)
            if (updatedLead.status === "enriquecido") {
              toast.success("Lead enriquecido com sucesso!")
            }
          }
        }
      }, 2000)

      // Timeout de 5 minutos
      setTimeout(() => clearInterval(pollInterval), 300000)
    } catch {
      toast.error("Erro ao enriquecer lead")
    }
  }

  const handleDelete = async (leadId: string) => {
    if (!confirm("Tem certeza que deseja excluir este lead?")) return

    try {
      const response = await fetch(`/api/leads/${leadId}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Erro ao excluir lead")
      
      setLeads((prev) => prev.filter((l) => l.id !== leadId))
      toast.success("Lead excluído")
    } catch {
      toast.error("Erro ao excluir lead")
    }
  }

  // Funções de seleção
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredLeads.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredLeads.map(l => l.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  // Função para exportar leads
  const exportLeads = async (format: 'csv' | 'excel', exportAll: boolean = false) => {
    setIsExporting(true)
    try {
      let leadsToExport: Lead[]
      
      if (exportAll) {
        // Buscar TODOS os leads da API (sem paginação)
        const response = await fetch('/api/leads?all=true')
        if (!response.ok) throw new Error('Erro ao buscar leads')
        const data = await response.json()
        leadsToExport = data.leads || []
      } else {
        leadsToExport = leads.filter(l => selectedIds.has(l.id))
      }
      
      if (leadsToExport.length === 0) {
        toast.error("Nenhum lead para exportar")
        setIsExporting(false)
        return
      }

      // Preparar dados para exportação
      const exportData = leadsToExport.map(lead => ({
        'CNPJ': lead.cnpj,
        'Razão Social': lead.razao_social || '',
        'Nome Fantasia': lead.nome_fantasia || '',
        'Segmento': lead.segmento || '',
        'Classificação': lead.classificacao || '',
        'Modelo de Negócio': lead.modelo_negocio || '',
        'Atuação': lead.atuacao || '',
        'Site': lead.site || '',
        'Site E-commerce': lead.site_ecommerce || '',
        'Plataforma': lead.plataforma || '',
        'Telefone': lead.telefone || '',
        'WhatsApp': lead.whatsapp || '',
        'Email': lead.email || '',
        'Cidade': lead.endereco_cidade || '',
        'Estado': lead.endereco_estado || '',
        'CEP': lead.endereco_cep || '',
        'Capital Social': lead.capital_social || '',
        'Tempo de Mercado': lead.tempo_mercado || '',
        'CNAE Código': lead.cnae_codigo || '',
        'CNAE Descrição': lead.cnae_descricao || '',
        'Possíveis Dores': lead.possiveis_dores?.join('; ') || '',
        'Status': lead.status,
        'Resumo': lead.resumo || '',
      }))

      if (format === 'csv') {
        // Gerar CSV
        const headers = Object.keys(exportData[0])
        const csvContent = [
          headers.join(';'),
          ...exportData.map(row => 
            headers.map(h => {
              const value = String(row[h as keyof typeof row] || '')
              // Escapar valores com vírgula ou quebra de linha
              if (value.includes(';') || value.includes('\n') || value.includes('"')) {
                return `"${value.replace(/"/g, '""')}"`
              }
              return value
            }).join(';')
          )
        ].join('\n')

        // Download
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `leads_${new Date().toISOString().split('T')[0]}.csv`
        link.click()
        URL.revokeObjectURL(url)
        
        toast.success(`${leadsToExport.length} leads exportados para CSV`)
      } else {
        // Para Excel, usar a API
        const response = await fetch('/api/leads/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leads: exportData, format: 'excel' })
        })

        if (!response.ok) {
          // Fallback para CSV se a API de Excel não existir
          toast.info("Exportando como CSV...")
          exportLeads('csv', exportAll)
          return
        }

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `leads_${new Date().toISOString().split('T')[0]}.xlsx`
        link.click()
        URL.revokeObjectURL(url)
        
        toast.success(`${leadsToExport.length} leads exportados para Excel`)
      }
    } catch (error) {
      console.error('Erro ao exportar:', error)
      toast.error("Erro ao exportar leads")
    } finally {
      setIsExporting(false)
    }
  }

  // Função para deletar em massa
  const handleDeleteBatch = async () => {
    if (selectedIds.size === 0) return
    
    if (!confirm(`Tem certeza que deseja excluir ${selectedIds.size} lead(s)?`)) return
    
    setIsDeletingBatch(true)
    try {
      const response = await fetch('/api/leads/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      })

      if (!response.ok) throw new Error("Erro ao excluir leads")

      const result = await response.json()
      setSelectedIds(new Set())
      toast.success(`${result.deleted} leads excluídos`)
      // Recarregar página atual para atualizar contagens
      await fetchLeads(currentPage)
    } catch {
      toast.error("Erro ao excluir leads")
    } finally {
      setIsDeletingBatch(false)
    }
  }

  // Função para enriquecer em massa
  const handleEnrichBatch = async () => {
    if (selectedIds.size === 0) return
    
    const pendingLeads = leads.filter(l => selectedIds.has(l.id) && (l.status === 'pendente' || l.status === 'erro'))
    if (pendingLeads.length === 0) {
      toast.error("Nenhum lead pendente selecionado para enriquecer")
      return
    }

    setIsProcessing(true)
    setProcessingProgress({ current: 0, total: pendingLeads.length })

    for (const lead of pendingLeads) {
      await handleEnrichSingle(lead.id)
    }

    setSelectedIds(new Set())
    toast.success(`${pendingLeads.length} leads enviados para enriquecimento`)
  }

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      !searchQuery ||
      lead.cnpj.includes(searchQuery) ||
      lead.razao_social?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.nome_fantasia?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || lead.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const stats = {
    total: leads.length,
    pendentes: leads.filter((l) => l.status === "pendente").length,
    processando: leads.filter((l) => l.status === "processando").length,
    enriquecidos: leads.filter((l) => l.status === "enriquecido").length,
    erros: leads.filter((l) => l.status === "erro").length,
  }

  const formatCNPJ = (cnpj: string) => {
    const digits = cnpj.replace(/\D/g, "")
    if (digits.length !== 14) return cnpj
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="mt-1 text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Pendentes</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-muted-foreground">{stats.pendentes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Processando</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-blue-600">{stats.processando}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Enriquecidos</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-green-600">{stats.enriquecidos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Erros</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-red-600">{stats.erros}</p>
          </CardContent>
        </Card>
      </div>

      {/* Processing Progress */}
      {isProcessing && (
        <Card className="border-blue-500/50 bg-blue-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <div>
                  <p className="font-medium">Enriquecendo leads...</p>
                  <p className="text-sm text-muted-foreground">
                    {processingProgress.current} de {processingProgress.total} processados
                  </p>
                </div>
              </div>
              <Progress
                value={(processingProgress.current / processingProgress.total) * 100}
                className="w-48"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions Bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-4">
            {/* Linha 1: Campo de busca */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por CNPJ, razão social ou nome fantasia..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Linha 2: Filtros e botões */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <Tabs
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as LeadStatus | "all")}
              >
                <TabsList>
                  <TabsTrigger value="all">Todos</TabsTrigger>
                  <TabsTrigger value="pendente">Pendentes</TabsTrigger>
                  <TabsTrigger value="enriquecido">Enriquecidos</TabsTrigger>
                  <TabsTrigger value="erro">Erros</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" asChild>
                  <Link href="/dashboard/prospeccao/relatorios">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Relatórios
                  </Link>
                </Button>
                <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar Excel
                </Button>
                <Button variant="outline" onClick={() => setIsFormOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Lead
                </Button>
                <Button
                  onClick={handleEnrichAll}
                  disabled={isProcessing || stats.pendentes === 0}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Enriquecer Todos ({stats.pendentes})
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Leads</CardTitle>
              <CardDescription>
                {filteredLeads.length} leads encontrados
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isExporting}>
                    {isExporting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportLeads('csv', true)}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Exportar Todos (CSV)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportLeads('excel', true)}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Exportar Todos (Excel)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        {/* Barra de ações em massa */}
        {selectedIds.size > 0 && (
          <div className="mx-6 mb-4 flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3">
            <div className="flex items-center gap-3">
              <CheckSquare className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">
                {selectedIds.size} lead{selectedIds.size > 1 ? 's' : ''} selecionado{selectedIds.size > 1 ? 's' : ''}
              </span>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                <X className="mr-1 h-3 w-3" />
                Limpar
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleEnrichBatch}
                disabled={isProcessing}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Enriquecer
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isExporting}>
                    {isExporting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportLeads('csv', false)}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Exportar Selecionados (CSV)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportLeads('excel', false)}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Exportar Selecionados (Excel)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDeleteBatch}
                disabled={isDeletingBatch}
              >
                {isDeletingBatch ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Excluir
              </Button>
            </div>
          </div>
        )}

        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-12 w-12 text-muted-foreground/50 animate-spin" />
              <p className="mt-4 text-sm text-muted-foreground">Carregando leads...</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 font-semibold">Nenhum lead encontrado</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Importe uma planilha ou adicione leads manualmente
              </p>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar Excel
                </Button>
                <Button onClick={() => setIsFormOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Lead
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={filteredLeads.length > 0 && selectedIds.size === filteredLeads.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Selecionar todos"
                      />
                    </TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Segmento</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => {
                    const StatusIcon = STATUS_CONFIG[lead.status].icon
                    return (
                      <TableRow 
                        key={lead.id} 
                        className={cn(
                          "group cursor-pointer hover:bg-muted/50 transition-colors",
                          selectedIds.has(lead.id) && "bg-primary/5"
                        )}
                        onClick={() => setSelectedLead(lead)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox 
                            checked={selectedIds.has(lead.id)}
                            onCheckedChange={() => toggleSelect(lead.id)}
                            aria-label={`Selecionar ${lead.nome_fantasia || lead.razao_social}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatCNPJ(lead.cnpj)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {lead.nome_fantasia || lead.razao_social || "-"}
                            </p>
                            {lead.nome_fantasia && lead.razao_social && (
                              <p className="text-xs text-muted-foreground">
                                {lead.razao_social}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {lead.segmento ? (
                            <Badge variant="secondary">{lead.segmento}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {lead.endereco_cidade || lead.endereco_estado ? (
                            <span className="text-sm">
                              {[lead.endereco_cidade, lead.endereco_estado]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {lead.modelo_negocio ? (
                            <Badge variant="outline" className="uppercase">
                              {lead.modelo_negocio}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "gap-1",
                              STATUS_CONFIG[lead.status].color
                            )}
                          >
                            <StatusIcon
                              className={cn(
                                "h-3 w-3",
                                lead.status === "processando" && "animate-spin"
                              )}
                            />
                            {STATUS_CONFIG[lead.status].label}
                          </Badge>
                          {lead.status === "processando" && lead.enrichment_progress > 0 && (
                            <Progress
                              value={lead.enrichment_progress}
                              className="mt-1 h-1"
                            />
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedLead(lead)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver detalhes
                              </DropdownMenuItem>
                              {lead.status === "pendente" && (
                                <DropdownMenuItem
                                  onClick={() => handleEnrichSingle(lead.id)}
                                >
                                  <Sparkles className="mr-2 h-4 w-4" />
                                  Enriquecer
                                </DropdownMenuItem>
                              )}
                              {lead.status === "erro" && (
                                <DropdownMenuItem
                                  onClick={() => handleEnrichSingle(lead.id)}
                                >
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Tentar novamente
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDelete(lead.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
        
        {/* Controles de Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-4">
            <div className="text-sm text-muted-foreground">
              Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, totalLeads)} de {totalLeads} leads
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newPage = currentPage - 1
                  setCurrentPage(newPage)
                  setSelectedIds(new Set())
                  fetchLeads(newPage)
                }}
                disabled={currentPage <= 1 || isLoading}
              >
                Anterior
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      className="w-9"
                      onClick={() => {
                        setCurrentPage(pageNum)
                        setSelectedIds(new Set())
                        fetchLeads(pageNum)
                      }}
                      disabled={isLoading}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newPage = currentPage + 1
                  setCurrentPage(newPage)
                  setSelectedIds(new Set())
                  fetchLeads(newPage)
                }}
                disabled={currentPage >= totalPages || isLoading}
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Dialogs */}
      <LeadImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onSuccess={() => fetchLeads(1)}
      />

      <LeadFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={() => fetchLeads(currentPage)}
      />

{selectedLead && (
<LeadDetailDialog
  lead={selectedLead}
  open={!!selectedLead}
  onOpenChange={(open) => !open && setSelectedLead(null)}
  onLeadUpdate={(updatedLead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l))
    setSelectedLead(updatedLead)
  }}
          onEnrich={() => {
            handleEnrichSingle(selectedLead.id)
            setSelectedLead(null)
          }}
        />
      )}
    </div>
  )
}
