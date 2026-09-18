"use client"

import React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Pilcrow,
  Code,
  GripVertical,
  Unlink,
  Minus,
} from "lucide-react"

interface HtmlEditorProps {
  value: string
  onChange: (html: string) => void
}

// Available font families
const fontFamilies = [
  { label: "Padrao", value: "" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Helvetica", value: "Helvetica, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "Times New Roman, serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Tahoma", value: "Tahoma, sans-serif" },
  { label: "Trebuchet", value: "Trebuchet MS, sans-serif" },
  { label: "Courier New", value: "Courier New, monospace" },
]

// Available font sizes
const fontSizes = [
  { label: "10px", value: "1" },
  { label: "12px", value: "2" },
  { label: "14px", value: "3" },
  { label: "16px", value: "4" },
  { label: "18px", value: "5" },
  { label: "24px", value: "6" },
  { label: "32px", value: "7" },
]

export function HtmlEditor({ value, onChange }: HtmlEditorProps) {
  const [mode, setMode] = useState<"visual" | "html">("visual")
  const editorRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [editorHeight, setEditorHeight] = useState(450)
  const [isResizing, setIsResizing] = useState(false)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const [linkText, setLinkText] = useState("")
  const resizeStart = useRef({ y: 0, height: 0 })

  // Execute formatting command
  const exec = useCallback((command: string, value?: string) => {
    editorRef.current?.focus()
    document.execCommand(command, false, value)
    // Sync after command
    setTimeout(() => {
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML)
      }
    }, 0)
  }, [onChange])

  // Format block (headings, paragraph)
  const formatBlock = useCallback((tag: string) => {
    exec("formatBlock", tag)
  }, [exec])

  // Insert link
  const insertLink = useCallback(() => {
    if (linkUrl) {
      const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`
      if (linkText) {
        exec("insertHTML", `<a href="${url}">${linkText}</a>`)
      } else {
        exec("createLink", url)
      }
      setLinkUrl("")
      setLinkText("")
      setShowLinkDialog(false)
    }
  }, [linkUrl, linkText, exec])

  // Remove link
  const removeLink = useCallback(() => {
    exec("unlink")
  }, [exec])

  // Track if the editor is focused to avoid overwriting user input
  const isFocusedRef = useRef(false)

  // Handle visual editor input
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }, [onChange])

  // Sync value to editor only when switching to visual mode or when not focused
  useEffect(() => {
    if (mode === "visual" && editorRef.current && !isFocusedRef.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value
      }
    }
  }, [mode, value])

  // Handle focus/blur to track editor state
  const handleFocus = useCallback(() => {
    isFocusedRef.current = true
  }, [])

  const handleBlur = useCallback(() => {
    isFocusedRef.current = false
  }, [])

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    resizeStart.current = { y: e.clientY, height: editorHeight }
    
    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientY - resizeStart.current.y
      const newHeight = Math.max(200, Math.min(1000, resizeStart.current.height + delta))
      setEditorHeight(newHeight)
    }
    
    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
    
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }, [editorHeight])

  // Strip HTML for word count
  const stripHtml = (html: string): string => {
    const doc = new DOMParser().parseFromString(html, "text/html")
    return doc.body.textContent || ""
  }

  const wordCount = stripHtml(value).split(/\s+/).filter(Boolean).length

  // Toolbar button component
  const ToolbarButton = ({ 
    onClick, 
    active, 
    title, 
    children 
  }: { 
    onClick: () => void
    active?: boolean
    title: string
    children: React.ReactNode 
  }) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        active 
          ? "bg-primary/15 text-primary" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  )

  // Separator
  const Sep = () => <div className="w-px h-6 bg-border mx-0.5" />

  return (
    <div ref={containerRef} className="rounded-xl border bg-card overflow-hidden">
      {/* Mode toggle + word count */}
      <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode("visual")}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              mode === "visual"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Visual
          </button>
          <button
            type="button"
            onClick={() => setMode("html")}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
              mode === "html"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Code className="h-3.5 w-3.5" />
            HTML
          </button>
        </div>
        <Badge variant="secondary" className="text-xs">
          {wordCount} palavras
        </Badge>
      </div>

      {/* Formatting Toolbar - only in visual mode */}
      {mode === "visual" && (
        <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/10 px-3 py-1.5">
          {/* Block format dropdown */}
          <select
            onChange={(e) => { if (e.target.value) formatBlock(e.target.value); e.target.value = "" }}
            defaultValue=""
            className="h-7 text-xs bg-transparent border border-border rounded-md px-1.5 mr-1 text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/30"
            title="Tipo de bloco"
          >
            <option value="" disabled>Formato</option>
            <option value="p">Paragrafo</option>
            <option value="h1">Titulo 1</option>
            <option value="h2">Titulo 2</option>
            <option value="h3">Titulo 3</option>
            <option value="h4">Titulo 4</option>
            <option value="h5">Titulo 5</option>
            <option value="h6">Titulo 6</option>
            <option value="pre">Codigo</option>
            <option value="blockquote">Citacao</option>
          </select>

          {/* Font family dropdown */}
          <select
            onChange={(e) => { if (e.target.value) exec("fontName", e.target.value); e.target.value = "" }}
            defaultValue=""
            className="h-7 text-xs bg-transparent border border-border rounded-md px-1.5 mr-1 text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/30"
            title="Fonte"
          >
            <option value="" disabled>Fonte</option>
            {fontFamilies.map(f => (
              <option key={f.value || "default"} value={f.value}>{f.label}</option>
            ))}
          </select>

          {/* Font size dropdown */}
          <select
            onChange={(e) => { if (e.target.value) exec("fontSize", e.target.value); e.target.value = "" }}
            defaultValue=""
            className="h-7 text-xs bg-transparent border border-border rounded-md px-1.5 mr-1 text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/30"
            title="Tamanho"
          >
            <option value="" disabled>Tamanho</option>
            {fontSizes.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <Sep />

          {/* Text formatting */}
          <ToolbarButton onClick={() => exec("bold")} title="Negrito (Ctrl+B)">
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => exec("italic")} title="Italico (Ctrl+I)">
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => exec("underline")} title="Sublinhado (Ctrl+U)">
            <Underline className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => exec("strikeThrough")} title="Tachado">
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>

          <Sep />

          {/* Lists */}
          <ToolbarButton onClick={() => exec("insertUnorderedList")} title="Lista com marcadores">
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => exec("insertOrderedList")} title="Lista numerada">
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>

          <Sep />

          {/* Alignment */}
          <ToolbarButton onClick={() => exec("justifyLeft")} title="Alinhar a esquerda">
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => exec("justifyCenter")} title="Centralizar">
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => exec("justifyRight")} title="Alinhar a direita">
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>

          <Sep />

          {/* Link */}
          <div className="relative">
            <ToolbarButton onClick={() => setShowLinkDialog(!showLinkDialog)} title="Inserir link">
              <Link className="h-4 w-4" />
            </ToolbarButton>
            {showLinkDialog && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-lg shadow-lg p-3 space-y-2 min-w-[280px]">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">URL</label>
                  <input
                    type="text"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://exemplo.com"
                    className="w-full mt-0.5 px-2 py-1 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    onKeyDown={(e) => { if (e.key === "Enter") insertLink() }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Texto (opcional)</label>
                  <input
                    type="text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="Texto do link"
                    className="w-full mt-0.5 px-2 py-1 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    onKeyDown={(e) => { if (e.key === "Enter") insertLink() }}
                  />
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={insertLink}
                    className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    Inserir
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLinkDialog(false)}
                    className="px-3 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-md hover:bg-muted/80"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
          <ToolbarButton onClick={removeLink} title="Remover link">
            <Unlink className="h-4 w-4" />
          </ToolbarButton>

          <Sep />

          {/* Horizontal rule */}
          <ToolbarButton onClick={() => exec("insertHorizontalRule")} title="Linha horizontal">
            <Minus className="h-4 w-4" />
          </ToolbarButton>

          <Sep />

          {/* Undo/Redo */}
          <ToolbarButton onClick={() => exec("undo")} title="Desfazer (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => exec("redo")} title="Refazer (Ctrl+Y)">
            <Redo2 className="h-4 w-4" />
          </ToolbarButton>
        </div>
      )}

      {/* Editor Area */}
      {mode === "visual" ? (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="outline-none focus:ring-2 focus:ring-primary/20 focus:ring-inset"
          style={{
            height: `${editorHeight}px`,
            overflow: "auto",
            padding: "1.5rem",
            overflowWrap: "break-word",
            wordBreak: "break-word",
          }}
          dangerouslySetInnerHTML={{ __html: value }}
        />
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-card text-sm font-mono outline-none border-none focus:ring-2 focus:ring-primary/20 focus:ring-inset"
          style={{
            height: `${editorHeight}px`,
            padding: "1.5rem",
            resize: "none",
          }}
          spellCheck={false}
        />
      )}

      {/* Resize handle */}
      <div
        onMouseDown={handleResizeStart}
        className={`flex items-center justify-center border-t py-1 cursor-ns-resize transition-colors ${
          isResizing ? "bg-primary/10" : "hover:bg-muted/50"
        }`}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground rotate-90" />
      </div>

      {/* Styles for visual editor content */}
      <style>{`
        [contenteditable] h1 { font-size: 2rem; font-weight: 700; margin: 1.25rem 0 0.75rem; line-height: 1.3; }
        [contenteditable] h2 { font-size: 1.5rem; font-weight: 600; margin: 1.15rem 0 0.65rem; line-height: 1.35; }
        [contenteditable] h3 { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.5rem; line-height: 1.4; }
        [contenteditable] h4 { font-size: 1.1rem; font-weight: 600; margin: 0.85rem 0 0.5rem; line-height: 1.4; }
        [contenteditable] h5 { font-size: 1rem; font-weight: 600; margin: 0.75rem 0 0.4rem; }
        [contenteditable] h6 { font-size: 0.9rem; font-weight: 600; margin: 0.65rem 0 0.35rem; }
        [contenteditable] p { margin: 0.75rem 0; line-height: 1.7; }
        [contenteditable] ul, [contenteditable] ol { padding-left: 1.5rem; margin: 0.65rem 0; }
        [contenteditable] li { margin: 0.35rem 0; line-height: 1.6; }
        [contenteditable] a { color: #2563eb; text-decoration: underline; cursor: pointer; }
        [contenteditable] strong { font-weight: 700; }
        [contenteditable] em { font-style: italic; }
        [contenteditable] blockquote { border-left: 3px solid #d1d5db; padding-left: 1rem; margin: 0.75rem 0; color: #6b7280; font-style: italic; }
        [contenteditable] pre { background: #f3f4f6; padding: 0.75rem; border-radius: 0.5rem; font-family: monospace; font-size: 0.875rem; overflow-x: auto; margin: 0.75rem 0; }
        [contenteditable] hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.25rem 0; }
        [contenteditable] div { margin: 0.5rem 0; }
      `}</style>
    </div>
  )
}
