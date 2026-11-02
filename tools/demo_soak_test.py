"""Полный естественный цикл демо на указанной сложности (0–3), без выдачи ресурсов."""
from pathlib import Path
import json, os, sys
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / 'artifacts'
ART.mkdir(exist_ok=True)
os.environ['TEMP'] = os.environ['TMP'] = str(ROOT / '.venv' / 'tmp')
difficulty = int(sys.argv[1]) if len(sys.argv) > 1 else 3
assert difficulty in range(4)
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    context = browser.new_context(offline=True)
    page = context.new_page()
    page.add_init_script('window.requestAnimationFrame=()=>0')
    errors, network = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: network.append(r.url) if r.url.startswith(('http:', 'https:')) else None)
    page.goto((ROOT / 'dist' / 'index.html').as_uri())
    page.evaluate('''difficulty => {
      X.Demo.enter(false,difficulty);X.profile.settings.mute=true;X.profile.settings.quality=0;
      window.transitions=[];const finish=X.Demo.finished;
      X.Demo.finished=function(win){transitions.push({stage:X.game.number,win,time:+X.game.time.toFixed(1),reason:X.game.resultReason});finish.call(this,win)};
    }''', difficulty)
    for chunk in range(600):
        state = page.evaluate('''() => {
          const g=X.game;for(let i=0;i<6000&&X.Demo.cycle===1;i++)g.update(1/60);
          return {cycle:X.Demo.cycle,stage:g.number,time:+g.time.toFixed(1),hp:+g.player.hp.toFixed(1),
            core:g.coreHp,wave:g.wave,enemies:g.activeEnemies(),kills:g.kills,
            position:[Math.round(g.player.x),Math.round(g.player.y)],
            goals:g.objectives.map(o=>({done:o.done,hp:o.hp})),weapon:g.weapon,credits:X.profile.credits,
            transitions:transitions.length};
        }''')
        print(json.dumps({'difficulty':difficulty,'chunk':chunk, **state},ensure_ascii=False),flush=True)
        if state['cycle'] > 1 or state['time'] > 1800:
            break
    transitions = page.evaluate('transitions')
    report = {'difficulty':difficulty,'autopilot':state,'transitions':transitions,'errors':errors,'network':network}
    (ART / f'demo-soak-{difficulty}-{os.getpid()}.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    assert not errors and not network, (errors, network)
    assert state['cycle'] == 2, state
    assert [t['stage'] for t in transitions if t['win']] == list(range(1,21)), transitions
    browser.close()
    print(f'PASS: natural 20-level demo cycle, difficulty {difficulty}',flush=True)
