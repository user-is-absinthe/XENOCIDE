() => {
 const assert=(v,m)=>{if(!v)throw Error(m);}, original=JSON.stringify(X.profile),g=X.game;
 let bosses=[];
 for(let n=1;n<=20;n++){
  g.start(n);g.player.invuln=10000;
  for(const o of g.objectives){g.player.x=o.x-48;g.player.y=o.y;if(o.kind==='nest'){g.weapon=0;g.player.angle=0;while(!o.done)g.fire(false);}else g.interact(2);}
  for(let wave=0;wave<g.level.waves;wave++){
   g.newWave();let guard=0;
   while((g.spawnQueue.length||g.activeEnemies())&&guard++<400){g.spawnTimer=0;g.waveTimer=999;g.update(1/60);for(const e of g.enemies.items)if(e.active){if(e.boss){bosses.push(e.type);g.bossAttack(e);}g.hurtEnemy(e,1e9,'energy');}}
   assert(guard<400,'wave stuck '+n);
  }
  g.defendTime=g.level.waves*g.level.interval*X.profile.settings.pace;
  assert(g.ready(),'mission not completable '+n);
  g.player.x=g.exit.x;g.player.y=g.exit.y;g.interact(.1);
  assert(g.state==='victory','exit not working '+n);
 }
 assert(X.profile.completed.length===20&&X.profile.endless.unlocked,'campaign progression');
 assert(new Set(bosses).size===4,'four bosses');
 g.start(14);g.time=g.level.limit+1;g.update(1/60);assert(g.state==='dead','time limit');
 g.start(4);g.coreHp=1;let e=g.spawn(0,g.objectives[0].x+20,g.objectives[0].y);e.attack=0;g.enemyStep(e,.1);assert(g.state==='dead','defence loss');
 X.profile=X.Save.validate(JSON.parse(original));X.Save.write(X.profile);g.start(1);
 return {levels:20,bosses:[...new Set(bosses)],scenarioTransitions:true};
}
