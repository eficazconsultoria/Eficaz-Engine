"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AgentEditor } from "@/components/dashboard/agent-editor"
import type { Profile, AgentPrompt, GenerationLog } from "@/lib/types"
import { generateBanners, saveAgentPrompt } from "./actions"
import {
  Target,
  Type,
  Palette,
  Sparkles,
  Check,
  ChevronRight,
  ChevronLeft,
  Upload,
  X,
  FileImage,
  FileText,
  ImageIcon,
  Download,
  Copy,
  Loader2,
  Monitor,
  Smartphone,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  Wand2,
  Lightbulb,
} from "lucide-react"
import { useDropzone } from "react-dropzone"
import { cn } from "@/lib/utils"

interface BannersFormProps {
  profile: Profile
  agent: AgentPrompt | null
  history: GenerationLog[]
}

type BannerStyle = "modern" | "minimal" | "bold" | "elegant" | "playful"
type BannerRatio = "16:9" | "1:1" | "9:16" | "4:3" | "21:9"

interface BannerPreset {
  name: string
  width: number
  height: number
  ratio: BannerRatio
  icon: React.ReactNode
  description: string
}

const BANNER_PRESETS: BannerPreset[] = [
  {
    name: "Desktop Full",
    width: 1920,
    height: 1080,
    ratio: "16:9",
    icon: <Monitor className="h-5 w-5" />,
    description: "Banner principal para site",
  },
  {
    name: "Desktop Wide",
    width: 1920,
    height: 600,
    ratio: "21:9",
    icon: <RectangleHorizontal className="h-5 w-5" />,
    description: "Header ou hero section",
  },
  {
    name: "Quadrado",
    width: 1080,
    height: 1080,
    ratio: "1:1",
    icon: <Square className="h-5 w-5" />,
    description: "Instagram, Facebook",
  },
  {
    name: "Story/Reels",
    width: 1080,
    height: 1920,
    ratio: "9:16",
    icon: <Smartphone className="h-5 w-5" />,
    description: "Stories e Reels",
  },
  {
    name: "Post Feed",
    width: 1200,
    height: 900,
    ratio: "4:3",
    icon: <RectangleVertical className="h-5 w-5" />,
    description: "Posts de feed",
  },
]

const BANNER_STYLES: { value: BannerStyle; label: string; description: string; emoji: string }[] = [
  { value: "modern", label: "Moderno", description: "Clean e contemporâneo", emoji: "✨" },
  { value: "minimal", label: "Minimalista", description: "Menos é mais", emoji: "◻️" },
  { value: "bold", label: "Impactante", description: "Cores vibrantes e fortes", emoji: "🔥" },
  { value: "elegant", label: "Elegante", description: "Sofisticado e refinado", emoji: "💎" },
  { value: "playful", label: "Divertido", description: "Lúdico e criativo", emoji: "🎨" },
]

const steps = [
  { id: 1, title: "Formato", description: "Escolha o tamanho", icon: ImageIcon },
  { id: 2, title: "Conteúdo", description: "Textos e objetivo", icon: Type },
  { id: 3, title: "Estilo", description: "Visual e referências", icon: Palette },
  { id: 4, title: "Resultado", description: "Banner gerado", icon: Sparkles },
]

export function BannersForm({ profile, agent }: BannersFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1 - Format
  const [selectedPreset, setSelectedPreset] = useState<BannerPreset | null>(null)
  const [customWidth, setCustomWidth] = useState<number>(1920)
  const [customHeight, setCustomHeight] = useState<number>(1080)
  const [useCustomSize, setUseCustomSize] = useState(false)

  // Step 2 - Content
  const [objective, setObjective] = useState("")
  const [mainText, setMainText] = useState("")
  const [ctaText, setCtaText] = useState("")
  const [additionalInfo, setAdditionalInfo] = useState("")

  // Step 3 - Style
  const [selectedStyle, setSelectedStyle] = useState<BannerStyle>("modern")
  const [referenceFiles, setReferenceFiles] = useState<File[]>([])
  const [brandColors, setBrandColors] = useState<string[]>([])
  const [newColor, setNewColor] = useState("#000000")

  // Step 4 - Result
  const [result, setResult] = useState<{ image: { url: string; base64?: string; mediaType?: string }; concept: string } | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setReferenceFiles((prev) => [...prev, ...acceptedFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
      "application/pdf": [".pdf"],
    },
    maxSize: 10 * 1024 * 1024,
  })

  const removeFile = (index: number) => {
    setReferenceFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const addColor = () => {
    if (newColor && !brandColors.includes(newColor)) {
      setBrandColors((prev) => [...prev, newColor])
    }
  }

  const removeColor = (color: string) => {
    setBrandColors((prev) => prev.filter((c) => c !== color))
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    const formData = new FormData()
    formData.set("objective", objective)
    formData.set("mainText", mainText)
    formData.set("ctaText", ctaText)
    formData.set("style", selectedStyle)
    formData.set("width", useCustomSize ? customWidth.toString() : selectedPreset?.width.toString() || "1920")
    formData.set("height", useCustomSize ? customHeight.toString() : selectedPreset?.height.toString() || "1080")
    formData.set("ratio", selectedPreset?.ratio || "16:9")
    formData.set("additionalInfo", additionalInfo)
    formData.set("brandColors", brandColors.join(","))

    referenceFiles.forEach((file, index) => {
      formData.append(`reference_${index}`, file)
    })

    const response = await generateBanners(formData)

    if (response.success && response.image) {
      // Handle both old string format and new object format
      const imageData = typeof response.image === 'string' 
        ? { url: response.image } 
        : response.image
      setResult({ image: imageData, concept: response.concept || "" })
      setCurrentStep(4)
    } else {
      setError(response.error || "Erro ao gerar banner")
    }

    setIsGenerating(false)
  }

  // Download banner image
  const downloadBanner = () => {
    if (!result) return
    
    if (result.image.base64 && result.image.mediaType) {
      const byteCharacters = atob(result.image.base64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: result.image.mediaType })
      
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const extension = result.image.mediaType.split('/')[1] || 'png'
      const width = useCustomSize ? customWidth : selectedPreset?.width || 1920
      const height = useCustomSize ? customHeight : selectedPreset?.height || 1080
      link.download = `banner-${width}x${height}.${extension}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } else {
      window.open(result.image.url, '_blank')
    }
  }

  const handleSaveAgent = async (content: string) => {
    const agentResult = await saveAgentPrompt(content)
    if (!agentResult.success) throw new Error(agentResult.error)
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedPreset !== null || useCustomSize
      case 2:
        return objective.trim() !== "" && mainText.trim() !== ""
      case 3:
        return true
      default:
        return false
    }
  }

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1)
    } else if (currentStep === 3) {
      handleGenerate()
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const resetForm = () => {
    setCurrentStep(1)
    setSelectedPreset(null)
    setUseCustomSize(false)
    setObjective("")
    setMainText("")
    setCtaText("")
    setAdditionalInfo("")
    setSelectedStyle("modern")
    setReferenceFiles([])
    setBrandColors([])
    setResult(null)
    setError(null)
  }

  const getWidth = () => (useCustomSize ? customWidth : selectedPreset?.width || 1920)
  const getHeight = () => (useCustomSize ? customHeight : selectedPreset?.height || 1080)

  return (
    <div className="space-y-6">
      {profile.role === "admin" && agent && <AgentEditor prompt={agent} onSave={handleSaveAgent} />}

      {/* Progress Steps */}
      <div className="relative">
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = currentStep === step.id
            const isCompleted = currentStep > step.id

            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                      isActive && "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-110",
                      isCompleted && "bg-green-500 text-white",
                      !isActive && !isCompleted && "bg-muted text-muted-foreground",
                    )}
                  >
                    {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <div className="mt-2 text-center">
                    <p
                      className={cn(
                        "font-medium text-sm transition-colors",
                        isActive && "text-primary",
                        isCompleted && "text-green-500",
                        !isActive && !isCompleted && "text-muted-foreground",
                      )}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground hidden sm:block">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 mx-2 transition-colors duration-300",
                      currentStep > step.id ? "bg-green-500" : "bg-muted",
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardContent className="p-6">
          {/* Step 1 - Format */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <ImageIcon className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Escolha o Formato</h2>
                <p className="text-muted-foreground mt-2">
                  Selecione um tamanho predefinido ou defina dimensões personalizadas
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {BANNER_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      setSelectedPreset(preset)
                      setUseCustomSize(false)
                    }}
                    className={cn(
                      "relative p-4 rounded-xl border-2 text-left transition-all duration-200 hover:border-primary/50 hover:bg-primary/5",
                      selectedPreset?.name === preset.name && !useCustomSize
                        ? "border-primary bg-primary/10"
                        : "border-border",
                    )}
                  >
                    {selectedPreset?.name === preset.name && !useCustomSize && (
                      <div className="absolute top-2 right-2">
                        <Check className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={cn(
                          "p-2 rounded-lg",
                          selectedPreset?.name === preset.name && !useCustomSize
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted",
                        )}
                      >
                        {preset.icon}
                      </div>
                      <div>
                        <p className="font-semibold">{preset.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {preset.width} x {preset.height}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{preset.description}</p>
                    <Badge variant="secondary" className="mt-2">
                      {preset.ratio}
                    </Badge>
                  </button>
                ))}

                {/* Custom Size Option */}
                <button
                  onClick={() => {
                    setUseCustomSize(true)
                    setSelectedPreset(null)
                  }}
                  className={cn(
                    "relative p-4 rounded-xl border-2 border-dashed text-left transition-all duration-200 hover:border-primary/50 hover:bg-primary/5",
                    useCustomSize ? "border-primary bg-primary/10" : "border-border",
                  )}
                >
                  {useCustomSize && (
                    <div className="absolute top-2 right-2">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={cn(
                        "p-2 rounded-lg",
                        useCustomSize ? "bg-primary text-primary-foreground" : "bg-muted",
                      )}
                    >
                      <Target className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">Personalizado</p>
                      <p className="text-xs text-muted-foreground">Defina suas dimensões</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Tamanho específico para sua necessidade</p>
                </button>
              </div>

              {/* Custom Size Inputs */}
              {useCustomSize && (
                <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border animate-in slide-in-from-top duration-300">
                  <h3 className="font-medium mb-4">Dimensões Personalizadas</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="customWidth">Largura (px)</Label>
                      <Input
                        id="customWidth"
                        type="number"
                        value={customWidth}
                        onChange={(e) => setCustomWidth(Number.parseInt(e.target.value) || 1920)}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customHeight">Altura (px)</Label>
                      <Input
                        id="customHeight"
                        type="number"
                        value={customHeight}
                        onChange={(e) => setCustomHeight(Number.parseInt(e.target.value) || 1080)}
                        className="bg-background"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Preview */}
              {(selectedPreset || useCustomSize) && (
                <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border">
                  <p className="text-sm text-muted-foreground mb-3">Preview da proporção:</p>
                  <div className="flex justify-center">
                    <div
                      className="bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-dashed border-primary/30 rounded-lg flex items-center justify-center"
                      style={{
                        width: Math.min(300, getWidth() / 6),
                        height: Math.min(200, getHeight() / 6),
                        aspectRatio: `${getWidth()} / ${getHeight()}`,
                      }}
                    >
                      <span className="text-xs text-muted-foreground">
                        {getWidth()} x {getHeight()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2 - Content */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Type className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Defina o Conteúdo</h2>
                <p className="text-muted-foreground mt-2">Preencha os textos e objetivo do seu banner</p>
              </div>

              <div className="max-w-xl mx-auto space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="objective" className="text-base font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Objetivo do Banner *
                  </Label>
                  <Input
                    id="objective"
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    placeholder="Ex: Promoção de Black Friday, Lançamento de produto..."
                    className="h-12 text-base"
                  />
                  <p className="text-xs text-muted-foreground">Descreva o propósito principal do banner</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mainText" className="text-base font-medium flex items-center gap-2">
                    <Type className="h-4 w-4 text-primary" />
                    Texto Principal *
                  </Label>
                  <Input
                    id="mainText"
                    value={mainText}
                    onChange={(e) => setMainText(e.target.value)}
                    placeholder="Ex: Até 70% OFF, Novidade Imperdível..."
                    className="h-12 text-base"
                  />
                  <p className="text-xs text-muted-foreground">O texto de destaque do banner</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ctaText" className="text-base font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Texto do Botão (CTA)
                  </Label>
                  <Input
                    id="ctaText"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="Ex: Compre Agora, Saiba Mais, Aproveite..."
                    className="h-12 text-base"
                  />
                  <p className="text-xs text-muted-foreground">Opcional - Texto de chamada para ação</p>
                </div>

                {/* Quick Suggestions */}
                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    <p className="text-sm font-medium">Sugestões de CTA</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["Compre Agora", "Saiba Mais", "Aproveite", "Confira", "Garanta o Seu", "Cadastre-se"].map(
                      (suggestion) => (
                        <Button
                          key={suggestion}
                          variant="outline"
                          size="sm"
                          onClick={() => setCtaText(suggestion)}
                          className="text-xs"
                        >
                          {suggestion}
                        </Button>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 - Style */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Palette className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Defina o Estilo</h2>
                <p className="text-muted-foreground mt-2">Escolha o visual e adicione referências</p>
              </div>

              {/* Style Selection */}
              <div>
                <Label className="text-base font-medium mb-4 block">Estilo Visual</Label>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {BANNER_STYLES.map((style) => (
                    <button
                      key={style.value}
                      onClick={() => setSelectedStyle(style.value)}
                      className={cn(
                        "p-4 rounded-xl border-2 text-center transition-all duration-200 hover:border-primary/50",
                        selectedStyle === style.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted/50",
                      )}
                    >
                      <span className="text-2xl mb-2 block">{style.emoji}</span>
                      <p className="font-medium text-sm">{style.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{style.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand Colors */}
              <div>
                <Label className="text-base font-medium mb-4 block">Cores da Marca (opcional)</Label>
                <div className="flex flex-wrap items-center gap-3">
                  {brandColors.map((color) => (
                    <div
                      key={color}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border"
                    >
                      <div className="w-6 h-6 rounded-full border border-border" style={{ backgroundColor: color }} />
                      <span className="text-sm font-mono">{color}</span>
                      <button
                        onClick={() => removeColor(color)}
                        className="p-1 hover:bg-destructive/10 rounded-full transition-colors"
                      >
                        <X className="h-3 w-3 text-destructive" />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-border"
                    />
                    <Button variant="outline" size="sm" onClick={addColor}>
                      Adicionar Cor
                    </Button>
                  </div>
                </div>
              </div>

              {/* Reference Upload */}
              <div>
                <Label className="text-base font-medium mb-4 block">Imagens de Referência (opcional)</Label>
                <div
                  {...getRootProps()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
                    isDragActive
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/30",
                  )}
                >
                  <input {...getInputProps()} />
                  <Upload
                    className={cn(
                      "h-10 w-10 mx-auto mb-4 transition-colors",
                      isDragActive ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <p className="font-medium">
                    {isDragActive ? "Solte os arquivos aqui" : "Arraste imagens ou clique para selecionar"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">PNG, JPG, PDF até 10MB</p>
                </div>

                {referenceFiles.length > 0 && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {referenceFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border"
                      >
                        {file.type.startsWith("image/") ? (
                          <FileImage className="h-8 w-8 text-blue-500 shrink-0" />
                        ) : (
                          <FileText className="h-8 w-8 text-red-500 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="p-1.5 hover:bg-destructive/10 rounded-full transition-colors"
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Info */}
              <div>
                <Label htmlFor="additionalInfo" className="text-base font-medium mb-4 block">
                  Informações Adicionais (opcional)
                </Label>
                <Textarea
                  id="additionalInfo"
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="Elementos visuais obrigatórios, estilo específico, inspirações, restrições..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Summary */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Resumo do Banner
                </h3>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dimensões:</span>
                    <span className="font-medium">
                      {getWidth()} x {getHeight()} px
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Objetivo:</span>
                    <span className="font-medium truncate max-w-[200px]">{objective || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Texto Principal:</span>
                    <span className="font-medium truncate max-w-[200px]">{mainText || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estilo:</span>
                    <span className="font-medium">{BANNER_STYLES.find((s) => s.value === selectedStyle)?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Referências:</span>
                    <span className="font-medium">{referenceFiles.length} arquivo(s)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4 - Result */}
          {currentStep === 4 && result && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
                  <Check className="h-8 w-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold">Banner Gerado!</h2>
                <p className="text-muted-foreground mt-2">Seu banner está pronto para uso</p>
                {result.image.base64 && (
                  <Badge variant="secondary" className="mt-2 bg-green-500/10 text-green-600">
                    Imagem em Alta Definição
                  </Badge>
                )}
              </div>

              {/* Generated Banner */}
              <div className="relative overflow-hidden rounded-xl border border-border bg-muted/30">
                <img src={result.image.url || "/placeholder.svg"} alt="Banner gerado" className="w-full" />
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 justify-center">
                <Button className="gap-2" onClick={downloadBanner}>
                  <Download className="h-4 w-4" />
                  Baixar Banner
                </Button>
                <Button variant="outline" onClick={resetForm} className="gap-2 bg-transparent">
                  <Wand2 className="h-4 w-4" />
                  Criar Novo
                </Button>
              </div>

              {/* Concept */}
              {result.concept && (
                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    Conceito do Banner
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.concept}</p>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Navigation Buttons */}
          {currentStep < 4 && (
            <div className="flex justify-between mt-8 pt-6 border-t border-border">
              <Button variant="ghost" onClick={prevStep} disabled={currentStep === 1} className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </Button>

              <Button onClick={nextStep} disabled={!canProceed() || isGenerating} className="gap-2 min-w-[160px]">
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : currentStep === 3 ? (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Gerar Banner
                  </>
                ) : (
                  <>
                    Próximo
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
