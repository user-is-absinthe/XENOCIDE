"""Офлайн Edge: развитие бойца/оружия, рельсотрон, ремонт и полигон v1.1."""
from pathlib import Path
import json, os
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent.parent
ART=ROOT/'artifacts';ART.mkdir(exist_ok=True)
os.environ['TEMP']=os.environ['TMP']=str(ROOT/'.venv'/'tmp')
url=(ROOT/'dist'/'index.html').as_uri()
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1280,'height':720},offline=True)
    errors=[];network=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:network.append(r.url) if r.url.startswith(('http:','https:')) else None)
    page.goto(url)
    report=page.evaluate((ROOT/'tools'/'development_checks.js').read_text(encoding='utf-8'))
    assert page.locator('.game-version').inner_text()=='v1.1.0'
    assert page.locator('.game-version').evaluate('(e)=>parseFloat(getComputedStyle(e).fontSize)>=30')
    page.evaluate("document.getElementById('toast').classList.remove('visible')");page.wait_for_timeout(500)
    page.screenshot(path=str(ART/'menu-v1.1.png'))
    page.get_by_role('button',name='НАСТРОЙКИ И УПРАВЛЕНИЕ',exact=True).click()
    page.get_by_role('button',name='РАЗБЛОКИРОВАТЬ БЕСКОНЕЧНЫЙ РЕЖИМ',exact=True).click()
    assert page.get_by_role('button',name='БЕСКОНЕЧНЫЙ РЕЖИМ УЖЕ ОТКРЫТ',exact=True).is_disabled()
    page.reload();assert page.evaluate('X.profile.endless.manualUnlock&&X.profile.endless.unlocked&&!X.profile.completed.length')
    page.evaluate('X.profile.credits=1000000;X.profile.unlocked=20;X.profile.owned=X.weapons.map((_,i)=>i);X.UI.shop()')
    assert page.locator('.weapon-tuning-info').count()==13
    for action in ['upgrade:dashCharges','upgrade:sprint','upgrade:stamina','upgrade:regeneration','tune:1']:
        button=page.locator(f'[data-act="{action}"]');button.scroll_into_view_if_needed()
        top=page.locator('.panel').evaluate('(e)=>e.scrollTop');button.click()
        page.evaluate('()=>new Promise(requestAnimationFrame)')
        assert abs(page.locator('.panel').evaluate('(e)=>e.scrollTop')-top)<=1,action
    assert page.evaluate('X.profile.upgrades.dashCharges===1&&X.profile.upgrades.sprint===1&&X.profile.upgrades.stamina===1&&X.profile.upgrades.regeneration===1&&X.profile.weaponTuning.pistol===1')
    page.mouse.move(5,5);page.evaluate('X.UI.hideWeaponTooltip()')
    page.screenshot(path=str(ART/'shop-branches.png'))
    for width,height,dpi in [(640,800,1),(1024,768,1)]:
        page.set_viewport_size({'width':width,'height':height})
        assert page.locator('.panel').evaluate('(e)=>e.scrollWidth<=e.clientWidth'),'shop overflow'
    page.set_viewport_size({'width':1280,'height':720})
    page.evaluate('''() => {
      X.game.start(4);const g=X.game,o=g.objectives[0];o.done=true;g.coreHp=250;
      g.player.x=o.x+50;g.player.y=o.y;g.waveTimer=999;g.keys.add('KeyE');g.update(1/60);
      g.state='pause';X.UI.hide();document.getElementById('toast').classList.remove('visible');
    }''');page.wait_for_timeout(500)
    page.screenshot(path=str(ART/'defense-repair.png'))
    page.evaluate('X.UI.menu();X.Debug.enter();X.Debug.code("BARRAGE");X.UI.debug()')
    page.get_by_role('button',name='01 · Внешний периметр',exact=True).click()
    page.get_by_role('button',name='НАЧАТЬ МИССИЮ',exact=True).click()
    assert page.evaluate('X.weapons[X.game.weapon].debugOnly')
    page.mouse.down();page.wait_for_timeout(350);page.mouse.up();assert page.evaluate('X.game.stats.shots>1&&X.game.reload===0')
    page.evaluate('X.UI.menu()');assert not page.evaluate('X.weapons.some(w=>w.debugOnly)')
    assert not errors and not network,(errors,network)
    browser.close()
    profile=ROOT/'.venv'/'edge-development-profile'
    ctx=p.chromium.launch_persistent_context(str(profile),channel='msedge',headless=True)
    pg=ctx.new_page();pg.goto(url)
    pg.evaluate('X.profile=X.Save.defaults();X.profile.endless.manualUnlock=X.profile.endless.unlocked=true;X.profile.upgrades.dashCharges=4;X.profile.upgrades.stamina=5;X.profile.weaponTuning.rail=3;X.game.start(4);X.game.player.dashCharges=2;X.game.player.dash=1.2;X.game.coreHp=321;X.game.pause()')
    ctx.close()
    ctx=p.chromium.launch_persistent_context(str(profile),channel='msedge',headless=True)
    pg=ctx.new_page();pg.goto(url)
    assert pg.evaluate('X.profile.endless.unlocked&&X.profile.upgrades.dashCharges===4&&X.profile.weaponTuning.rail===3&&X.profile.checkpoint.coreHp===321&&X.profile.checkpoint.player.dashCharges===2&&X.profile.checkpoint.player.maxStamina===225')
    ctx.close()
    report.update(realUIPurchases=True,fullEdgeRestart=True,version='1.1.0',errors=errors,network=0)
    (ART/'development-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False))
