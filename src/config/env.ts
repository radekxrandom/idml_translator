export type AppConfig = {
  openaiApiKey: string | null
  openaiModel: string
  debugFiles: boolean
}

export const loadEnv = (): AppConfig => {
  const { OPENAI_API_KEY, OPENAI_MODEL, DEBUG_FILES } = process.env

  const debugFiles = DEBUG_FILES === '1' || DEBUG_FILES === 'true'

  return {
    openaiApiKey: OPENAI_API_KEY ?? null,
    openaiModel: OPENAI_MODEL ?? 'gpt-4o',
    debugFiles
  }
}
