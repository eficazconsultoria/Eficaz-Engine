"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Eye,
  ArrowUp,
  ArrowDown,
  Target,
  Lightbulb,
  MessageSquare,
  Filter,
  Zap,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from "lucide-react"
import type { Client, ClientKeyword } from "@/lib/types"

type VolumeFilter = "all" | "muito_alto" | "alto" | "medio" | "baixo"
type TrendFilter = "all" | "crescimento" | "estavel" | "queda"
type StatusFilter = "all" | "monitored" | "not_monitored"

export default function KeywordsPage() {
  const params = useParams()
  const clientSlug = params.client_slug as string

  const [client, setClient] = useState<Client | null>(null)
  const [keywords, setKeywords] = useState<ClientKeyword[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingPromptsFor, setGeneratingPromptsFor] = useState<string | null>(null)
  const [selectedKeyword, setSelectedKeyword] = useState<ClientKeyword | null>(null)
  const [monitoringPrompt, setMonitoringPrompt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [volumeFilter, setVolumeFilter] = useState<VolumeFilter>("all")
  const [trendFilter, setTrendFilter] = useState<TrendFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  useEffect(() => {
    fetchKeywords()
  }, [clientSlug])

  const filteredKeywords = useMemo(() => {
    return keywords.filter(keyword => {
      // Search filter
      if (searchQuery && !keyword.keyword.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      // Volume filter
      if (volumeFilter !== "all" && keyword.search_volume !== volumeFilter) {
        return false
      }
      // Trend filter
      if (trendFilter !== "all" && keyword.trend !== trendFilter) {
        return false
      }
      // Status filter
      if (statusFilter === "monitored" && !keyword.is_monitored) {
        return false
      }
      if (statusFilter === "not_monitored" && keyword.is_monitored) {
        return false
      }
      return true
    })
  }, [keywords, searchQuery, volumeFilter, trendFilter, statusFilter])

  // Stats
  const stats = useMemo(() => {
    return {
      total: keywords.length,
      crescimento: keywords.filter(k => k.trend === "crescimento").length,
      altoVolume: keywords.filter(k => k.search_volume === "muito_alto" || k.search_volume === "alto").length,
      monitoradas: keywords.filter(k => k.is_monitored).length,
      muitoAlto: keywords.filter(k => k.search_volume === "muito_alto").length,
      alto: keywords.filter(k => k.search_volume === "alto").length,
      medio: keywords.filter(k => k.search_volume === "medio").length,
      baixo: keywords.filter(k => k.search_volume === "baixo").length,
      queda: keywords.filter(k => k.trend === "queda").length,
      estavel: keywords.filter(k => k.trend === "estavel").length,
    }
  }, [keywords])

  async function fetchKeywords() {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/clients/${clientSlug}/keywords`)
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Erro de servidor")
      }
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setClient(data.client)
      setKeywords(data.keywords || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGenerateKeywords() {
    setIsGenerating(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const response = await fetch(`/api/clients/${clientSlug}/keywords`, {
        method: "POST",
      })
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Erro de servidor")
      }
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setKeywords(data.keywords || [])
      setSuccessMessage(data.message)
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar palavras-chave")
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleGeneratePrompts(keyword: ClientKeyword) {
    setGeneratingPromptsFor(keyword.id)
    setError(null)
    try {
      const response = await fetch(`/api/clients/${clientSlug}/keywords/${keyword.id}/prompts`, {
        method: "POST",
      })
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Erro de servidor")
      }
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      
      setKeywords(prev => prev.map(k => 
        k.id === keyword.id 
          ? { ...k, suggested_prompts: data.prompts }
          : k
      ))
      
      setSelectedKeyword({ ...keyword, suggested_prompts: data.prompts })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar prompts")
    } finally {
      setGeneratingPromptsFor(null)
    }
  }

  async function handleMonitorPrompt(keyword: ClientKeyword, prompt: string) {
    setMonitoringPrompt(prompt)
    setError(null)
    try {
      const response = await fetch(`/api/clients/${clientSlug}/keywords/${keyword.id}/monitor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      })
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Erro de servidor")
      }
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      
      setKeywords(prev => prev.map(k => 
        k.id === keyword.id 
          ? { ...k, is_monitored: true, monitored_prompt_id: data.prompt.id }
          : k
      ))
      
      setSuccessMessage("Prompt adicionado para monitoramento!")
      setTimeout(() => setSuccessMessage(null), 5000)
      setSelectedKeyword(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao monitorar prompt")
    } finally {
      setMonitoringPrompt(null)
    }
  }

  function getVolumeColor(volume: string) {
    switch (volume) {
      case "muito_alto": return "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-sm"
      case "alto": return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm"
      case "medio": return "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm"
      case "baixo": return "bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-sm"
      default: return "bg-gray-400 text-white"
    }
  }

  function getVolumeLabel(volume: string) {
    switch (volume) {
      case "muito_alto": return "Muito Alto"
      case "alto": return "Alto"
      case "medio": return "Medio"
      case "baixo": return "Baixo"
      default: return volume
    }
  }

  function getTrendIcon(trend: string, size = "h-4 w-4") {
    switch (trend) {
      case "crescimento": return <TrendingUp className={`${size} text-emerald-500`} />
      case "queda": return <TrendingDown className={`${size} text-red-500`} />
      default: return <Minus className={`${size} text-amber-500`} />
    }
  }

  function getTrendLabel(trend: string) {
    switch (trend) {
      case "crescimento": return "Em crescimento"
      case "queda": return "Em queda"
      default: return "Estavel"
    }
  }

  function getTrendColor(trend: string) {
    switch (trend) {
      case "crescimento": return "text-emerald-500 bg-emerald-500/10"
      case "queda": return "text-red-500 bg-red-500/10"
      default: return "text-amber-500 bg-amber-500/10"
    }
  }

  function getVolumeChange(current: string, previous: string | null) {
    if (!previous) return null
    const levels = ["baixo", "medio", "alto", "muito_alto"]
    const currentIndex = levels.indexOf(current)
    const previousIndex = levels.indexOf(previous)
    if (currentIndex > previousIndex) return "up"
    if (currentIndex < previousIndex) return "down"
    return null
  }

  const clearFilters = () => {
    setSearchQuery("")
    setVolumeFilter("all")
    setTrendFilter("all")
    setStatusFilter("all")
  }

  const hasActiveFilters = searchQuery || volumeFilter !== "all" || trendFilter !== "all" || statusFilter !== "all"

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Spinner className="h-8 w-8 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Carregando palavras-chave...</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              Palavras-Chave
            </h1>
            <p className="text-muted-foreground mt-1">
              Palavras-chave estrategicas sugeridas pela IA para {client?.name}
            </p>
          </div>
          <Button 
            onClick={handleGenerateKeywords}
            disabled={isGenerating}
            size="lg"
            className="gap-2 shadow-lg"
          >
            {isGenerating ? (
              <>
                <Spinner className="h-4 w-4" />
                Analisando mercado...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {keywords.length > 0 ? "Atualizar Analise" : "Gerar Keywords"}
              </>
            )}
          </Button>
        </div>

        {/* Messages */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm flex items-center gap-3">
            <XCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}
        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {successMessage}
          </div>
        )}

        {/* Stats Cards */}
        {keywords.length > 0 && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card 
              className={`border-0 shadow-sm cursor-pointer transition-all hover:shadow-md ${volumeFilter === "all" && trendFilter === "all" && statusFilter === "all" ? "ring-2 ring-primary" : ""}`}
              onClick={clearFilters}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                    <Search className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total de Keywords</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className={`border-0 shadow-sm cursor-pointer transition-all hover:shadow-md ${trendFilter === "crescimento" ? "ring-2 ring-emerald-500" : ""}`}
              onClick={() => setTrendFilter(trendFilter === "crescimento" ? "all" : "crescimento")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-emerald-600">{stats.crescimento}</p>
                    <p className="text-xs text-muted-foreground">Em Crescimento</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className={`border-0 shadow-sm cursor-pointer transition-all hover:shadow-md ${volumeFilter === "muito_alto" || volumeFilter === "alto" ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => setVolumeFilter(volumeFilter === "alto" ? "muito_alto" : volumeFilter === "muito_alto" ? "all" : "alto")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-blue-600">{stats.altoVolume}</p>
                    <p className="text-xs text-muted-foreground">Alto Volume</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className={`border-0 shadow-sm cursor-pointer transition-all hover:shadow-md ${statusFilter === "monitored" ? "ring-2 ring-violet-500" : ""}`}
              onClick={() => setStatusFilter(statusFilter === "monitored" ? "all" : "monitored")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/10">
                    <Eye className="h-5 w-5 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-violet-600">{stats.monitoradas}</p>
                    <p className="text-xs text-muted-foreground">Monitoradas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        {keywords.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar palavras-chave..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Quick Filters */}
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
                    <Filter className="h-4 w-4" />
                    Filtros:
                  </div>
                  
                  {/* Volume Filters */}
                  <div className="flex flex-wrap gap-1.5">
                    <Badge 
                      variant={volumeFilter === "muito_alto" ? "default" : "outline"}
                      className={`cursor-pointer transition-all ${volumeFilter === "muito_alto" ? "bg-emerald-500 hover:bg-emerald-600" : "hover:bg-emerald-500/10"}`}
                      onClick={() => setVolumeFilter(volumeFilter === "muito_alto" ? "all" : "muito_alto")}
                    >
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Muito Alto ({stats.muitoAlto})
                    </Badge>
                    <Badge 
                      variant={volumeFilter === "alto" ? "default" : "outline"}
                      className={`cursor-pointer transition-all ${volumeFilter === "alto" ? "bg-blue-500 hover:bg-blue-600" : "hover:bg-blue-500/10"}`}
                      onClick={() => setVolumeFilter(volumeFilter === "alto" ? "all" : "alto")}
                    >
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Alto ({stats.alto})
                    </Badge>
                    <Badge 
                      variant={volumeFilter === "medio" ? "default" : "outline"}
                      className={`cursor-pointer transition-all ${volumeFilter === "medio" ? "bg-amber-500 hover:bg-amber-600" : "hover:bg-amber-500/10"}`}
                      onClick={() => setVolumeFilter(volumeFilter === "medio" ? "all" : "medio")}
                    >
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Medio ({stats.medio})
                    </Badge>
                    <Badge 
                      variant={volumeFilter === "baixo" ? "default" : "outline"}
                      className={`cursor-pointer transition-all ${volumeFilter === "baixo" ? "bg-gray-500 hover:bg-gray-600" : "hover:bg-gray-500/10"}`}
                      onClick={() => setVolumeFilter(volumeFilter === "baixo" ? "all" : "baixo")}
                    >
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Baixo ({stats.baixo})
                    </Badge>
                  </div>

                  <div className="w-px h-6 bg-border mx-1" />

                  {/* Trend Filters */}
                  <div className="flex flex-wrap gap-1.5">
                    <Badge 
                      variant={trendFilter === "crescimento" ? "default" : "outline"}
                      className={`cursor-pointer transition-all ${trendFilter === "crescimento" ? "bg-emerald-500 hover:bg-emerald-600" : "hover:bg-emerald-500/10"}`}
                      onClick={() => setTrendFilter(trendFilter === "crescimento" ? "all" : "crescimento")}
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Crescimento ({stats.crescimento})
                    </Badge>
                    <Badge 
                      variant={trendFilter === "estavel" ? "default" : "outline"}
                      className={`cursor-pointer transition-all ${trendFilter === "estavel" ? "bg-amber-500 hover:bg-amber-600" : "hover:bg-amber-500/10"}`}
                      onClick={() => setTrendFilter(trendFilter === "estavel" ? "all" : "estavel")}
                    >
                      <Minus className="h-3 w-3 mr-1" />
                      Estavel ({stats.estavel})
                    </Badge>
                    <Badge 
                      variant={trendFilter === "queda" ? "default" : "outline"}
                      className={`cursor-pointer transition-all ${trendFilter === "queda" ? "bg-red-500 hover:bg-red-600" : "hover:bg-red-500/10"}`}
                      onClick={() => setTrendFilter(trendFilter === "queda" ? "all" : "queda")}
                    >
                      <TrendingDown className="h-3 w-3 mr-1" />
                      Queda ({stats.queda})
                    </Badge>
                  </div>

                  <div className="w-px h-6 bg-border mx-1" />

                  {/* Status Filters */}
                  <div className="flex flex-wrap gap-1.5">
                    <Badge 
                      variant={statusFilter === "monitored" ? "default" : "outline"}
                      className={`cursor-pointer transition-all ${statusFilter === "monitored" ? "bg-violet-500 hover:bg-violet-600" : "hover:bg-violet-500/10"}`}
                      onClick={() => setStatusFilter(statusFilter === "monitored" ? "all" : "monitored")}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Monitoradas ({stats.monitoradas})
                    </Badge>
                    <Badge 
                      variant={statusFilter === "not_monitored" ? "default" : "outline"}
                      className={`cursor-pointer transition-all ${statusFilter === "not_monitored" ? "bg-gray-500 hover:bg-gray-600" : "hover:bg-gray-500/10"}`}
                      onClick={() => setStatusFilter(statusFilter === "not_monitored" ? "all" : "not_monitored")}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      Nao Monitoradas ({stats.total - stats.monitoradas})
                    </Badge>
                  </div>

                  {hasActiveFilters && (
                    <>
                      <div className="w-px h-6 bg-border mx-1" />
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs">
                        Limpar filtros
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Keywords List */}
        {keywords.length === 0 ? (
          <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-violet-500/5">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-6 rounded-full bg-gradient-to-br from-primary/20 to-violet-500/20 mb-6">
                <Zap className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Descubra Palavras-Chave Estrategicas</h3>
              <p className="text-muted-foreground text-center max-w-md mb-8">
                Nossa IA analisa o mercado do seu segmento e sugere palavras-chave 
                com alto potencial de busca para voce monitorar.
              </p>
              <Button onClick={handleGenerateKeywords} disabled={isGenerating} size="lg" className="gap-2 shadow-lg">
                <Sparkles className="h-5 w-5" />
                Iniciar Analise de Mercado
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {/* Results count */}
            <div className="flex items-center justify-between px-1">
              <p className="text-sm text-muted-foreground">
                {filteredKeywords.length === keywords.length 
                  ? `${keywords.length} palavras-chave encontradas`
                  : `${filteredKeywords.length} de ${keywords.length} palavras-chave`
                }
              </p>
            </div>

            {/* Keywords Grid */}
            {filteredKeywords.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="h-10 w-10 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Nenhuma palavra-chave encontrada com os filtros selecionados</p>
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-4">
                    Limpar filtros
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredKeywords.map((keyword) => {
                  const volumeChange = getVolumeChange(keyword.search_volume, keyword.previous_volume)
                  const trendChanged = keyword.previous_trend && keyword.previous_trend !== keyword.trend
                  
                  return (
                    <Card 
                      key={keyword.id}
                      className={`border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group ${
                        keyword.is_monitored ? "ring-1 ring-violet-500/30" : ""
                      }`}
                      onClick={() => {
                        if (keyword.suggested_prompts?.length > 0) {
                          setSelectedKeyword(keyword)
                        } else {
                          handleGeneratePrompts(keyword)
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* Keyword Name */}
                            <div className="flex items-center gap-2 mb-3">
                              <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                                {keyword.keyword}
                              </h3>
                              {keyword.is_monitored && (
                                <Badge variant="secondary" className="text-[10px] bg-violet-500/20 text-violet-600 shrink-0">
                                  <Eye className="h-3 w-3 mr-1" />
                                  Monitorada
                                </Badge>
                              )}
                            </div>

                            {/* Metrics Row */}
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Volume */}
                              <div className="flex items-center gap-1.5">
                                <Badge className={`${getVolumeColor(keyword.search_volume)} text-xs`}>
                                  {getVolumeLabel(keyword.search_volume)}
                                </Badge>
                                {volumeChange && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      {volumeChange === "up" ? (
                                        <ArrowUp className="h-4 w-4 text-emerald-500" />
                                      ) : (
                                        <ArrowDown className="h-4 w-4 text-red-500" />
                                      )}
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {volumeChange === "up" 
                                        ? `Aumentou (era ${getVolumeLabel(keyword.previous_volume!)})` 
                                        : `Diminuiu (era ${getVolumeLabel(keyword.previous_volume!)})`
                                      }
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>

                              {/* Trend */}
                              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${getTrendColor(keyword.trend)}`}>
                                {getTrendIcon(keyword.trend, "h-3.5 w-3.5")}
                                <span className="font-medium">{getTrendLabel(keyword.trend)}</span>
                                {trendChanged && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <span className="text-[10px] opacity-70">(mudou)</span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Era &quot;{getTrendLabel(keyword.previous_trend!)}&quot;
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action */}
                          <div className="shrink-0">
                            {generatingPromptsFor === keyword.id ? (
                              <div className="p-2">
                                <Spinner className="h-5 w-5" />
                              </div>
                            ) : keyword.suggested_prompts?.length > 0 ? (
                              <div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                                <MessageSquare className="h-4 w-4" />
                                <span className="text-sm">{keyword.suggested_prompts.length}</span>
                                <ChevronRight className="h-4 w-4" />
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-muted-foreground group-hover:text-primary transition-colors">
                                <Lightbulb className="h-4 w-4" />
                                <ChevronRight className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Prompts Dialog */}
        <Dialog open={!!selectedKeyword} onOpenChange={() => setSelectedKeyword(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                </div>
                Prompts Sugeridos
              </DialogTitle>
              <DialogDescription className="pt-2">
                Prompts que usuarios podem fazer relacionados a <strong>&quot;{selectedKeyword?.keyword}&quot;</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-4">
              {selectedKeyword?.suggested_prompts?.map((prompt, index) => (
                <div 
                  key={index}
                  className="p-4 rounded-xl border bg-gradient-to-br from-muted/20 to-muted/10 hover:from-muted/30 hover:to-muted/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium">{prompt.prompt}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <Badge variant="secondary" className="text-xs">
                          {prompt.intent}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Target className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Relevancia: {prompt.relevance}/10
                          </span>
                        </div>
                      </div>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant={selectedKeyword.is_monitored ? "secondary" : "default"}
                          disabled={monitoringPrompt === prompt.prompt || selectedKeyword.is_monitored}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMonitorPrompt(selectedKeyword, prompt.prompt)
                          }}
                          className="gap-2 shrink-0"
                        >
                          {monitoringPrompt === prompt.prompt ? (
                            <Spinner className="h-4 w-4" />
                          ) : selectedKeyword.is_monitored ? (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              Monitorando
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4" />
                              Monitorar
                            </>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {selectedKeyword.is_monitored 
                          ? "Esta keyword ja tem um prompt sendo monitorado" 
                          : "Adicionar este prompt a lista de monitoramento"
                        }
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>

            {selectedKeyword && !selectedKeyword.is_monitored && (
              <div className="mt-4 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-violet-500/20 shrink-0">
                    <Target className="h-4 w-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
                      Dica
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clique em &quot;Monitorar&quot; para adicionar um desses prompts a sua lista de monitoramento 
                      e acompanhar como a IA responde sobre sua empresa.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
