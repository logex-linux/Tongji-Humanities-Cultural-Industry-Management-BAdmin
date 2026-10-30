"""crawl4ai 抓取脚本（沙箱安全版）
- 将所有缓存/日志重定向到项目内可见目录 tools/crawl4ai-cache（不使用点开头目录）
- 从 zh.wikipedia.org 等来源抓取珠宝玉石资料，保存为 markdown
"""
import asyncio
import os
import sys
import json

BASE = "/Users/linnx/Documents/学习/珠宝玉石教学大全"
CACHE_BASE = os.path.join(BASE, "tools", "crawl4ai-cache")
os.makedirs(CACHE_BASE, exist_ok=True)

# ---- monkeypatch: 重定向 .crawl4ai 缓存目录到可见目录 ----
import crawl4ai.async_webcrawler as awc
from crawl4ai.utils import RobotsParser
from crawl4ai.async_logger import AsyncLogger
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, CacheMode

_orig_makedirs = os.makedirs


def _makedirs(name, mode=0o777, exist_ok=False):
    s = os.fspath(name)
    parts = s.split("/")
    if ".crawl4ai" in parts:
        parts = ["app" if p == ".crawl4ai" else p for p in parts]
        s = "/".join(parts)
    return _orig_makedirs(s, mode, exist_ok=exist_ok)


os.makedirs = _makedirs


class VisibleRobotsParser(RobotsParser):
    def __init__(self, cache_dir=None, cache_ttl=None):
        self.cache_dir = os.path.join(CACHE_BASE, "robots")
        self.cache_ttl = cache_ttl or 7 * 24 * 60 * 60
        os.makedirs(self.cache_dir, exist_ok=True)
        self.db_path = os.path.join(self.cache_dir, "robots_cache.db")
        self._init_db()


awc.RobotsParser = VisibleRobotsParser

logger = AsyncLogger(log_file=os.path.join(CACHE_BASE, "crawler.log"), verbose=False, tag_width=10)

WIKI = "https://zh.wikipedia.org/wiki/"

URLS = [
    # 总论与基础
    ("宝石", WIKI + "宝石"),
    ("宝石学", WIKI + "宝石学"),
    ("玉石", WIKI + "玉石"),
    ("矿物", WIKI + "矿物"),
    ("莫氏硬度", WIKI + "莫氏硬度"),
    ("晶体", WIX := WIKI + "晶体"),
    ("折射", WIKI + "折射"),
    ("双折射", WIKI + "双折射"),
    # 贵重宝石
    ("钻石", WIKI + "钻石"),
    ("刚玉", WIKI + "刚玉"),
    ("红宝石", WIKI + "红宝石"),
    ("蓝宝石", WIKI + "蓝宝石"),
    ("祖母绿", WIKI + "祖母绿"),
    ("金绿宝石", WIKI + "金绿宝石"),
    ("尖晶石", WIKI + "尖晶石"),
    ("碧玺", WIKI + "碧玺"),
    ("石榴石", WIKI + "石榴石"),
    ("坦桑石", WIKI + "坦桑石"),
    ("欧泊", WIKI + "蛋白石"),
    ("锆石", WIKI + "锆石"),
    ("橄榄石", WIKI + "橄榄石"),
    ("托帕石", WIKI + "黄玉"),
    ("水晶", WIKI + "水晶"),
    ("月光石", WIKI + "月光石"),
    # 有机宝石
    ("珍珠", WIKI + "珍珠"),
    ("珊瑚", WIKI + "珊瑚"),
    ("琥珀", WIKI + "琥珀"),
    ("象牙", WIKI + "象牙"),
    ("砗磲", WIKI + "砗磲"),
    # 玉石
    ("翡翠", WIKI + "翡翠"),
    ("和田玉", WIKI + "和田玉"),
    ("岫岩玉", WIKI + "岫岩玉"),
    ("独山玉", WIKI + "独山玉"),
    ("绿松石", WIKI + "绿松石"),
    ("青金石", WIKI + "青金石"),
    ("玛瑙", WIKI + "玛瑙"),
    ("孔雀石", WIKI + "孔雀石"),
    ("寿山石", WIKI + "寿山石"),
    ("田黄", WIKI + "田黄"),
    ("玉", WIKI + "玉"),
]


async def main():
    out_dir = os.path.join(BASE, "资料")
    os.makedirs(out_dir, exist_ok=True)
    cfg = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        excluded_tags=["nav", "footer", "script", "style"],
        exclude_external_links=True,
        page_timeout=45000,
    )
    async with AsyncWebCrawler(config=None, logger=logger, base_directory=CACHE_BASE) as crawler:
        results = await crawler.arun_many(
            urls=[u for _, u in URLS],
            config=cfg,
            max_concurrent=4,
        )
        # 以 result.url 为准命名，避免并发返回顺序错位
        name_by_url = {}
        for name, url in URLS:
            name_by_url[url] = name
            name_by_url[url.replace("https://zh.wikipedia.org/wiki/", "https://zh.wikipedia.org/zh-cn/")] = name
        summary = []
        for r in results:
            md = r.markdown or ""
            name = name_by_url.get(r.url)
            if name is None:
                from urllib.parse import unquote
                slug = r.url.rstrip("/").split("/")[-1]
                name = unquote(slug)
            path = os.path.join(out_dir, f"{name}.md")
            with open(path, "w", encoding="utf-8") as f:
                f.write(f"# 来源: {r.url}\n\n")
                f.write(md)
            summary.append({"name": name, "url": r.url, "ok": bool(r.success), "chars": len(md)})
            print(f"{'OK ' if r.success else 'FAIL'} {name}: {len(md)} chars")
        with open(os.path.join(out_dir, "crawl_summary.json"), "w", encoding="utf-8") as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)
    print("DONE", sum(1 for s in summary if s["ok"]), "/", len(summary))


if __name__ == "__main__":
    asyncio.run(main())
