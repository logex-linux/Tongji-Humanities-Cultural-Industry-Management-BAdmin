"""第三批抓取：专题词条补充（变石、猫眼、海蓝宝石、珠宝、诞生石、玉髓、蓝田玉、合成宝石、日光石、拉长石）"""
import asyncio
import os
import sys

BASE = "/Users/linnx/Documents/学习/珠宝玉石教学大全"
CACHE_BASE = os.path.join(BASE, "tools", "crawl4ai-cache")
os.makedirs(CACHE_BASE, exist_ok=True)

import crawl4ai.async_webcrawler as awc
from crawl4ai.utils import RobotsParser
from crawl4ai.async_logger import AsyncLogger
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, CacheMode

_orig_makedirs = os.makedirs


def _makedirs(name, mode=0o777, exist_ok=False):
    s = os.fspath(name)
    parts = s.split("/")
    if ".crawl4ai" in parts:
        s = "/".join("app" if p == ".crawl4ai" else p for p in parts)
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
    WIKI + "变石",
    WIKI + "猫眼",
    WIKI + "海蓝宝石",
    WIKI + "珠宝",
    WIKI + "诞生石",
    WIKI + "玉髓",
    WIKI + "蓝田玉",
    WIKI + "合成宝石",
    WIKI + "日光石",
    WIKI + "拉长石",
    WIKI + "星光红宝石",
    WIKI + "沙弗莱石",
]


async def main():
    out_dir = os.path.join(BASE, "资料")
    cfg = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        excluded_tags=["nav", "footer", "script", "style"],
        exclude_external_links=True,
        page_timeout=60000,
    )
    async with AsyncWebCrawler(config=None, logger=logger, base_directory=CACHE_BASE) as crawler:
        results = await crawler.arun_many(urls=URLS, config=cfg, max_concurrent=4)
        from urllib.parse import unquote
        for r in results:
            md = r.markdown or ""
            slug = r.url.rstrip("/").split("/")[-1]
            name = unquote(slug) or "unknown"
            with open(os.path.join(out_dir, f"{name}.md"), "w", encoding="utf-8") as f:
                f.write(f"# 来源: {r.url}\n\n{md}")
            print(f"{'OK ' if r.success else 'FAIL'} {name}: {len(md)} chars")
    print("BATCH3 DONE")


if __name__ == "__main__":
    asyncio.run(main())
