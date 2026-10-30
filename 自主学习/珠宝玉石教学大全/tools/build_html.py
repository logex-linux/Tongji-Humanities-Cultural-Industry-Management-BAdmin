"""构建脚本：将 tools/parts/*.html 按序拼接为单文件 index.html"""
import os

BASE = "/Users/linnx/Documents/学习/珠宝玉石教学大全"
PARTS = os.path.join(BASE, "tools", "parts")
OUT = os.path.join(BASE, "index.html")

order = [
    "00_head.html",
    "01_intro.html",
    "02_properties.html",
    "03_identification.html",
    "04_gems_a.html",
    "05_gems_b.html",
    "06_jade.html",
    "07_organic_appreciation.html",
    "08_appendix.html",
]

html = []
for name in order:
    p = os.path.join(PARTS, name)
    with open(p, encoding="utf-8") as f:
        html.append(f.read().strip())

content = "\n".join(html) + "\n"
with open(OUT, "w", encoding="utf-8") as f:
    f.write(content)

print(f"written: {OUT}")
print(f"size: {len(content.encode('utf-8'))/1024:.1f} KB")
print(f"lines: {content.count(chr(10))+1}")
