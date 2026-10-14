() => {
 const assert=(v,m)=>{if(!v)throw Error(m);},old=JSON.stringify(X.profile),g=X.game;
 X.profile.completed=Array.from({length:20},(_,i)=>i+1);X.profile.endless.unlocked=true;X.profile.endless.seed=987654;
 for(let n=21;n<=25;n++){
  g.start(n);g.player.invuln=9999;
  for(const o of g.objectives){g.player.x=o.x-48;g.player.y=o.y;g.weapon=0;while(!o.done){if(o.kind==='nest')g.fire(false);else g.interact(2);}}
  for(let w=0;w<g.level.waves;w++){g.newWave();let guard=0;while((g.spawnQueue.length||g.activeEnemies())&&guard++<500){g.spawnTimer=0;g.waveTimer=999;g.update(1/60);for(const e of g.enemies.items)if(e.active)g.hurtEnemy(e,1e9,'energy');}assert(guard<500,'endless spawn loop');}
  g.defendTime=g.level.waves*g.level.interval*X.profile.settings.pace;assert(g.ready(),'endless goal '+n);g.player.x=g.exit.x;g.player.y=g.exit.y;g.interact(.1);assert(g.state==='victory','endless exit '+n);
 }
 assert(X.profile.endless.stage===26&&X.profile.endless.best===25,'endless progression');
 g.start(26);g.checkpoint();const profile=X.Save.validate(JSON.parse(JSON.stringify(X.profile)));assert(profile.checkpoint?.number===26,'endless save');
 const cells=Array.from(g.map.cells).join('');X.profile=profile;g.start(26,profile.checkpoint);assert(Array.from(g.map.cells).join('')===cells,'endless map recovery');
 X.profile=X.Save.validate(JSON.parse(old));X.Save.write(X.profile);g.start(1);return {sectors:5,next:26,seedRecovery:true};
}
