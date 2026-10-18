"""Демо: испорченное/недоступное хранилище, ввод наблюдателя и живой рендер."""
from pathlib import Path
import json, os
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / 'artifacts'
ART.mkdir(exist_ok=True)
os.environ['TEMP'] = os.environ['TMP'] = str(ROOT / '.venv' / 'tmp')
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    context = browser.new_context(viewport={'width':1280,'height':800},offline=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto((ROOT/'dist'/'index.html').as_uri())
    data = page.evaluate('''() => {
      const assert=(v,m)=>{if(!v)throw Error(m)},g=X.game;
      for(const bad of ['{',JSON.stringify({version:7}),JSON.stringify({version:1,stage:21,cycle:1})]) {
        X.Demo.saved=null;localStorage.setItem(X.Demo.key,bad);
        assert(X.Demo.load()===null,'corrupt demo');
      }
      localStorage.removeItem(X.Demo.key);X.Demo.enter(false,1);g.pause();
      const set=Storage.prototype.setItem;
      Storage.prototype.setItem=function(){throw Error('blocked test storage')};
      g.resume();g.time=123;g.pause();X.UI.menu();X.Demo.enter(true);
      assert(g.time===123,'memory fallback retains latest checkpoint');
      Storage.prototype.setItem=set;
      g.pause();X.UI.menu();X.Demo.enter(false,0);
      const keys=X.profile.settings.keys;
      g.keys.clear();g.keys.add(keys.right);
      document.body.dispatchEvent(new KeyboardEvent('keyup',{code:keys.right,bubbles:true}));
      assert(g.keys.has(keys.right),'observer keyup');
      const weapon=g.weapon;
      document.body.dispatchEvent(new KeyboardEvent('keydown',{code:'Digit1',bubbles:true}));
      assert(g.weapon===weapon,'observer weapon selection');
      return {corruptStorage:true,blockedStorage:true,observerInput:true};
    }''')
    page.wait_for_timeout(1500)
    assert page.evaluate('X.game.time') > 1
    page.evaluate('''() => {X.game.waveTimer=0;for(let i=0;i<480;i++)X.game.update(1/60);X.UI.hudClock=-1;X.UI.hud(X.game);X.Render.draw(X.game,0)}''')
    assert 'ДЕМО' in page.locator('#hud').inner_text()
    page.screenshot(path=str(ART/'demo-live.png'))
    page.keyboard.press('Escape')
    time = page.evaluate('X.game.time')
    page.wait_for_timeout(150)
    assert page.evaluate('X.game.state==="pause"')
    assert page.evaluate('X.game.time') == time
    page.get_by_role('button', name='ГЛАВНОЕ МЕНЮ', exact=True).click()
    page.get_by_role('button', name='ДЕМО', exact=True).click()
    page.screenshot(path=str(ART/'demo-resume.png'))
    assert page.get_by_role('button',name='ПРОДОЛЖИТЬ ДЕМО',exact=True).is_visible()
    page.locator('#demo-difficulty').select_option('2')
    page.get_by_role('button',name='НАЧАТЬ ДЕМО ЗАНОВО',exact=True).click()
    assert page.evaluate('X.game.number===1 && X.game.difficulty===2 && X.Demo.cycle===1 && X.game.time<1')
    assert not errors, errors
    data.update(liveFrames=True,newDemoReset=True,errors=errors)
    (ART/'demo-edge-report.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(data,ensure_ascii=False),flush=True)
    browser.close()
