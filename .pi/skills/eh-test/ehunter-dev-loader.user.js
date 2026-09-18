// ==UserScript==
// @name         eHunter (dev loader)
// @namespace    ehunter-dev-loader
// @version      1.0.2
// @description  从本机 bundle server 动态加载 dist/ehunter.iife.js，构建后刷新页面即可生效
// @match        https://exhentai.org/*
// @match        https://e-hentai.org/*
// @match        https://nhentai.net/*
// @connect      127.0.0.1
// @connect      localhost
// @connect      hath.network
// @connect      nhentai.net
// @connect      githubusercontent.com
// @connect      jp.animesales.xyz
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// ==/UserScript==

// 使用前先在仓库里启动 bundle server：npm run serve:bundle
// 之后每次 `npm run build-prod` 完刷新页面即可加载最新构建产物。
// 注意 1：GM_* 权限与 @connect 由本脚本声明，被 eval 的 bundle 与本脚本同处一个沙箱，
//         因此存储、下载、跨域请求都走这里的声明；bundle 的 @connect 列表变更时需同步这里。
// 注意 2：file:// 直读被浏览器禁止（Access to this local file is forbidden），故走 HTTP。
const EHUNTER_BUNDLE_URL = "http://127.0.0.1:8787/ehunter.iife.js?t=" + Date.now();

GM_xmlhttpRequest({
    method: "GET",
    url: EHUNTER_BUNDLE_URL,
    onload(res) {
        if (res.status !== 0 && (res.status < 200 || res.status >= 300)) {
            console.error("[eHunter loader] 读取失败", res.status, res.statusText, "（先运行 npm run serve:bundle）");
            return;
        }
        if (!res.responseText) {
            console.error("[eHunter loader] 读取内容为空，status =", res.status);
            return;
        }
        console.log("[eHunter loader] 已加载", EHUNTER_BUNDLE_URL, res.responseText.length + " 字符");
        try {
            eval(res.responseText);
        } catch (error) {
            console.error("[eHunter loader] 执行失败", error);
        }
    },
    onerror(error) {
        console.error("[eHunter loader] 请求失败，bundle server 未启动？先运行 npm run serve:bundle", error);
    },
});
