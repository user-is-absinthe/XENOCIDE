"""Edge file://: A/B оружие, очереди, конечность боезапаса и сохранение эффектов."""
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
    report=page.evaluate((ROOT/'tools'/'modes_checks.js').read_text(encoding='utf-8'))
    page.evaluate('X.profile=X.Save.defaults();X.profile.owned=X.weapons.map((_,i)=>i);X.profile.unlocked=20;X.profile.credits=1e7;X.UI.shop()')
    for i in [3,7,8,9,10,11,12]:
        card=page.locator(f'[data-weapon="{i}"]')
        assert 'ЛКМ' in card.locator('.weapon-mod-info').inner_text() and 'А ·' not in card.locator('.weapon-mod-info').inner_text()
        assert 'ПКМ' in card.locator('.weapon-tuning-info').inner_text() and 'Б ·' not in card.locator('.weapon-tuning-info').inner_text()
        for mode in ['mod','tune']:
            for rank in range(5):
                button=card.locator(f'[data-act="{mode}:{i}"]')
                button.scroll_into_view_if_needed()
                top=page.locator('.panel').evaluate('(e)=>e.scrollTop')
                button.click()
                page.evaluate('()=>new Promise(requestAnimationFrame)')
                scroll=page.locator('.panel').evaluate('(e)=>({top:e.scrollTop,max:e.scrollHeight-e.clientHeight})')
                assert abs(scroll['top']-min(top,scroll['max']))<=1,('shop scroll jump',i,mode,rank,top,scroll)
            assert button.is_disabled()
    page.mouse.move(5,5);page.evaluate('X.UI.hideWeaponTooltip();document.getElementById("toast").classList.remove("visible")')
    page.locator('[data-weapon="8"]').scroll_into_view_if_needed()
    page.wait_for_timeout(500)
    page.screenshot(path=str(ART/'weapon-modes-shop.png'))
    for width,height in [(640,800),(1024,768)]:
        page.set_viewport_size({'width':width,'height':height})
        assert page.locator('.panel').evaluate('(e)=>e.scrollWidth<=e.clientWidth'),'shop overflow'
    page.set_viewport_size({'width':1280,'height':720})
    stress=page.evaluate('''() => {
      const g=X.game;X.profile.settings.mute=true;for(const k in X.ammo)X.profile.ammo[k]=99999;g.start(1);
      g.map=new X.Map(60,40);g.map.carve(1,1,58,38);g.navSmall=g.map.navigation(14);g.navBig=g.map.navigation(34);g.navCore=g.map.navigation(34);
      g.player.x=800;g.player.y=800;g.player.invuln=9999;g.waveTimer=9999;g.loot=[];g.wave=g.level.waves;
      const rng=new X.RNG(1300);for(let i=0;i<220;i++){let a=rng.next()*Math.PI*2,r=220+rng.next()*450;let e=g.spawn(i%10,800+Math.cos(a)*r,800+Math.sin(a)*r);e.hp=e.maxHp=1e6;}
      for(let i=0;i<32;i++)g.addSurface(600+(i%8)*60,650+Math.floor(i/8)*70,110,90,15,i%2?'fire':'energy');
      g.weapon=10;g.mouse.x=900;g.mouse.y=324;X.Render.prepare(g);let samples=[];
      for(let i=0;i<900;i++){
        const t=performance.now();if(i%30===0){g.charge=.65;g.mags[10]=14;g.reload=0;g.fire(false);}
        g.update(1/60);X.Render.draw(g,1/60);samples.push(performance.now()-t);
      }
      if(g.state!=='play'||g.activeEnemies()>X.C.maxEnemies||g.surfaces.items.filter(o=>o.active).length>32)throw Error('mode stress state/cap');
      for(const o of [...g.shots.items,...g.surfaces.items,...g.enemies.items].filter(o=>o.active))if(!Number.isFinite(o.x+o.y))throw Error('nonfinite mode stress');
      samples.sort((a,b)=>a-b);g.state='pause';return {frames:900,startedEnemies:220,surfaceCap:32,p95Ms:+samples[855].toFixed(2),maxMs:+samples.at(-1).toFixed(2),endingEnemies:g.activeEnemies()};
    }''')
    page.evaluate('''() => {
      const g=X.game;X.profile=X.Save.defaults();X.profile.owned=X.weapons.map((_,i)=>i);for(const k in X.ammo)X.profile.ammo[k]=99999;
      X.profile.weaponMods.flame=X.profile.weaponTuning.flame=5;g.start(1);g.player.x=600;g.player.y=600;g.weapon=7;g.player.angle=0;g.hash.clear();
      for(let i=0;i<8;i++){const e=g.spawn(0,800+(i%4)*50,530+Math.floor(i/4)*100);e.hp=e.maxHp=1e6;e.burn=3;g.hash.insert(e);}
      g.addSurface(800,600,124,80,6,'fire');g.camera.x=24;g.camera.y=276;g.mouse.x=800;g.mouse.y=324;X.UI.hide();g.state='pause';
      document.getElementById('toast').classList.remove('visible');
    }''')
    page.wait_for_timeout(500);page.screenshot(path=str(ART/'weapon-modes-napalm.png'))
    # Настоящая очередь через мышь, а не прямой вызов fire.
    page.evaluate('''() => {X.profile=X.Save.defaults();X.profile.owned=[0,1,4];X.profile.ammo.heavy=300;X.game.start(1);X.game.switchWeapon(4);X.game.cool=0;X.game.waveTimer=9999;}''')
    page.mouse.move(900,360);page.mouse.down();page.wait_for_timeout(90);page.mouse.up()
    assert page.evaluate('X.game.mags[4]===33&&X.game.stats.shots===1'),'real mouse burst'
    page.wait_for_timeout(180);assert page.evaluate('!X.game.pendingBurst'),'real mouse queued shots'
    report.update(realUIPurchases=70,shopScrollStable=True,stress=stress,realMouseRifle=True)
    assert not errors and not network,(errors,network)
    browser.close()
    # Сохранение липкой бомбы на движущемся враге, лужи и увеличенных магазинов.
    profile=ROOT/'.venv'/'edge-modes-profile'
    ctx=p.chromium.launch_persistent_context(str(profile),channel='msedge',headless=True,offline=True)
    pg=ctx.new_page();pg.goto(url)
    pg.evaluate('''() => {
      X.profile=X.Save.defaults();X.profile.owned=X.weapons.map((_,i)=>i);X.profile.unlocked=20;
      for(const id of Object.keys(X.Armory.definitions)){X.profile.weaponMods[id]=5;X.profile.weaponTuning[id]=5;}
      for(const k in X.ammo)X.profile.ammo[k]=99999;
      const g=X.game;g.start(1);g.player.x=600;g.player.y=600;g.player.angle=0;g.weapon=8;g.waveTimer=9999;
      const host=g.spawn(0,720,600);host.hp=host.maxHp=10000;g.hash.insert(host);g.fire(true);
      const bomb=g.shots.items.find(s=>s.active);for(let i=0;i<60&&!bomb.stuck;i++)g.projectileStep(1/60);
      g.addSurface(600,600,90,35,5,'fire');g.pause();X.Slots.save(0);
    }''')
    ctx.close()
    ctx=p.chromium.launch_persistent_context(str(profile),channel='msedge',headless=True,offline=True)
    pg=ctx.new_page();pg.goto(url)
    assert pg.evaluate('X.profile.weaponMods.plasma===5&&X.profile.weaponTuning.plasma===5&&X.profile.checkpoint.mags[10]===14')
    pg.get_by_role('button',name='ПРОДОЛЖИТЬ · КОНТРОЛЬНАЯ ТОЧКА',exact=True).click()
    restored=pg.evaluate('''() => {const g=X.game;g.pause();let b=g.shots.items.find(s=>s.active&&s.payload==='sticky');return !!b?.stuck&&b.host?.spawnId===b.hostId&&g.surfaces.items.some(o=>o.active)&&g.mags[10]===14;}''')
    assert restored,'full Edge restart effects'
    pg.evaluate('X.UI.settings()')
    with pg.expect_download() as download:pg.get_by_role('button',name='ЭКСПОРТ JSON',exact=True).click()
    export=ART/'weapon-modes-export.json';download.value.save_as(str(export))
    pg.evaluate('X.UI.action("doreset")');pg.locator('#import').set_input_files(str(export));pg.wait_for_timeout(100)
    assert pg.evaluate('X.profile.weaponMods.plasma===5&&X.Slots.entries[0].profile.checkpoint.weaponEffects.shots.length===1'),'JSON effects/branches'
    pg.evaluate('X.Slots.restore(0);X.game.pause();X.UI.hide();document.getElementById("toast").classList.remove("visible")')
    pg.wait_for_timeout(500);pg.screenshot(path=str(ART/'weapon-modes-sticky.png'))
    ctx.close()
    report.update(fullEdgeRestartEffects=True,jsonEffectsAndSlots=True,errors=errors,network=0,version='1.5.0')
    (ART/'modes-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False),flush=True)
