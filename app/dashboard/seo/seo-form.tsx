"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { AgentEditor } from "@/components/dashboard/agent-editor"
import { HtmlEditor } from "@/components/dashboard/html-editor"
import type { Profile, AgentPrompt, GenerationLog, KeywordSuggestion } from "@/lib/types"
import { generateSeoText, saveAgentPrompt, saveKeywordAgentPrompt, researchKeywords } from "./actions"
import {
  Search,
  FileText,
  Sparkles,
  Copy,
  Check,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Target,
  MessageSquare,
  Lightbulb,
  BookOpen,
  ShoppingCart,
  Compass,
  TrendingUp,
  TrendingDown,
  Minus,
  Upload,
  X,
  FileIcon,
  HelpCircle,
  RotateCcw,
  Download,
  Zap,
  BarChart3,
  Gauge,
  Tag,
} from "lucide-react"

interface SeoFormProps {
  profile: Profile
  agent: AgentPrompt | null
  keywordAgent: AgentPrompt | null
  history: GenerationLog[]
}

type PageType = "category" | "product"
type SearchIntent = "informational" | "transactional" | "navigational" | "commercial"
type Tone = "professional" | "casual" | "technical" | "persuasive"
type Length = "short" | "medium" | "long" | "extensive"

const pageTypeOptions = [
  { value: "category", label: "Categoria", icon: BookOpen, description: "Páginas de listagem de produtos" },
  { value: "product", label: "Produto", icon: ShoppingCart, description: "Páginas de produto individual" },
]

const searchIntentOptions = [
  { value: "informational", label: "Informacional", icon: Lightbulb, description: "Usuário busca informações" },
  { value: "transactional", label: "Transacional", icon: ShoppingCart, description: "Usuário quer comprar" },
  { value: "navigational", label: "Navegacional", icon: Compass, description: "Usuário busca site específico" },
  { value: "commercial", label: "Comercial", icon: TrendingUp, description: "Usuário pesquisa antes de comprar" },
]

const toneOptions = [
  { value: "professional", label: "Profissional", description: "Formal e corporativo" },
  { value: "casual", label: "Casual", description: "Amigável e descontraído" },
  { value: "technical", label: "Técnico", description: "Detalhado e especializado" },
  { value: "persuasive", label: "Persuasivo", description: "Focado em conversão" },
]

const lengthOptions = [
  { value: "short", label: "Curto", words: "~300 palavras", description: "Ideal para descrições rápidas" },
  { value: "medium", label: "Médio", words: "~600 palavras", description: "Equilíbrio entre profundidade e leitura" },
  { value: "long", label: "Longo", words: "~1000 palavras", description: "Conteúdo completo e detalhado" },
  { value: "extensive", label: "Extenso", words: "~1500+ palavras", description: "Guia completo e aprofundado" },
]

const intentColors: Record<string, string> = {
  commercial: "bg-green-500/10 text-green-600 border-green-500/20",
  transactional: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  informational: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  navigational: "bg-purple-500/10 text-purple-600 border-purple-500/20",
}

const intentLabels: Record<string, string> = {
  commercial: "Comercial",
  transactional: "Transacional",
  informational: "Informacional",
  navigational: "Navegacional",
}

function TrendIcon({ trend }: { trend: string }) {
  switch (trend) {
    case "up":
      return <TrendingUp className="h-3 w-3 text-green-500" />
    case "down":
      return <TrendingDown className="h-3 w-3 text-red-500" />
    default:
      return <Minus className="h-3 w-3 text-muted-foreground" />
  }
}

function getDifficultyColor(difficulty: number): string {
  if (difficulty <= 30) return "text-green-500"
  if (difficulty <= 60) return "text-yellow-500"
  return "text-red-500"
}

function formatVolume(volume: number): string {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}k`
  }
  return volume.toString()
}

export function SeoForm({ profile, agent, keywordAgent }: SeoFormProps) {
  const [step, setStep] = useState(0) // Start at step 0 (keyword research)
  const [generatedText, setGeneratedText] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isResearching, setIsResearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null)

  const handleCopyKeyword = async (keyword: string, e: React.MouseEvent) => {
    e.stopPropagation() // Don't trigger the card selection click
    await navigator.clipboard.writeText(keyword)
    setCopiedKeyword(keyword)
    setTimeout(() => setCopiedKeyword(null), 1500)
  }

  // Step 0: Keyword Research
  const [seedKeyword, setSeedKeyword] = useState("")
  const [keywordSuggestions, setKeywordSuggestions] = useState<KeywordSuggestion[]>([])

  // Step 1: Selected Keywords
  const [mainKeyword, setMainKeyword] = useState("")
  const [secondaryKeywords, setSecondaryKeywords] = useState<string[]>([])

  // Step 2: Configuration
  const [pageType, setPageType] = useState<PageType>("category")
  const [searchIntent, setSearchIntent] = useState<SearchIntent>("informational")
  const [tone, setTone] = useState<Tone>("professional")
  const [length, setLength] = useState<Length>("medium")
  const [includeFaq, setIncludeFaq] = useState(false)

  // Step 3: Additional Info
  const [additionalInfo, setAdditionalInfo] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  const handleSaveAgent = async (content: string) => {
    const result = await saveAgentPrompt(content)
    if (!result.success) throw new Error(result.error)
  }

  const handleSaveKeywordAgent = async (content: string) => {
    const result = await saveKeywordAgentPrompt(content)
    if (!result.success) throw new Error(result.error)
  }

  const handleResearchKeywords = async () => {
    if (!seedKeyword.trim()) return

    setIsResearching(true)
    setError(null)
    setKeywordSuggestions([])

    const result = await researchKeywords(seedKeyword.trim())
    
    if (result.success && result.keywords) {
      setKeywordSuggestions(result.keywords)
    } else {
      setError(result.error || "Erro ao pesquisar palavras-chave")
    }
    
    setIsResearching(false)
  }

  const handleKeywordClick = (keyword: KeywordSuggestion) => {
    if (!mainKeyword) {
      // First click sets main keyword
      setMainKeyword(keyword.keyword)
    } else if (keyword.keyword === mainKeyword) {
      // Clicking main keyword removes it
      setMainKeyword("")
    } else if (secondaryKeywords.includes(keyword.keyword)) {
      // Clicking secondary keyword removes it
      setSecondaryKeywords(secondaryKeywords.filter(k => k !== keyword.keyword))
    } else {
      // Add as secondary keyword
      setSecondaryKeywords([...secondaryKeywords, keyword.keyword])
    }
  }

  const getKeywordState = (keyword: string): "main" | "secondary" | "none" => {
    if (keyword === mainKeyword) return "main"
    if (secondaryKeywords.includes(keyword)) return "secondary"
    return "none"
  }

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(
      (file) =>
        file.type === "application/pdf" ||
        file.type === "text/plain" ||
        file.name.endsWith(".pdf") ||
        file.name.endsWith(".txt"),
    )
    setUploadedFiles((prev) => [...prev, ...validFiles])
  }, [])

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    const formData = new FormData()
    formData.set("type", pageType)
    formData.set("mainKeyword", mainKeyword)
    formData.set("secondaryKeywords", secondaryKeywords.join(", "))
    formData.set("searchIntent", searchIntent)
    formData.set("tone", tone)
    formData.set("length", length)
    if (includeFaq) formData.set("includeFaq", "on")
    if (additionalInfo) formData.set("additionalInfo", additionalInfo)
    uploadedFiles.forEach((file) => formData.append("files", file))

    const result = await generateSeoText(formData)
    if (result.success && result.text) {
      setGeneratedText(result.text)
      setEditableHtml(result.text)
      setStep(4)
    } else {
      setError(result.error || "Erro ao gerar texto SEO")
    }
    setIsGenerating(false)
  }

  // Editor state
  const [editableHtml, setEditableHtml] = useState("")

  const handleCopy = async () => {
    if (editableHtml) {
      await navigator.clipboard.writeText(editableHtml)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Strip all HTML tags and return plain text
  const stripHtml = (html: string): string => {
    const doc = new DOMParser().parseFromString(html, "text/html")
    return doc.body.textContent || ""
  }

  const handleDownloadTxt = () => {
    if (editableHtml) {
      const plainText = stripHtml(editableHtml)
      const blob = new Blob([plainText], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `seo-${mainKeyword.replace(/\s+/g, "-").toLowerCase()}.txt`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleDownloadHtml = () => {
    if (editableHtml) {
      const blob = new Blob([editableHtml], { type: "text/html;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `seo-${mainKeyword.replace(/\s+/g, "-").toLowerCase()}.html`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const resetForm = () => {
    setStep(0)
    setSeedKeyword("")
    setKeywordSuggestions([])
    setMainKeyword("")
    setSecondaryKeywords([])
    setPageType("category")
    setSearchIntent("informational")
    setTone("professional")
    setLength("medium")
    setIncludeFaq(false)
    setAdditionalInfo("")
    setUploadedFiles([])
    setGeneratedText(null)
    setEditableHtml("")
    setError(null)
  }

  const canProceedStep0 = keywordSuggestions.length > 0
  const canProceedStep1 = mainKeyword.trim().length >= 2
  const canProceedStep2 = true
  const canProceedStep3 = true

  const steps = [
    { number: 0, title: "Pesquisa", icon: Zap },
    { number: 1, title: "Palavras-chave", icon: Search },
    { number: 2, title: "Configurações", icon: Target },
    { number: 3, title: "Complementos", icon: FileText },
    { number: 4, title: "Resultado", icon: Sparkles },
  ]

  return (
    <div className="space-y-6">
      {/* Agent Editors for Admin */}
      {profile.role === "admin" && (
        <div className="space-y-4">
          {keywordAgent && (
            <AgentEditor 
              prompt={keywordAgent} 
              onSave={handleSaveKeywordAgent}
              title="Agente de Pesquisa de Palavras-chave"
            />
          )}
          {agent && (
            <AgentEditor 
              prompt={agent} 
              onSave={handleSaveAgent}
              title="Agente de Geração de Texto SEO"
            />
          )}
        </div>
      )}

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-1 sm:gap-2 py-4 overflow-x-auto">
        {steps.map((s, index) => (
          <div key={s.number} className="flex items-center">
            <button
              onClick={() => s.number < step && setStep(s.number)}
              disabled={s.number > step}
              className={`
                flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-full transition-all duration-300
                ${
                  step === s.number
                    ? "bg-primary text-primary-foreground shadow-lg scale-105"
                    : step > s.number
                      ? "bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                }
              `}
            >
              <s.icon className="h-4 w-4" />
              <span className="hidden md:inline text-sm font-medium">{s.title}</span>
              <span className="md:hidden text-sm font-medium">{s.number}</span>
            </button>
            {index < steps.length - 1 && (
              <ChevronRight
                className={`h-4 w-4 mx-0.5 sm:mx-1 ${step > s.number ? "text-primary" : "text-muted-foreground/30"}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Keyword Research */}
      {step === 0 && (
        <Card className="animate-in fade-in slide-in-from-right-4 duration-300">
          <CardContent className="pt-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Pesquisa de Palavras-chave</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Digite uma palavra-chave ou nome do produto para descobrir as melhores oportunidades de SEO.
              </p>
            </div>

            <div className="max-w-xl mx-auto space-y-6">
              <div className="space-y-2">
                <Label htmlFor="seedKeyword" className="text-base font-medium flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />
                  Palavra-chave ou Produto
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="seedKeyword"
                    value={seedKeyword}
                    onChange={(e) => setSeedKeyword(e.target.value)}
                    placeholder="Ex: tênis de corrida, smartphone Samsung, sofá retrátil..."
                    className="h-12 text-lg"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && seedKeyword.trim()) {
                        handleResearchKeywords()
                      }
                    }}
                  />
                  <Button 
                    onClick={handleResearchKeywords} 
                    disabled={isResearching || !seedKeyword.trim()}
                    className="h-12 px-6"
                  >
                    {isResearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Pesquisar
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    A IA ira analisar e sugerir 15 palavras-chave relevantes com metricas de SEO
                  </p>
                  <button
                    onClick={() => setStep(1)}
                    className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors whitespace-nowrap ml-4"
                  >
                    Ja tenho minhas palavras-chave, pular
                    <ChevronRight className="h-3 w-3 inline ml-0.5" />
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              {/* Keyword Suggestions Cloud */}
              {keywordSuggestions.length > 0 && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <Tag className="h-4 w-4 text-primary" />
                      Sugestões de Palavras-chave
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      Clique para selecionar (1a = principal, demais = secundárias)
                    </span>
                  </div>

                  <div className="grid gap-3">
                    {keywordSuggestions.map((kw, index) => {
                      const state = getKeywordState(kw.keyword)
                      return (
                        <button
                          key={kw.keyword}
                          onClick={() => handleKeywordClick(kw)}
                          className={`
                            p-4 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-md
                            ${state === "main" 
                              ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/20" 
                              : state === "secondary"
                                ? "border-green-500 bg-green-500/10 shadow-sm"
                                : "border-border hover:border-primary/50 hover:bg-muted/50"
                            }
                          `}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs text-muted-foreground font-mono">#{index + 1}</span>
                                <span className="font-medium truncate">{kw.keyword}</span>
                                {state === "main" && (
                                  <Badge className="bg-primary text-primary-foreground text-xs">Principal</Badge>
                                )}
                                {state === "secondary" && (
                                  <Badge variant="secondary" className="bg-green-500/20 text-green-600 text-xs">Secundária</Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs">
                                {/* Search Volume */}
                                <div className="flex items-center gap-1">
                                  <BarChart3 className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-muted-foreground">Volume:</span>
                                  <span className="font-medium">{formatVolume(kw.searchVolume)}</span>
                                  <TrendIcon trend={kw.trend} />
                                </div>
                                {/* SEO Difficulty */}
                                <div className="flex items-center gap-1">
                                  <Gauge className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-muted-foreground">Dificuldade:</span>
                                  <span className={`font-medium ${getDifficultyColor(kw.seoDifficulty)}`}>
                                    {kw.seoDifficulty}%
                                  </span>
                                </div>
                                {/* Intent */}
                                <Badge variant="outline" className={`text-xs ${intentColors[kw.intent]}`}>
                                  {intentLabels[kw.intent]}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {/* Copy button */}
                              <button
                                onClick={(e) => handleCopyKeyword(kw.keyword, e)}
                                className="flex items-center justify-center w-8 h-8 rounded-lg border border-border hover:bg-muted/80 hover:border-primary/30 transition-all"
                                title="Copiar palavra-chave"
                              >
                                {copiedKeyword === kw.keyword ? (
                                  <Check className="h-3.5 w-3.5 text-green-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </button>
                              {/* Score Badge */}
                              <div className="flex flex-col items-center">
                                <span className="text-xs text-muted-foreground mb-1">Score</span>
                                <div className={`
                                  w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                                  ${kw.score >= 80 ? "bg-green-500/20 text-green-600" 
                                    : kw.score >= 60 ? "bg-yellow-500/20 text-yellow-600"
                                    : "bg-red-500/20 text-red-600"}
                                `}>
                                  {kw.score}
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Selected Summary */}
                  {(mainKeyword || secondaryKeywords.length > 0) && (
                    <div className="p-4 rounded-xl bg-muted/50 border space-y-2">
                      <p className="text-sm font-medium">Seleção atual:</p>
                      {mainKeyword && (
                        <div className="flex items-center gap-2">
                          <Badge className="bg-primary text-primary-foreground">Principal</Badge>
                          <span className="text-sm">{mainKeyword}</span>
                        </div>
                      )}
                      {secondaryKeywords.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="bg-green-500/20 text-green-600">Secundárias</Badge>
                          <span className="text-sm">{secondaryKeywords.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={() => setStep(1)} 
                  disabled={!canProceedStep0 || !mainKeyword} 
                  size="lg" 
                  className="gap-2"
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Keywords Confirmation */}
      {step === 1 && (
        <Card className="animate-in fade-in slide-in-from-right-4 duration-300">
          <CardContent className="pt-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Search className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Confirme suas Palavras-chave</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Revise e ajuste as palavras-chave selecionadas para o seu texto SEO.
              </p>
            </div>

            <div className="max-w-xl mx-auto space-y-6">
              <div className="space-y-2">
                <Label htmlFor="mainKeyword" className="text-base font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Palavra-chave Principal *
                </Label>
                <Input
                  id="mainKeyword"
                  value={mainKeyword}
                  onChange={(e) => setMainKeyword(e.target.value)}
                  placeholder="Ex: tênis de corrida masculino"
                  className="h-12 text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Esta é a palavra-chave principal que será o foco do seu texto
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Palavras-chave Secundárias
                </Label>
                {secondaryKeywords.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {secondaryKeywords.map((keyword) => (
                      <Badge
                        key={keyword}
                        variant="secondary"
                        className="px-3 py-1.5 text-sm flex items-center gap-1.5"
                      >
                        {keyword}
                        <button
                          onClick={() => setSecondaryKeywords(secondaryKeywords.filter((k) => k !== keyword))}
                          className="hover:text-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma palavra-chave secundária selecionada</p>
                )}
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(0)} size="lg" className="gap-2 bg-transparent">
                  <ChevronLeft className="h-4 w-4" />
                  Voltar
                </Button>
                <Button onClick={() => setStep(2)} disabled={!canProceedStep1} size="lg" className="gap-2">
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Configuration */}
      {step === 2 && (
        <Card className="animate-in fade-in slide-in-from-right-4 duration-300">
          <CardContent className="pt-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Configure seu Texto</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Defina o tipo de página, intenção de busca, tom de voz e tamanho ideal para o seu conteúdo.
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-8">
              {/* Page Type */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Tipo de Página</Label>
                <div className="grid grid-cols-2 gap-4">
                  {pageTypeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPageType(option.value as PageType)}
                      className={`
                        p-4 rounded-xl border-2 text-left transition-all duration-200
                        ${
                          pageType === option.value
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${pageType === option.value ? "bg-primary/10" : "bg-muted"}`}>
                          <option.icon
                            className={`h-5 w-5 ${pageType === option.value ? "text-primary" : "text-muted-foreground"}`}
                          />
                        </div>
                        <div>
                          <p className="font-medium">{option.label}</p>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Intent */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Intenção de Busca</Label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {searchIntentOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSearchIntent(option.value as SearchIntent)}
                      className={`
                        p-4 rounded-xl border-2 text-center transition-all duration-200
                        ${
                          searchIntent === option.value
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }
                      `}
                    >
                      <option.icon
                        className={`h-6 w-6 mx-auto mb-2 ${searchIntent === option.value ? "text-primary" : "text-muted-foreground"}`}
                      />
                      <p className="font-medium text-sm">{option.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Tom de Voz</Label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {toneOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTone(option.value as Tone)}
                      className={`
                        p-4 rounded-xl border-2 text-center transition-all duration-200
                        ${
                          tone === option.value
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }
                      `}
                    >
                      <p className="font-medium">{option.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Length */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Tamanho do Texto</Label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {lengthOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setLength(option.value as Length)}
                      className={`
                        p-4 rounded-xl border-2 text-center transition-all duration-200
                        ${
                          length === option.value
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }
                      `}
                    >
                      <p className="font-medium">{option.label}</p>
                      <p className="text-xs text-primary font-medium mt-1">{option.words}</p>
                      <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Include FAQ */}
              <div className="flex items-center gap-4 p-4 rounded-xl border bg-muted/30">
                <button
                  type="button"
                  onClick={() => setIncludeFaq(!includeFaq)}
                  className={`
                    w-14 h-8 rounded-full transition-all duration-200 relative
                    ${includeFaq ? "bg-primary" : "bg-muted-foreground/30"}
                  `}
                >
                  <div
                    className={`
                    absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-200
                    ${includeFaq ? "left-7" : "left-1"}
                  `}
                  />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-primary" />
                    <p className="font-medium">Incluir Seção de FAQ</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Adiciona perguntas e respostas frequentes ao final do texto
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)} size="lg" className="gap-2 bg-transparent">
                  <ChevronLeft className="h-4 w-4" />
                  Voltar
                </Button>
                <Button onClick={() => setStep(3)} disabled={!canProceedStep2} size="lg" className="gap-2">
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Additional Info */}
      {step === 3 && (
        <Card className="animate-in fade-in slide-in-from-right-4 duration-300">
          <CardContent className="pt-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Informações Complementares</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Adicione contexto extra para que a IA gere um texto ainda mais relevante e personalizado.
              </p>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
              {/* File Upload */}
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Upload className="h-4 w-4 text-primary" />
                  Arquivos de Referência (Opcional)
                </Label>
                <div className="border-2 border-dashed rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="font-medium">Clique para enviar arquivos</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      PDFs ou arquivos de texto com informações do produto/categoria
                    </p>
                  </label>
                </div>
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 animate-in fade-in slide-in-from-bottom-2"
                      >
                        <div className="flex items-center gap-3">
                          <FileIcon className="h-5 w-5 text-primary" />
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Info */}
              <div className="space-y-3">
                <Label htmlFor="additionalInfo" className="text-base font-medium flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  Informações Adicionais (Opcional)
                </Label>
                <Textarea
                  id="additionalInfo"
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="Descreva detalhes importantes sobre o produto/categoria, diferenciais da marca, público-alvo, concorrentes, informações técnicas, benefícios específicos..."
                  className="min-h-[150px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Quanto mais contexto você fornecer, melhor será o resultado
                </p>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                <p className="font-medium text-sm">Resumo da sua configuração:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Palavra-chave:</span>
                    <span className="font-medium">{mainKeyword}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="font-medium capitalize">{pageType === "category" ? "Categoria" : "Produto"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Intenção:</span>
                    <span className="font-medium capitalize">
                      {searchIntentOptions.find((o) => o.value === searchIntent)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tom:</span>
                    <span className="font-medium capitalize">{toneOptions.find((o) => o.value === tone)?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tamanho:</span>
                    <span className="font-medium">{lengthOptions.find((o) => o.value === length)?.words}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">FAQ:</span>
                    <span className="font-medium">{includeFaq ? "Sim" : "Não"}</span>
                  </div>
                </div>
                {secondaryKeywords.length > 0 && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground text-sm">Secundárias: </span>
                    <span className="text-sm">{secondaryKeywords.join(", ")}</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)} size="lg" className="gap-2 bg-transparent">
                  <ChevronLeft className="h-4 w-4" />
                  Voltar
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !canProceedStep3}
                  size="lg"
                  className="gap-2 min-w-[180px]"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Gerar Texto SEO
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Result */}
      {step === 4 && generatedText && (
        <Card className="animate-in fade-in slide-in-from-right-4 duration-300">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Texto SEO Gerado com Sucesso!</h2>
              <p className="text-muted-foreground">
                Seu conteudo otimizado para <span className="font-medium text-foreground">{mainKeyword}</span> esta
                pronto
              </p>
            </div>

            <div className="max-w-4xl mx-auto space-y-4">
              {/* Actions */}
              <div className="flex flex-wrap justify-center gap-3">
                <Button onClick={handleCopy} variant="outline" className="gap-2 bg-transparent">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copiado!" : "Copiar HTML"}
                </Button>
                <Button onClick={handleDownloadTxt} variant="outline" className="gap-2 bg-transparent">
                  <Download className="h-4 w-4" />
                  Baixar .txt
                </Button>
                <Button onClick={handleDownloadHtml} variant="outline" className="gap-2 bg-transparent">
                  <Download className="h-4 w-4" />
                  Baixar .html
                </Button>
                <Button onClick={resetForm} variant="outline" className="gap-2 bg-transparent">
                  <RotateCcw className="h-4 w-4" />
                  Gerar Novo
                </Button>
              </div>

              {/* WYSIWYG Editor */}
              <HtmlEditor value={editableHtml} onChange={setEditableHtml} />

              {/* Tips */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  Dicas de Uso
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Use o modo Visual para editar o texto diretamente e o modo HTML para ajustar as tags</li>
                  <li>O arquivo .txt contem somente o texto puro, sem formatacao HTML</li>
                  <li>O arquivo .html esta pronto para colar na plataforma de e-commerce</li>
                  <li>Adicione links internos relevantes para melhorar a navegacao</li>
                  <li>Monitore o desempenho no Google Search Console apos publicar</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
