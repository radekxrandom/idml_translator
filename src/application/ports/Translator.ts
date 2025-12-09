import type { TranslationUnit } from '../../domain/model/TranslationUnit.js'

export interface Translator {
  translateBatch: (units: TranslationUnit[]) => Promise<Map<string, string>>
}


