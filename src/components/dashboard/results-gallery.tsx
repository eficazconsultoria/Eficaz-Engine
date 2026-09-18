"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Download, ExternalLink, Loader2, ImageIcon, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface ResultsGalleryProps {
  images: string[]
  isLoading?: boolean
}

export function ResultsGallery({ images, isLoading = false }: ResultsGalleryProps) {
  const [downloading, setDownloading] = useState<number | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const handleDownload = async (url: string, index: number) => {
    setDownloading(index)
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = `generated-image-${index + 1}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error("Download failed:", error)
    } finally {
      setDownloading(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center animate-fade-in">
          <div className="relative mx-auto mb-6 h-16 w-16">
            <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-ping" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="h-8 w-8 text-primary animate-pulse" />
            </div>
          </div>
          <p className="text-lg font-medium">Gerando imagens...</p>
          <p className="text-sm text-muted-foreground mt-1">Isso pode levar alguns segundos</p>
        </div>
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-center">
        <div className="animate-fade-in">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            Nenhuma imagem gerada ainda.
            <br />
            Preencha o formulário e clique em Gerar.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {images.map((url, index) => (
        <div
          key={index}
          className="group relative overflow-hidden rounded-2xl border border-border/50 bg-secondary/30 animate-scale-in"
          style={{ animationDelay: `${index * 100}ms` }}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <div className="relative aspect-square">
            <Image
              src={url || "/placeholder.svg"}
              alt={`Generated image ${index + 1}`}
              fill
              className={cn("object-cover transition-transform duration-300", hoveredIndex === index && "scale-105")}
            />
            {/* Overlay on hover */}
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent transition-opacity duration-300",
                hoveredIndex === index ? "opacity-100" : "opacity-0",
              )}
            />
          </div>

          {/* Actions */}
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 p-4 transition-all duration-300",
              hoveredIndex === index ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
            )}
          >
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 rounded-xl bg-background/80 backdrop-blur-sm hover:bg-background"
                onClick={() => handleDownload(url, index)}
                disabled={downloading === index}
              >
                {downloading === index ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Baixar
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="rounded-xl bg-background/80 backdrop-blur-sm hover:bg-background"
                asChild
              >
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* Image number badge */}
          <div className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 text-xs font-medium backdrop-blur-sm">
            {index + 1}
          </div>
        </div>
      ))}
    </div>
  )
}
