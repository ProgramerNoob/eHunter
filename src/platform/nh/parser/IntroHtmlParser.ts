import type { ImgPageInfo, ThumbInfo } from '../../../../core/model/model'
import { ThumbMode } from '../../../../core/model/model'

// a parser for album's intro page
export class IntroHtmlParser {
    private html: HTMLElement;
    private imgPageInfos: Array<ImgPageInfo> = [];
    private thumbInfos: Array<ThumbInfo> = [];


    constructor(html) {
        this.html = document.createElement('html');
        this.html.innerHTML = html.replace(/src=/g, 'x-src='); // avoid load assets
        this.parseData();
    }

    getTitle(): string {
        return this.html.querySelector('h1')!.textContent!;
    }

    private parseData() {
        Array.prototype.slice.call(this.html.querySelectorAll('.gallerythumb'), 0).forEach(i => {
            // 旧格式页面：src= 被改写成 x-src=，data-src= 被改写成 data-x-src=
            // 当前页面：仅原生 src，改写后由 x-src 兜底
            const img = i.children[0]
            const thumbSrc = img.getAttribute('data-x-src') || img.getAttribute('x-src')
            const thumbHeight = img.getAttribute('height') * 1;
            const thumbWidth = img.getAttribute('width') * 1;
            const pageUrl = i.getAttribute('href');
            this.imgPageInfos.push({
                id: pageUrl,
                index: this.imgPageInfos.length, // set id to index
                pageUrl,
                thumbHeight,
                thumbWidth,
                thumbStyle: '',
                src: '',
                heightOfWidth: thumbHeight / thumbWidth
            });
            this.thumbInfos.push({
                id: pageUrl,
                mode: ThumbMode.IMG,
                src: thumbSrc,
                style: '',
                height: 0,
                width: 0,
            })
        });
    }

    getImgPageInfos(): Array<ImgPageInfo> {
        return this.imgPageInfos;
    }

    getThumbInfos(): Array<ThumbInfo> {
        return this.thumbInfos;
    }
}
