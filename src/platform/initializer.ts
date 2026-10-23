
import type { AlbumService } from '../../core/service/AlbumService'
import { InitializationError, Platform, type InitializationStepUpdate } from './types'
import { markCurrentPendingStepFailed } from './init-steps'

type AlbumServiceWithStepReporter = AlbumService & {
  setInitializationStepReporter?: (reporter: (step: InitializationStepUpdate) => void) => void
}

export async function initializeWithTimeout(
  albumService: AlbumService,
  platform: Platform
): Promise<void> {
  const TIMEOUT_MS = 60000
  const steps: InitializationStepUpdate[] = []

  const upsertStep = (update: InitializationStepUpdate): void => {
    const index = steps.findIndex(step => step.id === update.id)
    if (index >= 0) {
      steps[index] = { ...steps[index], ...update }
      return
    }
    steps.push({ ...update })
  }

  const getStepOrder = (): string[] => {
    return steps
      .slice()
      .sort((a, b) => {
        const orderA = a.order ?? Number.MAX_SAFE_INTEGER
        const orderB = b.order ?? Number.MAX_SAFE_INTEGER
        return orderA - orderB
      })
      .map(step => step.id)
  }

  const getStepStatusMap = (): Record<string, InitializationStepUpdate['status']> => {
    return steps.reduce<Record<string, InitializationStepUpdate['status']>>((map, step) => {
      map[step.id] = step.status
      return map
    }, {})
  }

  const getStepMap = () => {
    return steps.reduce<Record<string, { id: string; label: string; order?: number }>>((map, step) => {
      map[step.id] = { id: step.id, label: step.label, order: step.order }
      return map
    }, {})
  }

  const failCurrentStep = (reason: string): void => {
    markCurrentPendingStepFailed(
      getStepOrder(),
      getStepStatusMap(),
      getStepMap(),
      reason,
      upsertStep
    )
  }

  const albumServiceWithStepReporter = albumService as AlbumServiceWithStepReporter
  albumServiceWithStepReporter.setInitializationStepReporter?.(upsertStep)

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      if (!steps.some(step => step.status === 'failed')) {
        failCurrentStep(`Timed out after ${TIMEOUT_MS / 1000} seconds`)
      }
      reject(new InitializationError(
        `Platform initialization timed out after ${TIMEOUT_MS / 1000} seconds`,
        platform,
        window.location.href,
        steps
      ))
    }, TIMEOUT_MS)
  })

  try {
    const result = await Promise.race([
      albumService.init(),
      timeoutPromise
    ])

    if (result instanceof Error) {
      if (!steps.some(step => step.status === 'failed')) {
        failCurrentStep(result.message)
      }
      throw new InitializationError(
        `Platform initialization failed: ${result.message}`,
        platform,
        window.location.href,
        steps
      )
    }
  } catch (error) {
    if (error instanceof InitializationError) {
      throw error
    }

    throw new InitializationError(
      error instanceof Error ? error.message : 'Unknown initialization error',
      platform,
      window.location.href,
      steps
    )
  }
}
