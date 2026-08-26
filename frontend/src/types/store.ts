import type {
  AppData,
  AchievementSignal,
  Character,
  CollectionEntityMap,
  EntityCollection,
  LocalSettings,
  SaveFile,
  StatKey,
} from './models'

export interface AppStoreValue {
  data: AppData | null
  settings: LocalSettings
  isLoading: boolean
  error: string | null
  updateCharacter: (patch: Partial<Omit<Character, 'id' | 'createdAt'>>) => Promise<void>
  changeStat: (key: StatKey, amount: number, note: string) => Promise<void>
  saveEntity: <K extends EntityCollection>(
    collection: K,
    entity: CollectionEntityMap[K],
  ) => Promise<void>
  deleteEntity: (collection: EntityCollection, id: string) => Promise<void>
  completeTask: (taskId: string) => Promise<void>
  evaluateAchievements: (signal: AchievementSignal) => Promise<void>
  updateSettings: (patch: Partial<LocalSettings>) => void
  createSaveFile: () => Promise<SaveFile>
  importSaveFile: (input: unknown) => Promise<void>
  resetToDefaults: () => Promise<void>
}
