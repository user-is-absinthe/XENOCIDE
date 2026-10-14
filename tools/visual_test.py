from pathlib import Path
import os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
ART=ROOT/'artifacts';ART.mkdir(exist_ok=True)
os.environ['TEMP']=os.environ['TMP']=str(ROOT/'.venv'/'tmp')
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    context=browser.new_context(viewport={'width':1440,'height':900},device_scale_factor=1,offline=True)
    page=context.new_page();errors=[];failed=[];net=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('requestfailed',lambda r:failed.append(r.url))
    page.on('request',lambda r:net.append(r.url) if r.url.startswith(('http:','https:')) else None)
    page.goto((ROOT/'dist'/'index.html').as_uri())
    page.screenshot(path=str(ART/'menu.png'))
    page.evaluate('''() => {
      X.profile.owned=X.weapons.map((w,i)=>i);X.profile.unlocked=20;X.profile.credits=18000;
      for(const k in X.profile.ammo)X.profile.ammo[k]=500;
      X.game.start(11);X.game.player.x=1150;X.game.player.y=900;X.game.weapon=8;
      X.game.player.invuln=30;X.game.wave=X.game.level.waves;X.game.waveTimer=999;
      const rng=new X.RNG(11);for(let i=0;i<45;i++){let a=rng.next()*6.28,r=200+rng.next()*430,x=1150+Math.cos(a)*r,y=900+Math.sin(a)*r;if(X.game.map.fits(x,y,34))X.game.spawn(i%10,x,y,i%5===0);}
      X.game.mouse.x=900;X.game.mouse.y=350;X.game.mouse.left=true;
    }''')
    page.wait_for_timeout(850);page.screenshot(path=str(ART/'combat.png'))
    page.evaluate('X.game.pause();X.profile.checkpoint=null;X.UI.shop()')
    page.screenshot(path=str(ART/'shop.png'))
    page.evaluate('X.UI.menu()');page.set_viewport_size({'width':1024,'height':768});page.screenshot(path=str(ART/'menu-1024.png'))
    assert page.evaluate('document.querySelector(".panel").scrollWidth<=document.querySelector(".panel").clientWidth')
    context.close()
    context=browser.new_context(viewport={'width':1024,'height':768},device_scale_factor=2,offline=True)
    page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto((ROOT/'dist'/'index.html').as_uri());page.evaluate('X.game.start(1)')
    page.mouse.move(700,400);page.mouse.down();page.wait_for_timeout(100);page.mouse.up()
    assert page.evaluate('X.Render.canvas.width===2304&&X.game.mags[1]<14')
    page.evaluate("window.dispatchEvent(new Event('blur'))")
    assert page.evaluate('X.game.state')=='pause'
    assert not errors and not failed and not net,(errors,failed,net)
    print('PASS: dist file:// offline, Edge '+browser.version+', zero errors/network, menu/combat/shop screenshots, 1024x768 + DPR2, focus loss pause')
    browser.close()
