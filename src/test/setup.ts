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

if (!Element.prototype.hasPointerCapture) {
  Object.defineProperty(Element.prototype, 'hasPointerCapture', {
    configurable: true,
    value: () => false,
  })
}

if (!Element.prototype.setPointerCapture) {
  Object.defineProperty(Element.prototype, 'setPointerCapture', {
    configurable: true,
    value: () => undefined,
  })
}

if (!Element.prototype.releasePointerCapture) {
  Object.defineProperty(Element.prototype, 'releasePointerCapture', {
    configurable: true,
    value: () => undefined,
  })
}

if (!Element.prototype.scrollIntoView) {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: () => undefined,
  })
}

afterEach(() => {
  cleanup()
})
