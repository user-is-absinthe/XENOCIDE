"""Edge file://: коэффициенты кредитов и отсутствие меток А/Б."""
from pathlib import Path
import json, os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
ART=ROOT/'artifacts';ART.mkdir(exist_ok=True)
os.environ['TEMP']=os.environ['TMP']=str(ROOT/'.venv'/'tmp')
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1280,'height':720},offline=True)
    errors=[];network=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:network.append(r.url) if r.url.startswith(('http:','https:')) else None)
    page.goto((ROOT/'dist'/'index.html').as_uri())
    report=page.evaluate((ROOT/'tools'/'rewards_checks.js').read_text(encoding='utf-8'))
    page.evaluate('X.profile=X.Save.defaults();X.profile.owned=X.weapons.map((_,i)=>i);X.profile.unlocked=20;X.profile.credits=1e7;X.UI.shop()')
    for i in range(13):
        card=page.locator(f'[data-weapon="{i}"]')
        for cls,mode in [('.weapon-mod-info','ЛКМ'),('.weapon-tuning-info','ПКМ')]:
            text=card.locator(cls).inner_text();assert mode in text and 'А ·' not in text and 'Б ·' not in text
    assert 'А/Б' not in page.locator('.panel').inner_text()
    prices=page.evaluate('({weapons:X.weapons.map(w=>w.price),ammo:Object.values(X.ammo).map(a=>a.price),implants:X.upgrades.map(u=>u.price)})')
    page.evaluate('X.UI.brief(1)')
    for i,value in enumerate(['0,8','1','1,5','2,5']):
        page.locator('#difficulty').select_option(str(i))
        assert page.locator('#credit-multiplier').inner_text()==value
        assert page.evaluate('X.profile.difficulty')==i
        assert page.evaluate('({weapons:X.weapons.map(w=>w.price),ammo:Object.values(X.ammo).map(a=>a.price),implants:X.upgrades.map(u=>u.price)})')==prices
    page.get_by_role('button',name='НАЧАТЬ МИССИЮ',exact=True).click()
    page.evaluate('X.game.stats.damage=1;X.game.finish(true)')
    assert 'Коэффициент кредитов сложности: ×2,5' in page.locator('.panel').inner_text()
    assert page.evaluate('X.game.earned')==1088
    page.evaluate('X.profile.checkpoint=null;X.UI.shop()')
    before=page.evaluate('({credits:X.profile.credits,ammo:X.profile.ammo.energy,price:X.ammo.energy.price,pack:X.ammo.energy.pack})')
    page.locator('[data-act="buyammo:energy"]').click()
    assert page.evaluate('X.profile.credits')==before['credits']-before['price']
    assert page.evaluate('X.profile.ammo.energy')==min(99999,before['ammo']+before['pack'])
    assert not errors and not network,(errors,network)
    report.update(allWeaponLabels=26,liveDifficultyUI=True,shopPricesUnchanged=True,version=page.evaluate('X.version'),errors=errors,network=0)
    (ART/'rewards-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False),flush=True)
    browser.close()
