"""Render every sector and verify cached visual detail stays deterministic."""
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
      const hash = canvas => {
        const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        let h=2166136261;
        for(let i=0;i<data.length;i+=4) h=Math.imul(h^data[i]^data[i+1]^data[i+2],16777619);
        return h;
      };
      const themes=new Set();
      for(let n=1;n<=20;n++) {
        X.game.start(n);X.game.state='pause';X.UI.hide();
        const seed=X.game.rng.seed, visual=X.game.visualRng.seed;
        const before=hash(X.Render.floor);
        X.Render.prepare(X.game);
        if(hash(X.Render.floor)!==before) throw Error('Non-deterministic materials: '+n);
        if(X.game.rng.seed!==seed || X.game.visualRng.seed!==visual) throw Error('Visuals changed game RNG');
        themes.add(X.game.level.theme);
        for(const dark of [false,true]) {
          X.profile.settings.darkMode=dark;
          X.Render.draw(X.game,0);
        }
      }
      for(const sprite of X.Render.sprites) {
        const data=sprite.getContext('2d').getImageData(0,0,100,100).data;
        for(let y=0;y<100;y+=2) for(let x=0;x<100;x+=2) {
          const i=(y*100+x)*4;
          for(const offset of [4,400,404]) for(let c=0;c<4;c++)
            if(data[i+c]!==data[i+offset+c]) throw Error('Sprite lost pixel grid');
        }
      }
      return {sectors:20,themes:themes.size,sprites:X.Render.sprites.length,version:X.version};
    }""")
    for sector in [1, 6, 11, 16]:
        page.evaluate("""n => {
          X.profile.settings.darkMode=false;X.game.start(n);X.game.state='pause';
          X.UI.hide();document.getElementById('toast').classList.remove('visible');
          X.game.player.invuln=0;X.game.time=12;X.game.player.angle=-0.2;
          X.Render.draw(X.game,0);
        }""", sector)
        page.screenshot(path=str(ART / f"graphics-190-sector-{sector}.png"))
        if sector == 1:
            page.evaluate("X.profile.settings.darkMode=true;X.Render.draw(X.game,0)")
            page.screenshot(path=str(ART / "graphics-190-dark.png"))
    assert not errors, errors
    print("PASS", report)
    browser.close()
