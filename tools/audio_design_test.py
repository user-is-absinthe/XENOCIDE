"""Validate the new sound bank, real weapon routing, mixing limits and exports."""
from pathlib import Path
import base64
import json
import os
import wave
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "artifacts" / "audio-200"
ART.mkdir(parents=True, exist_ok=True)
os.environ["TEMP"] = os.environ["TMP"] = str(ROOT / ".venv" / "tmp")
with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page(offline=True)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto((ROOT / "dist" / "index.html").as_uri())
    bank = page.evaluate("""() => {
      const ctx=new OfflineAudioContext(1,48000,48000), bank={};
      for(const kind of Object.keys(X.SoundDesign.recipes())) {
        const begin=performance.now(), buffer=X.SoundDesign.build(ctx,kind,false,1),data=buffer.getChannelData(0);
        let peak=0,square=0,crossings=0;
        const pcm=new Uint8Array(data.length*2),view=new DataView(pcm.buffer);
        for(let i=0;i<data.length;i++) {
          if(!Number.isFinite(data[i])) throw Error('Invalid PCM: '+kind);
          peak=Math.max(peak,Math.abs(data[i]));square+=data[i]*data[i];
          if(i && data[i]*data[i-1]<0)crossings++;
          view.setInt16(i*2,Math.round(data[i]*32767),true);
        }
        const rms=Math.sqrt(square/data.length);
        if(peak>=.8 || rms<.005 || Math.abs(data[data.length-1])>.0001)throw Error('Bad envelope: '+kind);
        let binary='';for(let i=0;i<pcm.length;i+=8192)binary+=String.fromCharCode(...pcm.subarray(i,i+8192));
        bank[kind]={pcm:btoa(binary),peak,rms,duration:buffer.duration,crossings,buildMs:performance.now()-begin};
      }
      const base=X.SoundDesign.build(ctx,'tesla',false,1).getChannelData(0),
        again=X.SoundDesign.build(ctx,'tesla',false,1).getChannelData(0),
        alt=X.SoundDesign.build(ctx,'tesla',true,1).getChannelData(0);
      if(base.some((v,i)=>v!==again[i]))throw Error('Non deterministic sound');
      if(base.length===alt.length && base.every((v,i)=>v===alt[i]))throw Error('Alt Tesla unchanged');
      return bank;
    }""")
    signatures = {(round(s["duration"], 3), round(s["rms"], 4), s["crossings"]) for s in bank.values()}
    assert len(signatures) == len(bank), "Duplicate sound signatures"
    for name, entry in bank.items():
        with wave.open(str(ART / f"{name}.wav"), "wb") as out:
            out.setparams((1, 2, 48000, 0, "NONE", "not compressed"))
            out.writeframes(base64.b64decode(entry["pcm"]))
    mix = page.evaluate("""async () => {
      const ctx=new OfflineAudioContext(1,96000,48000),limiter=ctx.createDynamicsCompressor();
      limiter.threshold.value=-12;limiter.knee.value=6;limiter.ratio.value=12;
      limiter.attack.value=.003;limiter.release.value=.12;
      const headroom=ctx.createGain();headroom.gain.value=.85;
      limiter.connect(headroom);headroom.connect(ctx.destination);
      const buffer=X.SoundDesign.build(ctx,'bullet',false,1);
      for(let i=0;i<32;i++) {
        const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;
        gain.gain.value=.32;source.connect(gain);gain.connect(limiter);source.start(0);
      }
      const rendered=await ctx.startRendering(),data=rendered.getChannelData(0);
      let peak=0;for(const v of data)peak=Math.max(peak,Math.abs(v));
      if(peak>=1)throw Error('Clipped 32-voice mix: '+peak);
      return {peak};
    }""")
    # A short audition reel: three electrical arcs, pneumatic launcher, then rocket.
    with wave.open(str(ART / "tesla-grenade-rocket.wav"), "wb") as out:
        out.setparams((1, 2, 48000, 0, "NONE", "not compressed"))
        for name in ["tesla", "tesla", "tesla", "grenade", "rocket"]:
            out.writeframes(base64.b64decode(bank[name]["pcm"]))
            out.writeframes(bytes(48000 // 3 * 2))
    page.get_by_role("button", name="НАСТРОЙКИ И УПРАВЛЕНИЕ").click()
    report = page.evaluate("""async () => {
      X.profile.settings.musicEnabled=false;X.profile.settings.mute=false;X.Audio.settings();
      await X.Audio.ctx.resume();
      X.Debug.enter();X.profile.owned=X.weapons.map((w,i)=>i);
      for(const key in X.profile.ammo)X.profile.ammo[key]=1000;
      X.game.start(0);X.game.waveTimer=999;X.game.state='pause';
      const calls=[],play=X.Audio.play;
      X.Audio.play=function(...args){calls.push(args);return play.apply(this,args)};
      for(let i=0;i<13;i++){X.game.switchWeapon(i);X.game.cool=X.game.reload=0;X.game.fire(false)}
      for(const i of [0,7,8,11]) {
        X.game.switchWeapon(i);X.game.cool=X.game.reload=0;X.game.fire(true);
        if(!calls.some(c=>c[0]===X.weapons[i].kind && c[2]===true))throw Error('Missing alt routing: '+i);
      }
      X.game.switchWeapon(8);X.game.reload=0;X.game.mags[8]=0;X.game.beginReload();
      if(!calls.some(c=>c[0]==='reload'&&c[2]==='plasma'))throw Error('Reload family routing');
      X.Audio.play=play;
      const expected=new Set(X.weapons.slice(0,13).map(w=>w.kind));
      for(const kind of expected)if(!calls.some(c=>c[0]===kind))throw Error('Missing weapon sound: '+kind);
      await new Promise(r=>setTimeout(r,1100));
      if(X.Audio.voices!==0)throw Error('Leaked playback voices');
      X.Audio.lastPlay.clear();
      const rng=X.game.rng.seed;
      for(let i=0;i<45;i++)X.Audio.play('bullet');
      if(X.game.rng.seed!==rng)throw Error('Audio changed combat RNG');
      if(X.Audio.voices!==32)throw Error('Voice cap');
      await new Promise(r=>setTimeout(r,350));
      if(X.Audio.voices!==0)throw Error('Voices not released');
      X.profile.settings.mute=true;X.Audio.settings();X.Audio.play('rocket');
      if(X.Audio.voices!==0)throw Error('Mute started sound');
      X.profile.settings.mute=false;X.Audio.settings();X.Audio.lastPlay.clear();
      X.Audio.play('tesla');const voices=X.Audio.voices;X.Audio.play('tesla');
      if(X.Audio.voices!==voices)throw Error('Tesla throttling failed');
      return {weaponSounds:expected.size,voiceCap:32,mute:true,cleanup:true,throttling:true,version:X.version};
    }""")
    assert not errors, errors
    report["mixPeak"] = mix["peak"]
    metrics = {name: {k: v for k, v in entry.items() if k != "pcm"} for name, entry in bank.items()}
    (ART / "report.json").write_text(json.dumps({**report, "sounds": metrics}, indent=2), encoding="utf-8")
    print("PASS", json.dumps({**report, "profiles": len(bank), "maxPeak": max(s["peak"] for s in bank.values()), "mixPeak":mix["peak"], "maxBuildMs": max(s["buildMs"] for s in bank.values()), "errors": errors}))
    browser.close()
