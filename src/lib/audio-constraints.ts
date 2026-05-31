const BYTES_PER_MIB = 1024 * 1024

export const MAX_AUDIO_UPLOAD_BYTES = 4 * BYTES_PER_MIB
export const MAX_AUDIO_UPLOAD_MB = MAX_AUDIO_UPLOAD_BYTES / BYTES_PER_MIB
export const MIN_RECORDING_DURATION_SECONDS = 5

export interface AudioProcessingCandidate {
  duration: number
  source: 'recording' | 'upload'
}

export const ALLOWED_AUDIO_EXTENSIONS = [
  'mp3',
  'wav',
  'webm',
  'ogg',
  'aac',
  'm4a',
  'mp4',
  'flac',
  '3gp',
  'amr',
]

export const ALLOWED_AUDIO_MIME_TYPES = [
  'audio/aac',
  'audio/amr',
  'audio/flac',
  'audio/3gpp',
  'audio/m4a',
  'audio/mp3',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/wave',
  'audio/webm',
  'audio/x-flac',
  'audio/x-m4a',
  'audio/x-wav',
  'video/3gpp',
  'video/mp4',
  'video/webm',
]

const GENERIC_MIME_TYPES = new Set([
  '',
  'application/octet-stream',
  'binary/octet-stream',
])

export interface AudioFileMeta {
  name?: string
  type?: string
  size: number
}

export interface AudioValidationResult {
  valid: boolean
  message?: string
  status?: number
}

export interface AudioSignatureCandidate {
  name?: string
  type?: string
  bytes: Uint8Array
}

export function getAudioExtension(filename?: string): string {
  return filename?.split('.').pop()?.toLowerCase() || ''
}

export function getBaseMimeType(type?: string): string {
  return type?.split(';')[0]?.trim().toLowerCase() || ''
}

export function getAudioMimeType(filename?: string, declaredMimeType?: string): string {
  const mimeType = getBaseMimeType(declaredMimeType)
  if (!GENERIC_MIME_TYPES.has(mimeType)) return mimeType

  switch (getAudioExtension(filename)) {
    case 'aac':
      return 'audio/aac'
    case 'amr':
      return 'audio/amr'
    case 'flac':
      return 'audio/flac'
    case '3gp':
      return 'audio/3gpp'
    case 'm4a':
      return 'audio/m4a'
    case 'mp3':
      return 'audio/mp3'
    case 'mp4':
      return 'audio/mp4'
    case 'ogg':
      return 'audio/ogg'
    case 'wav':
      return 'audio/wav'
    case 'webm':
      return 'audio/webm'
    default:
      return 'audio/webm'
  }
}

export function getAudioFilenameForBlob(blob: Pick<Blob, 'type'>): string {
  switch (getBaseMimeType(blob.type)) {
    case 'audio/aac':
      return 'recording.aac'
    case 'audio/amr':
      return 'recording.amr'
    case 'audio/flac':
    case 'audio/x-flac':
      return 'recording.flac'
    case 'audio/3gpp':
    case 'video/3gpp':
      return 'recording.3gp'
    case 'audio/m4a':
    case 'audio/mp4':
    case 'audio/x-m4a':
    case 'video/mp4':
      return 'recording.mp4'
    case 'audio/mp3':
    case 'audio/mpeg':
      return 'recording.mp3'
    case 'audio/ogg':
      return 'recording.ogg'
    case 'audio/wav':
    case 'audio/wave':
    case 'audio/x-wav':
      return 'recording.wav'
    case 'audio/webm':
    case 'video/webm':
    default:
      return 'recording.webm'
  }
}

export function isAllowedAudioType(file: Pick<AudioFileMeta, 'name' | 'type'>): boolean {
  const mimeType = getBaseMimeType(file.type)
  const extension = getAudioExtension(file.name)

  const hasAllowedMime =
    mimeType === '' ||
    mimeType === 'application/octet-stream' ||
    ALLOWED_AUDIO_MIME_TYPES.includes(mimeType)

  const hasAllowedExtension = ALLOWED_AUDIO_EXTENSIONS.includes(extension)

  return hasAllowedMime && (hasAllowedExtension || mimeType.startsWith('audio/'))
}

export function validateAudioFile(file: AudioFileMeta): AudioValidationResult {
  if (file.size <= 0) {
    return {
      valid: false,
      status: 400,
      message: 'Arquivo de áudio vazio ou inválido.',
    }
  }

  if (file.size > MAX_AUDIO_UPLOAD_BYTES) {
    return {
      valid: false,
      status: 413,
      message: `Arquivo muito grande. O limite atual é ${MAX_AUDIO_UPLOAD_MB}MB.`,
    }
  }

  if (!isAllowedAudioType(file)) {
    return {
      valid: false,
      status: 400,
      message: 'Formato de áudio não suportado.',
    }
  }

  return { valid: true }
}

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false
  return signature.every((value, index) => bytes[offset + index] === value)
}

function isMp3Frame(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0
}

function isAacFrame(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xf6) === 0xf0
}

function hasMp4FamilySignature(bytes: Uint8Array): boolean {
  return startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4)
}

export function validateAudioSignature(file: AudioSignatureCandidate): AudioValidationResult {
  const bytes = file.bytes
  const mimeType = getBaseMimeType(file.type)
  const extension = getAudioExtension(file.name)
  const format = extension || mimeType.replace(/^(audio|video)\//, '')

  const valid =
    (['webm'].includes(format) || mimeType === 'audio/webm' || mimeType === 'video/webm')
      ? startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])
      : (['ogg'].includes(format) || mimeType === 'audio/ogg')
        ? startsWith(bytes, [0x4f, 0x67, 0x67, 0x53])
        : (['wav', 'wave'].includes(format) || mimeType === 'audio/wav' || mimeType === 'audio/x-wav')
          ? startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x41, 0x56, 0x45], 8)
          : (['flac'].includes(format) || mimeType === 'audio/flac' || mimeType === 'audio/x-flac')
            ? startsWith(bytes, [0x66, 0x4c, 0x61, 0x43])
            : (['mp3'].includes(format) || mimeType === 'audio/mpeg' || mimeType === 'audio/mp3')
              ? startsWith(bytes, [0x49, 0x44, 0x33]) || isMp3Frame(bytes)
              : (['aac'].includes(format) || mimeType === 'audio/aac')
                ? isAacFrame(bytes)
                : (['m4a', 'mp4', '3gp'].includes(format) || mimeType === 'audio/mp4' || mimeType === 'audio/m4a' || mimeType === 'audio/x-m4a' || mimeType === 'audio/3gpp' || mimeType === 'video/mp4' || mimeType === 'video/3gpp')
                  ? hasMp4FamilySignature(bytes)
                  : (['amr'].includes(format) || mimeType === 'audio/amr')
                    ? startsWith(bytes, [0x23, 0x21, 0x41, 0x4d, 0x52])
                    : false

  if (valid) return { valid: true }

  return {
    valid: false,
    status: 400,
    message: 'O conteúdo do arquivo não corresponde a uma assinatura de áudio suportada.',
  }
}

export function shouldProcessRecording(candidate: AudioProcessingCandidate): boolean {
  return candidate.source !== 'recording' || candidate.duration >= MIN_RECORDING_DURATION_SECONDS
}
