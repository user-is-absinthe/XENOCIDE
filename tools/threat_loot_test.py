"""Check readable hostile projectiles, quiet loot and hover/pickup feedback."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "artifacts"
ART.mkdir(exist_ok=True)
os.environ["TEMP"] = os.environ["TMP"] = str(ROOT / ".venv" / "tmp")

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 720}, offline=True)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto((ROOT / "dist" / "index.html").as_uri())
    report = page.evaluate("""() => {
      X.Debug.enter();X.profile.owned=X.weapons.map((w,i)=>i);
      X.profile.settings.darkMode=true;X.game.start(0);X.game.state='pause';
      X.UI.hide();document.getElementById('toast').classList.remove('visible');
      const game=X.game,p=game.player;
      game.player.invuln=0;game.time=8;game.loot=[];
      Object.keys(X.ammo).forEach((ammoType,i)=>game.loot.push({x:p.x+70+i*43,y:p.y,kind:'ammo',ammoType,amount:1}));
      game.loot.push({x:p.x+70,y:p.y-65,kind:'health',amount:1});
      for(const [i,color] of ['#c0e75b','#e38cbd'].entries()) game.shot(p.x+145+i*90,p.y-55,Math.PI,{speed:235,range:800,damage:10,color,radius:6},true);
      const ctx=X.Render.ctx,text=[],original=ctx.fillText;
      ctx.fillText=function(s,...args){text.push(s);return original.call(this,s,...args)};
      game.mouse.x=0;game.mouse.y=0;X.Render.draw(game,0);
      if(Object.values(X.ammo).some(a=>text.includes(a.short))) throw Error('Persistent loot labels remain');
      const item=game.loot[0];game.mouse.x=item.x-game.camera.x;game.mouse.y=item.y-game.camera.y;
      text.length=0;X.Render.draw(game,0);
      if(!text.some(s=>s.startsWith(X.ammo.light.name+' +'))) throw Error('No hover tooltip');
      ctx.fillText=original;
      const shot=game.shots.items.find(s=>s.active),
        sx=Math.round((shot.x-game.camera.x)*X.Render.dpr),sy=Math.round((shot.y-game.camera.y)*X.Render.dpr),
        pixel=ctx.getImageData(sx,sy,1,1).data;
      if(Math.max(...pixel.slice(0,3))<180) throw Error('Hostile shot hidden by darkness');
      const savedLoot=game.loot;
      game.loot=[{x:p.x,y:p.y,kind:'health',amount:1},{x:p.x,y:p.y,kind:'ammo',ammoType:'light',amount:1}];
      p.hp=20;game.lootStep();
      const toast=document.getElementById('toast').textContent;
      if(!toast.includes('Аптечка +') || !toast.includes(X.ammo.light.name+' +')) throw Error('Missing pickup feedback');
      if(p.hp<=20 || game.loot.length) throw Error('Pickup failed');
      game.loot=savedLoot;game.mouse.x=0;game.mouse.y=0;
      document.getElementById('toast').classList.remove('visible');X.Render.draw(game,0);
      return {hostileShotVisible:true,noPersistentLabels:true,hover:true,pickups:true,icons:Object.keys(X.Loot.icons).length,version:X.version};
    }""")
    page.screenshot(path=str(ART / "threat-loot-192-dark.png"))
    page.evaluate("X.profile.settings.darkMode=false;X.Render.draw(X.game,0)")
    page.screenshot(path=str(ART / "threat-loot-192.png"))
    assert not errors, errors
    print("PASS", report)
    browser.close()
