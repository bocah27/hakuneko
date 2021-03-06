import SinMH from './templates/SinMH.mjs';

export default class ManHuaGui extends SinMH {

    constructor() {
        super();
        super.id = 'manhuagui';
        super.label = '看漫画 (ManHuaGui)';
        this.tags = [ 'webtoon', 'chinese' ];
        this.url = 'https://www.manhuagui.com';
        this.requestOptions.headers.set('x-referer', this.url);

        this.api = 'SMH';
        this.pathMatch = '/list/index_p(\\d+).html';
        this.queryMangasPageCount = 'div.pager-cont div.pager a:last-of-type';
        this.queryChapters = 'div.chapter-list ul li a';
        this.config = {
            throttle: {
                label: 'Page Throttle Requests [ms]',
                description: 'Enter the timespan in [ms] to delay consecuitive HTTP requests while downloading Pages.\nThe website may ban your IP for to many consecuitive requests.',
                input: 'numeric',
                min: 500,
                max: 10000,
                value: 2500
            },
            delaylist: {
                label: 'Delay Manga List Requsts[ms]',
                description: 'Enter the timespan in [ms] to delay consecuitive HTTP requests while loading MangaList.\nThe website may ban your IP for to many consecuitive requests.',
                input: 'numeric',
                min: 500,
                max: 10000,
                value: 4500
            }
        };
    }

    async _getMangas() {
        let mangaList = [];
        let request = new Request(new URL(this.path, this.url), this.requestOptions);
        let data = await this.fetchDOM(request, this.queryMangasPageCount);
        let pageCount = parseInt(new RegExp(this.pathMatch).exec(data[0].href)[1]);
        for(let page = 1; page <= pageCount; page++) {
            await this.wait(this.config.delaylist.value);
            let mangas = await this._getMangasFromPage(page);
            mangaList.push(...mangas);
        }
        return mangaList;
    }

    async _getChapters(manga) {
        let chapterList = await super._getChapters(manga);
        return chapterList.map(chapter => {
            chapter.title = chapter.title.replace(/\d+p$/, '');
            return chapter;
        });
    }

    async _getPages(chapter) {
        let script = `
            new Promise((resolve, reject) => {
                setTimeout(() => reject(new Error('Failed to get page links!')), 5000);
                SMH.imgData = function(data) {
                    let origin = 'https://' + servs[pVars.curServ].hosts[pVars.curHost].h + '.hamreus.com';
                    let pageLinks = data.files.map(file => origin + data.path + file + '?cid=' + data.cid + '&md5=' + data.sl.md5);
                    return {
                        preInit: () => resolve(pageLinks)
                    };
                };
                let script = [...document.querySelectorAll('script:not([src])')].find(script => script.text.trim().startsWith('window[')).text;
                eval(script);
            } );
        `;
        let request = new Request(this.url + chapter.id, this.requestOptions);
        let data = await Engine.Request.fetchUI(request, script);
        return data.map(page => this.createConnectorURI(page));
    }
}