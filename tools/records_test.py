from pathlib import Path
import json,os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
ART=ROOT/'artifacts';ART.mkdir(exist_ok=True)
os.environ['TEMP']=os.environ['TMP']=str(ROOT/'.venv'/'tmp')
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1280,'height':720},offline=True);errors=[];network=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:network.append(r.url) if r.url.startswith(('http:','https:')) else None)
    url=(ROOT/'dist'/'index.html').as_uri();page.goto(url)
    page.get_by_role('button',name='НОВАЯ КАМПАНИЯ').click();page.get_by_role('button',name='НАЧАТЬ ОПЕРАЦИЮ').click()
    report=page.evaluate((ROOT/'tools'/'records_checks.js').read_text(encoding='utf-8'))
    page.get_by_role('button',name='ТАБЛИЦА ЛИДЕРОВ',exact=True).click()
    page.locator('#records-name').fill('Пилот <img src=x onerror=alert(1)>');page.locator('#records-name').press('Tab')
    page.evaluate('''() => {X.UI.menu();X.profile.checkpoint=null;for(let i=0;i<3;i++){X.game.start(1);X.game.time=120+i*30;X.game.finish(true);}}''')
    assert page.locator('.score-summary').is_visible()
    page.evaluate("document.getElementById('toast').classList.remove('visible')")
    page.wait_for_timeout(500)
    page.screenshot(path=str(ART/'score-result.png'))
    page.get_by_role('button',name='ТАБЛИЦА ЛИДЕРОВ',exact=True).click();assert page.locator('.record-table tbody tr').count()==3
    assert page.locator('.record-table img').count()==0,'name interpreted as HTML'
    page.evaluate("X.profile.records.name='Пилот';for(const r of X.profile.records.levels[1])r.name='Пилот';X.RecordsUI.show()")
    page.screenshot(path=str(ART/'level-records.png'))
    page.locator('#records-difficulty').select_option('3');assert page.locator('.record-table tbody tr').count()==0
    page.locator('#records-difficulty').select_option('-1');assert page.locator('.record-table tbody tr').count()==3
    page.get_by_role('button',name='ПОЛНАЯ КАМПАНИЯ',exact=True).click();assert page.locator('.record-empty').is_visible()
    page.evaluate('''() => {X.UI.menu();X.profile.checkpoint=null;for(let n=2;n<=20;n++){X.game.start(n);X.game.time=120+n;X.game.finish(true);}X.UI.action('records');}''')
    assert page.locator('.record-table tbody tr').count()==1
    page.evaluate("document.getElementById('toast').classList.remove('visible')")
    page.wait_for_timeout(500)
    page.screenshot(path=str(ART/'campaign-records.png'))
    with page.expect_download() as download: page.evaluate('X.Save.export(X.profile)')
    download.value.save_as(str(ART/'records-export.json'))
    page.evaluate('X.profile=X.Save.defaults();X.UI.menu()')
    page.locator('#import').set_input_files(str(ART/'records-export.json'));page.wait_for_timeout(100)
    assert page.evaluate('X.profile.records.campaigns.length')==1,'records JSON import'
    page.set_viewport_size({'width':640,'height':800});page.get_by_role('button',name='ТАБЛИЦА ЛИДЕРОВ',exact=True).click()
    assert page.locator('.panel').evaluate('(p)=>p.scrollWidth<=p.clientWidth'),'leaderboard horizontal overflow'
    assert not errors and not network,(errors,network)
    browser.close()
    # Полный перезапуск Edge: таблицы и промежуточный счёт кампании.
    profile=ROOT/'.venv'/'edge-records-profile'
    ctx=p.chromium.launch_persistent_context(str(profile),channel='msedge',headless=True)
    pg=ctx.new_page();pg.goto(url);pg.evaluate('X.profile=X.Save.defaults();X.game.start(1);X.game.time=125;X.game.finish(true)');ctx.close()
    ctx=p.chromium.launch_persistent_context(str(profile),channel='msedge',headless=True)
    pg=ctx.new_page();pg.goto(url)
    assert pg.evaluate('X.profile.records.levels[1].length===1&&X.profile.campaignRun.next===2&&X.profile.campaignRun.points===X.profile.records.levels[1][0].points')
    ctx.close()
    report.update(errors=errors,network=0,jsonUIImport=True,fullEdgeRestart=True)
    (ART/'records-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False))
