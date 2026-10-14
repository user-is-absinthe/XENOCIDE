const fs=require('fs'),vm=require('vm');
global.window=global;
for(const file of ['config','world','levels','generator'])vm.runInThisContext(fs.readFileSync('src/'+file+'.js','utf8'));
const maps=X.levels.map(l=>X.makeMap(l));
if(X.levels.length!==20)throw Error('Campaign must have exactly 20 maps');
if(new Set(maps.map(m=>Array.from(m.cells).join(''))).size!==20)throw Error('Duplicate geometry');
for(const l of X.levels)for(const t of l.types)if(!X.enemies[t]||X.enemies[t].boss)throw Error('Bad spawn type');
console.log('PASS: 20 unique authored maps, all floors and mission points connected');

let signatures=new Set();
for(let seed=1;seed<=200;seed++)for(const n of [21,25,50,100,10000]){
 let a=X.generate(n,seed),b=X.generate(n,seed);
 if(JSON.stringify(a)!==JSON.stringify(b))throw Error('Non deterministic seed');
 let m=X.makeMap(a);signatures.add(Array.from(m.cells).join(''));
}
if(signatures.size<900)throw Error('Insufficient procedural variation');
console.log('PASS: 1000 procedural maps connected, deterministic; '+signatures.size+' unique geometries');
