from pathlib import Path
import os,json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
os.environ['TEMP']=os.environ['TMP']=str(root/'.venv'/'tmp')
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page();page.goto((root/'index.html').as_uri())
    print(json.dumps(page.evaluate((root/'tools'/'balance_checks.js').read_text(encoding='utf-8')),ensure_ascii=False))
    browser.close()
