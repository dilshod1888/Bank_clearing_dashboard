"""Render each dashboard page with headless Chrome and save PNG screenshots to images/.

Requires: pip install playwright && playwright install chromium
(or set CHROME_PATH to an installed Chrome/Chromium binary).

Usage:
    python scripts/screenshot_dashboards.py
"""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PAGES = ["cards", "processing", "reconciliation"]
pages = sys.argv[1:] or PAGES


def main():
    with sync_playwright() as p:
        kwargs = {"executable_path": os.environ["CHROME_PATH"]} if os.environ.get("CHROME_PATH") else {}
        browser = p.chromium.launch(**kwargs)
        page = browser.new_page(viewport={"width": 1600, "height": 1000}, device_scale_factor=1)
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        for name in pages:
            page.goto((ROOT / "dashboards" / f"{name}.html").as_uri())
            page.wait_for_timeout(400)
            out = ROOT / "images" / f"dashboard-{name}.png"
            page.screenshot(path=str(out), full_page=True)
            print("saved", out.relative_to(ROOT))
        browser.close()
        if errors:
            print("JS errors:", *errors, sep="\n  ")
            sys.exit(1)


if __name__ == "__main__":
    main()
