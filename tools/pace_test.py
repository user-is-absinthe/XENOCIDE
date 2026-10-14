from pathlib import Path
import json,os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
ART=ROOT/'artifacts';ART.mkdir(exist_ok=True)
os.environ['TEMP']=os.environ['TMP']=str(ROOT/'.venv'/'tmp')
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    results=[]
    for width,height,dpi in [(1280,720,1),(640,800,2)]:
        context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=dpi,offline=True)
        page=context.new_page();errors=[];network=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('request',lambda r:network.append(r.url) if r.url.startswith(('http:','https:')) else None)
        page.goto((ROOT/'dist'/'index.html').as_uri())
        page.evaluate('X.profile=X.Save.defaults();X.profile.unlocked=20;X.profile.credits=100000;X.UI.shop()')
        names=page.evaluate('X.weapons.map(w=>w.name)')
        for i,name in enumerate(names):
            card=page.locator(f'[data-weapon="{i}"]');card.hover()
            tip=page.locator('#weapon-tooltip');tip.wait_for(state='visible',timeout=2000)
            content=tip.text_content();assert name in content and 'Сильные стороны' in content and 'Слабые стороны' in content
            box=tip.bounding_box();assert box['x']>=0 and box['y']>=0 and box['x']+box['width']<=width and box['y']+box['height']<=height,box
            assert tip.evaluate('(t)=>getComputedStyle(t).pointerEvents')=='none'
        page.screenshot(path=str(ART/f'weapon-tooltip-{width}.png'))
        page.keyboard.press('Escape');assert page.locator('#weapon-tooltip').is_hidden()
        card=page.locator('[data-weapon="1"]');card.focus();assert page.locator('#weapon-tooltip').is_visible()
        page.keyboard.press('Tab');assert page.evaluate('document.activeElement.tagName')=='BUTTON','keyboard focus trapped'
        page.get_by_role('button',name='МЕНЮ',exact=True).click();assert page.locator('#weapon-tooltip').is_hidden()
        page.evaluate('X.UI.shop()');page.locator('[data-weapon="2"]').hover();before=page.evaluate('X.profile.credits');page.locator('[data-act="buyweapon:2"]').click();assert page.evaluate('X.profile.credits')==before-450
        page.evaluate('X.UI.menu();X.profile.unlocked=1;X.profile.owned=[0,1];X.UI.shop()');assert page.locator('[data-weapon="3"]').count()==0
        result=page.evaluate((ROOT/'tools'/'pace_checks.js').read_text(encoding='utf-8'))
        page.evaluate('''() => {X.profile.settings.quality=2;X.game.start(1);X.game.player.x=650;X.game.player.y=610;X.game.player.invuln=100;X.game.wave=X.game.level.waves;X.game.waveTimer=999;X.game.weapon=7;X.game.loot=[];for(let i=0;i<4;i++){const e=X.game.spawn([0,2,5,8][i],760+i*92,610);e.hp=e.maxHp=1000;e.burn=3;}X.game.mouse.x=900;X.game.mouse.y=324;}''')
        page.wait_for_timeout(100);page.screenshot(path=str(ART/f'burning-enemies-{width}.png'))
        fire_load=None
        if width==1280:
            fire_load=page.evaluate('''() => {
              const g=X.game;g.start(20);g.player.x=1200;g.player.y=900;g.wave=g.level.waves;
              const rng=new X.RNG(114);let attempts=0;
              while(g.activeEnemies()<220&&attempts++<5000){let x=700+rng.next()*1000,y=600+rng.next()*600;if(g.map.fits(x,y,34)){const e=g.spawn(attempts%10,x,y);e.burn=3;}}
              const samples=[];for(let i=0;i<180;i++){g.time=i/60;let t=performance.now();X.Render.draw(g,1/60);samples.push(performance.now()-t);}samples.sort((a,b)=>a-b);
              return {burning:g.activeEnemies(),renderedFrames:180,p95Ms:+samples[Math.floor(samples.length*.95)].toFixed(2)};
            }''')
        assert not errors and not network,(errors,network)
        results.append({'viewport':[width,height],'dpi':dpi,'weaponTips':13,'checks':result,'fireLoad':fire_load})
        context.close()
    browser.close()
    (ART/'pace-report.json').write_text(json.dumps({'PASS':results},ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'PASS':results},ensure_ascii=False))
