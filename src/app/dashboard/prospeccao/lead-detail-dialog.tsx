"use client"

import { Lead } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { 
  Building2, 
  Globe, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Calendar,
  DollarSign,
  Target,
  TrendingUp,
  ShoppingBag,
  ShoppingCart,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Linkedin,
  Instagram,
  Facebook,
  Youtube,
  Twitter,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  PieChart,
  BarChart3,
  Users,
  Store,
  Megaphone,
  Hash,
  Briefcase,
  Activity,
  Zap,
  ArrowUpRight,
  CircleDot,
  TrendingDown,
  X,
  RefreshCw,
  Search,
  Database,
  Cpu,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface LeadDetailDialogProps {
  lead: Lead
  open: boolean
  onOpenChange: (open: boolean) => void
  onLeadUpdate?: (lead: Lead) => void
}

const statusConfig = {
  pendente: { label: "Pendente", color: "text-yellow-600 bg-yellow-100", icon: Clock },
  processando: { label: "Processando", color: "text-blue-600 bg-blue-100", icon: Loader2 },
  enriquecido: { label: "Enriquecido", color: "text-green-600 bg-green-100", icon: CheckCircle2 },
  erro: { label: "Erro", color: "text-red-600 bg-red-100", icon: XCircle },
}

const socialIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  youtube: Youtube,
  twitter: Twitter,
  x: Twitter,
  tiktok: Activity,
}

const socialColors: Record<string, { bg: string; text: string; border: string }> = {
  instagram: { bg: "from-pink-500/10 to-purple-500/10", text: "text-pink-600", border: "border-pink-200" },
  facebook: { bg: "from-blue-500/10 to-blue-600/10", text: "text-blue-600", border: "border-blue-200" },
  linkedin: { bg: "from-blue-600/10 to-blue-700/10", text: "text-blue-700", border: "border-blue-300" },
  youtube: { bg: "from-red-500/10 to-red-600/10", text: "text-red-600", border: "border-red-200" },
  twitter: { bg: "from-sky-400/10 to-sky-500/10", text: "text-sky-500", border: "border-sky-200" },
  x: { bg: "from-gray-700/10 to-gray-800/10", text: "text-gray-800", border: "border-gray-300" },
  tiktok: { bg: "from-gray-800/10 to-black/10", text: "text-gray-900", border: "border-gray-300" },
}

type ReindexAgent = "empresa" | "contatos" | "redes_sociais" | "marketing" | "marketplaces" | "analise" | "all"

export function LeadDetailDialog({ lead, open, onOpenChange, onLeadUpdate }: LeadDetailDialogProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [reindexing, setReindexing] = useState<ReindexAgent | null>(null)
  const config = statusConfig[lead.status as keyof typeof statusConfig] || statusConfig.pendente
  const StatusIcon = config.icon

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    toast.success("Copiado!")
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleReindex = async (agent: ReindexAgent) => {
    setReindexing(agent)
    try {
      const response = await fetch(`/api/leads/${lead.id}/reindex`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent }),
      })

      if (!response.ok) {
        throw new Error("Falha ao re-indexar")
      }

      const updatedLead = await response.json()
      toast.success(agent === "all" ? "Re-enriquecimento completo iniciado!" : `Dados de ${getAgentLabel(agent)} atualizados!`)
      
      if (onLeadUpdate) {
        onLeadUpdate(updatedLead)
      }
    } catch {
      toast.error("Erro ao re-indexar dados")
    } finally {
      setReindexing(null)
    }
  }

  const getAgentLabel = (agent: ReindexAgent): string => {
    const labels: Record<ReindexAgent, string> = {
      empresa: "Empresa",
      contatos: "Contatos",
      redes_sociais: "Redes Sociais",
      marketing: "Marketing",
      marketplaces: "Marketplaces",
      analise: "Analise",
      all: "Tudo",
    }
    return labels[agent]
  }

  const ReindexButton = ({ agent, size = "sm" }: { agent: ReindexAgent; size?: "sm" | "icon" }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={size}
            onClick={() => handleReindex(agent)}
            disabled={reindexing !== null}
            className={cn(
              "h-7 gap-1.5 text-xs",
              size === "icon" && "h-7 w-7 p-0"
            )}
          >
            {reindexing === agent ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {size !== "icon" && "Re-indexar"}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Buscar novamente dados de {getAgentLabel(agent)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )

  // Calcular score de enriquecimento
  const calculateEnrichmentScore = () => {
    let score = 0
    let total = 0
    
    // Dados basicos (peso 2)
    if (lead.razao_social) score += 2; total += 2
    if (lead.nome_fantasia) score += 1; total += 1
    if (lead.site) score += 2; total += 2
    if (lead.plataforma) score += 1; total += 1
    
    // Localizacao (peso 1)
    if (lead.endereco_cidade) score += 1; total += 1
    if (lead.endereco_estado) score += 1; total += 1
    
    // Analise (peso 2)
    if (lead.classificacao) score += 2; total += 2
    if (lead.modelo_negocio) score += 2; total += 2
    if (lead.segmento) score += 2; total += 2
    if (lead.atuacao) score += 1; total += 1
    
    // Contatos (peso 2)
    if (lead.diretores && lead.diretores.length > 0) score += 2; total += 2
    if (lead.contatos_site?.emails?.length) score += 2; total += 2
    if (lead.contatos_site?.telefones?.length) score += 1; total += 1
    
    // Redes sociais (peso 1)
    if (lead.redes_sociais && lead.redes_sociais.length > 0) score += 2; total += 2
    
    // Marketing (peso 1)
    if (lead.campanhas_google !== null) score += 1; total += 1
    if (lead.campanhas_meta !== null) score += 1; total += 1
    
    // Marketplaces (peso 1)
    if (lead.marketplace) score += 1; total += 1
    
    // Analise qualitativa (peso 2)
    if (lead.possiveis_dores && lead.possiveis_dores.length > 0) score += 2; total += 2
    if (lead.resumo) score += 2; total += 2
    
    return Math.round((score / total) * 100)
  }

  const enrichmentScore = calculateEnrichmentScore()
  
  // Calcular alcance social total
  const totalSocialReach = lead.redes_sociais?.reduce((acc, rs) => acc + (rs.seguidores || 0), 0) || 0

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatCurrency = (value: string | null) => {
    if (!value) return "Nao informado"
    const num = parseFloat(value.replace(/[^\d]/g, ""))
    if (isNaN(num)) return value
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num)
  }

  const formatCNPJ = (cnpj: string) => {
    const cleaned = cnpj.replace(/\D/g, "")
    return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
  }

  const getEnderecoCompleto = () => {
    const parts = []
    if (lead.endereco_logradouro) {
      let addr = lead.endereco_logradouro
      if (lead.endereco_numero) addr += `, ${lead.endereco_numero}`
      if (lead.endereco_complemento) addr += ` - ${lead.endereco_complemento}`
      parts.push(addr)
    }
    if (lead.endereco_bairro) parts.push(lead.endereco_bairro)
    if (lead.endereco_cidade && lead.endereco_estado) {
      parts.push(`${lead.endereco_cidade}/${lead.endereco_estado}`)
    }
    if (lead.endereco_cep) parts.push(`CEP: ${lead.endereco_cep}`)
    return parts.join(" - ") || "Nao informado"
  }

  // Score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    if (score >= 40) return "text-orange-600"
    return "text-red-600"
  }

  const getScoreRingColor = (score: number) => {
    if (score >= 80) return "stroke-green-500"
    if (score >= 60) return "stroke-yellow-500"
    if (score >= 40) return "stroke-orange-500"
    return "stroke-red-500"
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[85vw] p-0 gap-0">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b bg-gradient-to-r from-muted/50 to-background">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <SheetTitle className="text-xl font-bold">
                    {lead.nome_fantasia || lead.razao_social || "Lead"}
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground font-mono">
                    CNPJ: {formatCNPJ(lead.cnpj)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="outline" className={cn("text-xs", config.color)}>
                  <StatusIcon className={cn("h-3 w-3 mr-1", lead.status === "processando" && "animate-spin")} />
                  {config.label}
                </Badge>
                {lead.site && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Globe className="h-3 w-3" />
                    {lead.site.replace(/https?:\/\//, "").replace(/\/$/, "")}
                  </Badge>
                )}
                {lead.plataforma && (
                  <Badge variant="outline" className="text-xs gap-1 bg-purple-50 text-purple-700 border-purple-200">
                    <Cpu className="h-3 w-3" />
                    {lead.plataforma}
                  </Badge>
                )}
                {lead.classificacao && (
                  <Badge variant="outline" className="text-xs gap-1 bg-blue-50 text-blue-700 border-blue-200">
                    <Briefcase className="h-3 w-3" />
                    {lead.classificacao}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Score Ring */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="35"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="6"
                      className="text-muted/20"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="35"
                      fill="none"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${enrichmentScore * 2.2} 220`}
                      className={getScoreRingColor(enrichmentScore)}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={cn("text-xl font-bold", getScoreColor(enrichmentScore))}>
                      {enrichmentScore}%
                    </span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground mt-1">Score</span>
              </div>
              
              <div className="flex flex-col items-center px-4 border-l">
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="text-xl font-bold">{formatNumber(totalSocialReach)}</span>
                </div>
                <span className="text-xs text-muted-foreground">Alcance Social</span>
              </div>

              {/* Re-index All Button */}
              <div className="border-l pl-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReindex("all")}
                  disabled={reindexing !== null}
                  className="gap-2"
                >
                  {reindexing === "all" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Re-enriquecer Tudo
                </Button>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <ScrollArea className="h-[calc(100vh-140px)]">
          <Tabs defaultValue="visao-geral" className="p-6">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="visao-geral" className="gap-2">
                <PieChart className="h-4 w-4" />
                Visao Geral
              </TabsTrigger>
              <TabsTrigger value="contatos" className="gap-2">
                <Users className="h-4 w-4" />
                Contatos
              </TabsTrigger>
              <TabsTrigger value="digital" className="gap-2">
                <Share2 className="h-4 w-4" />
                Digital
              </TabsTrigger>
              <TabsTrigger value="vendas" className="gap-2">
                <ShoppingBag className="h-4 w-4" />
                Vendas
              </TabsTrigger>
              <TabsTrigger value="analise" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Analise
              </TabsTrigger>
            </TabsList>

            {/* Tab: Visao Geral */}
            <TabsContent value="visao-geral" className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-blue-600 font-medium">Classificacao</p>
                        <p className="text-lg font-bold text-blue-900">{lead.classificacao || "N/A"}</p>
                      </div>
                      <Briefcase className="h-8 w-8 text-blue-500/50" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-purple-600 font-medium">Modelo</p>
                        <p className="text-lg font-bold text-purple-900">{lead.modelo_negocio || "N/A"}</p>
                      </div>
                      <Target className="h-8 w-8 text-purple-500/50" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-green-600 font-medium">Tempo de Mercado</p>
                        <p className="text-lg font-bold text-green-900">{lead.tempo_mercado || "N/A"}</p>
                      </div>
                      <Calendar className="h-8 w-8 text-green-500/50" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-amber-600 font-medium">Capital Social</p>
                        <p className="text-lg font-bold text-amber-900 truncate">{formatCurrency(lead.capital_social)}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-amber-500/50" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Dados Empresariais */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        Dados Empresariais
                      </CardTitle>
                      <ReindexButton agent="empresa" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Razao Social</p>
                        <p className="font-medium">{lead.razao_social || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Nome Fantasia</p>
                        <p className="font-medium">{lead.nome_fantasia || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Segmento</p>
                        <p className="font-medium">{lead.segmento || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Atuacao</p>
                        <p className="font-medium">{lead.atuacao || "N/A"}</p>
                      </div>
                    </div>
                    
                    {/* CNAE - Atividade Economica */}
                    {(lead.cnae_codigo || lead.cnae_descricao) && (
                      <div className="pt-2 border-t">
                        <p className="text-muted-foreground text-xs mb-1">CNAE Principal</p>
                        <div className="flex items-center gap-2">
                          {lead.cnae_codigo && (
                            <Badge variant="outline" className="font-mono text-xs">
                              {lead.cnae_codigo}
                            </Badge>
                          )}
                          <p className="text-sm font-medium">{lead.cnae_descricao || "N/A"}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* CNAEs Secundarios */}
                    {lead.cnaes_secundarios && lead.cnaes_secundarios.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-muted-foreground text-xs mb-2">CNAEs Secundarios</p>
                        <div className="flex flex-wrap gap-1">
                          {lead.cnaes_secundarios.slice(0, 5).map((cnae, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {cnae.codigo}: {cnae.descricao.length > 30 ? cnae.descricao.substring(0, 30) + '...' : cnae.descricao}
                            </Badge>
                          ))}
                          {lead.cnaes_secundarios.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{lead.cnaes_secundarios.length - 5} mais
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                  {lead.site && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-muted-foreground text-xs">Site Principal</p>
                      {lead.site_tipo && (
                        <Badge variant="outline" className="text-xs capitalize">{lead.site_tipo}</Badge>
                      )}
                    </div>
                    <a
                      href={lead.site.startsWith("http") ? lead.site : `https://${lead.site}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      {lead.site}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    {lead.plataforma && (
                      <Badge variant="secondary" className="ml-2 text-xs">{lead.plataforma}</Badge>
                    )}
                  </div>
                  )}
                  
                  {lead.site_ecommerce && lead.site_ecommerce !== lead.site && (
                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground text-xs mb-1">Loja Virtual / E-commerce</p>
                    <a
                      href={lead.site_ecommerce.startsWith("http") ? lead.site_ecommerce : `https://${lead.site_ecommerce}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-green-600 hover:underline"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      {lead.site_ecommerce}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    {lead.plataforma_ecommerce && (
                      <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-700">{lead.plataforma_ecommerce}</Badge>
                    )}
                  </div>
                  )}
                  
                  {lead.site_blog && lead.site_blog !== lead.site && (
                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground text-xs mb-1">Blog</p>
                    <a
                      href={lead.site_blog.startsWith("http") ? lead.site_blog : `https://${lead.site_blog}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                    >
                      <Activity className="h-3.5 w-3.5" />
                      {lead.site_blog}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  )}
                  </CardContent>
                </Card>

                {/* Localizacao */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        Localizacao
                      </CardTitle>
                      <ReindexButton agent="empresa" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-muted-foreground text-xs mb-1">Endereco Completo</p>
                        <p className="font-medium">{getEnderecoCompleto()}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-muted-foreground text-xs">Cidade</p>
                          <p className="font-medium">{lead.endereco_cidade || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Estado</p>
                          <p className="font-medium">{lead.endereco_estado || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">CEP</p>
                          <p className="font-medium">{lead.endereco_cep || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

                  {/* Resumo */}
                  <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Resumo Executivo (IA)
                        </CardTitle>
                        <ReindexButton agent="analise" />
                      </div>
                      <CardDescription>
                        Analise inteligente baseada em todos os dados coletados
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {lead.resumo ? (
                        <div className="prose prose-sm max-w-none">
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{lead.resumo}</p>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Resumo ainda nao gerado</p>
                          <p className="text-xs mt-1">Clique em Re-indexar para gerar o resumo executivo</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
            </TabsContent>

            {/* Tab: Contatos */}
            <TabsContent value="contatos" className="space-y-6">
              {/* Quadro Societario */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        Quadro Societario
                      </CardTitle>
                      <CardDescription>
                        Socios e diretores da empresa (Fonte: Receita Federal)
                      </CardDescription>
                    </div>
                    <ReindexButton agent="contatos" />
                  </div>
                </CardHeader>
                <CardContent>
                  {lead.diretores && lead.diretores.length > 0 ? (
                    <div className="grid gap-3">
                      {lead.diretores.map((diretor, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{diretor.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {diretor.qualificacao || diretor.cargo || "Socio"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {diretor.email && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(diretor.email!, `email-${idx}`)}
                                className="h-8 gap-1.5 text-xs"
                              >
                                {copiedField === `email-${idx}` ? (
                                  <Check className="h-3.5 w-3.5 text-green-500" />
                                ) : (
                                  <Mail className="h-3.5 w-3.5" />
                                )}
                                {diretor.email}
                              </Button>
                            )}
                            {diretor.telefone && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(diretor.telefone!, `tel-${idx}`)}
                                className="h-8 gap-1.5 text-xs"
                              >
                                {copiedField === `tel-${idx}` ? (
                                  <Check className="h-3.5 w-3.5 text-green-500" />
                                ) : (
                                  <Phone className="h-3.5 w-3.5" />
                                )}
                                {diretor.telefone}
                              </Button>
                            )}
                            {diretor.linkedin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => window.open(diretor.linkedin, "_blank")}
                              >
                                <Linkedin className="h-4 w-4 text-blue-600" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p>Nenhum socio encontrado</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => handleReindex("empresa")}>
                        <Search className="h-4 w-4 mr-2" />
                        Buscar socios
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contatos do Site */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" />
                        Contatos do Site
                      </CardTitle>
                      <CardDescription>
                        Extraidos automaticamente do site oficial
                      </CardDescription>
                    </div>
                    <ReindexButton agent="contatos" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Emails */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        Emails
                      </p>
                      {lead.contatos_site?.emails && lead.contatos_site.emails.length > 0 ? (
                        <div className="space-y-1">
                          {lead.contatos_site.emails.map((email, idx) => (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              className="w-full justify-start h-8 text-xs"
                              onClick={() => copyToClipboard(email, `site-email-${idx}`)}
                            >
                              {copiedField === `site-email-${idx}` ? (
                                <Check className="h-3.5 w-3.5 mr-2 text-green-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5 mr-2" />
                              )}
                              {email}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhum email encontrado</p>
                      )}
                    </div>

                    {/* Telefones */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        Telefones
                      </p>
                      {lead.contatos_site?.telefones && lead.contatos_site.telefones.length > 0 ? (
                        <div className="space-y-1">
                          {lead.contatos_site.telefones.map((tel, idx) => (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              className="w-full justify-start h-8 text-xs"
                              onClick={() => copyToClipboard(tel, `site-tel-${idx}`)}
                            >
                              {copiedField === `site-tel-${idx}` ? (
                                <Check className="h-3.5 w-3.5 mr-2 text-green-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5 mr-2" />
                              )}
                              {tel}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhum telefone encontrado</p>
                      )}
                    </div>
                  </div>

                  {lead.contatos_site?.whatsapp && (
                    <div className="mt-4 pt-4 border-t">
                      <Button
                        variant="outline"
                        className="gap-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                        onClick={() => window.open(`https://wa.me/${lead.contatos_site!.whatsapp!.replace(/\D/g, "")}`, "_blank")}
                      >
                        <Phone className="h-4 w-4" />
                        WhatsApp: {lead.contatos_site.whatsapp}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Digital */}
            <TabsContent value="digital" className="space-y-6">
              {/* Redes Sociais */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Share2 className="h-4 w-4 text-primary" />
                        Redes Sociais
                      </CardTitle>
                      <CardDescription>
                        Presenca digital e seguidores
                      </CardDescription>
                    </div>
                    <ReindexButton agent="redes_sociais" />
                  </div>
                </CardHeader>
                <CardContent>
                  {lead.redes_sociais && lead.redes_sociais.length > 0 ? (
                    <div className="grid grid-cols-3 gap-4">
                      {lead.redes_sociais.map((rs, idx) => {
                        const Icon = socialIcons[rs.rede.toLowerCase()] || Share2
                        const colors = socialColors[rs.rede.toLowerCase()] || { 
                          bg: "from-gray-100 to-gray-200", 
                          text: "text-gray-700",
                          border: "border-gray-200"
                        }
                        return (
                          <Card 
                            key={idx}
                            className={cn(
                              "bg-gradient-to-br cursor-pointer hover:shadow-md transition-shadow",
                              colors.bg,
                              colors.border
                            )}
                            onClick={() => rs.url && window.open(rs.url, "_blank")}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Icon className={cn("h-5 w-5", colors.text)} />
                                  <span className={cn("font-medium capitalize", colors.text)}>
                                    {rs.rede}
                                  </span>
                                </div>
                                {rs.url && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />}
                              </div>
                              <div className="mt-3">
                                <p className="text-2xl font-bold">{formatNumber(rs.seguidores || 0)}</p>
                                <p className="text-xs text-muted-foreground">seguidores</p>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Share2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p>Nenhuma rede social encontrada</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => handleReindex("redes_sociais")}>
                        <Search className="h-4 w-4 mr-2" />
                        Buscar redes sociais
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Marketing Digital */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Megaphone className="h-4 w-4 text-primary" />
                        Midia Paga
                      </CardTitle>
                      <CardDescription>
                        Estimativa de campanhas ativas
                      </CardDescription>
                    </div>
                    <ReindexButton agent="marketing" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    {/* Google Ads */}
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-blue-100">
                            <BarChart3 className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="font-medium">Google Ads</span>
                        </div>
                        <span className="text-2xl font-bold text-blue-600">
                          {lead.campanhas_google ?? "N/A"}
                        </span>
                      </div>
                      {lead.campanhas_google !== null && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Anuncios ativos</span>
                            <span>{lead.campanhas_google}</span>
                          </div>
                          <Progress value={Math.min(lead.campanhas_google * 5, 100)} className="h-2" />
                        </div>
                      )}
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-2 p-0 h-auto text-xs"
                        onClick={() => {
                          const domain = lead.site?.replace(/https?:\/\//, "").replace(/\/$/, "") || lead.nome_fantasia?.replace(/\s/g, "").toLowerCase()
                          window.open(`https://adstransparency.google.com/?region=BR&domain=${domain}`, "_blank")
                        }}
                      >
                        Ver no Google Ads Transparency
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </div>

                    {/* Meta Ads */}
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-indigo-100">
                            <Facebook className="h-4 w-4 text-indigo-600" />
                          </div>
                          <span className="font-medium">Meta Ads</span>
                        </div>
                        <span className="text-2xl font-bold text-indigo-600">
                          {lead.campanhas_meta ?? "N/A"}
                        </span>
                      </div>
                      {lead.campanhas_meta !== null && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Anuncios ativos</span>
                            <span>{lead.campanhas_meta}</span>
                          </div>
                          <Progress value={Math.min(lead.campanhas_meta * 5, 100)} className="h-2" />
                        </div>
                      )}
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-2 p-0 h-auto text-xs"
                        onClick={() => {
                          window.open(`https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&q=${encodeURIComponent(lead.nome_fantasia || lead.razao_social || "")}`, "_blank")
                        }}
                      >
                        Ver na Meta Ad Library
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Vendas */}
            <TabsContent value="vendas" className="space-y-6">
              {/* Canais de Venda */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-primary" />
                        Canais de Venda
                      </CardTitle>
                      <CardDescription>
                        Onde a empresa comercializa seus produtos/servicos
                      </CardDescription>
                    </div>
                    <ReindexButton agent="analise" />
                  </div>
                </CardHeader>
                <CardContent>
                  {lead.canais_vendas && lead.canais_vendas.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {lead.canais_vendas.map((canal, idx) => (
                        <Badge 
                          key={idx} 
                          variant="secondary" 
                          className="text-sm py-1.5 px-3 gap-1.5"
                        >
                          <Store className="h-3.5 w-3.5" />
                          {typeof canal === "string" ? canal : canal.canal}
                          {typeof canal === "object" && canal.url && (
                            <ExternalLink 
                              className="h-3 w-3 ml-1 cursor-pointer" 
                              onClick={() => window.open(canal.url, "_blank")}
                            />
                          )}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p>Nenhum canal de venda identificado</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => handleReindex("analise")}>
                        <Search className="h-4 w-4 mr-2" />
                        Identificar canais
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Marketplaces */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Store className="h-4 w-4 text-primary" />
                        Presenca em Marketplaces
                      </CardTitle>
                      <CardDescription>
                        Lojas em plataformas de e-commerce
                      </CardDescription>
                    </div>
                    <ReindexButton agent="marketplaces" />
                  </div>
                </CardHeader>
                <CardContent>
                  {lead.marketplace?.presente ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-200">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Presente em marketplaces
                        </Badge>
                      </div>
                      {lead.marketplace.lojas && lead.marketplace.lojas.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                          {lead.marketplace.lojas.map((loja, idx) => (
                            <Card key={idx} className="hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Store className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{loja.nome}</span>
                                  </div>
                                  {loja.url && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => window.open(loja.url, "_blank")}
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Store className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p>Nao identificado em marketplaces</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => handleReindex("marketplaces")}>
                        <Search className="h-4 w-4 mr-2" />
                        Buscar em marketplaces
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Analise */}
            <TabsContent value="analise" className="space-y-6">
              {/* Modelo de Negocio */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Modelo de Negocio</span>
                    </div>
                    <p className="text-xl font-bold text-blue-700">{lead.modelo_negocio || "N/A"}</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-900">Segmento</span>
                    </div>
                    <p className="text-xl font-bold text-purple-700">{lead.segmento || "N/A"}</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-green-50 to-green-100/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">Atuacao</span>
                    </div>
                    <p className="text-xl font-bold text-green-700">{lead.atuacao || "N/A"}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Possiveis Dores */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Possiveis Dores
                      </CardTitle>
                      <CardDescription>
                        Desafios e oportunidades identificados
                      </CardDescription>
                    </div>
                    <ReindexButton agent="analise" />
                  </div>
                </CardHeader>
                <CardContent>
                  {lead.possiveis_dores && lead.possiveis_dores.length > 0 ? (
                    <div className="grid gap-2">
                      {lead.possiveis_dores.map((dor, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3 border rounded-lg bg-amber-50/50 border-amber-200"
                        >
                          <div className="p-1 rounded bg-amber-100 mt-0.5">
                            <CircleDot className="h-3.5 w-3.5 text-amber-600" />
                          </div>
                          <p className="text-sm">{dor}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p>Nenhuma dor identificada</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => handleReindex("analise")}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Analisar com IA
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Qualidade dos Dados */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary" />
                    Qualidade dos Dados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <DataQualityItem label="Dados Empresariais" filled={!!lead.razao_social} />
                      <DataQualityItem label="Site Oficial" filled={!!lead.site} />
                      <DataQualityItem label="Plataforma" filled={!!lead.plataforma} />
                      <DataQualityItem label="Localizacao" filled={!!lead.endereco_cidade} />
                      <DataQualityItem label="Socios" filled={!!(lead.diretores && lead.diretores.length > 0)} />
                    </div>
                    <div className="space-y-3">
                      <DataQualityItem label="Contatos" filled={!!(lead.contatos_site?.emails?.length)} />
                      <DataQualityItem label="Redes Sociais" filled={!!(lead.redes_sociais && lead.redes_sociais.length > 0)} />
                      <DataQualityItem label="Classificacao" filled={!!lead.classificacao} />
                      <DataQualityItem label="Analise de Dores" filled={!!(lead.possiveis_dores && lead.possiveis_dores.length > 0)} />
                      <DataQualityItem label="Resumo" filled={!!lead.resumo} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

function DataQualityItem({ label, filled }: { label: string; filled: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      {filled ? (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Preenchido
        </Badge>
      ) : (
        <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
          <XCircle className="h-3 w-3 mr-1" />
          Pendente
        </Badge>
      )}
    </div>
  )
}
