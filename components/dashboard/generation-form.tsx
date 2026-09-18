"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Wand2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface GenerationFormProps {
  children: React.ReactNode
  onSubmit: (formData: FormData) => Promise<void>
  isGenerating?: boolean
  submitLabel?: string
}

export function GenerationForm({
  children,
  onSubmit,
  isGenerating = false,
  submitLabel = "Gerar com IA",
}: GenerationFormProps) {
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)
    try {
      const formData = new FormData(e.currentTarget)
      await onSubmit(formData)
    } finally {
      setIsPending(false)
    }
  }

  const loading = isGenerating || isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {children}

      <Button
        type="submit"
        disabled={loading}
        size="lg"
        className={cn(
          "w-full rounded-xl text-base font-medium transition-all sm:w-auto",
          "bg-primary hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20",
          loading && "animate-pulse",
        )}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Gerando...
          </>
        ) : (
          <>
            <Wand2 className="mr-2 h-5 w-5" />
            {submitLabel}
          </>
        )}
      </Button>
    </form>
  )
}
