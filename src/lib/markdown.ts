import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ gfm: true, breaks: true })

/** Markdown -> HTML sanitizado. Nunca injetar o resultado sem passar por aqui. */
export function renderMarkdown(source: string | null | undefined): string {
  if (!source || !source.trim()) return ''
  const raw = marked.parse(source, { async: false }) as string
  return DOMPurify.sanitize(raw, {
    ADD_ATTR: ['target', 'rel'],
    FORBID_TAGS: ['style', 'iframe', 'form', 'input', 'script'],
  })
}
