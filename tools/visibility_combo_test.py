"""Verify hostile shot exposure and persistent, hit-driven blade combo."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
os.environ["TEMP"] = os.environ["TMP"] = str(ROOT / ".venv" / "tmp")
with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page(offline=True)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto((ROOT / "dist" / "index.html").as_uri())
    result = page.evaluate("""() => {
      X.Render.sceneLights=[];
      const game={player:{x:0,y:0,angle:0}}, shot={x:0,y:500};
      X.profile.settings.darkMode=false;
      const normal=X.Render.shotExposure(game,shot);
      X.profile.settings.darkMode=true;
      const dark=X.Render.shotExposure(game,shot),
        near=X.Render.shotExposure(game,{x:40,y:0}),
        torch=X.Render.shotExposure(game,{x:400,y:0});
      if(normal!==1 || dark>.1 || near<.95 || torch<dark+.2) throw Error('Wrong exposure');
      X.Render.sceneLights=[{x:0,y:500,radius:80,power:1}];
      if(X.Render.shotExposure(game,shot)<.95) throw Error('Other light ignored');
      const canvas=document.createElement('canvas');canvas.width=200;canvas.height=100;
      const g=canvas.getContext('2d',{willReadFrequently:true});
      const sample=exposure=>{
        g.fillStyle='#000000';g.fillRect(0,0,200,100);
        X.Render.drawHostileShot(g,{x:100,y:50,radius:6,color:'#c0e75b',vx:200,vy:0},1,exposure);
        return Math.max(...g.getImageData(100,50,1,1).data.slice(0,3));
      };
      const bright=sample(normal),dim=sample(dark);
      if(dim>=bright*.9 || dim<120 || bright<230) throw Error('Shot brightness regression: '+bright+'/'+dim);
      X.profile=X.Save.defaults();X.profile.owned=X.weapons.map((w,i)=>i);
      X.game.start(1);const battle=X.game,p=battle.player;
      battle.weapon=0;p.angle=0;battle.hash.clear();
      const target=battle.spawn(0,p.x+45,p.y);target.hp=target.maxHp=10000;battle.hash.insert(target);
      const damage=[];
      for(let i=0;i<4;i++) {const hp=target.hp;battle.fire(false);damage.push(hp-target.hp)}
      if(!(damage[0]<damage[1]&&damage[1]<damage[2]&&damage[2]===damage[3])) throw Error('Combo damage');
      battle.gunStep(30);if(battle.gunState.combo!==2) throw Error('Combo timed out');
      const profile=X.Save.validate({...X.profile,checkpoint:battle.snapshot()});
      if(profile.checkpoint.gunState.combo!==2) throw Error('Combo lost in checkpoint');
      X.profile=profile;battle.start(1,profile.checkpoint);
      if(battle.gunState.combo!==2) throw Error('Combo lost on restore');
      battle.hash.clear();battle.fire(false);battle.fire(false);
      if(battle.gunState.combo!==0) throw Error('Empty swing grew combo');
      battle.gunState.combo=2;battle.switchWeapon(1);battle.switchWeapon(0);
      if(battle.gunState.combo!==0) throw Error('Switch did not reset combo');
      return {normalBrightness:bright,darkBrightness:dim,torch,hitOnlyCombo:true,comboCheckpoint:true,version:X.version};
    }""")
    assert not errors, errors
    print("PASS", result)
    browser.close()
