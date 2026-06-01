import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdvancedAudioRecorder } from './useAdvancedAudioRecorder'

class MockMediaRecorder {
  static isTypeSupported = vi.fn((_type: string) => true)
  static instances: MockMediaRecorder[] = []

  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  start = vi.fn()
  stop = vi.fn(() => {
    this.onstop?.()
  })
  pause = vi.fn()
  resume = vi.fn()

  constructor(public stream: MediaStream, public options?: MediaRecorderOptions) {
    MockMediaRecorder.instances.push(this)
  }
}

describe('useAdvancedAudioRecorder', () => {
  const streams: Array<{ stream: MediaStream; stopTrack: ReturnType<typeof vi.fn> }> = []
  let closeAudioContext: ReturnType<typeof vi.fn>

  beforeEach(() => {
    streams.length = 0
    MockMediaRecorder.instances.length = 0
    closeAudioContext = vi.fn()

    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.stubGlobal('MediaRecorder', MockMediaRecorder)

    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: vi.fn().mockImplementation(function MockAudioContext() {
        return {
          createMediaStreamSource: vi.fn(() => ({ connect: vi.fn() })),
          createAnalyser: vi.fn(() => ({
            fftSize: 0,
            smoothingTimeConstant: 0,
            frequencyBinCount: 4,
            getByteFrequencyData: vi.fn(),
          })),
          close: closeAudioContext,
        }
      }),
    })

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn(async () => {
          const stopTrack = vi.fn()
          const stream = {
            getTracks: () => [{ stop: stopTrack }],
          } as unknown as MediaStream
          streams.push({ stream, stopTrack })
          return stream
        }),
        enumerateDevices: vi.fn(async () => [
          {
            deviceId: 'default',
            label: 'Default microphone',
            kind: 'audioinput',
          },
        ]),
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('stops an active recorder, stream and timers when unmounted mid-recording', async () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
    const { result, unmount } = renderHook(() => useAdvancedAudioRecorder())

    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      await result.current.startRecording()
    })

    const recordingStream = streams.at(-1)
    const recorder = MockMediaRecorder.instances.at(-1)

    expect(recordingStream?.stopTrack).not.toHaveBeenCalled()

    unmount()

    expect(recordingStream?.stopTrack).toHaveBeenCalled()
    expect(recorder?.stop).toHaveBeenCalled()
    expect(clearIntervalSpy).toHaveBeenCalled()
    expect(closeAudioContext).toHaveBeenCalled()
  })

  it('preserves the selected recording container in the generated filename', async () => {
    MockMediaRecorder.isTypeSupported.mockImplementation((type) => type === 'audio/mp4')
    const { result } = renderHook(() => useAdvancedAudioRecorder())

    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      await result.current.startRecording()
    })

    const recorder = MockMediaRecorder.instances.at(-1)
    await act(async () => {
      recorder?.ondataavailable?.({ data: new Blob(['audio'], { type: 'audio/mp4' }) })
      result.current.stopRecording()
    })

    await waitFor(() => {
      expect(result.current.recordingData?.filename).toBe('recording.mp4')
    })
  })
})
