
import { Platform } from './types'
import type { AlbumService } from '../../core/service/AlbumService'
import { EHAlbumServiceImpl } from './eh/service/AlbumServiceImpl'
import { NHAlbumServiceImpl } from './nh/service/AlbumServiceImpl'
import { TestAlbumService } from './test/AlbumService'

export function createPlatformService(platform: Platform): AlbumService {
  switch (platform) {
    case Platform.EH:
      return new EHAlbumServiceImpl()
    
    case Platform.NH:
      return new NHAlbumServiceImpl()
    
    case Platform.TEST:
      return new TestAlbumService('')
    
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}
