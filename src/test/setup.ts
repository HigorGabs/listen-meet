import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

function createStorageMock(): Storage {
  let store = new Map<string, string>()

  return {
    get length() {
      return store.size
    },
    clear() {
      store = new Map<string, string>()
    },
    getItem(key: string) {
      return store.get(key) ?? null
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null
    },
    removeItem(key: string) {
      store.delete(key)
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: createStorageMock(),
})

Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: createStorageMock(),
})

afterEach(() => {
  cleanup()
})
