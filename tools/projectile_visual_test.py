"""Check animated fire/plasma rendering and capture actual weapon streams."""
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
      X.game.start(1);X.game.state='pause';
      const game=X.game, rng=game.rng.seed;
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
      const g=canvas.getContext('2d');
      g.imageSmoothingEnabled=false;
      const draw=(kind,time,payload=null,stuck=false) => {
        g.clearRect(0,0,256,128);
        const shot={x:128,y:64,vx:stuck?0:400,vy:0,life:.4,range:300,radius:8,kind,payload,stuck,fuse:.8};
        X.Render.drawEnergyShot(g,shot,time);
        return Array.from(g.getImageData(0,0,256,128).data);
      };
      for(const kind of ['flame','plasma']) {
        const a=draw(kind,1), b=draw(kind,1.2), still=draw(kind,1);
        if(!a.some((v,i)=>v!==b[i])) throw Error('No animation: '+kind);
        if(a.some((v,i)=>Math.abs(v-still[i])>3)) throw Error('Unstable paused frame: '+kind);
        let tail=0,front=0;
        for(let y=0;y<128;y++) for(let x=0;x<256;x++) {
          const alpha=a[(y*256+x)*4+3];
          if(x<116) tail+=alpha;
          if(x>140) front+=alpha;
        }
        if(tail<=front) throw Error('Tail does not trail: '+kind);
      }
      for(const [kind,payload] of [['napalm','napalm'],['plasma','sticky']]) {
        for(const stuck of [false,true]) draw(kind,1,payload,stuck);
      }
      for(let quality=0;quality<3;quality++) {
        X.profile.settings.quality=quality;
        game.addSurface(game.player.x+80,game.player.y,40,10,3,'fire');
        game.addSurface(game.player.x+150,game.player.y,40,10,3,'energy');
        for(const dark of [false,true]) {
          X.profile.settings.darkMode=dark;X.Render.draw(game,0);
        }
      }
      // Render calls must not consume combat or particle RNG state.
      const before=game.visualRng.seed;
      X.Render.draw(game,0);X.Render.draw(game,0);
      if(game.rng.seed!==rng || game.visualRng.seed!==before) throw Error('Rendering changed RNG');
      return {animation:true,pauseStable:true,tailDirection:true,qualities:3,version:X.version};
    }""")
    for kind, hold in [("flame", 450), ("plasma", 650)]:
        page.evaluate("""kind => {
          X.Debug.enter();X.profile.settings.darkMode=true;X.profile.settings.quality=2;
          X.profile.owned=X.weapons.map((w,i)=>i);
          for(const key in X.profile.ammo)X.profile.ammo[key]=999;
          X.game.start(0);X.game.waveTimer=999;X.game.player.invuln=30;
          X.game.weapon=X.weapons.findIndex(w=>w.id===kind);
          X.game.mouse.x=1000;X.game.mouse.y=324;X.game.mouse.left=true;
          document.getElementById('toast').classList.remove('visible');
        }""", kind)
        page.wait_for_timeout(hold)
        page.evaluate("X.game.state='pause';X.game.mouse.left=false;X.UI.hide();X.Render.draw(X.game,0)")
        page.screenshot(path=str(ART / f"projectile-191-{kind}.png"))
    page.evaluate("""() => {
      const game=X.game;
      game.mouse.left=game.mouse.right=false;game.shots.clear();game.surfaces.clear();
      game.muzzle=0;game.time=12;
      game.addSurface(game.player.x+140,game.player.y,65,10,3,'fire');
      game.addSurface(game.player.x+320,game.player.y,65,10,3,'energy');
      X.Render.draw(game,0);
    }""")
    page.screenshot(path=str(ART / "projectile-191-surfaces.png"))
    assert not errors, errors
    print("PASS", report)
    browser.close()
