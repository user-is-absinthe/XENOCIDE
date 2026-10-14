'use strict';
window.X = {};
X.C = {tile:48,width:1152,height:648,maxEnemies:260,maxShots:1000,maxParticles:700};
X.difficulties = [{name:'Лёгкая',hp:.75,damage:.6,speed:.9,count:.75,loot:1.4,economy:1.2,elite:.02},{name:'Нормальная',hp:1,damage:1,speed:1,count:1,loot:1,economy:1,elite:.06},{name:'Сложная',hp:1.25,damage:1.4,speed:1.08,count:1.2,loot:.8,economy:.9,elite:.13},{name:'Кошмар',hp:1.5,damage:1.85,speed:1.15,count:1.45,loot:.65,economy:.85,elite:.2}];
X.weapons = [
 {id:'blade',name:'Энергетический клинок',kind:'blade',damage:55,rate:.42,range:110,spread:0,speed:0,mag:0,ammo:null,reload:0,pierce:20,type:'energy',price:0,color:'#7ce8ce',desc:'Бесконечная дуга ближнего боя. ПКМ: круговой удар.'},
 {id:'pistol',name:'Пистолет «Клык»',kind:'bullet',damage:30,rate:.3,range:850,spread:.018,speed:1000,mag:14,ammo:'light',reload:1.1,pierce:1,type:'kinetic',price:0,color:'#ffe7ae',desc:'Точный одиночный огонь. ПКМ: два выстрела.'}
];
X.enemies = [{id:'drone',name:'Трутень',hp:70,speed:83,radius:16,damage:12,rate:1,credit:9,color:'#8eaa6d',kind:'melee',resist:{}}];
X.upgrades = [{id:'health',name:'Биокаркас',desc:'+25 к максимальному здоровью',max:6,price:400},{id:'armor',name:'Керамическая броня',desc:'+20 к броне, восстановление между миссиями',max:5,price:350},{id:'speed',name:'Сервоприводы',desc:'+6% к скорости',max:4,price:500},{id:'reload',name:'Автоподача',desc:'Перезарядка быстрее на 9%',max:5,price:450},{id:'power',name:'Усилитель оружия',desc:'+10% урона всего арсенала',max:6,price:650}];
X.ammo = {light:{name:'Лёгкие патроны',pack:120,price:90},shell:{name:'Картечь',pack:30,price:120},heavy:{name:'Винтовочные патроны',pack:100,price:130},fuel:{name:'Топливо',pack:150,price:110},energy:{name:'Энергоячейки',pack:60,price:170},explosive:{name:'Взрывчатые заряды',pack:12,price:200}};
