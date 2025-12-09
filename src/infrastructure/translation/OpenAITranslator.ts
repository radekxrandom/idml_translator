import type { Translator } from '../../application/ports/Translator.js'
import type { Logger } from '../../application/ports/Logger.js'
import type { TranslationUnit } from '../../domain/model/TranslationUnit.js'

type OpenAITranslatorConfig = {
  apiKey: string
  model: string
}

const splitEdgeWhitespace = (text: string) => {
  const match = text.match(/^(\s*)([\s\S]*?)(\s*)$/)
  if (!match) {
    return { leading: '', core: text, trailing: '' }
  }

  const [, leading, core, trailing] = match
  return { leading, core, trailing }
}

export class OpenAITranslator implements Translator {
  private readonly config: OpenAITranslatorConfig
  private readonly logger: Logger

  constructor(config: OpenAITranslatorConfig, logger: Logger) {
    this.config = config
    this.logger = logger
  }

  translateBatch = async (units: TranslationUnit[]): Promise<Map<string, string>> => {
    if (!units.length) return new Map()

    const translateUnit = async (unit: TranslationUnit) => {
      const source = unit.source

      try {
        const translated = await this.translateText(source)
        const { leading, trailing } = splitEdgeWhitespace(source)
        const { core } = splitEdgeWhitespace(translated)
        const finalText = `${leading}${core}${trailing}`

        return [unit.id, finalText] as const
      } catch (err) {
        const error = err as Error
        this.logger.error('openai translation failed for unit, using source text', {
          id: unit.id,
          message: error.message
        })
        return [unit.id, source] as const
      }
    }

    const promises = units.map(translateUnit)
    const translations = await Promise.all(promises)

    return new Map(translations)
  }

  private translateText = async (text: string): Promise<string> => {
    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          temperature: 0,
          messages: [
            {
              role: 'system',
              content:
                'you are a translation engine. translate the user text to polish language. the user text is a full paragraph from an idml layout file, possibly spanning multiple sentences and lines, with special layout tokens of the form ⟦ANCHOR_n⟧. preserve any placeholders, variables, starting blank spaces or special tokens exactly as they appear. preserve tokens of the form ⟦ANCHOR_n⟧ exactly, do not change, remove, duplicate, or reorder them, and do not move text across these tokens. preserve all line breaks, internal whitespace, capitalization and punctuation, except where you must change them for natural polish. the context here is that we are translating instructions from an idml file for a board game rulebook. aim for natural, fluent polish suitable for print; if you encounter any short or awkward fragments, translate them so they read naturally in context.'
            },
            { role: 'user', content: text }
          ]
        })
      }
    )

    if (!response.ok) {
      const body = await response.text()
      this.logger.error('openai translation failed', { status: response.status, body })
      throw new Error(`openai error ${response.status}`)
    }

    try {
      const data = await response.json() as any
      const content = data?.choices?.[0]?.message?.content

      if (typeof content !== 'string') {
        throw new Error('invalid response format: missing content')
      }

      return content
    } catch (err) {
      const error = err as Error
      this.logger.error('failed to parse openai response', { message: error.message })
      throw error
    }
  }
}
