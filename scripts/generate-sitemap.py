#!/usr/bin/env python3
"""Generate static search-engine files using the confirmed public base URL."""

import argparse
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit, quote
from xml.etree import ElementTree as ET


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base_url", help="真实 HTTPS 站点根地址，包含仓库子路径")
    args = parser.parse_args()
    url = urlsplit(args.base_url)
    if (url.scheme != "https" or not url.hostname or url.username or url.password
            or url.query or url.fragment or any(c.isspace() for c in args.base_url)):
        parser.error("请提供不含账号、查询参数或片段的真实 HTTPS 站点地址")
    if any(segment in (".", "..") for segment in url.path.split("/")):
        parser.error("站点地址不应包含 . 或 .. 路径片段")
    base = urlunsplit((url.scheme, url.netloc, quote(url.path.rstrip("/") + "/", safe="/%"), "", ""))
    root = Path(__file__).resolve().parent.parent
    # 仅收录实际页面；模板与 404 页保留 noindex，不加入地图。
    pages = ("", "projects/pendulum.html", "pendulum/")
    namespace = "http://www.sitemaps.org/schemas/sitemap/0.9"
    ET.register_namespace("", namespace)
    urlset = ET.Element(f"{{{namespace}}}urlset")
    for page in pages:
        if not (root / (page or "index.html")).exists():
            parser.error(f"页面不存在：{page}")
        entry = ET.SubElement(urlset, f"{{{namespace}}}url")
        ET.SubElement(entry, f"{{{namespace}}}loc").text = base + page
    ET.indent(urlset, space="  ")
    ET.ElementTree(urlset).write(root / "sitemap.xml", encoding="utf-8", xml_declaration=True)
    (root / "robots.txt").write_text(
        f"User-agent: *\nAllow: /\n\nSitemap: {base}sitemap.xml\n", encoding="utf-8"
    )
    print(f"已生成 {len(pages)} 个页面的 sitemap.xml 和 robots.txt：{base}")


if __name__ == "__main__":
    main()
