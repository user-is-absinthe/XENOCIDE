"""Полоса передатчика: реальные атаки, checkpoint и отрисовка в Edge."""
from pathlib import Path
import json, os
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / 'artifacts'
ART.mkdir(exist_ok=True)
os.environ['TEMP'] = os.environ['TMP'] = str(ROOT / '.venv' / 'tmp')
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width':1280,'height':720}, offline=True)
    errors, network = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: network.append(r.url) if r.url.startswith(('http:','https:')) else None)
    page.goto((ROOT / 'dist' / 'index.html').as_uri())
    report = page.evaluate('''() => {
      const assert=(v,m)=>{if(!v)throw Error(m)},g=X.game,levels=[];
      X.profile=X.Save.defaults();
      const c=document.createElement('canvas');c.width=360;c.height=200;
      const ctx=c.getContext('2d');
      const sample=(hp,x)=>{
        ctx.clearRect(0,0,360,200);g.coreHp=hp;ctx.save();
        ctx.translate(180-g.objectives[0].x,140-g.objectives[0].y);
        X.Render.defenseHealth(ctx,g);ctx.restore();
        return Array.from(ctx.getImageData(x,80,1,1).data).join(',');
      };
      for(let n=1;n<=20;n++){
        if(X.levels[n-1].mode!=='defend')continue;
        g.start(n);levels.push(n);
        assert(sample(500,230)==='112,208,176,255','full bar');
        assert(sample(250,120)==='239,180,92,255','half bar color');
        assert(sample(250,230)==='41,59,68,255','half bar width');
        assert(sample(100,120)==='241,111,104,255','critical bar color');
        assert(sample(-10,120)==='41,59,68,255','negative HP bar');
        assert(sample(1000,230)==='112,208,176,255','overfull HP bar');
        g.coreHp=500;const o=g.objectives[0],e=g.spawn(0,o.x,o.y);e.attack=0;
        g.enemyStep(e,1/60);
        assert(g.coreHp<500,'real attack does not damage core');
        const hp=g.coreHp;g.checkpoint();const cp=JSON.parse(JSON.stringify(X.profile.checkpoint));
        g.start(n,cp);assert(g.coreHp===hp,'core HP lost at checkpoint');
        assert(sample(hp,230)==='112,208,176,255','restored bar');
        g.objectives[0].done=true;
        assert(sample(hp,230)==='112,208,176,255','activated transmitter bar hidden');
      }
      g.start(1);ctx.clearRect(0,0,360,200);X.Render.defenseHealth(ctx,g);
      assert(!ctx.getImageData(0,0,360,200).data.some(v=>v),'bar visible in non-defense mission');
      g.start(4);g.coreHp=300;g.player.x=g.objectives[0].x+100;g.player.y=g.objectives[0].y+80;
      g.state='pause';X.UI.hide();X.UI.hud(g);document.getElementById('toast').classList.remove('visible');
      return {levels,realEnemyDamage:true,checkpoint:true,healthColors:true,nonDefenseHidden:true};
    }''')
    page.wait_for_timeout(500)
    page.screenshot(path=str(ART / 'defense-health.png'))
    assert not errors and not network, (errors, network)
    report.update(errors=errors,network=len(network))
    (ART / 'defense-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False))
    browser.close()
