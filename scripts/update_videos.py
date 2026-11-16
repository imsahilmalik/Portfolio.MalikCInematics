#!/usr/bin/env python3
"""Reads the public YouTube feed of the channel and writes videos.json.

No API key is needed. The GitHub Action runs this before every deploy.
"""
import json
import os
import sys
import urllib.request
import xml.etree.ElementTree as ET

CHANNEL_ID = os.environ.get("CHANNEL_ID", "UCUtd2SHjXu9aiCNgktUU9Gg")
FEED_URL = f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}"
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
OUT_PATH = os.path.join(ROOT, "videos.json")

NS = {
    "a": "http://www.w3.org/2005/Atom",
    "yt": "http://www.youtube.com/xml/schemas/2015",
}


def fetch_feed():
    request = urllib.request.Request(
        FEED_URL,
        headers={"User-Agent": "Mozilla/5.0 (portfolio-site feed reader)"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def parse_feed(xml_bytes):
    root = ET.fromstring(xml_bytes)
    videos = []
    for entry in root.findall("a:entry", NS):
        video_id = entry.findtext("yt:videoId", default="", namespaces=NS).strip()
        title = entry.findtext("a:title", default="", namespaces=NS).strip()
        published = entry.findtext("a:published", default="", namespaces=NS).strip()
        link = ""
        for link_el in entry.findall("a:link", NS):
            if link_el.get("rel", "alternate") == "alternate":
                link = link_el.get("href", "")
                break
        if not video_id or not title:
            continue
        videos.append(
            {
                "id": video_id,
                "title": title,
                "published": published,
                "short": "/shorts/" in link,
            }
        )
    videos.sort(key=lambda v: v["published"], reverse=True)
    return videos


def main():
    try:
        videos = parse_feed(fetch_feed())
    except Exception as error:  # network problem, channel id wrong, feed changed
        print(f"Could not read the YouTube feed: {error}", file=sys.stderr)
        # Keep the existing videos.json so the site still builds.
        sys.exit(0 if os.path.exists(OUT_PATH) else 1)

    with open(OUT_PATH, "w", encoding="utf-8") as handle:
        json.dump({"videos": videos}, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print(f"Wrote {len(videos)} videos to videos.json")


if __name__ == "__main__":
    main()
