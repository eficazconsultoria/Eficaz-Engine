"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AgentEditor } from "@/components/dashboard/agent-editor"
import type { Profile, AgentPrompt, GenerationLog } from "@/lib/types"
import { generateCreatives, saveAgentPrompt } from "./actions"
import {
  Upload,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Target,
  Users,
  Palette,
  LayoutGrid,
  Square,
  Smartphone,
  RectangleHorizontal,
  Layers,
  Download,
  RefreshCw,
  FileText,
  Loader2,
  Lightbulb,
  Megaphone,
  ShoppingBag,
  Heart,
} from "lucide-react"

interface CreativesFormProps {
  profile: Profile
  agent: AgentPrompt | null
  history: GenerationLog[]
}

const steps = [
  { id: 1, title: "Campanha", icon: Target },
  { id: 2, title: "Formato", icon: LayoutGrid },
  { id: 3, title: "Estilo", icon: Palette },
  { id: 4, title: "Resultado", icon: Sparkles },
]

const formatOptions = [
  {
    id: "feed",
    name: "Feed Quadrado",
    ratio: "1:1",
    icon: Square,
    description: "Ideal para Instagram e Facebook Feed",
    preview: { width: 80, height: 80 },
  },
  {
    id: "story",
    name: "Story/Reels",
    ratio: "9:16",
    icon: Smartphone,
    description: "Stories, Reels e TikTok",
    preview: { width: 45, height: 80 },
  },
  {
    id: "landscape",
    name: "Paisagem",
    ratio: "16:9",
    icon: RectangleHorizontal,
    description: "YouTube, LinkedIn e displays",
    preview: { width: 100, height: 56 },
  },
  {
    id: "carousel",
    name: "Carrossel",
    ratio: "1:1 x4",
    icon: Layers,
    description: "Múltiplos slides sequenciais",
    preview: { width: 80, height: 80 },
  },
]

const objectiveOptions = [
  { id: "awareness", name: "Reconhecimento", icon: Megaphone, description: "Aumentar visibilidade da marca" },
  { id: "consideration", name: "Consideração", icon: Lightbulb, description: "Gerar interesse e engajamento" },
  { id: "conversion", name: "Conversão", icon: ShoppingBag, description: "Vendas e leads diretos" },
  { id: "loyalty", name: "Fidelização", icon: Heart, description: "Reter e engajar clientes" },
]

const styleOptions = [
  { id: "modern", name: "Moderno", emoji: "✨" },
  { id: "minimalist", name: "Minimalista", emoji: "◻️" },
  { id: "bold", name: "Impactante", emoji: "💥" },
  { id: "elegant", name: "Elegante", emoji: "👑" },
  { id: "playful", name: "Divertido", emoji: "🎨" },
  { id: "corporate", name: "Corporativo", emoji: "💼" },
]

export function CreativesForm({ profile, agent, history }: CreativesFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1 - Campanha
  const [objective, setObjective] = useState("")
  const [objectiveType, setObjectiveType] = useState("")
  const [audience, setAudience] = useState("")

  // Step 2 - Formato
  const [format, setFormat] = useState("feed")
  const [quantity, setQuantity] = useState(3)

  // Step 3 - Estilo
  const [style, setStyle] = useState("modern")
  const [brandColors, setBrandColors] = useState<string[]>([])
  const [colorInput, setColorInput] = useState("")
  const [adText, setAdText] = useState("")
  const [references, setReferences] = useState<File[]>([])
  const [additionalInfo, setAdditionalInfo] = useState("")

  // Step 4 - Resultado
  const [generatedImages, setGeneratedImages] = useState<Array<{ url: string; base64?: string; mediaType?: string }>>([])
  const [concepts, setConcepts] = useState("")

  const audienceSuggestions = [
    "Mulheres 25-45 anos",
    "Jovens 18-24 anos",
    "Profissionais de negócios",
    "Mães de primeira viagem",
    "Entusiastas de tecnologia",
    "Público premium",
  ]

  const handleAddColor = () => {
    if (colorInput && !brandColors.includes(colorInput)) {
      setBrandColors([...brandColors, colorInput])
      setColorInput("")
    }
  }

  const handleRemoveColor = (color: string) => {
    setBrandColors(brandColors.filter((c) => c !== color))
  }

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setReferences((prev) => [...prev, ...files].slice(0, 5))
  }, [])

  const handleRemoveFile = (index: number) => {
    setReferences((prev) => prev.filter((_, i) => i !== index))
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return objective.trim() && objectiveType && audience.trim()
      case 2:
        return format && quantity > 0
      case 3:
        return style
      default:
        return true
    }
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    const formData = new FormData()
    formData.append("objective", objective)
    formData.append("objectiveType", objectiveType)
    formData.append("audience", audience)
    formData.append("format", format)
    formData.append("quantity", quantity.toString())
    formData.append("style", style)
    formData.append("brandColors", brandColors.join(", "))
    formData.append("adText", adText)
    formData.append("additionalInfo", additionalInfo)

    references.forEach((file) => {
      formData.append("references", file)
    })

    const result = await generateCreatives(formData)

    if (result.success && result.images) {
      // Handle both old string[] format and new object format
      const formattedImages = result.images.map((img: string | { url: string; base64?: string; mediaType?: string }) => 
        typeof img === 'string' ? { url: img } : img
      )
      setGeneratedImages(formattedImages)
      setConcepts(result.concepts || "")
      setCurrentStep(4)
    } else {
      setError(result.error || "Erro ao gerar criativos")
    }

    setIsGenerating(false)
  }

  // Download a single image
  const downloadImage = (image: { url: string; base64?: string; mediaType?: string }, index: number) => {
    if (image.base64 && image.mediaType) {
      const byteCharacters = atob(image.base64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: image.mediaType })
      
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const extension = image.mediaType.split('/')[1] || 'png'
      link.download = `criativo-${format}-${index + 1}.${extension}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } else {
      window.open(image.url, '_blank')
    }
  }

  const downloadAllImages = () => {
    generatedImages.forEach((image, index) => {
      setTimeout(() => downloadImage(image, index), index * 500)
    })
  }

  const handleSaveAgent = async (content: string) => {
    const result = await saveAgentPrompt(content)
    if (!result.success) throw new Error(result.error)
  }

  const resetForm = () => {
    setCurrentStep(1)
    setObjective("")
    setObjectiveType("")
    setAudience("")
    setFormat("feed")
    setQuantity(3)
    setStyle("modern")
    setBrandColors([])
    setAdText("")
    setReferences([])
    setAdditionalInfo("")
    setGeneratedImages([])
    setConcepts("")
    setError(null)
  }

  return (
    <div className="space-y-6">
      {profile.role === "admin" && agent && <AgentEditor prompt={agent} onSave={handleSaveAgent} />}

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isActive = currentStep === step.id
          const isCompleted = currentStep > step.id

          return (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                disabled={step.id > currentStep}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300
                  ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg scale-105"
                      : isCompleted
                        ? "bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                  }
                `}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
              </button>
              {index < steps.length - 1 && <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground" />}
            </div>
          )
        })}
      </div>

      {/* Step Content */}
      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        {/* Step 1 - Campanha */}
        {currentStep === 1 && (
          <div className="p-6 space-y-6 animate-in fade-in duration-300">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">Defina sua Campanha</h2>
              <p className="text-muted-foreground mt-2">Conte-nos sobre o objetivo e público da sua campanha</p>
            </div>

            {/* Objetivo da Campanha */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Qual é o objetivo principal?</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {objectiveOptions.map((opt) => {
                  const Icon = opt.icon
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setObjectiveType(opt.id)}
                      className={`
                        p-4 rounded-xl border-2 transition-all duration-200 text-left
                        ${
                          objectiveType === opt.id
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }
                      `}
                    >
                      <Icon
                        className={`w-6 h-6 mb-2 ${objectiveType === opt.id ? "text-primary" : "text-muted-foreground"}`}
                      />
                      <div className="font-medium text-sm">{opt.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{opt.description}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Descrição do Objetivo */}
            <div className="space-y-3">
              <Label htmlFor="objective" className="text-base font-medium">
                Descreva seu objetivo
              </Label>
              <Textarea
                id="objective"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="Ex: Lançar a nova coleção de verão com foco em vestidos e saias, destacando o conforto e estilo para o dia a dia..."
                className="min-h-[100px] text-base resize-none"
              />
            </div>

            {/* Público-Alvo */}
            <div className="space-y-3">
              <Label htmlFor="audience" className="text-base font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Público-alvo
              </Label>
              <Input
                id="audience"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Descreva seu público ideal..."
                className="text-base"
              />
              <div className="flex flex-wrap gap-2">
                {audienceSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setAudience(suggestion)}
                    className={`
                      px-3 py-1.5 rounded-full text-xs font-medium transition-all
                      ${
                        audience === suggestion
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                      }
                    `}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2 - Formato */}
        {currentStep === 2 && (
          <div className="p-6 space-y-6 animate-in fade-in duration-300">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <LayoutGrid className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">Escolha o Formato</h2>
              <p className="text-muted-foreground mt-2">Selecione o formato ideal para onde o criativo será exibido</p>
            </div>

            {/* Formato */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Formato do criativo</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {formatOptions.map((opt) => {
                  const Icon = opt.icon
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFormat(opt.id)}
                      className={`
                        p-5 rounded-xl border-2 transition-all duration-200 text-center group
                        ${
                          format === opt.id
                            ? "border-primary bg-primary/5 shadow-lg"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }
                      `}
                    >
                      {/* Preview Visual */}
                      <div className="flex justify-center mb-3">
                        <div
                          className={`
                            border-2 rounded transition-colors
                            ${format === opt.id ? "border-primary bg-primary/20" : "border-muted-foreground/30 bg-muted"}
                          `}
                          style={{
                            width: opt.preview.width,
                            height: opt.preview.height,
                          }}
                        />
                      </div>
                      <div className="font-medium">{opt.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{opt.ratio}</div>
                      <div className="text-xs text-muted-foreground mt-1">{opt.description}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Quantidade */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Quantos criativos você precisa?</Label>
              <div className="flex gap-3">
                {[1, 3, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setQuantity(num)}
                    className={`
                      flex-1 py-4 px-6 rounded-xl border-2 transition-all duration-200
                      ${
                        quantity === num
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border hover:border-primary/50"
                      }
                    `}
                  >
                    <div className="text-3xl font-bold">{num}</div>
                    <div className="text-sm text-muted-foreground">{num === 1 ? "criativo" : "criativos"}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3 - Estilo */}
        {currentStep === 3 && (
          <div className="p-6 space-y-6 animate-in fade-in duration-300">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Palette className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">Personalize o Estilo</h2>
              <p className="text-muted-foreground mt-2">Defina a identidade visual dos seus criativos</p>
            </div>

            {/* Estilo Visual */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Estilo visual</Label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {styleOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStyle(opt.id)}
                    className={`
                      p-4 rounded-xl border-2 transition-all duration-200 text-center
                      ${
                        style === opt.id
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }
                    `}
                  >
                    <div className="text-2xl mb-2">{opt.emoji}</div>
                    <div className="text-sm font-medium">{opt.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Cores da Marca */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Cores da marca (opcional)</Label>
              <div className="flex gap-2">
                <Input
                  value={colorInput}
                  onChange={(e) => setColorInput(e.target.value)}
                  placeholder="Ex: #FF5733 ou azul"
                  className="flex-1"
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddColor())}
                />
                <Button type="button" onClick={handleAddColor} variant="outline">
                  Adicionar
                </Button>
              </div>
              {brandColors.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {brandColors.map((color) => (
                    <span
                      key={color}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm"
                    >
                      <span
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: color.startsWith("#") ? color : undefined }}
                      />
                      {color}
                      <button type="button" onClick={() => handleRemoveColor(color)} className="hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Texto do Anúncio */}
            <div className="space-y-3">
              <Label htmlFor="adText" className="text-base font-medium">
                Texto do anúncio (opcional)
              </Label>
              <Textarea
                id="adText"
                value={adText}
                onChange={(e) => setAdText(e.target.value)}
                placeholder="Headline, CTA ou mensagem principal que deve aparecer no criativo..."
                className="min-h-[80px] resize-none"
              />
            </div>

            {/* Upload de Referências */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Referências visuais (opcional)</Label>
              <div
                className={`
                  border-2 border-dashed rounded-xl p-6 text-center transition-colors
                  hover:border-primary/50 hover:bg-muted/50 cursor-pointer
                `}
                onClick={() => document.getElementById("ref-upload")?.click()}
              >
                <input
                  id="ref-upload"
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">Arraste ou clique para enviar</p>
                <p className="text-xs text-muted-foreground mt-1">Imagens ou PDFs de referência (máx. 5 arquivos)</p>
              </div>
              {references.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
                  {references.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                        {file.type.startsWith("image/") ? (
                          <img
                            src={URL.createObjectURL(file) || "/placeholder.svg"}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileText className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <p className="text-xs text-muted-foreground truncate mt-1">{file.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Informações Adicionais */}
            <div className="space-y-3">
              <Label htmlFor="additionalInfo" className="text-base font-medium">
                Informações adicionais (opcional)
              </Label>
              <Textarea
                id="additionalInfo"
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder="Qualquer informação extra que possa ajudar na criação..."
                className="min-h-[80px] resize-none"
              />
            </div>

            {/* Resumo */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                Resumo da geração
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Objetivo:</span>
                  <p className="font-medium">{objectiveOptions.find((o) => o.id === objectiveType)?.name || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Formato:</span>
                  <p className="font-medium">{formatOptions.find((f) => f.id === format)?.name || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Quantidade:</span>
                  <p className="font-medium">{quantity} criativos</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Estilo:</span>
                  <p className="font-medium">{styleOptions.find((s) => s.id === style)?.name || "-"}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4 - Resultado */}
        {currentStep === 4 && (
          <div className="p-6 space-y-6 animate-in fade-in duration-300">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-semibold">Criativos Gerados!</h2>
              <p className="text-muted-foreground mt-2">{generatedImages.length} criativos prontos para uso</p>
            </div>

            {/* Grid de Criativos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {generatedImages.map((image, index) => (
                <div key={index} className="group relative">
                  <div className="aspect-square rounded-xl overflow-hidden bg-muted border">
                    <img
                      src={image.url || "/placeholder.svg"}
                      alt={`Criativo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => downloadImage(image, index)}>
                      <Download className="w-4 h-4 mr-1" />
                      Baixar
                    </Button>
                  </div>
                  <span className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                    {index + 1}/{generatedImages.length}
                  </span>
                  {image.base64 && (
                    <span className="absolute top-2 right-2 bg-green-500/80 text-white text-xs px-2 py-1 rounded-full">
                      HD
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Conceitos */}
            {concepts && (
              <div className="bg-muted/50 rounded-xl p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  Conceitos Criativos
                </h4>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{concepts}</p>
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={resetForm} className="gap-2 bg-transparent">
                <RefreshCw className="w-4 h-4" />
                Criar Novos Criativos
              </Button>
              <Button className="gap-2" onClick={downloadAllImages}>
                <Download className="w-4 h-4" />
                Baixar Todos
              </Button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mx-6 mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Navigation */}
        {currentStep < 4 && (
          <div className="flex justify-between items-center p-6 border-t bg-muted/30">
            <Button
              variant="ghost"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </Button>

            {currentStep < 3 ? (
              <Button onClick={() => setCurrentStep(currentStep + 1)} disabled={!canProceed()} className="gap-2">
                Próximo
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleGenerate} disabled={!canProceed() || isGenerating} className="gap-2 min-w-[160px]">
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Gerar Criativos
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
