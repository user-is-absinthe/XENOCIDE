"""Демо: настоящие кнопки, сохранение/изоляция, автопилот и полный цикл миссий."""
from pathlib import Path
import json, os
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / 'artifacts'
ART.mkdir(exist_ok=True)
os.environ['TEMP'] = os.environ['TMP'] = str(ROOT / '.venv' / 'tmp')
errors, network = [], []
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    context = browser.new_context(viewport={'width': 1280, 'height': 800}, offline=True)
    page = context.new_page()
    page.add_init_script('window.requestAnimationFrame=()=>0')
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: network.append(r.url) if r.url.startswith(('http:', 'https:')) else None)
    page.goto((ROOT / 'dist' / 'index.html').as_uri())
    page.evaluate('''() => {
      X.profile.credits=4321;X.Save.write(X.profile);
      window.campaign=JSON.stringify(X.profile);
      window.storedCampaign=localStorage.getItem(X.Save.key);
      window.slots=localStorage.getItem(X.Slots.key);
    }''')
    page.get_by_role('button', name='ДЕМО', exact=True).click()
    page.locator('#demo-difficulty').select_option('3')
    page.screenshot(path=str(ART / 'demo-menu.png'))
    page.get_by_role('button', name='НАЧАТЬ ДЕМО ЗАНОВО', exact=True).click()
    assert page.evaluate('X.Demo.active && X.profile.difficulty===3 && X.game.number===1 && !X.Debug.active')
    page.keyboard.press('Escape')
    assert page.evaluate('X.game.state') == 'pause'
    time = page.evaluate('X.game.time')
    page.wait_for_timeout(150)
    assert page.evaluate('X.game.time') == time
    page.get_by_role('button', name='ГЛАВНОЕ МЕНЮ', exact=True).click()
    assert page.evaluate('!X.Demo.active && JSON.stringify(X.profile)===campaign && localStorage.getItem(X.Save.key)===storedCampaign && localStorage.getItem(X.Slots.key)===slots')
    page.get_by_role('button', name='ДЕМО', exact=True).click()
    page.get_by_role('button', name='ПРОДОЛЖИТЬ ДЕМО', exact=True).click()
    assert page.evaluate('X.game.time') >= time
    page.keyboard.press('Escape')
    page.screenshot(path=str(ART / 'demo-pause.png'))
    # Контрольная точка в полёте: обычный снаряд, заряд, боезапас, очередь, цели.
    snapshot = page.evaluate('''() => {
      const g=X.game;g.resume();g.enemies.clear();g.spawnQueue=[];
      g.shots.clear();g.fire(false);g.player.invuln=0.17;g.spawnTimer=0.073;
      g.pause();return {time:g.time,hp:g.player.hp,ammo:g.ammo,mags:g.mags,
        shots:g.shots.items.filter(s=>s.active).length,spawnTimer:g.spawnTimer};
    }''')
    page.reload()
    page.get_by_role('button', name='ДЕМО', exact=True).click()
    page.get_by_role('button', name='ПРОДОЛЖИТЬ ДЕМО', exact=True).click()
    restored = page.evaluate('''() => { const g=X.game;g.pause();return {time:g.time,hp:g.player.hp,
      ammo:g.ammo,mags:g.mags,shots:g.shots.items.filter(s=>s.active).length,spawnTimer:g.spawnTimer}; }''')
    assert snapshot == restored, (snapshot, restored)
    checks = page.evaluate('''() => {
      const assert=(v,m)=>{if(!v)throw Error(m)}, g=X.game;
      X.UI.menu(); const original=JSON.stringify(X.profile), stored=localStorage.getItem(X.Save.key);
      for(let difficulty=0;difficulty<4;difficulty++) {
        X.Demo.enter(false,difficulty);assert(g.difficulty===difficulty,'difficulty');
        g.start(0);g.start(21);assert(g.number===1,'campaign maps only');
        X.UI.action('debug');X.UI.action('slots');assert(!X.Debug.active,'mode isolation');
        const before=g.weapon;X.UI.action('buyweapon:2');assert(g.weapon===before,'no manual purchases');
        g.finish(false);assert(g.state==='demo-wait'&&X.Demo.stage===1,'retry death');
        g.pause();const wait=X.Demo.wait;for(let i=0;i<120;i++)g.update(1/60);
        assert(g.state==='pause'&&X.Demo.wait===wait,'intermission paused');
        g.resume();for(let i=0;i<250;i++)g.update(1/60);assert(g.state==='play'&&g.number===1,'auto retry');
        X.UI.menu();
      }
      X.Demo.enter(false,1);X.profile.credits=1000000;X.profile.unlocked=20;
      const money=X.profile.credits;for(let i=0;i<15;i++)X.Demo.supply();
      assert(X.profile.owned.length===13&&X.profile.credits<money,'weapon purchases');
      assert(X.profile.upgrades.secondChance===1&&X.profile.upgrades.regeneration>0,'implants');
      assert(Object.values(X.profile.weaponMods).some(n=>n>0)&&Object.values(X.profile.weaponTuning).some(n=>n>0),'branches');
      const purchased=JSON.parse(JSON.stringify(X.profile));
      for(let n=1;n<=20;n++) {
        g.start(n);X.Demo.stage=n;const records=JSON.stringify(X.profile.records);
        g.finish(true);assert(X.Demo.stage===n%20+1,'sequential stage');
        assert(JSON.stringify(X.profile.records)===records,'no demo records');
        if(n===20)assert(X.Demo.cycle===2,'wrap cycle');
      }
      for(let i=0;i<250;i++)g.update(1/60);
      assert(g.number===1&&g.state==='play','automatic wrap to first');
      const credits=X.profile.credits;g.finish(false);const paid=X.profile.credits;g.finish(false);
      assert(X.profile.credits===paid,'finish once');
      X.UI.menu();assert(JSON.stringify(X.profile)===original&&localStorage.getItem(X.Save.key)===stored,'campaign unchanged');
      return {difficulties:4,maps:20,wrap:true,purchases:purchased.owned.length,creditsSpent:money-purchased.credits,isolated:true};
    }''')
    # Фактическое прохождение от стандартного стартового снаряжения.
    page.evaluate('''() => {
      X.Demo.enter(false,1);X.profile.settings.mute=true;X.profile.settings.quality=0;
      window.transitions=[];const finish=X.Demo.finished;
      X.Demo.finished=function(win){transitions.push({stage:X.game.number,win,time:+X.game.time.toFixed(1),hp:+X.game.player.hp.toFixed(1),kills:X.game.kills});finish.call(this,win)};
    }''')
    for chunk in range(150):
        state = page.evaluate('''() => {
          const g=X.game;for(let i=0;i<6000&&X.Demo.cycle===1;i++)g.update(1/60);
          return {cycle:X.Demo.cycle,stage:g.number,time:+g.time.toFixed(1),hp:+g.player.hp.toFixed(1),
            wave:g.wave,enemies:g.activeEnemies(),kills:g.kills,position:[Math.round(g.player.x),Math.round(g.player.y)],
            goals:g.objectives.map(o=>({done:o.done,hp:o.hp})),weapon:g.weapon,credits:X.profile.credits,
            transitions:transitions.length};
        }''')
        print(json.dumps({'chunk':chunk, **state},ensure_ascii=False),flush=True)
        if state['cycle'] > 1:
            break
    transitions = page.evaluate('transitions')
    page.evaluate('X.Render.draw(X.game,0);X.game.pause()')
    page.screenshot(path=str(ART / 'demo-autopilot.png'))
    report = {'checks':checks,'snapshot':snapshot,'restored':restored,'autopilot':state,
              'transitions':transitions,'errors':errors,'network':network}
    (ART / 'demo-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    assert not errors and not network, (errors, network)
    assert state['cycle'] == 2, state
    assert [t['stage'] for t in transitions if t['win']] == list(range(1,21)), transitions
    # Проверяем любой старт/терминал/ресурс → выход на всех картах без постановки боя.
    routes = page.evaluate('''() => {
      let routes=0;const g=X.game;
      for(let n=1;n<=20;n++) {
        const level=X.levels[n-1];
        for(const from of [level.start,...level.targets,...level.resources]) {
          X.Demo.stage=n;g.start(n);X.Demo.resetPilot();
          Object.assign(g.player,g.map.point(from));g.wave=g.level.waves;g.spawnQueue=[];
          g.bossSpawned=true;g.objectives.forEach(o=>o.done=true);
          g.seedLoot=()=>{};g.loot=[];
          for(let i=0;i<12000&&g.state==='play';i++)g.update(1/60);
          if(g.state!=='demo-wait')throw Error('route '+n+' from '+from+' at '+g.player.x+','+g.player.y);
          routes++;
        }
      }return routes;
    }''')
    report['routes'] = routes
    (ART / 'demo-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    browser.close()
    # Закрытие и повторный запуск всего процесса Edge, отдельный тестовый профиль.
    profile_dir = ROOT / '.venv' / 'edge-demo-profile'
    ctx = p.chromium.launch_persistent_context(str(profile_dir), channel='msedge', headless=True, offline=True)
    pg = ctx.new_page()
    pg.add_init_script('window.requestAnimationFrame=()=>0')
    pg.goto((ROOT / 'dist' / 'index.html').as_uri())
    saved = pg.evaluate('''() => {
      X.Demo.enter(false,2);X.Demo.stage=7;X.game.start(7);X.Demo.resetPilot();
      X.game.player.hp=73;X.game.time=19.5;X.game.fire(false);X.game.pause();
      return {time:X.game.time,hp:X.game.player.hp,shots:X.game.shots.items.filter(s=>s.active).length};
    }''')
    ctx.close()
    ctx = p.chromium.launch_persistent_context(str(profile_dir), channel='msedge', headless=True, offline=True)
    pg = ctx.new_page()
    pg.add_init_script('window.requestAnimationFrame=()=>0')
    pg.goto((ROOT / 'dist' / 'index.html').as_uri())
    pg.get_by_role('button', name='ДЕМО', exact=True).click()
    pg.get_by_role('button', name='ПРОДОЛЖИТЬ ДЕМО', exact=True).click()
    assert pg.evaluate('X.game.number===7&&X.profile.difficulty===2')
    reopened = pg.evaluate('''() => ({time:X.game.time,hp:X.game.player.hp,shots:X.game.shots.items.filter(s=>s.active).length})''')
    assert saved == reopened, (saved, reopened)
    ctx.close()
    report['processRestart'] = reopened
    (ART / 'demo-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print('PASS: demo UI, isolation, checkpoints, economy, 4 difficulties, 20-level natural autopilot cycle',flush=True)
