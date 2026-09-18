"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Sparkles,
  Search,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  Shield,
  ShoppingCart,
  Scale,
  Lightbulb,
  BarChart3,
  Power,
  PowerOff,
  Trash2,
  Plus,
  HelpCircle,
  Wand2,
  MessageSquare,
  LogOut,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
  FileText,
  Instagram,
  Linkedin,
  Twitter,
  Facebook,
  Loader2,
  PenTool,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { ClientAIPrompt } from "@/lib/types"

const CATEGORY_CONFIG: Record<
  string,
  { label: string; description: string; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }
> = {
  reputation: {
    label: "Reputacao",
    description: "Avaliacoes e confiabilidade",
    icon: Shield,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10 border-emerald-500/20",
  },
  comparison: {
    label: "Comparacao",
    description: "Versus concorrentes",
    icon: Scale,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10 border-purple-500/20",
  },
  solution: {
    label: "Solucao",
    description: "Resolver problema",
    icon: Lightbulb,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/20",
  },
  pre_purchase: {
    label: "Pre-Compra",
    description: "Antes de comprar",
    icon: ShoppingCart,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/20",
  },
}

// Score color helper
function getScoreColor(score: number): string {
  if (score >= 70) return "text-emerald-500"
  if (score >= 40) return "text-amber-500"
  return "text-red-500"
}

function getScoreBgColor(score: number): string {
  if (score >= 70) return "bg-emerald-500"
  if (score >= 40) return "bg-amber-500"
  return "bg-red-500"
}

// Variation indicator component
function VariationIndicator({ current, initial }: { current: number; initial: number | null | undefined }) {
  if (initial === null || initial === undefined) return null
  
  const diff = current - initial
  
  if (Math.abs(diff) < 1) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span>Estavel</span>
      </div>
    )
  }
  
  const isPositive = diff > 0
  const Icon = isPositive ? TrendingUp : TrendingDown
  const colorClass = isPositive ? "text-emerald-500" : "text-red-500"
  
  return (
    <div className={`flex items-center gap-1 text-xs ${colorClass}`}>
      <Icon className="h-3 w-3" />
      <span>{isPositive ? "+" : ""}{diff.toFixed(0)}%</span>
      <span className="text-muted-foreground">vs 1º teste</span>
    </div>
  )
}

// Tooltip helper
function InfoTooltip({ content }: { content: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-4 w-4 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground">
          <p className="text-xs">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default function ClientPromptsPage() {
  const params = useParams()
  const clientSlug = params.client_slug as string

  const [prompts, setPrompts] = useState<ClientAIPrompt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [canManage, setCanManage] = useState(false)
  const [isClientUserView, setIsClientUserView] = useState(false)
  const [maxPrompts, setMaxPrompts] = useState(8)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [promptToDelete, setPromptToDelete] = useState<ClientAIPrompt | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  
  // Form state
  const [newPromptText, setNewPromptText] = useState("")
  const [newPromptCategory, setNewPromptCategory] = useState("solution")
  
  // Content ideas state
  const [isContentIdeasOpen, setIsContentIdeasOpen] = useState(false)
  const [isLoadingIdeas, setIsLoadingIdeas] = useState(false)
  const [contentIdeasError, setContentIdeasError] = useState<string | null>(null)
  const [contentIdeas, setContentIdeas] = useState<{
    blog: Array<{ title: string; keyword: string; reason: string }>
    instagram: Array<{ title: string; keyword: string; reason: string }>
    linkedin: Array<{ title: string; keyword: string; reason: string }>
    twitter: Array<{ title: string; keyword: string; reason: string }>
    facebook: Array<{ title: string; keyword: string; reason: string }>
  } | null>(null)
  const [selectedPromptForIdeas, setSelectedPromptForIdeas] = useState<ClientAIPrompt | null>(null)
  
  // Filter/Sort state
  const [sortOrder, setSortOrder] = useState<"default" | "visibility_desc" | "visibility_asc">("default")
  const [showZeroVisibility, setShowZeroVisibility] = useState(false)

  useEffect(() => {
    fetchPrompts()
  }, [clientSlug])

  async function fetchPrompts() {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/clients/${clientSlug}/prompts`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao buscar prompts")
      }

      setPrompts(data.prompts)
      setCanManage(data.canManage || false)
      setIsClientUserView(data.isClientUser || false)
      setMaxPrompts(data.maxPrompts || 8)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar prompts")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRegenerate() {
    setIsRegenerating(true)
    setError(null)
    setPrompts([])

    try {
      const response = await fetch(`/api/clients/${clientSlug}/prompts/regenerate`, {
        method: "POST",
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao regenerar prompts")
      }

      await fetchPrompts()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao regenerar prompts")
    } finally {
      setIsRegenerating(false)
    }
  }

  async function handleCopy(promptItem: ClientAIPrompt) {
    try {
      await navigator.clipboard.writeText(promptItem.prompt)
      setCopiedId(promptItem.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  async function handleTogglePrompt(promptItem: ClientAIPrompt) {
    setTogglingIds(prev => new Set(prev).add(promptItem.id))

    try {
      const response = await fetch(`/api/clients/${clientSlug}/prompts/${promptItem.id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !promptItem.is_active }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Erro ao alterar status")
      }

      setPrompts(prev => prev.map(p => 
        p.id === promptItem.id ? { ...p, is_active: !p.is_active } : p
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar status")
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev)
        next.delete(promptItem.id)
        return next
      })
    }
  }

  async function handleDelete() {
    if (!promptToDelete) return
    
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/clients/${clientSlug}/prompts/${promptToDelete.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Erro ao deletar prompt")
      }

      setPrompts(prev => prev.filter(p => p.id !== promptToDelete.id))
      setIsDeleteDialogOpen(false)
      setPromptToDelete(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao deletar prompt")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleAddPrompt(generateWithAI: boolean = false) {
    if (!generateWithAI && newPromptText.trim().length < 10) {
      setError("O prompt deve ter pelo menos 10 caracteres")
      return
    }

    setIsSubmitting(true)
    if (generateWithAI) setIsGeneratingAI(true)

    try {
      const response = await fetch(`/api/clients/${clientSlug}/prompts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: generateWithAI ? null : newPromptText.trim(),
          category: newPromptCategory,
          generateWithAI,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar prompt")
      }

      setPrompts(prev => [...prev, data.prompt])
      setIsAddDialogOpen(false)
      setNewPromptText("")
      setNewPromptCategory("solution")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar prompt")
    } finally {
      setIsSubmitting(false)
      setIsGeneratingAI(false)
    }
  }

  async function handleOpenContentIdeas(prompt: ClientAIPrompt) {
    setSelectedPromptForIdeas(prompt)
    setIsContentIdeasOpen(true)
    setIsLoadingIdeas(true)
    setContentIdeas(null)
    setContentIdeasError(null)

    try {
      // First, try to get existing ideas from database
      const getResponse = await fetch(`/api/clients/${clientSlug}/prompts/${prompt.id}/content-ideas`)
      const getData = await getResponse.json()

      if (getResponse.ok && getData.exists && getData.ideas) {
        // Ideas already exist, show them
        setContentIdeas(getData.ideas)
        setIsLoadingIdeas(false)
        return
      }

      // No existing ideas, generate new ones
      await generateNewContentIdeas(prompt, false)
    } catch (err) {
      setContentIdeasError(err instanceof Error ? err.message : "Erro ao buscar ideias de conteudo")
      setIsLoadingIdeas(false)
    }
  }

  async function generateNewContentIdeas(prompt: ClientAIPrompt, showLoading = true) {
    if (showLoading) {
      setIsLoadingIdeas(true)
    }
    setContentIdeasError(null)

    try {
      const response = await fetch(`/api/clients/${clientSlug}/prompts/${prompt.id}/content-ideas`, {
        method: "POST",
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao gerar ideias")
      }

      setContentIdeas(data.ideas)
    } catch (err) {
      setContentIdeasError(err instanceof Error ? err.message : "Erro ao gerar ideias de conteudo")
    } finally {
      setIsLoadingIdeas(false)
    }
  }

  const getCategoryInfo = (category: string | null) => {
    if (!category || !CATEGORY_CONFIG[category]) {
      return CATEGORY_CONFIG.solution
    }
    return CATEGORY_CONFIG[category]
  }

  const activePrompts = prompts.filter(p => p.is_active).length
  const canAddMore = prompts.length < maxPrompts

  if (isLoading || (isRegenerating && prompts.length === 0)) {
    return (
      <div className="space-y-6 px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>

        {isRegenerating && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <RefreshCw className="h-8 w-8 text-primary animate-spin" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Gerando novos prompts...</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                A IA esta analisando as caracteristicas do cliente para criar prompts personalizados. Isso pode levar alguns segundos.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      window.location.href = "/login"
    } catch {
      window.location.href = "/login"
    }
  }

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      {/* Client User Header with Logout */}
      {isClientUserView && (
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-teal-600" />
            <div>
              <p className="font-medium text-sm text-teal-700">Modo Visualizacao</p>
              <p className="text-xs text-muted-foreground">
                Selecione um prompt para visualizar os analytics
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Simulador de Buscas</h1>
              <p className="text-muted-foreground">
                Prompts que simulam o que seu publico buscaria em IAs
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Prompt counter */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{prompts.length}/{maxPrompts}</span>
            <InfoTooltip content={`Voce pode ter ate ${maxPrompts} prompts. Atualmente ${activePrompts} estao ativos.`} />
          </div>
          
          {canManage && canAddMore && (
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          )}
          
          {canManage && (
            <Button onClick={handleRegenerate} disabled={isRegenerating} variant="outline" className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`} />
              Regenerar Todos
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Info Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10 shrink-0">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Como funciona?</h3>
                <InfoTooltip content="Esses prompts simulam buscas reais que seu publico faria em ChatGPT, Claude, Perplexity e outras IAs." />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Cada prompt abaixo representa uma busca que seu potencial cliente faria em uma IA. Usamos esses prompts para testar se sua empresa aparece nas respostas e como ela e apresentada. Clique em <strong>Ver Analytics</strong> para acompanhar os resultados.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                  const Icon = config.icon
                  return (
                    <div key={key} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${config.bgColor}`}>
                      <Icon className={`h-3 w-3 ${config.color}`} />
                      <span className={config.color}>{config.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prompts Grid */}
      {prompts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum prompt encontrado</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Os prompts serao gerados automaticamente com base nas caracteristicas do cliente.
            </p>
            <Button onClick={handleRegenerate} disabled={isRegenerating} size="lg">
              <Sparkles className="h-4 w-4 mr-2" />
              Gerar Prompts com IA
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filter/Sort Bar */}
          <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>Filtros:</span>
            </div>
            
            {/* Sort by Visibility */}
            <ToggleGroup 
              type="single" 
              value={sortOrder} 
              onValueChange={(value) => value && setSortOrder(value as typeof sortOrder)}
              className="bg-background rounded-md border"
            >
              <ToggleGroupItem value="default" aria-label="Ordem padrão" className="text-xs px-3 gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5" />
                Padrao
              </ToggleGroupItem>
              <ToggleGroupItem value="visibility_desc" aria-label="Maior visibilidade" className="text-xs px-3 gap-1.5">
                <ArrowDown className="h-3.5 w-3.5" />
                Maior
              </ToggleGroupItem>
              <ToggleGroupItem value="visibility_asc" aria-label="Menor visibilidade" className="text-xs px-3 gap-1.5">
                <ArrowUp className="h-3.5 w-3.5" />
                Menor
              </ToggleGroupItem>
            </ToggleGroup>
            
            {/* Zero Visibility Filter */}
            <Button
              variant={showZeroVisibility ? "default" : "outline"}
              size="sm"
              onClick={() => setShowZeroVisibility(!showZeroVisibility)}
              className={`text-xs gap-1.5 ${showZeroVisibility ? "bg-red-500 hover:bg-red-600 text-white" : ""}`}
            >
              <Eye className="h-3.5 w-3.5" />
              Visibilidade 0%
              {showZeroVisibility && <X className="h-3 w-3 ml-1" />}
            </Button>
            
            {/* Active filters indicator */}
            {(sortOrder !== "default" || showZeroVisibility) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSortOrder("default")
                  setShowZeroVisibility(false)
                }}
                className="text-xs text-muted-foreground hover:text-foreground ml-auto"
              >
                Limpar filtros
              </Button>
            )}
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            {(() => {
              // Filter and sort prompts
              let filteredPrompts = [...prompts]
              
              // Filter by zero visibility
              if (showZeroVisibility) {
                filteredPrompts = filteredPrompts.filter(p => {
                  const score = p.analytics?.avg_visibility_score ?? 0
                  return score === 0
                })
              }
              
              // Sort by visibility
              if (sortOrder === "visibility_desc") {
                filteredPrompts.sort((a, b) => {
                  const scoreA = a.analytics?.avg_visibility_score ?? 0
                  const scoreB = b.analytics?.avg_visibility_score ?? 0
                  return scoreB - scoreA
                })
              } else if (sortOrder === "visibility_asc") {
                filteredPrompts.sort((a, b) => {
                  const scoreA = a.analytics?.avg_visibility_score ?? 0
                  const scoreB = b.analytics?.avg_visibility_score ?? 0
                  return scoreA - scoreB
                })
              }
              
              if (filteredPrompts.length === 0) {
                return (
                  <div className="col-span-2 flex flex-col items-center justify-center py-12 text-center">
                    <Eye className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">
                      {showZeroVisibility 
                        ? "Nenhum prompt com visibilidade 0% encontrado" 
                        : "Nenhum prompt encontrado"}
                    </p>
                    {showZeroVisibility && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setShowZeroVisibility(false)}
                        className="mt-2"
                      >
                        Mostrar todos os prompts
                      </Button>
                    )}
                  </div>
                )
              }
              
              return filteredPrompts.map((prompt, index) => {
                const categoryInfo = getCategoryInfo(prompt.category)
                const CategoryIcon = categoryInfo.icon
                const isToggling = togglingIds.has(prompt.id)
                
                // Analytics data
                const analytics = prompt.analytics
                const firstTest = prompt.first_test
                const visibilityScore = analytics?.avg_visibility_score ?? 0
                const totalTests = analytics?.total_tests ?? 0
                const hasData = totalTests > 0

                return (
                  <Card
                key={prompt.id}
                className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                  !prompt.is_active ? "opacity-60" : ""
                }`}
              >
                {/* Category indicator bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${categoryInfo.color.replace("text-", "bg-")}`} />
                
                <CardContent className="p-5 pt-6">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${categoryInfo.bgColor}`}>
                        <CategoryIcon className={`h-4 w-4 ${categoryInfo.color}`} />
                      </div>
                      <div>
                        <span className={`text-xs font-medium ${categoryInfo.color}`}>
                          {categoryInfo.label}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">#{index + 1}</span>
                      </div>
                      {!prompt.is_active && (
                        <Badge variant="secondary" className="text-xs">
                          Inativo
                        </Badge>
                      )}
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canManage && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleTogglePrompt(prompt)}
                            disabled={isToggling}
                            title={prompt.is_active ? "Desativar" : "Ativar"}
                          >
                            {isToggling ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : prompt.is_active ? (
                              <PowerOff className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            ) : (
                              <Power className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              setPromptToDelete(prompt)
                              setIsDeleteDialogOpen(true)
                            }}
                            title="Deletar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleCopy(prompt)}
                        title="Copiar"
                      >
                        {copiedId === prompt.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Prompt text */}
                  <p className="text-sm leading-relaxed mb-4 min-h-[3rem]">
                    &ldquo;{prompt.prompt}&rdquo;
                  </p>
                  
                  {/* Visibility Metric - Prominent Display */}
                  <div className="mb-4 p-3 rounded-lg bg-muted/30 border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-blue-500" />
                        <span className="text-xs font-medium text-muted-foreground">Visibilidade</span>
                      </div>
                      {hasData && (
                        <span className="text-xs text-muted-foreground">
                          {totalTests} teste{totalTests !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    
                    {hasData ? (
                      <>
                        <div className="flex items-end justify-between gap-3">
                          <div className="flex items-baseline gap-1">
                            <span className={`text-2xl font-bold ${getScoreColor(visibilityScore)}`}>
                              {visibilityScore.toFixed(0)}%
                            </span>
                          </div>
                          <VariationIndicator 
                            current={visibilityScore} 
                            initial={firstTest?.visibility_score} 
                          />
                        </div>
                        <Progress 
                          value={visibilityScore} 
                          className="h-1.5 mt-2" 
                        />
                      </>
                    ) : (
                      <div className="flex items-center gap-2 py-1">
                        <Activity className="h-4 w-4 text-muted-foreground/50" />
                        <span className="text-sm text-muted-foreground">
                          Aguardando primeiro teste
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Link href={`/${clientSlug}/prompts/${prompt.id}/analytics`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Analytics
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-2"
                      onClick={() => handleOpenContentIdeas(prompt)}
                    >
                      <PenTool className="h-4 w-4" />
                      Ideias
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
              })
            })()}
          </div>
        </>
      )}

      {/* Add Prompt Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Adicionar Novo Prompt
            </DialogTitle>
            <DialogDescription>
              Crie um novo prompt manualmente ou deixe a IA gerar uma sugestao.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={newPromptCategory} onValueChange={setNewPromptCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                    const Icon = config.icon
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${config.color}`} />
                          <span>{config.label}</span>
                          <span className="text-xs text-muted-foreground">- {config.description}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="prompt">Texto do Prompt</Label>
              <Textarea
                id="prompt"
                placeholder="Ex: Quais sao as melhores opcoes de [seu segmento] em [sua cidade]?"
                value={newPromptText}
                onChange={(e) => setNewPromptText(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Minimo 10 caracteres. Escreva como seu cliente buscaria.
              </p>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">ou</span>
              </div>
            </div>
            
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => handleAddPrompt(true)}
              disabled={isGeneratingAI || isSubmitting}
            >
              {isGeneratingAI ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Gerando com IA...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Gerar Sugestao com IA
                </>
              )}
            </Button>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => handleAddPrompt(false)} 
              disabled={isSubmitting || newPromptText.trim().length < 10}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Adicionar Prompt"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content Ideas Dialog */}
      <Dialog open={isContentIdeasOpen} onOpenChange={setIsContentIdeasOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5 text-primary" />
              Ideias de Conteudo
            </DialogTitle>
            {selectedPromptForIdeas && (
              <DialogDescription className="text-left">
                Ideias para melhorar sua presenca no prompt: <span className="font-medium text-foreground">&ldquo;{selectedPromptForIdeas.prompt}&rdquo;</span>
              </DialogDescription>
            )}
          </DialogHeader>

          {isLoadingIdeas ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Gerando ideias com IA...</p>
              <p className="text-xs text-muted-foreground mt-1">Isso pode levar alguns segundos</p>
            </div>
          ) : contentIdeasError ? (
            <div className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="h-10 w-10 text-destructive mb-4" />
              <p className="text-destructive font-medium mb-2">Erro ao gerar ideias</p>
              <p className="text-sm text-muted-foreground mb-4">{contentIdeasError}</p>
              {selectedPromptForIdeas && (
                <Button onClick={() => generateNewContentIdeas(selectedPromptForIdeas, true)} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Tentar Novamente
                </Button>
              )}
            </div>
          ) : contentIdeas ? (
            <ScrollArea className="h-[60vh] pr-4">
              <Tabs defaultValue="blog" className="w-full">
                <TabsList className="grid w-full grid-cols-5 mb-4">
                  <TabsTrigger value="blog" className="gap-2 text-xs">
                    <FileText className="h-3.5 w-3.5" />
                    Blog
                  </TabsTrigger>
                  <TabsTrigger value="instagram" className="gap-2 text-xs">
                    <Instagram className="h-3.5 w-3.5" />
                    Instagram
                  </TabsTrigger>
                  <TabsTrigger value="linkedin" className="gap-2 text-xs">
                    <Linkedin className="h-3.5 w-3.5" />
                    LinkedIn
                  </TabsTrigger>
                  <TabsTrigger value="twitter" className="gap-2 text-xs">
                    <Twitter className="h-3.5 w-3.5" />
                    Twitter/X
                  </TabsTrigger>
                  <TabsTrigger value="facebook" className="gap-2 text-xs">
                    <Facebook className="h-3.5 w-3.5" />
                    Facebook
                  </TabsTrigger>
                </TabsList>

                {Object.entries(contentIdeas).map(([platform, ideas]) => (
                  <TabsContent key={platform} value={platform} className="space-y-3 mt-0">
                    {ideas.map((idea, index) => (
                      <Card key={index} className="border shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h4 className="font-semibold text-sm leading-tight flex-1">
                              {idea.title}
                            </h4>
                            <Badge variant="secondary" className="shrink-0 text-xs">
                              #{index + 1}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="outline" className="text-xs bg-primary/5">
                              <Search className="h-3 w-3 mr-1" />
                              {idea.keyword}
                            </Badge>
                          </div>
                          
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            <span className="font-medium text-foreground">Por que funciona:</span> {idea.reason}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            </ScrollArea>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsContentIdeasOpen(false)}>
              Fechar
            </Button>
            {contentIdeas && selectedPromptForIdeas && (
              <Button 
                onClick={() => generateNewContentIdeas(selectedPromptForIdeas)}
                disabled={isLoadingIdeas}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingIdeas ? "animate-spin" : ""}`} />
                Regerar Ideias
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Deletar Prompt
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Tem certeza que deseja deletar este prompt?</p>
              {promptToDelete && (
                <p className="p-3 bg-muted rounded-lg text-sm italic">
                  &ldquo;{promptToDelete.prompt}&rdquo;
                </p>
              )}
              <p className="text-destructive font-medium">
                Esta acao ira deletar tambem todo o historico de analytics associado a este prompt e nao pode ser desfeita.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deletando...
                </>
              ) : (
                "Sim, deletar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
