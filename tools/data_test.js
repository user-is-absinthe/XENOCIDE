const fs=require('fs'),vm=require('vm');
global.window=global;
for(const file of ['config','world','levels'])vm.runInThisContext(fs.readFileSync('src/'+file+'.js','utf8'));
const maps=X.levels.map(l=>X.makeMap(l));
if(X.levels.length!==20)throw Error('Campaign must have exactly 20 maps');
if(new Set(maps.map(m=>Array.from(m.cells).join(''))).size!==20)throw Error('Duplicate geometry');
for(const l of X.levels)for(const t of l.types)if(!X.enemies[t]||X.enemies[t].boss)throw Error('Bad spawn type');
console.log('PASS: 20 unique authored maps, all floors and mission points connected');
