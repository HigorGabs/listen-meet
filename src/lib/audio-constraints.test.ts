import { describe, expect, it } from 'vitest'
import {
  MAX_AUDIO_UPLOAD_BYTES,
  MIN_RECORDING_DURATION_SECONDS,
  getAudioFilenameForBlob,
  getBaseMimeType,
  getAudioMimeType,
  isAllowedAudioType,
  shouldProcessRecording,
  validateAudioSignature,
  validateAudioFile,
} from './audio-constraints'

describe('audio constraints', () => {
  it('accepts supported audio files by MIME type and extension', () => {
    expect(validateAudioFile({
      name: 'meeting.webm',
      type: 'audio/webm',
      size: 1024,
    }).valid).toBe(true)
  })

  it('accepts MediaRecorder MIME types with codec parameters', () => {
    expect(validateAudioFile({
      name: 'recording.webm',
      type: 'audio/webm;codecs=opus',
      size: 1024,
    }).valid).toBe(true)
  })

  it('normalizes MIME types with parameters', () => {
    expect(getBaseMimeType('audio/webm;codecs=opus')).toBe('audio/webm')
  })

  it('maps generic MIME types to Gemini-compatible audio MIME types from extensions', () => {
    expect(getAudioMimeType('meeting.mp3', 'application/octet-stream')).toBe('audio/mp3')
    expect(getAudioMimeType('meeting.3gp', '')).toBe('audio/3gpp')
    expect(getAudioMimeType('meeting.webm', 'audio/webm;codecs=opus')).toBe('audio/webm')
  })

  it('creates recording filenames that match the recorded container MIME type', () => {
    expect(getAudioFilenameForBlob(new Blob(['audio'], { type: 'audio/mp4' }))).toBe('recording.mp4')
    expect(getAudioFilenameForBlob(new Blob(['audio'], { type: 'audio/webm;codecs=opus' }))).toBe('recording.webm')
  })

  it('accepts files with empty MIME type when the extension is supported', () => {
    expect(isAllowedAudioType({
      name: 'meeting.mp3',
      type: '',
    })).toBe(true)
  })

  it('accepts 3GPP MIME types advertised by the upload allowlist', () => {
    expect(isAllowedAudioType({
      name: 'meeting.3gp',
      type: 'audio/3gpp',
    })).toBe(true)
    expect(isAllowedAudioType({
      name: 'meeting.3gp',
      type: 'video/3gpp',
    })).toBe(true)
  })

  it('rejects unsupported extensions', () => {
    const result = validateAudioFile({
      name: 'payload.exe',
      type: 'application/octet-stream',
      size: 1024,
    })

    expect(result.valid).toBe(false)
    expect(result.status).toBe(400)
  })

  it('rejects files whose bytes do not match the declared audio container', () => {
    const result = validateAudioSignature({
      name: 'meeting.mp3',
      type: 'audio/mpeg',
      bytes: new Uint8Array([0x4e, 0x4f, 0x54, 0x20, 0x41, 0x55, 0x44, 0x49, 0x4f]),
    })

    expect(result.valid).toBe(false)
    expect(result.status).toBe(400)
  })

  it('accepts valid webm/ebml signatures produced by browser recording', () => {
    const result = validateAudioSignature({
      name: 'recording.webm',
      type: 'audio/webm',
      bytes: new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81]),
    })

    expect(result.valid).toBe(true)
  })

  it('accepts AAC ADTS frames with and without CRC protection', () => {
    expect(validateAudioSignature({
      name: 'meeting.aac',
      type: 'audio/aac',
      bytes: new Uint8Array([0xff, 0xf0, 0x50, 0x80]),
    }).valid).toBe(true)
    expect(validateAudioSignature({
      name: 'meeting.aac',
      type: 'audio/aac',
      bytes: new Uint8Array([0xff, 0xf9, 0x50, 0x80]),
    }).valid).toBe(true)
  })

  it('rejects empty files', () => {
    const result = validateAudioFile({
      name: 'empty.wav',
      type: 'audio/wav',
      size: 0,
    })

    expect(result.valid).toBe(false)
    expect(result.status).toBe(400)
  })

  it('rejects files above the direct processing limit', () => {
    const result = validateAudioFile({
      name: 'large.wav',
      type: 'audio/wav',
      size: MAX_AUDIO_UPLOAD_BYTES + 1,
    })

    expect(result.valid).toBe(false)
    expect(result.status).toBe(413)
  })

  it('requires at least five seconds for direct recordings', () => {
    expect(MIN_RECORDING_DURATION_SECONDS).toBe(5)
    expect(shouldProcessRecording({ duration: 4, source: 'recording' })).toBe(false)
    expect(shouldProcessRecording({ duration: 5, source: 'recording' })).toBe(true)
  })

  it('does not apply the recording minimum to uploaded files', () => {
    expect(shouldProcessRecording({ duration: 1, source: 'upload' })).toBe(true)
  })
})
