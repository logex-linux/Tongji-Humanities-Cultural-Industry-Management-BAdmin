"""第二批抓取：鉴定、优化处理、国际权威来源"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
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
    ("宝石优化处理", WIKI + "宝石优化处理"),
    ("合成钻石", WIKI + "合成钻石"),
    ("莫桑石", WIKI + "碳化硅"),
    ("火彩", WIKI + "色散"),
    ("解理", WIKI + "解理"),
    ("断口", WIKI + "断口"),
    ("硬度", WIKI + "硬度"),
    ("比重", WIKI + "比重"),
    ("荧光", WIKI + "荧光"),
    ("光谱学", WIKI + "光谱学"),
    ("GIA宝石百科", "https://www.gia.edu/gem-encyclopedia"),
    ("Britannica宝石", "https://www.britannica.com/topic/gemstone"),
    ("IGS宝石鉴定", "https://www.gemsociety.org/article/gemstone-identification/"),
    ("IGS玉石", "https://www.gemsociety.org/article/jade/"),
    ("IGS红宝石", "https://www.gemsociety.org/article/ruby/"),
]


async def main():
    out_dir = os.path.join(BASE, "资料")
    os.makedirs(out_dir, exist_ok=True)
    cfg = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        excluded_tags=["nav", "footer", "script", "style"],
        exclude_external_links=True,
        page_timeout=60000,
    )
    async with AsyncWebCrawler(config=None, logger=logger, base_directory=CACHE_BASE) as crawler:
        results = await crawler.arun_many(urls=[u for _, u in URLS], config=cfg, max_concurrent=3)
        from urllib.parse import unquote
        for r in results:
            md = r.markdown or ""
            slug = r.url.rstrip("/").split("/")[-1]
            name = unquote(slug) or "unknown"
            if name.startswith("wiki/"):
                name = name.split("wiki/")[-1]
            with open(os.path.join(out_dir, f"{name}.md"), "w", encoding="utf-8") as f:
                f.write(f"# 来源: {r.url}\n\n{md}")
            print(f"{'OK ' if r.success else 'FAIL'} {name} <- {r.url}: {len(md)} chars")
    print("BATCH2 DONE")


if __name__ == "__main__":
    asyncio.run(main())
