"""Run boss scenarios in Edge from the offline distribution."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
os.environ["TEMP"] = os.environ["TMP"] = str(ROOT / ".venv" / "tmp")
with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 720}, offline=True)
    page.add_init_script("window.requestAnimationFrame = () => 0")
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto((ROOT / "dist" / "index.html").as_uri())
    checks = (ROOT / "tools" / "boss_checks.js").read_text(encoding="utf-8")
    for difficulty in (1, 3):
        print(page.evaluate(checks, {"difficulty": difficulty}))
    artifacts = ROOT / "artifacts"
    artifacts.mkdir(exist_ok=True)
    for dark in (False, True):
        for stage in (5, 10, 15, 20):
            state = page.evaluate(checks, {"visual": [stage, dark]})
            mode = "dark" if dark else "normal"
            page.screenshot(path=str(artifacts / f"boss-{stage}-{mode}-{state}.png"))
    assert not errors, errors
    browser.close()
