"""Edge: реальный file:// запуск, gameplay и инварианты данных."""
from pathlib import Path
import json, os, sys
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / 'artifacts'
ART.mkdir(exist_ok=True)
os.environ['TEMP'] = os.environ['TMP'] = str(ROOT / '.venv' / 'tmp')
errors, requests = [], []
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width':1280,'height':720}, device_scale_factor=1)
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: requests.append(request.url))
    page.goto((ROOT / 'index.html').as_uri())
    page.get_by_role('button', name='НОВАЯ КАМПАНИЯ').click()
    page.get_by_role('button', name='НАЧАТЬ ОПЕРАЦИЮ').click()
    page.wait_for_timeout(200)
    assert page.evaluate('X.game.state') == 'play'
    start = page.evaluate('X.game.player.x')
    page.keyboard.down('KeyD')
    page.wait_for_timeout(400)
    page.keyboard.up('KeyD')
    assert page.evaluate('X.game.player.x') > start + 20
    page.mouse.move(900,360)
    page.mouse.down()
    page.wait_for_timeout(450)
    page.mouse.up()
    assert page.evaluate('X.game.mags[1]') < 14
    page.keyboard.press('Escape')
    assert page.evaluate('X.game.state') == 'pause'
    before = page.evaluate('X.game.time')
    page.wait_for_timeout(100)
    assert page.evaluate('X.game.time') == before
    page.keyboard.press('Escape')
    page.evaluate('X.game.waveTimer=0')
    page.wait_for_timeout(1500)
    assert page.evaluate('X.game.activeEnemies()') > 0
    page.screenshot(path=str(ART / 'stage1.png'))
    result = page.evaluate('''() => {
      let g=X.game, m=g.map, reachable=m.bfs(g.player.x,g.player.y);
      let points=[g.level.start,g.level.exit,...g.level.spawns,...g.level.targets];
      if(!points.every(a=>m.field[m.index(...Object.values(m.point(a)))]>=0))throw Error('unreachable');
      let p=g.player; p.x=48+15;p.y=48+15;m.move(p,-100,0);
      if(!m.fits(p.x,p.y,p.r))throw Error('wall collision');
      g.checkpoint();let cp=JSON.stringify(X.profile.checkpoint);g.start(1,JSON.parse(cp));
      return {reachable,restored:g.wave,weapons:X.weapons.length,enemies:X.enemies.length};
    }''')
    battle = page.evaluate((ROOT / 'tools' / 'battle_checks.js').read_text(encoding='utf-8'))
    campaign = page.evaluate((ROOT / 'tools' / 'campaign_checks.js').read_text(encoding='utf-8'))
    endless = page.evaluate((ROOT / 'tools' / 'endless_checks.js').read_text(encoding='utf-8'))
    navigation = page.evaluate((ROOT / 'tools' / 'navigation_checks.js').read_text(encoding='utf-8'))
    stress = page.evaluate((ROOT / 'tools' / 'stress_checks.js').read_text(encoding='utf-8'))
    soak = page.evaluate((ROOT / 'tools' / 'soak_checks.js').read_text(encoding='utf-8'))
    balance = page.evaluate((ROOT / 'tools' / 'balance_checks.js').read_text(encoding='utf-8'))
    economy = page.evaluate('''() => {
      const assert=(v,m)=>{if(!v)throw Error(m);},old=JSON.stringify(X.profile);
      X.profile=X.Save.defaults();X.profile.credits=100000;X.profile.unlocked=20;
      assert(X.Economy.weapon(12),'purchase');let credits=X.profile.credits;
      assert(!X.Economy.weapon(12)&&X.profile.credits===credits,'duplicate purchase');
      assert(X.Economy.ammo('explosive')&&X.profile.ammo.explosive>9,'ammo');
      for(let i=0;i<7;i++)X.Economy.upgrade('health');assert(X.profile.upgrades.health===6,'upgrade cap');
      for(let i=0;i<6;i++)X.Economy.mod(12);assert(X.profile.weaponMods.rocket===5,'mod cap');
      X.profile.credits=0;assert(!X.Economy.ammo('light'),'negative credits');
      let bad=X.Save.defaults();bad.ammo.light='infinity';bad.credits=-1;bad.upgrades.health=999;bad.checkpoint={number:1};
      let fixed=X.Save.validate(bad);assert(fixed.ammo.light===140&&fixed.credits===0&&fixed.upgrades.health===6&&!fixed.checkpoint,'sanitizer');
      let rejected=false;try{X.Save.validate({version:777,owned:[]});}catch(e){rejected=true;}assert(rejected,'version');
      X.profile=X.Save.validate(JSON.parse(old));X.Save.warning='';X.game.start(1);X.game.pause();X.UI.settings();return true;
    }''')
    page.locator('[data-act="key:up"]').click()
    page.keyboard.press('KeyI')
    assert page.evaluate('X.profile.settings.keys.up') == 'KeyI'
    with page.expect_download() as download:
        page.get_by_role('button', name='ЭКСПОРТ JSON').click()
    download.value.save_as(str(ART / 'export.json'))
    page.locator('#import').set_input_files(str(ART / 'export.json'))
    page.wait_for_timeout(100)
    assert page.evaluate('X.profile.settings.keys.up') == 'KeyI'
    assert not errors, errors
    assert not any(x.startswith(('http:', 'https:')) for x in requests), requests
    report={'PASS':result,'battle':battle,'campaign':campaign,'endless':endless,'navigation':navigation,'stress':stress,'soak':soak,'balanceBot':balance,'economy':economy,'errors':errors,'network':0}
    (ART / 'test-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False),flush=True)
    browser.close()
    # Отдельный профиль только для теста. Закрывается весь процесс браузера.
    profile = ROOT / '.venv' / 'edge-test-profile'
    context = p.chromium.launch_persistent_context(str(profile), channel='msedge', headless=True)
    pg=context.new_page();pg.goto((ROOT / 'index.html').as_uri())
    pg.evaluate('X.profile=X.Save.defaults();X.profile.credits=4321;X.game.start(3);X.game.player.hp=77;X.game.pause()')
    context.close()
    context = p.chromium.launch_persistent_context(str(profile), channel='msedge', headless=True)
    pg=context.new_page();pg.goto((ROOT / 'index.html').as_uri())
    assert pg.evaluate('X.profile.credits') == 4321
    assert pg.evaluate('X.profile.checkpoint.number') == 3
    pg.get_by_role('button',name='ПРОДОЛЖИТЬ · КОНТРОЛЬНАЯ ТОЧКА').click()
    assert pg.evaluate('X.game.number===3&&X.game.player.hp===77')
    context.close()
    print('PASS: Edge full process close/reopen, file:// profile and checkpoint persistence, JSON download/import, key rebinding')
    browser=p.chromium.launch(channel='msedge',headless=True)
    pg=browser.new_page()
    pg.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw Error('blocked')}})")
    pg.goto((ROOT / 'index.html').as_uri())
    assert pg.evaluate('!X.Save.available&&X.Save.warning.length>0')
    pg.evaluate('X.Save.write(X.profile)')
    assert pg.get_by_role('button',name='НОВАЯ КАМПАНИЯ').is_visible()
    browser.close()
    print('PASS: localStorage denial recovery')
