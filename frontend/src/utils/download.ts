import type { SaveFile } from '../types/models'

export function downloadSaveFile(save: SaveFile): void {
  const json = JSON.stringify(save, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'life_rpg_save.json'
  anchor.click()
  URL.revokeObjectURL(url)
}
