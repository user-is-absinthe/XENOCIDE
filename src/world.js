'use strict';
X.RNG = class {constructor(seed){this.seed=seed>>>0||1;} next(){let t=this.seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;} int(a,b){return a+Math.floor(this.next()*(b-a+1));} pick(a){return a[this.int(0,a.length-1)];}};
X.Pool = class {constructor(n){this.items=Array.from({length:n},()=>({active:false}));this.cursor=0;} get(){for(let k=0;k<this.items.length;k++){let o=this.items[this.cursor];this.cursor=(this.cursor+1)%this.items.length;if(!o.active){o.active=true;return o;}}return null;} clear(){for(const o of this.items)o.active=false;}};
X.Hash = class {constructor(size=96){this.size=size;this.cells=new Map();this.buckets=[];this.used=0;} clear(){this.cells.clear();this.used=0;} key(x,y){return (x+1024)*4096+y+1024;} insert(e){let key=this.key(Math.floor(e.x/this.size),Math.floor(e.y/this.size)),b=this.cells.get(key);if(!b){b=this.buckets[this.used]||(this.buckets[this.used]=[]);this.used++;b.length=0;this.cells.set(key,b);}b.push(e);} query(x,y,r,fn){let s=this.size;for(let j=Math.floor((y-r)/s);j<=Math.floor((y+r)/s);j++)for(let i=Math.floor((x-r)/s);i<=Math.floor((x+r)/s);i++){const b=this.cells.get(this.key(i,j));if(b)for(const e of b)if(e.active)fn(e);}}};
X.Map = class {
 constructor(w,h){this.w=w;this.h=h;this.cells=new Uint8Array(w*h);this.cells.fill(1);this.field=new Int16Array(w*h);this.queue=new Int32Array(w*h);}
 carve(x,y,w,h){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)if(i>0&&j>0&&i<this.w-1&&j<this.h-1)this.cells[j*this.w+i]=0;}
 blocked(x,y){let i=Math.floor(x/48),j=Math.floor(y/48);return i<0||j<0||i>=this.w||j>=this.h||this.cells[j*this.w+i]===1;}
 fits(x,y,r){return !this.blocked(x-r,y-r)&&!this.blocked(x+r,y-r)&&!this.blocked(x-r,y+r)&&!this.blocked(x+r,y+r);}
 move(e,dx,dy){if(this.fits(e.x+dx,e.y,e.r))e.x+=dx;if(this.fits(e.x,e.y+dy,e.r))e.y+=dy;}
 index(x,y){return Math.floor(y/48)*this.w+Math.floor(x/48);}
 bfs(x,y){this.field.fill(-1);let head=0,tail=0,start=this.index(x,y);if(this.cells[start])return;this.queue[tail++]=start;this.field[start]=0;while(head<tail){let n=this.queue[head++];for(const k of [n-1,n+1,n-this.w,n+this.w])if(k>=0&&k<this.cells.length&&!this.cells[k]&&this.field[k]<0){this.field[k]=this.field[n]+1;this.queue[tail++]=k;}}return tail;}
 line(x,y,tx,ty){const n=Math.ceil(Math.hypot(tx-x,ty-y)/16);for(let i=1;i<=n;i++)if(this.blocked(x+(tx-x)*i/n,y+(ty-y)*i/n))return false;return true;}
 point(a){return {x:(a[0]+.5)*48,y:(a[1]+.5)*48};}
};
