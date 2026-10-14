from pathlib import Path
import os,json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
ART=ROOT/'artifacts';ART.mkdir(exist_ok=True)
os.environ['TEMP']=os.environ['TMP']=str(ROOT/'.venv'/'tmp')
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    context=browser.new_context(viewport={'width':1280,'height':720},offline=True)
    page=context.new_page();errors=[];net=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:net.append(r.url) if r.url.startswith(('http:','https:')) else None)
    page.goto((ROOT/'dist'/'index.html').as_uri())
    page.get_by_role('button',name='НОВАЯ КАМПАНИЯ').click();page.get_by_role('button',name='НАЧАТЬ ОПЕРАЦИЮ').click()
    result=page.evaluate((ROOT/'tools'/'enhancements_checks.js').read_text(encoding='utf-8'))
    # Реальный UI: выбрать финальную карту без прохождения, ввести код клавиатурой.
    page.get_by_role('button',name='ПОЛИГОН · УРОВНИ И ЧИТЫ').click()
    page.locator('#cheat-code').fill('CREDITS');page.locator('#cheat-code').press('Enter')
    page.get_by_role('button',name='ARSENAL · ВЕСЬ АРСЕНАЛ').click()
    page.screenshot(path=str(ART/'testing-mode.png'))
    page.locator('[data-act="testLevel:20"]').click();page.get_by_role('button',name='НАЧАТЬ МИССИЮ').click()
    assert page.evaluate('X.game.number===20&&X.Debug.active')
    page.mouse.move(800,350)
    page.evaluate('X.game.mags[X.game.weapon]=3;X.game.beginReload();X.game.waveTimer=999')
    page.wait_for_timeout(180);page.screenshot(path=str(ART/'crosshair-reload.png'))
    page.keyboard.press('Escape');page.screenshot(path=str(ART/'pause-audio.png'))
    assert page.get_by_role('button',name='ОТКЛЮЧИТЬ ВЕСЬ ЗВУК').is_visible()
    page.get_by_role('button',name='ГЛАВНОЕ МЕНЮ',exact=True).click()
    assert not page.evaluate('X.Debug.active')
    page.evaluate('X.profile.checkpoint=null;X.UI.shop()');page.screenshot(path=str(ART/'shop-hidden-weapons.png'))
    page.evaluate('''() => {X.profile.owned=X.weapons.map((w,i)=>i);X.game.start(1);X.game.wave=X.game.level.waves;X.game.loot=[];X.game.addAmmoLoot(600,640);X.game.mouse.x=600;X.game.mouse.y=240;X.game.waveTimer=999;}''')
    page.wait_for_timeout(100);page.screenshot(path=str(ART/'ammo-icons.png'))
    page.evaluate('X.game.pause();X.UI.action("toggleMusic");X.UI.action("toggleMute")')
    page.reload()
    assert page.evaluate('!X.profile.settings.musicEnabled&&X.profile.settings.mute'), 'audio preferences not restored'
    assert not errors and not net,(errors,net)
    result.update(errors=errors,network=0,audioPreferencesRestored=True,browser=browser.version)
    (ART/'enhancements-report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False))
    browser.close()
