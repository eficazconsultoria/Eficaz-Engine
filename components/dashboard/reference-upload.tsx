"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload, X, FileText, Paperclip, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface ReferenceUploadProps {
  acceptTypes: ("image" | "pdf")[]
  showAdditionalInfo?: boolean
  additionalInfoLabel?: string
  additionalInfoPlaceholder?: string
}

interface UploadedFile {
  id: string
  name: string
  type: "image" | "pdf"
  url: string
  file: File
}

export function ReferenceUpload({
  acceptTypes,
  showAdditionalInfo = true,
  additionalInfoLabel = "Informações Adicionais",
  additionalInfoPlaceholder = "Adicione informações extras que podem ajudar a IA a gerar um resultado melhor...",
}: ReferenceUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const acceptString = acceptTypes.map((type) => (type === "image" ? "image/*" : ".pdf")).join(",")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles) return
    processFiles(selectedFiles)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const processFiles = (selectedFiles: FileList) => {
    const newFiles: UploadedFile[] = []

    Array.from(selectedFiles).forEach((file) => {
      const isImage = file.type.startsWith("image/")
      const isPdf = file.type === "application/pdf"

      if ((isImage && acceptTypes.includes("image")) || (isPdf && acceptTypes.includes("pdf"))) {
        const url = URL.createObjectURL(file)
        newFiles.push({
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: isImage ? "image" : "pdf",
          url,
          file,
        })
      }
    })

    setFiles((prev) => [...prev, ...newFiles])
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files)
    }
  }

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id)
      if (file) {
        URL.revokeObjectURL(file.url)
      }
      return prev.filter((f) => f.id !== id)
    })
  }

  return (
    <div className="space-y-5 border-t border-border/50 pt-5 mt-5">
      {/* Upload de Referências */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          Referências
          <span className="text-xs text-muted-foreground font-normal">
            ({acceptTypes.includes("image") && "imagens"}
            {acceptTypes.includes("image") && acceptTypes.includes("pdf") && ", "}
            {acceptTypes.includes("pdf") && "PDFs"})
          </span>
        </Label>

        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all",
            "hover:border-primary/50 hover:bg-secondary/50",
            isDragging ? "border-primary bg-primary/5" : "border-border/50 bg-secondary/30",
          )}
        >
          <div className="flex flex-col items-center gap-2">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
                isDragging ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground",
              )}
            >
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium">Arraste arquivos ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground mt-1">
                {acceptTypes.includes("image") && "PNG, JPG, WEBP"}
                {acceptTypes.includes("image") && acceptTypes.includes("pdf") && " ou "}
                {acceptTypes.includes("pdf") && "PDF"}
              </p>
            </div>
          </div>
        </div>

        {/* Files preview */}
        {files.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {files.map((file) => (
              <div
                key={file.id}
                className="group relative aspect-square overflow-hidden rounded-xl border border-border/50 bg-secondary/30 animate-scale-in"
              >
                {file.type === "image" ? (
                  <img
                    src={file.url || "/placeholder.svg"}
                    alt={file.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center p-3">
                    <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-[10px] text-muted-foreground text-center line-clamp-2">{file.name}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(file.id)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {/* Add more button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-secondary/20 text-muted-foreground transition-all hover:border-primary/50 hover:bg-secondary/50 hover:text-foreground"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={acceptString}
          multiple
          className="hidden"
          onChange={handleFileChange}
          name="referenceFiles"
        />

        {files.map((file, index) => (
          <input key={file.id} type="hidden" name={`reference_${index}_name`} value={file.name} />
        ))}
        <input type="hidden" name="referenceCount" value={files.length} />
      </div>

      {/* Informações Adicionais */}
      {showAdditionalInfo && (
        <div className="space-y-2">
          <Label htmlFor="additionalInfo" className="text-sm font-medium">
            {additionalInfoLabel}
          </Label>
          <Textarea
            id="additionalInfo"
            name="additionalInfo"
            placeholder={additionalInfoPlaceholder}
            rows={3}
            className="resize-none rounded-xl border-border/50 bg-secondary/30 transition-all focus:border-primary focus:bg-background"
          />
        </div>
      )}
    </div>
  )
}
