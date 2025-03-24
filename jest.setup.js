// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock the fetch API
global.fetch = jest.fn()

// Reset all mocks between tests
beforeEach(() => {
  jest.clearAllMocks()
})

// Mock environment variables
process.env = {
  ...process.env,
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  USE_AZURE_SERVICES: 'true',
}

// Mock Audio API (not available in jsdom)
window.HTMLMediaElement.prototype.play = jest.fn()
window.HTMLMediaElement.prototype.pause = jest.fn()
window.HTMLMediaElement.prototype.load = jest.fn()

// Mock Web Speech API
const mockSpeechRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}

window.SpeechRecognition = jest.fn(() => mockSpeechRecognition)
window.webkitSpeechRecognition = window.SpeechRecognition

// Suppress console errors during tests
console.error = jest.fn()

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback) {
    this.callback = callback
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}