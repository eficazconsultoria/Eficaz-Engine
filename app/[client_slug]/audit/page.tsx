"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
  Search,
  RefreshCw,
  Globe,
  FileText,
  Bot,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Filter,
  Sparkles,
  TrendingUp,
  Clock,
  AlertCircle,
  BarChart3,
  Zap,
  FileSearch,
  Loader2,
  Play,
  Pause,
  Square,
  Plus,
  ArrowUpDown,
  RotateCcw,
} from "lucide-react"
import { SiteAudit, AuditItem, Client } from "@/lib/types"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface DiscoveredPage {
  url: string
  title: string
  type: string
  priority: string
}

interface AuditQueue {
  pages: string[]
  currentIndex: number
  isRunning: boolean
  currentPage: string | null
}

export default function AuditPage() {
  const params = useParams()
  const clientSlug = params.client_slug as string

  const [audits, setAudits] = useState<SiteAudit[]>([])
  const [client, setClient] = useState<Client | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [discoveredPages, setDiscoveredPages] = useState<DiscoveredPage[]>([])
  const [selectedPages, setSelectedPages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [expandedAudit, setExpandedAudit] = useState<string | null>(null)
  const [manualUrl, setManualUrl] = useState("")
  const [isAddingManual, setIsAddingManual] = useState(false)
  const [sortBy, setSortBy] = useState<string>("priority")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [reauditingPages, setReauditingPages] = useState<Set<string>>(new Set())
  const [recentlyAudited, setRecentlyAudited] = useState<Set<string>>(new Set())
  const { toast } = useToast()
  
  // Queue state for background auditing
  const [auditQueue, setAuditQueue] = useState<AuditQueue>({
    pages: [],
    currentIndex: 0,
    isRunning: false,
    currentPage: null
  })
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    fetchAudits()
  }, [clientSlug])

  // Auto-refresh when audit is running
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (auditQueue.isRunning) {
      interval = setInterval(() => {
        fetchAudits(true) // silent refresh
      }, 3000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [auditQueue.isRunning])

  async function fetchAudits(silent = false) {
    if (!silent) setIsLoading(true)
    try {
      const response = await fetch(`/api/clients/${clientSlug}/audit`)
      const data = await response.json()
      if (response.ok) {
        setAudits(data.audits || [])
        setClient(data.client)
      } else if (!silent) {
        setError(data.error)
      }
    } catch (err) {
      if (!silent) setError("Erro ao carregar auditorias")
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  async function discoverPages() {
    setIsDiscovering(true)
    setError(null)
    try {
      const response = await fetch(`/api/clients/${clientSlug}/audit/discover`, {
        method: "POST",
      })
      const data = await response.json()
      if (response.ok) {
        setDiscoveredPages(data.pages || [])
        setSelectedPages(data.pages?.map((p: DiscoveredPage) => p.url) || [])
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError("Erro ao descobrir paginas")
    } finally {
      setIsDiscovering(false)
    }
  }

  // Audit a single page
  const auditSinglePage = useCallback(async (pageUrl: string, signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/clients/${clientSlug}/audit/single`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_url: pageUrl }),
        signal,
      })
      
      const data = await response.json()
      
      if (response.ok && data.audit) {
        // Update audits list with new audit
        setAudits(prev => {
          const existing = prev.findIndex(a => a.page_url === pageUrl)
          if (existing >= 0) {
            const updated = [...prev]
            updated[existing] = data.audit
            return updated
          }
          return [data.audit, ...prev]
        })
        return true
      }
      return false
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return false
      }
      console.error(`Error auditing ${pageUrl}:`, err)
      return false
    }
  }, [clientSlug])

  // Process queue one by one
  const processQueue = useCallback(async () => {
    const controller = new AbortController()
    abortControllerRef.current = controller

    for (let i = auditQueue.currentIndex; i < auditQueue.pages.length; i++) {
      if (controller.signal.aborted) break
      
      const pageUrl = auditQueue.pages[i]
      
      setAuditQueue(prev => ({
        ...prev,
        currentIndex: i,
        currentPage: pageUrl
      }))

      await auditSinglePage(pageUrl, controller.signal)
      
      // Small delay between pages
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Finished
    setAuditQueue(prev => ({
      ...prev,
      isRunning: false,
      currentPage: null
    }))
    setDiscoveredPages([])
    setSelectedPages([])
  }, [auditQueue.pages, auditQueue.currentIndex, auditSinglePage])

  // Start audit queue
  function startAudit() {
    if (selectedPages.length === 0) {
      setError("Selecione pelo menos uma pagina para auditar")
      return
    }

    setError(null)
    setAuditQueue({
      pages: selectedPages,
      currentIndex: 0,
      isRunning: true,
      currentPage: selectedPages[0]
    })
  }

  // Effect to process queue when it starts
  useEffect(() => {
    if (auditQueue.isRunning && auditQueue.pages.length > 0) {
      processQueue()
    }
  }, [auditQueue.isRunning])

  // Stop audit
  function stopAudit() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setAuditQueue(prev => ({
      ...prev,
      isRunning: false,
      currentPage: null
    }))
  }

  // Re-audit a single page (add to queue)
  async function reauditPage(pageUrl: string) {
    setReauditingPages(prev => new Set(prev).add(pageUrl))
    
    toast({
      title: "Reauditoria iniciada",
      description: `Auditando: ${new URL(pageUrl).pathname || "/"}`,
    })
    
    try {
      await auditSinglePage(pageUrl)
      
      // Mark as recently audited for visual feedback
      setRecentlyAudited(prev => new Set(prev).add(pageUrl))
      
      // Remove from recently audited after 5 seconds
      setTimeout(() => {
        setRecentlyAudited(prev => {
          const newSet = new Set(prev)
          newSet.delete(pageUrl)
          return newSet
        })
      }, 5000)
      
      toast({
        title: "Auditoria concluida",
        description: `Pagina auditada com sucesso: ${new URL(pageUrl).pathname || "/"}`,
        variant: "default",
      })
    } catch (err) {
      toast({
        title: "Erro na auditoria",
        description: "Nao foi possivel auditar a pagina. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setReauditingPages(prev => {
        const newSet = new Set(prev)
        newSet.delete(pageUrl)
        return newSet
      })
    }
  }

  // Add manual URL to audit queue
  async function addManualUrl() {
    if (!manualUrl.trim()) return
    
    // Validate URL
    try {
      new URL(manualUrl)
    } catch {
      setError("URL invalida. Use o formato: https://exemplo.com/pagina")
      return
    }

    setIsAddingManual(true)
    setError(null)
    
    try {
      await auditSinglePage(manualUrl.trim())
      setManualUrl("")
    } catch (err) {
      setError("Erro ao adicionar URL para auditoria")
    } finally {
      setIsAddingManual(false)
    }
  }

  async function updateStatus(auditId: string, status: string) {
    try {
      const response = await fetch(`/api/clients/${clientSlug}/audit/${auditId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (response.ok) {
        setAudits(prev => prev.map(a => a.id === auditId ? { ...a, status: status as SiteAudit["status"] } : a))
      }
    } catch (err) {
      console.error("Error updating status:", err)
    }
  }

  // Filter and sort audits
  const filteredAudits = audits
    .filter(audit => {
      const matchesSearch = searchQuery === "" || 
        audit.page_url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        audit.page_title?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesPriority = priorityFilter === "all" || audit.priority === priorityFilter
      const matchesStatus = statusFilter === "all" || audit.status === statusFilter
      return matchesSearch && matchesPriority && matchesStatus
    })
    .sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case "priority":
          const priorityOrder = { critico: 4, alto: 3, medio: 2, baixo: 1 }
          comparison = (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
                       (priorityOrder[a.priority as keyof typeof priorityOrder] || 0)
          break
        case "score":
          comparison = b.overall_score - a.overall_score
          break
        case "seo":
          comparison = b.seo_score - a.seo_score
          break
        case "content":
          comparison = b.content_score - a.content_score
          break
        case "aeo":
          comparison = b.aeo_score - a.aeo_score
          break
        case "issues":
          comparison = b.critical_issues - a.critical_issues
          break
        case "date":
          comparison = new Date(b.last_audit_at).getTime() - new Date(a.last_audit_at).getTime()
          break
        default:
          comparison = 0
      }
      
      return sortOrder === "asc" ? -comparison : comparison
    })

  // Stats
  const totalAudits = audits.length
  const avgScore = totalAudits > 0 ? Math.round(audits.reduce((sum, a) => sum + a.overall_score, 0) / totalAudits) : 0
  const criticalCount = audits.filter(a => a.priority === "critico").length
  const resolvedCount = audits.filter(a => a.status === "resolvido").length

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critico": return "bg-red-500 text-white"
      case "alto": return "bg-orange-500 text-white"
      case "medio": return "bg-amber-500 text-white"
      case "baixo": return "bg-emerald-500 text-white"
      default: return "bg-muted"
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "critico": return "Critico"
      case "alto": return "Alto"
      case "medio": return "Medio"
      case "baixo": return "Baixo"
      default: return priority
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendente": return "bg-amber-500/20 text-amber-600 border-amber-500/30"
      case "em_progresso": return "bg-blue-500/20 text-blue-600 border-blue-500/30"
      case "resolvido": return "bg-emerald-500/20 text-emerald-600 border-emerald-500/30"
      default: return "bg-muted"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pendente": return "Pendente"
      case "em_progresso": return "Em Progresso"
      case "resolvido": return "Resolvido"
      default: return status
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500"
    if (score >= 60) return "text-amber-500"
    if (score >= 40) return "text-orange-500"
    return "text-red-500"
  }

  const getScoreGradient = (score: number) => {
    if (score >= 80) return "from-emerald-500 to-green-500"
    if (score >= 60) return "from-amber-500 to-yellow-500"
    if (score >= 40) return "from-orange-500 to-amber-500"
    return "from-red-500 to-rose-500"
  }

  const renderAuditItem = (item: AuditItem) => {
    const statusIcon = item.status === "passed" ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    ) : item.status === "warning" ? (
      <AlertCircle className="h-4 w-4 text-amber-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    )

    const statusBg = item.status === "passed" 
      ? "bg-emerald-500/10 border-emerald-500/20" 
      : item.status === "warning" 
      ? "bg-amber-500/10 border-amber-500/20"
      : "bg-red-500/10 border-red-500/20"

    return (
      <div key={item.id} className={`p-4 rounded-lg border ${statusBg} transition-all hover:shadow-sm`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{statusIcon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h5 className="font-medium text-sm">{item.title}</h5>
              <Badge variant="outline" className={`text-[10px] ${getPriorityColor(item.priority)}`}>
                {getPriorityLabel(item.priority)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{item.description}</p>
            
            {(item.current_value || item.expected_value) && (
              <div className="flex flex-wrap gap-4 text-xs mb-2">
                {item.current_value && (
                  <div>
                    <span className="text-muted-foreground">Atual:</span>{" "}
                    <span className="font-mono">{item.current_value}</span>
                  </div>
                )}
                {item.expected_value && (
                  <div>
                    <span className="text-muted-foreground">Esperado:</span>{" "}
                    <span className="font-mono text-emerald-600">{item.expected_value}</span>
                  </div>
                )}
              </div>
            )}
            
            {item.recommendation && item.status !== "passed" && (
              <div className="mt-2 p-2 rounded bg-muted/50 border border-dashed">
                <p className="text-xs">
                  <span className="font-medium text-primary">Recomendacao:</span>{" "}
                  {item.recommendation}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileSearch className="h-6 w-6 text-primary" />
            Auditoria de Site
          </h1>
          <p className="text-muted-foreground mt-1">
            Analise SEO Tecnico, Qualidade de Conteudo e AEO do seu site
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={discoverPages}
            disabled={isDiscovering || auditQueue.isRunning}
          >
            {isDiscovering ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Descobrir Paginas
          </Button>
          <Button onClick={() => fetchAudits()} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600">
          {error}
        </div>
      )}

      {/* Audit Progress Banner */}
      {auditQueue.isRunning && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/10 via-violet-500/10 to-primary/10 animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/20">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    Auditando pagina {auditQueue.currentIndex + 1} de {auditQueue.pages.length}
                  </p>
                  <p className="text-xs text-muted-foreground truncate max-w-md">
                    {auditQueue.currentPage}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32">
                  <Progress 
                    value={((auditQueue.currentIndex + 1) / auditQueue.pages.length) * 100} 
                    className="h-2"
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={stopAudit}
                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                >
                  <Square className="h-4 w-4 mr-1" />
                  Parar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Discover Pages Modal */}
      {discoveredPages.length > 0 && !auditQueue.isRunning && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-violet-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Paginas Descobertas
            </CardTitle>
            <CardDescription>
              Selecione as paginas que deseja auditar (serao processadas uma por vez)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
              {discoveredPages.map((page) => (
                <label
                  key={page.url}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedPages.includes(page.url)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPages([...selectedPages, page.url])
                      } else {
                        setSelectedPages(selectedPages.filter(p => p !== page.url))
                      }
                    }}
                    className="rounded border-muted-foreground/30"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{page.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{page.url}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-[10px]">{page.type}</Badge>
                    <Badge 
                      className={`text-[10px] ${
                        page.priority === "alta" ? "bg-red-500" : 
                        page.priority === "media" ? "bg-amber-500" : "bg-emerald-500"
                      } text-white`}
                    >
                      {page.priority}
                    </Badge>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                <p>{selectedPages.length} de {discoveredPages.length} selecionadas</p>
                <p className="text-xs">Cada pagina sera auditada individualmente</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDiscoveredPages([])}>
                  Cancelar
                </Button>
                <Button onClick={startAudit} disabled={selectedPages.length === 0}>
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar Auditoria
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/10 to-violet-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/20">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgScore}%</p>
                <p className="text-xs text-muted-foreground">Score Medio</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-muted">
                <Globe className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalAudits}</p>
                <p className="text-xs text-muted-foreground">Paginas Auditadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-500/10 to-rose-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{criticalCount}</p>
                <p className="text-xs text-muted-foreground">Criticos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-500/10 to-green-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resolvedCount}</p>
                <p className="text-xs text-muted-foreground">Resolvidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Manual URL */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Adicionar URL manualmente (ex: https://exemplo.com/pagina)"
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    className="pl-9"
                    onKeyDown={(e) => e.key === "Enter" && addManualUrl()}
                  />
                </div>
                <Button 
                  onClick={addManualUrl} 
                  disabled={!manualUrl.trim() || isAddingManual || auditQueue.isRunning}
                >
                  {isAddingManual ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Auditar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por URL ou titulo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[130px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="critico">Critico</SelectItem>
                  <SelectItem value="alto">Alto</SelectItem>
                  <SelectItem value="medio">Medio</SelectItem>
                  <SelectItem value="baixo">Baixo</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <Clock className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_progresso">Em Progresso</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Prioridade</SelectItem>
                  <SelectItem value="score">Score Geral</SelectItem>
                  <SelectItem value="seo">Score SEO</SelectItem>
                  <SelectItem value="content">Score Conteudo</SelectItem>
                  <SelectItem value="aeo">Score AEO</SelectItem>
                  <SelectItem value="issues">Issues Criticos</SelectItem>
                  <SelectItem value="date">Data Auditoria</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                title={sortOrder === "asc" ? "Ordem crescente" : "Ordem decrescente"}
              >
                <ArrowUpDown className={`h-4 w-4 transition-transform ${sortOrder === "asc" ? "rotate-180" : ""}`} />
              </Button>
            </div>
          </div>
          
          {/* Active filters indicator */}
          {(priorityFilter !== "all" || statusFilter !== "all" || searchQuery) && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t">
              <span className="text-xs text-muted-foreground">Filtros ativos:</span>
              {searchQuery && (
                <Badge variant="secondary" className="text-xs">
                  Busca: {searchQuery}
                </Badge>
              )}
              {priorityFilter !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  Prioridade: {getPriorityLabel(priorityFilter)}
                </Badge>
              )}
              {statusFilter !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  Status: {getStatusLabel(statusFilter)}
                </Badge>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs"
                onClick={() => {
                  setSearchQuery("")
                  setPriorityFilter("all")
                  setStatusFilter("all")
                }}
              >
                Limpar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audits List */}
      {filteredAudits.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileSearch className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma auditoria encontrada</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {audits.length === 0
                ? "Clique em 'Descobrir Paginas' para iniciar uma auditoria do site"
                : "Nenhuma auditoria corresponde aos filtros selecionados"}
            </p>
            {audits.length === 0 && (
              <Button onClick={discoverPages} disabled={isDiscovering}>
                <Sparkles className="h-4 w-4 mr-2" />
                Descobrir Paginas
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAudits.map((audit) => {
            const isReauditing = reauditingPages.has(audit.page_url)
            const wasRecentlyAudited = recentlyAudited.has(audit.page_url)
            
            return (
            <Collapsible
              key={audit.id}
              open={expandedAudit === audit.id}
              onOpenChange={(open) => setExpandedAudit(open ? audit.id : null)}
            >
              <Card className={`border-0 shadow-sm overflow-hidden transition-all duration-500 relative ${
                isReauditing 
                  ? "ring-2 ring-blue-500/50 bg-blue-500/5" 
                  : wasRecentlyAudited 
                  ? "ring-2 ring-emerald-500/50 bg-emerald-500/5" 
                  : ""
              }`}>
                {/* Reauditing indicator bar */}
                {isReauditing && (
                  <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 h-1 animate-pulse" />
                )}
                {wasRecentlyAudited && !isReauditing && (
                  <div className="bg-gradient-to-r from-emerald-500 to-green-500 h-1" />
                )}
                
                <CollapsibleTrigger asChild>
                  <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-4">
                      {/* Status indicator for reauditing */}
                      {isReauditing && (
                        <div className="absolute top-4 right-4 flex items-center gap-2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium animate-pulse z-10">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Auditando...
                        </div>
                      )}
                      {wasRecentlyAudited && !isReauditing && (
                        <div className="absolute top-4 right-4 flex items-center gap-2 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-medium z-10">
                          <CheckCircle2 className="h-3 w-3" />
                          Atualizado!
                        </div>
                      )}
                      
                      {/* Score Circle */}
                      <div className={`relative w-16 h-16 rounded-full bg-gradient-to-br ${getScoreGradient(audit.overall_score)} p-0.5 shrink-0 ${isReauditing ? "opacity-50" : ""}`}>
                        {isReauditing ? (
                          <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                          </div>
                        ) : (
                          <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                            <span className={`text-xl font-bold ${getScoreColor(audit.overall_score)}`}>
                              {audit.overall_score}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Page Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-sm truncate">{audit.page_title || "Sem titulo"}</h3>
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                              <Globe className="h-3 w-3" />
                              {audit.page_url}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation()
                                reauditPage(audit.page_url)
                              }}
                              disabled={reauditingPages.has(audit.page_url) || auditQueue.isRunning}
                              title="Re-auditar pagina"
                            >
                              {reauditingPages.has(audit.page_url) ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Badge className={getPriorityColor(audit.priority)}>
                              {getPriorityLabel(audit.priority)}
                            </Badge>
                            <Select
                              value={audit.status}
                              onValueChange={(value) => updateStatus(audit.id, value)}
                            >
                              <SelectTrigger className={`h-7 text-xs w-auto border ${getStatusColor(audit.status)}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pendente">Pendente</SelectItem>
                                <SelectItem value="em_progresso">Em Progresso</SelectItem>
                                <SelectItem value="resolvido">Resolvido</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Score Bars */}
                        <div className="grid grid-cols-3 gap-4 mt-3">
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">SEO</span>
                              <span className="font-medium">{audit.seo_score}%</span>
                            </div>
                            <Progress value={audit.seo_score} className="h-1.5" />
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Conteudo</span>
                              <span className="font-medium">{audit.content_score}%</span>
                            </div>
                            <Progress value={audit.content_score} className="h-1.5" />
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">AEO</span>
                              <span className="font-medium">{audit.aeo_score}%</span>
                            </div>
                            <Progress value={audit.aeo_score} className="h-1.5" />
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex items-center gap-1 text-xs">
                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                            <span>{audit.critical_issues} criticos</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                            <span>{audit.warnings} avisos</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            <span>{audit.passed} ok</span>
                          </div>
                        </div>
                      </div>

                      {/* Expand Icon */}
                      <div className="shrink-0">
                        {expandedAudit === audit.id ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="border-t bg-muted/20">
                    <Tabs defaultValue="seo" className="w-full">
                      <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
                        <TabsTrigger 
                          value="seo" 
                          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          SEO Tecnico
                        </TabsTrigger>
                        <TabsTrigger 
                          value="content" 
                          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                        >
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Conteudo
                        </TabsTrigger>
                        <TabsTrigger 
                          value="aeo" 
                          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                        >
                          <Bot className="h-4 w-4 mr-2" />
                          AEO
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="seo" className="p-4 space-y-3">
                        {audit.seo_audit && Object.values(audit.seo_audit).map((item) => 
                          item && renderAuditItem(item as AuditItem)
                        )}
                      </TabsContent>

                      <TabsContent value="content" className="p-4 space-y-3">
                        {audit.content_audit && Object.values(audit.content_audit).map((item) => 
                          item && renderAuditItem(item as AuditItem)
                        )}
                      </TabsContent>

                      <TabsContent value="aeo" className="p-4 space-y-3">
                        {audit.aeo_audit && Object.values(audit.aeo_audit).map((item) => 
                          item && renderAuditItem(item as AuditItem)
                        )}
                      </TabsContent>
                    </Tabs>

                    {/* Actions */}
                    <div className="p-4 border-t flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Ultima auditoria: {new Date(audit.last_audit_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            reauditPage(audit.page_url)
                          }}
                          disabled={reauditingPages.has(audit.page_url) || auditQueue.isRunning}
                        >
                          {reauditingPages.has(audit.page_url) ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4 mr-1" />
                          )}
                          Re-auditar
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href={audit.page_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Visitar
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )})}
        </div>
      )}
    </div>
  )
}
