"""First-run player identity and background demo regression in offline Edge."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
os.environ["TEMP"] = os.environ["TMP"] = str(ROOT / ".venv" / "tmp")
with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page(offline=True)
    page.add_init_script("window.requestAnimationFrame = () => 0")
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto((ROOT / "dist" / "index.html").as_uri())
    name = "Сокол <7>"
    page.get_by_label("Имя игрока").fill("  " + name + "  ")
    page.get_by_label("Имя игрока").press("Enter")
    assert page.evaluate("JSON.parse(localStorage.getItem(X.Save.key)).records.name") == name
    page.reload()
    assert not page.get_by_label("Имя игрока").count()
    assert page.get_by_text("Игрок · " + name).is_visible()

    page.get_by_role("button", name="НОВАЯ КАМПАНИЯ", exact=True).click()
    page.get_by_role("button", name="НАЧАТЬ ОПЕРАЦИЮ", exact=True).click()
    page.evaluate("window.dispatchEvent(new Event('blur'))")
    assert page.evaluate("X.game.state") == "pause"
    page.keyboard.press("Escape")
    page.evaluate("X.game.time = 12; X.game.finish(true)")
    assert page.evaluate("X.profile.records.levels[1][0].name") == name
    page.evaluate("X.UI.menu(); X.Slots.save(0); X.Slots.show()")
    assert page.locator(".save-slot").first.get_by_text(name, exact=False).is_visible()
    assert page.evaluate("X.Slots.exportData().entries[0].profile.records.name") == name
    page.reload()
    assert page.evaluate("X.Slots.entries[0].profile.records.name") == name

    page.get_by_role("button", name="ДЕМО", exact=True).click()
    page.get_by_role("button", name="НАЧАТЬ ДЕМО ЗАНОВО", exact=True).click()
    page.evaluate("""() => {
        window.dispatchEvent(new Event('blur'));
        Object.defineProperty(document, 'hidden', {configurable: true, value: true});
        document.dispatchEvent(new Event('visibilitychange'));
    }""")
    assert page.evaluate("X.Demo.active && X.game.state === 'play'")
    page.wait_for_function("X.game.time > 0.15", polling=50)
    page.keyboard.press("Escape")
    assert page.evaluate("X.game.state") == "pause"
    frozen = page.evaluate("X.game.time")
    page.wait_for_timeout(250)
    assert page.evaluate("X.game.time") == frozen
    page.evaluate("""() => {
        delete document.hidden;
        document.dispatchEvent(new Event('visibilitychange'));
        X.UI.menu();
    }""")
    assert page.evaluate("X.profile.records.name") == name
    assert not errors, errors
    browser.close()
    print("PASS: first launch, named records and saves, demo blur and hidden progress, manual pause")

