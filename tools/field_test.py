"""Edge file://: новые шесть А/Б веток, напалм и полный гранатный зонтик."""
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
    report=page.evaluate((ROOT/'tools'/'field_checks.js').read_text(encoding='utf-8'))
    page.evaluate('X.profile=X.Save.defaults();X.profile.owned=X.weapons.map((_,i)=>i);X.profile.unlocked=20;X.profile.credits=1e7;X.UI.shop()')
    for i in [0,1,2,4,5,6]:
        card=page.locator(f'[data-weapon="{i}"]')
        assert 'ЛКМ' in card.locator('.weapon-mod-info').inner_text() and 'А ·' not in card.locator('.weapon-mod-info').inner_text()
        assert 'ПКМ' in card.locator('.weapon-tuning-info').inner_text() and 'Б ·' not in card.locator('.weapon-tuning-info').inner_text()
        for mode in ['mod','tune']:
            for rank in range(5):
                button=card.locator(f'[data-act="{mode}:{i}"]');button.scroll_into_view_if_needed()
                top=page.locator('.panel').evaluate('(e)=>e.scrollTop');button.click()
                scroll=page.locator('.panel').evaluate('(e)=>({top:e.scrollTop,max:e.scrollHeight-e.clientHeight})')
                assert abs(scroll['top']-min(top,scroll['max']))<=1,'shop scroll jump'
            assert button.is_disabled()
    page.locator('[data-weapon="0"]').scroll_into_view_if_needed();page.mouse.move(5,5)
    page.evaluate('X.UI.hideWeaponTooltip();document.getElementById("toast").classList.remove("visible")');page.wait_for_timeout(500)
    page.screenshot(path=str(ART/'field-branches.png'))
    for width,height in [(640,800),(1024,768)]:
        page.set_viewport_size({'width':width,'height':height})
        assert page.locator('.panel').evaluate('(e)=>e.scrollWidth<=e.clientWidth')
    page.set_viewport_size({'width':1280,'height':720})
    original=page.evaluate('X.Save.write(X.profile);JSON.stringify(X.profile)')
    stored=page.evaluate('localStorage.getItem(X.Save.key)')
    assert page.evaluate('!X.Debug.code("MAXWEAPONS")&&!X.Debug.code("MAXPLAYER")')
    page.evaluate('X.UI.menu()');page.get_by_role('button',name='ПОЛИГОН · УРОВНИ И ЧИТЫ',exact=True).click()
    shop=page.get_by_role('button',name='МАГАЗИН ПОЛИГОНА · ПРОКАЧКА',exact=True)
    assert shop.locator('xpath=ancestor::section[1]').get_attribute('class')=='debug-supply'
    assert page.locator('.debug-supply [data-act^="cheat:"]').count()==0
    page.locator('[data-act="cheat:MAXWEAPONS"]').click()
    assert page.evaluate('X.profile.owned.length===13&&X.weapons.filter(w=>!w.debugOnly).every(w=>X.profile.weaponMods[w.id]===5&&X.profile.weaponTuning[w.id]===5)')
    page.locator('#cheat-code').fill('maxplayer');page.get_by_role('button',name='ВВЕСТИ',exact=True).click()
    assert page.evaluate('X.upgrades.every(u=>X.profile.upgrades[u.id]===u.max)')
    page.evaluate('document.getElementById("toast").classList.remove("visible")');page.wait_for_timeout(500)
    page.screenshot(path=str(ART/'sandbox-sections.png'))
    page.get_by_role('button',name='ОТКРЫТАЯ АРЕНА · БЕЗ ВНУТРЕННИХ СТЕН',exact=True).click()
    page.get_by_role('button',name='НАЧАТЬ МИССИЮ',exact=True).click()
    assert page.evaluate('X.game.player.maxHp===250&&X.game.player.maxDashCharges===5&&X.game.player.maxStamina===225&&X.game.mags[9]===15')
    page.evaluate('X.game.player.hp=10;X.game.player.stamina=0;X.game.player.dashCharges=0;X.Debug.code("MAXPLAYER");X.Debug.code("MAXWEAPONS")')
    assert page.evaluate('X.game.player.hp===250&&X.game.player.stamina===225&&X.game.player.dashCharges===5&&X.game.mags[10]===14')
    page.evaluate('X.UI.menu()')
    assert page.evaluate('JSON.stringify(X.profile)')==original,'sandbox cheat changes profile'
    assert page.evaluate('localStorage.getItem(X.Save.key)')==stored,'sandbox cheat changes storage'
    # Прямая проверка поведения с клавиатурой/мышью: упор запрещает рывок.
    page.evaluate('''() => {for(const k in X.ammo)X.profile.ammo[k]=99999;X.game.start(1);X.game.weapon=5;X.game.waveTimer=9999;X.game.player.x=600;X.game.player.y=600;}''')
    page.mouse.move(900,360);page.mouse.down(button='right');page.keyboard.down('KeyD');page.keyboard.press('Space');page.wait_for_timeout(200);page.keyboard.up('KeyD');page.mouse.up(button='right')
    assert page.evaluate('X.game.player.dashCharges===X.game.player.maxDashCharges&&X.game.stats.shots>0'),'real input brace'
    page.evaluate('X.game.pause()')
    page.evaluate('''() => {
      const g=X.game;g.start(1);g.waveTimer=9999;g.player.x=600;g.player.y=600;g.weapon=1;g.player.angle=0;g.hash.clear();
      const marked=g.spawn(0,780,600);marked.hp=marked.maxHp=10000;g.hash.insert(marked);g.fire(true);for(let i=0;i<20;i++)g.projectileStep(1/60);
      const bound=g.spawn(2,850,700);bound.cripple=2;const suppressed=g.spawn(5,900,500);suppressed.suppressed=1;
      g.gunState.pistolStreak=4;g.pause();X.UI.hide();document.getElementById('toast').classList.remove('visible');X.UI.hudClock=-1;X.UI.hud(g);
    }''');page.wait_for_timeout(500);page.screenshot(path=str(ART/'field-status-effects.png'))
    page.evaluate('''() => {
      X.UI.menu();X.Debug.enter();X.Debug.code('MAXWEAPONS');X.Debug.code('MAXPLAYER');const g=X.game;g.start(0);g.weapon=9;g.player.x=1200;g.player.y=900;g.player.angle=0;g.fire(true);
      for(let i=0;i<180;i++)g.projectileStep(1/60);for(const b of g.blasts)b.life=.06;
      g.pause();X.UI.hide();document.getElementById('toast').classList.remove('visible');X.UI.hudClock=-1;X.UI.hud(g);
    }''');page.wait_for_timeout(500);page.screenshot(path=str(ART/'grenade-umbrella-rings.png'))
    page.evaluate('X.UI.menu()')
    stress=page.evaluate('''() => {
      const g=X.game;X.profile=X.Save.defaults();X.profile.owned=X.weapons.map((_,i)=>i);for(const w of X.weapons){X.profile.weaponMods[w.id]=5;X.profile.weaponTuning[w.id]=5;}
      for(const k in X.ammo)X.profile.ammo[k]=99999;g.start(1);g.waveTimer=9999;g.wave=g.level.waves;g.player.x=1000;g.player.y=900;g.player.invuln=99999;
      g.map=new X.Map(60,40);g.map.carve(1,1,58,38);g.navSmall=g.map.navigation(14);g.navBig=g.map.navigation(34);g.navCore=g.map.navigation(34);
      const rng=new X.RNG(1400);for(let i=0;i<220;i++){const a=rng.next()*7,r=150+rng.next()*550,e=g.spawn(i%10,1000+Math.cos(a)*r,900+Math.sin(a)*r);e.hp=e.maxHp=1e7;}
      X.Render.prepare(g);const frames=[];for(let i=0;i<900;i++){const t=performance.now();if(i%20===0){g.cancelBurst();g.weapon=[0,1,2,4,5,6,9][Math.floor(i/40)%7];g.mags[g.weapon]=X.Armory.mag(X.weapons[g.weapon]);g.reload=0;g.cool=0;g.fire(Math.floor(i/20)%2===0);}g.update(1/60);X.Render.draw(g,1/60);frames.push(performance.now()-t);}
      if(g.state!=='play')throw Error('field stress ended');for(const o of [...g.shots.items,...g.enemies.items].filter(o=>o.active))if(!Number.isFinite(o.x+o.y))throw Error('nonfinite field stress');
      frames.sort((a,b)=>a-b);g.pause();return {frames:900,startedEnemies:220,endingEnemies:g.activeEnemies(),p95Ms:+frames[855].toFixed(2),maxMs:+frames.at(-1).toFixed(2)};
    }''')
    report.update(uiPurchases=60,oldLabelsRemoved=True,shopSeparated=True,maxWeaponsCheat=True,maxPlayerCheat=True,cheatsIsolated=True,realInputBrace=True,stress=stress)
    assert not errors and not network,(errors,network)
    browser.close()
    # Три реальных снимка и полный перезапуск процесса Edge.
    profile=ROOT/'.venv'/'edge-field-profile'
    ctx=p.chromium.launch_persistent_context(str(profile),channel='msedge',headless=True,offline=True)
    pg=ctx.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(url)
    pg.evaluate('''() => {
      X.profile=X.Save.defaults();X.Slots.clear();X.profile.owned=X.weapons.map((_,i)=>i);for(const w of X.weapons){X.profile.weaponMods[w.id]=5;X.profile.weaponTuning[w.id]=5;}for(const k in X.ammo)X.profile.ammo[k]=99999;
      const g=X.game;g.start(1);g.player.x=600;g.player.y=600;g.player.angle=0;g.weapon=1;g.waveTimer=9999;const e=g.spawn(0,720,600);e.hp=e.maxHp=10000;g.hash.insert(e);g.fire(true);for(let i=0;i<20;i++)g.projectileStep(1/60);g.gunState.pistolStreak=4;g.pause();X.Slots.save(0);
      g.start(1);g.weapon=4;g.mags[4]=2;g.fire(false);g.pause();X.Slots.save(1);
      g.start(1);g.weapon=0;g.fire(true);g.pause();X.Slots.save(2);
    }''');ctx.close()
    ctx=p.chromium.launch_persistent_context(str(profile),channel='msedge',headless=True,offline=True)
    pg=ctx.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(url)
    assert pg.evaluate('X.Slots.entries.every(s=>s&&s.profile.weaponMods.blade===5&&s.profile.weaponTuning.sniper===5)')
    assert pg.evaluate('''() => {X.Slots.restore(0);X.game.pause();return X.game.gunState.pistolStreak===4&&X.game.enemies.items.some(e=>e.active&&e.weakTime>0);}''')
    assert pg.evaluate('''() => {X.Slots.restore(1);const g=X.game;g.pause();return g.pendingBurst.remaining===1&&g.pendingBurst.fired===1;}''')
    assert pg.evaluate('''() => {const g=X.game;g.burstStep(.2);return g.shots.items.filter(s=>s.active).length===1&&!g.shots.items.some(s=>s.active&&s.armorPierce);}'''),'partial burst restored as third round'
    assert pg.evaluate('''() => {X.Slots.restore(2);X.game.pause();return X.game.gunState.parry>0&&X.game.gunState.parryCooldown>0;}''')
    pg.evaluate('X.UI.settings()')
    with pg.expect_download() as download:pg.get_by_role('button',name='ЭКСПОРТ JSON',exact=True).click()
    export=ART/'field-export.json';download.value.save_as(str(export))
    pg.evaluate('X.UI.action("doreset")');pg.locator('#import').set_input_files(str(export));pg.wait_for_timeout(100)
    assert pg.evaluate('X.Slots.entries[0].profile.checkpoint.gunState.pistolStreak===4&&X.profile.weaponMods.blade===5')
    ctx.close()
    assert not errors and not network,(errors,network)
    report.update(fullEdgeRestart=True,json=True,version='1.4.1',errors=errors,network=0)
    (ART/'field-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False),flush=True)
