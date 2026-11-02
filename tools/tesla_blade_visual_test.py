"""Check electrical/melee visuals, paused animation and effect cleanup."""
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
      for(const key in X.profile.ammo)X.profile.ammo[key]=1000;
      X.profile.settings.darkMode=true;X.game.start(0);X.game.state='pause';X.UI.hide();
      const game=X.game,p=game.player;
      p.invuln=0;game.time=8;game.weapon=11;game.hash.clear();
      for(const [dx,dy] of [[170,0],[250,-75],[300,70]]) {
        const e=game.spawn(0,p.x+dx,p.y+dy);e.hp=e.maxHp=10000;game.hash.insert(e);
      }
      p.angle=0;game.fire(false);
      if(game.beams.length<2) throw Error('No Tesla chain');
      const canvas=document.createElement('canvas');canvas.width=400;canvas.height=200;
      const g=canvas.getContext('2d',{willReadFrequently:true});
      const beam={x:30,y:100,tx:350,ty:100,color:'#c1afff',width:3,life:.14};
      const capture=time=>{
        g.clearRect(0,0,400,200);X.Render.drawTeslaBeam(g,beam,time);
        return g.getImageData(0,0,400,200).data;
      };
      const a=capture(1),still=capture(1),next=capture(1.1);
      if(a.some((v,i)=>Math.abs(v-still[i])>3)) throw Error('Paused beam changes');
      if(!a.some((v,i)=>v!==next[i])) throw Error('No beam flicker');
      const rng=game.rng.seed,visual=game.visualRng.seed;
      for(let quality=0;quality<3;quality++) {
        X.profile.settings.quality=quality;
        for(const dark of [false,true]) {
          X.profile.settings.darkMode=dark;X.Render.draw(game,0);
          game.arc={angle:0,life:.1,duration:.15,range:110,phase:quality,alt:false};
          game.weapon=0;X.Render.draw(game,0);
          game.gunState.parry=.2;X.Render.draw(game,0);game.gunState.parry=0;
        }
      }
      if(game.rng.seed!==rng||game.visualRng.seed!==visual)throw Error('Render consumed RNG');
      game.state='play';X.Render.draw(game,.3);game.state='pause';
      if(game.beams.length || game.arc.life>0) throw Error('Effects did not expire');
      game.weapon=11;X.profile.settings.darkMode=true;game.beams=[];
      game.cool=game.reload=0;game.fire(false);game.time=8;X.Render.draw(game,0);
      document.getElementById('toast').classList.remove('visible');
      return {teslaChain:true,flicker:true,pauseStable:true,qualities:3,cleanup:true,version:X.version};
    }""")
    page.screenshot(path=str(ART / "tesla-193.png"))
    for phase in range(3):
        page.evaluate("""phase => {
          const game=X.game;game.beams=[];game.weapon=0;
          game.arc={angle:0,life:.065,duration:.15,range:110,phase,alt:false};
          X.Render.draw(game,0);
        }""", phase)
        page.screenshot(path=str(ART / f"blade-193-combo-{phase+1}.png"))
    page.evaluate("""() => {
      const game=X.game;game.arc=null;game.gunState.parry=.25;
      game.bladeImpact={x:game.player.x+55,y:game.player.y,life:.12};
      X.Render.draw(game,0);
    }""")
    page.screenshot(path=str(ART / "blade-193-parry.png"))
    assert not errors, errors
    print("PASS", report)
    browser.close()
