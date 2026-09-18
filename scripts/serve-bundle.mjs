// 仅供本地开发/验收使用：把构建产物 dist/ehunter.iife.js 通过 HTTP 暴露给 Tampermonkey 的
// 动态加载脚本（.pi/skills/eh-test/ehunter-dev-loader.user.js）。
//
// 用法：npm run serve:bundle        # 默认 http://127.0.0.1:8787/ehunter.iife.js
//      PORT=8788 npm run serve:bundle
//
// 每次请求都直接读磁盘并禁用缓存，因此 `npm run build-prod` 之后刷新页面即可加载新包。
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 8787);
const bundleUrlPath = "/ehunter.iife.js";
const bundlePath = resolve(import.meta.dirname, "../dist/ehunter.iife.js");

const server = createServer(async (req, res) => {
    const { pathname } = new URL(req.url, `http://${host}:${port}`);

    if (pathname === "/health") {
        res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
        res.end("ok\n");
        return;
    }

    if (pathname !== bundleUrlPath) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("not found\n");
        return;
    }

    try {
        const body = await readFile(bundlePath);
        res.writeHead(200, {
            "content-type": "text/javascript; charset=utf-8",
            "content-length": String(body.byteLength),
            "cache-control": "no-store",
            "access-control-allow-origin": "*",
        });
        res.end(body);
        console.log(`[${new Date().toISOString()}] 下发 ${bundleUrlPath} (${body.byteLength} 字节)`);
    } catch (error) {
        res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        res.end(`读取构建产物失败：${error.message}\n`);
        console.error(`读取 ${bundlePath} 失败：${error.message}（先执行 npm run build-prod）`);
    }
});

server.listen(port, host, () => {
    console.log(`eHunter bundle server 已启动：http://${host}:${port}${bundleUrlPath}`);
    console.log(`源文件：${bundlePath}`);
    console.log("按 Ctrl+C 停止；停止后动态加载脚本会失效（可在 Tampermonkey 中改用静态安装的 eHunter）。");
});
