"""Офлайн Edge: три снимка, перезапуск экспедиции, перезарядка и открытый полигон."""
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
    report=page.evaluate((ROOT/'tools'/'saves_checks.js').read_text(encoding='utf-8'))
    page.evaluate('X.profile=X.Save.defaults();X.profile.credits=111;X.Slots.clear();X.UI.menu()')
    page.get_by_role('button',name='СОХРАНЕНИЯ · 3 ЯЧЕЙКИ',exact=True).click()
    assert page.locator('.save-slot').count()==3
    page.locator('[data-act="saveSlot:0"]').click();assert page.evaluate('X.Slots.entries[0].profile.credits')==111
    page.evaluate('X.profile.credits=333')
    page.locator('[data-act="saveSlot:0"]').click();assert page.evaluate('X.Slots.entries[0].profile.credits')==111
    page.get_by_role('button',name='ОТМЕНА',exact=True).click();assert page.evaluate('X.Slots.entries[0].profile.credits')==111
    page.locator('[data-act="saveSlot:0"]').click();page.get_by_role('button',name='ПОДТВЕРДИТЬ',exact=True).click()
    assert page.evaluate('X.Slots.entries[0].profile.credits')==333
    page.evaluate('''() => {X.profile.endless.manualUnlock=X.profile.endless.unlocked=true;X.profile.endless.stage=26;X.profile.endless.best=29;X.profile.endless.seed=999;X.profile.credits=222;X.profile.upgrades.speed=3;X.game.start(26);X.game.player.hp=77;X.game.pause();}''')
    page.get_by_role('button',name='СОХРАНЕНИЯ · 3 ЯЧЕЙКИ',exact=True).click();page.locator('[data-act="saveSlot:1"]').click()
    page.evaluate('X.profile.checkpoint=null;X.profile.resumeMode="campaign";X.profile.level=4;X.profile.credits=444;X.game.state="menu";X.Slots.show()')
    page.locator('[data-act="saveSlot:2"]').click()
    page.evaluate("document.getElementById('toast').classList.remove('visible')");page.wait_for_timeout(500)
    page.screenshot(path=str(ART/'save-slots.png'))
    with page.expect_download() as download: page.get_by_role('button',name='ЭКСПОРТ ВСЕХ СОХРАНЕНИЙ',exact=True).click()
    export=ART/'slots-export.json';download.value.save_as(str(export))
    data=json.loads(export.read_text(encoding='utf-8'))
    assert len(data['saveSlots']['entries'])==3 and all('saveSlots' not in r['profile'] for r in data['saveSlots']['entries'])
    page.evaluate('X.UI.action("doreset")');assert page.evaluate('X.Slots.entries.every(r=>r===null)')
    page.locator('#import').set_input_files(str(export));page.wait_for_timeout(100)
    assert page.evaluate('X.Slots.entries.every(r=>r!==null)&&X.profile.credits===444')
    # Старый одиночный JSON оставляет ручные ячейки на месте.
    legacy=dict(data);legacy.pop('saveSlots');legacy['credits']=123
    legacy_path=ART/'single-profile.json';legacy_path.write_text(json.dumps(legacy,ensure_ascii=False),encoding='utf-8')
    page.locator('#import').set_input_files(str(legacy_path));page.wait_for_timeout(100)
    assert page.evaluate('X.profile.credits===123&&X.Slots.entries.every(r=>r!==null)')
    page.get_by_role('button',name='СОХРАНЕНИЯ · 3 ЯЧЕЙКИ',exact=True).click()
    page.locator('[data-act="loadSlot:1"]').click();assert page.evaluate('X.profile.credits')==123
    page.get_by_role('button',name='ПОДТВЕРДИТЬ',exact=True).click()
    assert page.evaluate('X.game.number===26&&X.game.player.hp===77&&X.profile.endless.seed===999&&X.profile.credits===222')
    page.keyboard.press('Escape');page.locator('[data-act="menu"]').click()
    page.get_by_role('button',name='БЕСКОНЕЧНАЯ ЭКСПЕДИЦИЯ',exact=True).click()
    page.evaluate("document.getElementById('toast').classList.remove('visible')");page.wait_for_timeout(500)
    page.screenshot(path=str(ART/'expedition-restart.png'))
    page.locator('#seed').fill('1.5');page.locator('[data-act="restartExpedition"]').click()
    assert page.evaluate('X.UI.screen==="endless"&&X.profile.endless.stage===26')
    page.locator('#seed').fill('54321');page.locator('[data-act="restartExpedition"]').click()
    assert page.evaluate('X.profile.checkpoint.number===26&&X.profile.endless.stage===26')
    page.get_by_role('button',name='ОТМЕНА',exact=True).click()
    assert page.evaluate('X.profile.endless.stage')==26
    page.locator('#seed').fill('54321');page.locator('[data-act="restartExpedition"]').click()
    page.get_by_role('button',name='НАЧАТЬ С СЕКТОРА 21',exact=True).click()
    assert page.evaluate('X.profile.endless.stage===21&&X.profile.endless.seed===54321&&!X.profile.checkpoint&&X.profile.endless.best===29&&X.profile.credits===222&&X.profile.upgrades.speed===3')
    page.get_by_role('button',name='НАЧАТЬ МИССИЮ',exact=True).click();assert page.evaluate('X.game.number')==21
    page.keyboard.press('Escape');page.locator('[data-act="menu"]').click();page.get_by_role('button',name='БЕСКОНЕЧНАЯ ЭКСПЕДИЦИЯ',exact=True).click()
    page.locator('[data-act="expedition"]').click();assert page.evaluate('X.game.number===21&&X.game.state==="play"')
    page.evaluate('X.game.pause();X.profile.checkpoint=null;X.profile.endless.stage=28;X.profile.resumeMode="endless";X.UI.menu()')
    page.get_by_role('button',name='ПРОДОЛЖИТЬ · ЭКСПЕДИЦИЯ 28',exact=True).click();assert page.evaluate('X.UI.next')==28
    page.evaluate('X.UI.menu();X.profile.upgrades.power=6;X.profile.weaponMods.pistol=3;X.profile.weaponTuning.pistol=3')
    page.get_by_role('button',name='ПОЛИГОН · УРОВНИ И ЧИТЫ',exact=True).click()
    assert page.evaluate('X.profile.credits===500000&&Object.values(X.profile.upgrades).every(n=>n===0)&&!Object.keys(X.profile.weaponMods).length&&!Object.keys(X.profile.weaponTuning).length')
    page.get_by_role('button',name='МАГАЗИН ПОЛИГОНА · ПРОКАЧКА',exact=True).click()
    page.locator('[data-act="upgrade:dashCharges"]').click();assert page.evaluate('X.profile.upgrades.dashCharges')==1
    page.get_by_role('button',name='ПОЛИГОН · ВЫБРАТЬ КАРТУ',exact=True).click();assert page.evaluate('X.profile.upgrades.dashCharges')==1
    page.get_by_role('button',name='ОТКРЫТАЯ АРЕНА · БЕЗ ВНУТРЕННИХ СТЕН',exact=True).click()
    page.get_by_role('button',name='НАЧАТЬ МИССИЮ',exact=True).click();assert page.evaluate('X.game.number===0&&X.game.player.maxDashCharges===2')
    page.evaluate('X.game.state="pause";X.UI.hide();document.getElementById("toast").classList.remove("visible")');page.wait_for_timeout(500)
    page.screenshot(path=str(ART/'open-arena.png'))
    page.evaluate('X.UI.menu();X.Slots.show()');page.set_viewport_size({'width':640,'height':800})
    assert page.locator('.panel').evaluate('(e)=>e.scrollWidth<=e.clientWidth'),'slot panel overflow'
    assert not errors and not network,(errors,network)
    browser.close()
    # Полное закрытие процесса и восстановление всех трёх независимых снимков.
    profile=ROOT/'.venv'/'edge-slots-profile'
    ctx=p.chromium.launch_persistent_context(str(profile),channel='msedge',headless=True)
    pg=ctx.new_page();pg.goto(url)
    pg.evaluate('''() => {X.profile=X.Save.defaults();X.Slots.clear();for(let i=0;i<3;i++){X.profile.credits=1000+i;X.profile.endless.manualUnlock=X.profile.endless.unlocked=true;X.game.start(i===1?24:3+i);X.game.player.hp=70+i;X.game.pause();X.Slots.save(i);}}''');ctx.close()
    ctx=p.chromium.launch_persistent_context(str(profile),channel='msedge',headless=True)
    pg=ctx.new_page();pg.goto(url)
    assert pg.evaluate('X.Slots.entries.every((r,i)=>r.profile.credits===1000+i&&r.profile.checkpoint.player.hp===70+i)')
    for i in range(3): assert pg.evaluate('(i)=>X.Slots.restore(i)&&X.game.player.hp===70+i',i)
    pg.evaluate('''() => {const bank=X.Slots.exportData();bank.entries[1].profile={version:99};localStorage.setItem(X.Slots.key,JSON.stringify(bank));}''')
    pg.reload();assert pg.evaluate('X.profile.credits===1002&&X.Slots.entries[0]&&!X.Slots.entries[1]&&X.Slots.entries[2]&&X.Slots.notice.length>0')
    ctx.close()
    # Запрет хранилища не ломает ручные снимки в памяти.
    browser=p.chromium.launch(channel='msedge',headless=True);pg=browser.new_page()
    pg.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw Error('blocked')}})")
    pg.goto(url);assert pg.evaluate('X.Slots.save(0)&&!X.Slots.available&&X.Slots.entries[0].profile.version===1')
    with pg.expect_download() as download: pg.evaluate('X.Save.export(X.profile)')
    blocked_export=ART/'blocked-slots-export.json';download.value.save_as(str(blocked_export))
    assert json.loads(blocked_export.read_text(encoding='utf-8'))['saveSlots']['entries'][0]['profile']['version']==1
    browser.close()
    report.update(realUISlots=True,jsonAllSlots=True,legacyJSONKeepsSlots=True,restartExpedition=True,fullEdgeRestart=True,corruptBankStartup=True,blockedStorage=True,errors=errors,network=0)
    (ART/'saves-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False))
