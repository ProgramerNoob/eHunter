
import { Platform, type PlatformDetectionResult } from './types'
import { isTestEnvironmentHost } from '../../core/utils/runtimeEnv'

export function detectPlatform(): PlatformDetectionResult {
  const host = window.location.host
  const hostname = window.location.hostname
  const pathname = window.location.pathname

  const isEhHost = hostname === 'e-hentai.org' || hostname === 'exhentai.org'
  const isEhReaderPage = /^\/s\/[^/]+\/\d+-\d+\/?$/.test(pathname)

  if (isEhHost && isEhReaderPage) {
    return {
      platform: Platform.EH,
      host,
      pathname,
      isAlbumPage: true
    }
  }

  const isNhReaderPage = /^\/g\/\d+\/\d+\/$/.test(pathname)

  if (hostname === 'nhentai.net' && isNhReaderPage) {
    return {
      platform: Platform.NH,
      host,
      pathname,
      isAlbumPage: true
    }
  }

  if (isTestEnvironmentHost(host)) {
    return {
      platform: Platform.TEST,
      host,
      pathname,
      isAlbumPage: true
    }
  }

  return {
    platform: null,
    host,
    pathname,
    isAlbumPage: false
  }
}
