from pathlib import Path
from playwright.sync_api import sync_playwright
import os
root=Path(__file__).resolve().parent.parent
os.environ['TEMP']=os.environ['TMP']=str(root/'.venv/tmp')
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1280,'height':720})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto((root/'index.html').as_uri())
    result=page.evaluate('''() => {
      X.profile.settings.darkMode=true;
      if (!X.Save.validate(X.profile).settings.darkMode) throw Error('dark mode save');
      X.UI.settings();
      if (document.querySelector('[data-setting="darkMode"]')) throw Error('toggle still in settings');
      for (const show of [()=>X.UI.setup(),()=>X.UI.brief(1),()=>X.UI.brief(21),()=>X.UI.demo(),()=>X.UI.debug()]) {
        show();
        const toggle=document.querySelector('[data-setting="darkMode"]');
        const difficulty=document.querySelector('#difficulty, #demo-difficulty');
        if (!toggle || !difficulty.parentElement.contains(toggle)) throw Error('toggle not beside difficulty: '+X.UI.screen);
        toggle.checked=false;toggle.dispatchEvent(new Event('change',{bubbles:true}));
        if (X.profile.settings.darkMode) throw Error('toggle off failed');
        toggle.checked=true;toggle.dispatchEvent(new Event('change',{bubbles:true}));
        if (!X.profile.settings.darkMode) throw Error('toggle on failed');
      }
      X.Debug.leave();
      const c=document.createElement('canvas');c.width=1152;c.height=648;
      const ctx=c.getContext('2d',{alpha:false});
      const fake={player:{x:576,y:324,angle:0},weapon:1,muzzle:0,shots:{items:[]},surfaces:{items:[]},blasts:[],beams:[],enemies:{items:[]}};
      const paint=()=>{ctx.fillStyle='#ffffff';ctx.fillRect(0,0,1152,648);X.Render.lighting(ctx,fake,0,0)};
      const pixel=(x,y)=>Array.from(ctx.getImageData(x,y,1,1).data);
      paint();
      const center=pixel(576,324),edge=pixel(15,15),ahead=pixel(990,324),behind=pixel(162,324);
      if(center[0]<240 || edge[0]>25 || ahead[0]<=behind[0]+10) throw Error('lighting '+JSON.stringify({center,edge,ahead,behind}));
      fake.surfaces.items=[{active:true,x:100,y:100,radius:65,type:'energy',life:2}];paint();
      const plasma=pixel(100,100);if(plasma[2]<=plasma[0]) throw Error('blue plasma');
      fake.surfaces.items[0].type='fire';paint();const fire=pixel(100,100);if(fire[0]<=fire[2]) throw Error('red fire');
      fake.surfaces.items=[];fake.blasts=[{x:100,y:100,r:100,life:.3}];paint();if(pixel(100,100)[0]<180) throw Error('explosion flash');
      fake.blasts=[];fake.player={x:100,y:100,angle:0};fake.muzzle=.055;paint();const flash=pixel(260,100)[0];fake.muzzle=0;paint();if(pixel(260,100)[0]>=flash) throw Error('muzzle flash');
      X.game.start(1);X.game.state='play';X.game.player.invuln=100;X.game.waveTimer=999;
      X.game.keys.add(X.profile.settings.keys.sprint);X.game.player.stamina=0;
      for(let i=0;i<30;i++) X.game.update(.01);
      if(X.game.player.stamina!==0) throw Error('stamina regenerated with shift');
      X.game.keys.clear();X.game.update(.1);if(X.game.player.stamina<=0) throw Error('no regen after release');
      X.profile.settings.darkMode=true;X.Render.draw(X.game,0);X.game.state="pause";X.UI.hide();document.getElementById("toast").classList.remove("visible");
      return {center,edge,ahead,behind,plasma,fire,version:X.version};
    }''')
    page.screenshot(path=str(root/'artifacts/dark-mode-186.png'))
    assert not errors,errors
    print('PASS',result)
    browser.close()
