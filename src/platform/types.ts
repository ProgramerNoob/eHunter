
export enum Platform {
  EH = 'EH',
  NH = 'NH',
  TEST = 'TEST'
}

export interface PlatformDetectionResult {
  platform: Platform | null
  host: string
  pathname: string
  isAlbumPage: boolean
}

export type InitializationStepStatus = 'pending' | 'success' | 'failed'

export interface InitializationStepUpdate {
  id: string
  label: string
  order?: number
  status: InitializationStepStatus
  detail?: string
}

export class InitializationError extends Error {
  platform: Platform
  url: string
  timestamp: Date
  steps: InitializationStepUpdate[]

  constructor(message: string, platform: Platform, url: string, steps: InitializationStepUpdate[] = []) {
    super(message)
    this.name = 'InitializationError'
    this.platform = platform
    this.url = url
    this.timestamp = new Date()
    this.steps = steps
  }
}

export enum InitializationState {
  UNINITIALIZED = 'UNINITIALIZED',
  INITIALIZING = 'INITIALIZING',
  READY = 'READY',
  ERROR = 'ERROR'
}
