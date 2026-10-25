
import type { AlbumService } from '../../../../core/service/AlbumService'
import type { ImgPageInfo, ThumbInfo, PreviewThumbnailStyle } from '../../../../core/model/model'
import { ThumbMode, ImgSrcMode } from '../../../../core/model/model'
import { ImgHtmlParser } from '../parser/ImgHtmlParser'
import { ImgUrlListParser } from '../parser/ImgUrlListParser'
import { TextReq } from '../../base/request/TextReq'
import type { InitializationStepUpdate } from '../../types'
import {
  EH_INITIALIZATION_STEPS,
  createStepMap,
  createStepUpdate,
  markCurrentPendingStepFailed
} from '../../init-steps'

const MOCK_THUMB_PARSE_ERROR_QUERY_KEY = 'ehunterMockThumbParseError'

function shouldMockThumbParseError(): boolean {
  try {
    const params = new URLSearchParams(window.location.search)
    return params.get(MOCK_THUMB_PARSE_ERROR_QUERY_KEY) === '1'
  } catch {
    return false
  }
}

export class EHAlbumServiceImpl implements AlbumService {
  private imgHtmlParser: ImgHtmlParser
  private thumbInfos: Array<ThumbInfo> = []
  private imgPageInfos: Array<ImgPageInfo> = []
  private pageCount: number = 0
  private introUrl: string = ''
  private albumId: string = ''
  private curPageIndex: number = 0
  private title: string = ''
  private reportInitializationStep: (step: InitializationStepUpdate) => void = () => {}
  private initializationStepStatus: Record<string, InitializationStepUpdate['status']> = {}
  private readonly initializationStepOrder = EH_INITIALIZATION_STEPS.map(step => step.id)
  private readonly initializationStepMap = createStepMap(EH_INITIALIZATION_STEPS)

  constructor() {
    const htmlText = document.documentElement.outerHTML
    this.imgHtmlParser = new ImgHtmlParser(htmlText)
  }

  isSupportOriginImg(): boolean {
    return true
  }

  isSupportImgChangeSource(): boolean {
    return true
  }

  isSupportThumbView(): boolean {
    return true
  }

  getTitle(): string {
    return this.title
  }

  getAlbumId(): string {
    return this.albumId
  }

  getPageCount(): number {
    return this.pageCount
  }

  getCurPageIndex(): number {
    return this.curPageIndex
  }

  setInitializationStepReporter(reporter: (step: InitializationStepUpdate) => void): void {
    this.reportInitializationStep = reporter
  }

  private updateInitializationStep(step: InitializationStepUpdate): void {
    this.initializationStepStatus[step.id] = step.status
    this.reportInitializationStep(step)
  }

  private failCurrentInitializationStep(reason: string): void {
    markCurrentPendingStepFailed(
      this.initializationStepOrder,
      this.initializationStepStatus,
      this.initializationStepMap,
      reason,
      step => this.updateInitializationStep(step)
    )
  }

  async init(): Promise<Error | void> {
    this.initializationStepStatus = {}
    EH_INITIALIZATION_STEPS.forEach(step => {
      this.updateInitializationStep(createStepUpdate(step, 'pending'))
    })

    try {
      this.title = this.imgHtmlParser.getTitle()
      this.pageCount = this.imgHtmlParser.getPageCount()
      this.albumId = this.imgHtmlParser.getAlbumId()
      this.introUrl = this.imgHtmlParser.getIntroUrl()
      this.curPageIndex = this.imgHtmlParser.getCurPageNum() - 1 // Convert to 0-based index
      this.updateInitializationStep(
        createStepUpdate(
          this.initializationStepMap.parseImagePageMetadata,
          'success',
          `Parsed title and ${this.pageCount} pages`
        )
      )

      const imgUrlListParser = new ImgUrlListParser(this.introUrl, this.pageCount)

      if (shouldMockThumbParseError()) {
        return new Error('MOCK_THUMB_PARSE_ERROR: failed to parse thumbnail list')
      }

      this.imgPageInfos = await imgUrlListParser.request()
      this.updateInitializationStep(
        createStepUpdate(
          this.initializationStepMap.fetchIntroPages,
          'success',
          'Intro pages fetched successfully'
        )
      )

      this.thumbInfos = this.imgPageInfos.map((imgPageInfo, index) => {
        if (imgPageInfo.thumbStyle) {
          const urlMatch = imgPageInfo.thumbStyle.match(/url\(([^)]+)\)/)
          const offsetMatch = imgPageInfo.thumbStyle.match(/-(\d+)px/)
          
          const src = urlMatch ? urlMatch[1] : ''
          const offset = offsetMatch ? parseInt(offsetMatch[1], 10) : 0
          
          return {
            id: imgPageInfo.id,
            src: src,
            mode: ThumbMode.SPIRIT,
            style: imgPageInfo.thumbStyle,
            height: imgPageInfo.thumbHeight || 0,
            width: imgPageInfo.thumbWidth || 0,
            offset: offset
          }
        } else {
          return {
            id: imgPageInfo.id,
            src: '',
            mode: ThumbMode.IMG,
            height: imgPageInfo.thumbHeight || 0,
            width: imgPageInfo.thumbWidth || 0
          }
        }
      })
      this.updateInitializationStep(
        createStepUpdate(
          this.initializationStepMap.extractImagePagesAndThumbnails,
          'success',
          `${this.imgPageInfos.length} image pages and ${this.thumbInfos.length} thumbnails extracted`
        )
      )

      console.log('EH Platform initialized successfully', {
        title: this.title,
        pageCount: this.pageCount,
        albumId: this.albumId,
        curPageIndex: this.curPageIndex,
        thumbCount: this.thumbInfos.length,
        imgPageCount: this.imgPageInfos.length
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      this.failCurrentInitializationStep(reason)
      console.error('EH Platform initialization failed:', error)
      return error instanceof Error ? error : new Error(String(error))
    }
  }

  getThumbInfos(isDisableCache: boolean): Array<ThumbInfo> {
    return this.thumbInfos
  }

  getImgPageInfos(): Array<ImgPageInfo> {
    return this.imgPageInfos
  }

  async getImgSrc(index: number, mode: ImgSrcMode): Promise<ImgPageInfo | Error> {
    try {
      const imgPageInfo = this.imgPageInfos[index]
      if (!imgPageInfo) {
        return new Error(`Image page info not found for index ${index}`)
      }

      if (imgPageInfo.src && mode !== ImgSrcMode.ChangeSource && mode !== ImgSrcMode.Origin) {
        return imgPageInfo
      }

      const req = new TextReq(imgPageInfo.pageUrl)
      const htmlText = await req.request()
      const parser = new ImgHtmlParser(htmlText)

      switch (mode) {
        case ImgSrcMode.Origin:
          try {
            imgPageInfo.src = parser.getOriginalImgUrl()
          } catch (e) {
            return new Error('ERROR_NO_ORIGIN')
          }
          break
        
        case ImgSrcMode.ChangeSource:
          try {
            const sourceId = parser.getSourceId()
            if (!sourceId) {
              return new Error('ERROR_CHANGE_SOURCE')
            }
            const sourceReq = new TextReq(`${imgPageInfo.pageUrl}?nl=${sourceId}`)
            const sourceHtml = await sourceReq.request()
            const sourceParser = new ImgHtmlParser(sourceHtml)
            imgPageInfo.src = sourceParser.getImgUrl()
            imgPageInfo.preciseHeightOfWidth = sourceParser.getPreciseHeightOfWidth()
            return imgPageInfo
          } catch (e) {
            return new Error('ERROR_CHANGE_SOURCE')
          }
        
        default:
          imgPageInfo.src = parser.getImgUrl()
      }

      imgPageInfo.preciseHeightOfWidth = parser.getPreciseHeightOfWidth()

      return imgPageInfo
    } catch (error) {
      return error instanceof Error ? error : new Error(String(error))
    }
  }

  getPreviewThumbnailStyle(index: number): PreviewThumbnailStyle {
    const thumbInfo = this.thumbInfos[index]
    if (!thumbInfo || !thumbInfo.style) {
      return {
        'background-image': '',
        'background-position': '',
        'background-size': ''
      }
    }

    const styleObj: PreviewThumbnailStyle = {
      'background-image': '',
      'background-position': '',
      'background-size': ''
    }

    const bgMatch = thumbInfo.style.match(/url\(([^)]+)\)\s*([-0-9px\s]+)/)
    if (bgMatch) {
      styleObj['background-image'] = `url(${bgMatch[1]})`
      styleObj['background-position'] = bgMatch[2].trim()
    }

    return styleObj
  }

  getIntroUrl(): string {
    return this.introUrl
  }

  setIntroUrl(url: string): void {
    this.introUrl = url
  }
}
