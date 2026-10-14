'use strict';
window.X = {};
X.C = {tile:48,width:1152,height:648,maxEnemies:260,maxShots:1000,maxParticles:700};
X.difficulties = [{name:'Лёгкая',hp:.75,damage:.6,speed:.9,count:.75,loot:1.4,economy:1.2,elite:.02},{name:'Нормальная',hp:1,damage:1,speed:1,count:1,loot:1,economy:1,elite:.06},{name:'Сложная',hp:1.25,damage:1.4,speed:1.08,count:1.2,loot:.8,economy:.9,elite:.13},{name:'Кошмар',hp:1.5,damage:1.85,speed:1.15,count:1.45,loot:.65,economy:.85,elite:.2}];
X.weapons = [
 {id:'blade',name:'Энергетический клинок',kind:'blade',damage:55,rate:.42,range:110,spread:0,speed:0,mag:0,ammo:null,reload:0,pierce:20,type:'energy',price:0,color:'#7ce8ce',desc:'Бесконечная дуга ближнего боя. ПКМ: круговой удар.'},
 {id:'pistol',name:'Пистолет «Клык»',kind:'bullet',damage:30,rate:.3,range:850,spread:.018,speed:1000,mag:14,ammo:'light',reload:1.1,pierce:1,type:'kinetic',price:0,color:'#ffe7ae',recoil:1,desc:'Точный одиночный огонь. ПКМ: усиленный двойной заряд.'},
 {id:'smg',name:'ПП «Шершень»',kind:'smg',damage:17,rate:.065,range:600,spread:.2,speed:900,mag:45,ammo:'light',reload:1.5,pierce:1,type:'kinetic',price:450,color:'#ffe3a1',recoil:1,desc:'Лёгкий скорострельный ПП: точность сохраняется в движении.'},
 {id:'shotgun',name:'Дробовик «Цербер»',kind:'shotgun',damage:20,pellets:8,rate:.8,range:370,spread:.46,speed:820,mag:8,ammo:'shell',reload:2,pierce:1,type:'kinetic',price:700,color:'#ffd09a',recoil:5,desc:'Восемь дробин, широкий конус и высокий урон вблизи.'},
 {id:'rifle',name:'Винтовка МК-4',kind:'rifle',damage:24,burst:3,rate:.3,range:950,spread:.075,speed:1100,mag:36,ammo:'heavy',reload:1.8,pierce:1,type:'kinetic',price:1000,color:'#ffe8b8',recoil:2,desc:'Контролируемая очередь по три пули. Универсальный средний бой.'},
 {id:'machine',name:'Пулемёт «Бастион»',kind:'machine',damage:32,rate:.15,range:850,spread:.19,speed:1000,mag:110,ammo:'heavy',reload:3.6,pierce:2,type:'kinetic',price:1600,color:'#ffce83',recoil:3,desc:'Разгон стволов удваивает темп огня. Стрельба замедляет бойца.'},
 {id:'sniper',name:'Снайперская «Игла»',kind:'sniper',damage:175,rate:1.05,range:1600,spread:.003,speed:1900,mag:6,ammo:'heavy',reload:2.3,pierce:4,type:'kinetic',price:1900,color:'#e9f2d3',recoil:4,desc:'Пробивает четыре цели; максимальная точность в неподвижности.'},
 {id:'flame',name:'Огнемёт «Пепел»',kind:'flame',damage:12,rate:.065,range:230,spread:.48,speed:390,mag:140,ammo:'fuel',reload:2.5,pierce:4,type:'fire',price:2200,color:'#ff9d4f',recoil:0,desc:'Непрерывный конус пламени. Поджигает на три секунды.'},
 {id:'plasma',name:'Плазменный карабин',kind:'plasma',damage:65,rate:.22,range:800,spread:.04,speed:540,mag:26,ammo:'energy',reload:1.9,pierce:2,type:'energy',price:2700,color:'#78e4d9',recoil:2,desc:'Медленные плазменные сгустки пробивают и замедляют цели.'},
 {id:'grenade',name:'Гранатомёт «Разлом»',kind:'grenade',damage:220,rate:.95,range:470,spread:.05,speed:350,mag:5,ammo:'explosive',reload:2.6,pierce:1,blast:140,type:'explosive',price:3200,color:'#ffc879',recoil:4,desc:'Гранаты отскакивают от стен и взрываются по таймеру.'},
 {id:'rail',name:'Рельсотрон «Горизонт»',kind:'rail',damage:420,rate:1.45,charge:.65,range:2000,spread:0,speed:3400,mag:4,ammo:'energy',reload:3,pierce:14,type:'energy',price:4100,color:'#9edaff',recoil:8,desc:'Заряд 0,65 с; пробивает до четырнадцати врагов.'},
 {id:'tesla',name:'Тесла-пушка «Дуга»',kind:'tesla',damage:100,rate:.55,range:390,spread:0,speed:0,mag:18,ammo:'energy',reload:2.2,pierce:5,type:'electric',price:4500,color:'#c1afff',recoil:1,desc:'Цепь до пяти целей, краткий паралич. ПКМ: до семи.'},
 {id:'rocket',name:'Ракетная «Апокалипсис»',kind:'rocket',damage:450,rate:1.4,range:1200,spread:.01,speed:450,mag:3,ammo:'explosive',reload:3.3,pierce:1,blast:210,type:'explosive',price:5400,color:'#ffb26b',recoil:9,desc:'Тяжёлая ракета с коррекцией курса и большим радиусом взрыва.'}
];
X.enemies = [
 {id:'drone',name:'Трутень',hp:70,speed:83,radius:16,damage:12,rate:1,credit:9,color:'#8eaa6d',kind:'melee',resist:{}},
 {id:'hunter',name:'Бегун',hp:42,speed:148,radius:13,damage:9,rate:.65,credit:12,color:'#b4b87d',kind:'fast',resist:{}},
 {id:'brute',name:'Громила',hp:340,speed:52,radius:26,damage:28,rate:1.5,credit:30,color:'#a99a71',kind:'heavy',resist:{kinetic:.85}},
 {id:'spitter',name:'Плевальщик',hp:90,speed:66,radius:18,damage:18,rate:2,credit:20,color:'#a6b757',kind:'acid',resist:{fire:.8}},
 {id:'suicide',name:'Пузырник',hp:48,speed:123,radius:17,damage:50,rate:1,credit:15,color:'#c48c58',kind:'suicide',resist:{}},
 {id:'armor',name:'Панцирник',hp:210,speed:68,radius:22,damage:20,rate:1.2,credit:25,color:'#8cabb4',kind:'armor',resist:{kinetic:.35,electric:1.4}},
 {id:'summoner',name:'Носитель',hp:260,speed:42,radius:23,damage:14,rate:1.5,credit:40,color:'#a58cb7',kind:'summon',resist:{energy:.7}},
 {id:'gunner',name:'Биострелок',hp:125,speed:70,radius:18,damage:17,rate:1.3,credit:25,color:'#9e87b0',kind:'gunner',resist:{electric:.7}},
 {id:'ghost',name:'Тень',hp:95,speed:112,radius:16,damage:22,rate:1.1,credit:30,color:'#71889c',kind:'cloak',resist:{energy:1.2}},
 {id:'elite',name:'Альфа-мутант',hp:390,speed:100,radius:24,damage:24,rate:1.7,credit:50,color:'#bd7a77',kind:'elite',resist:{kinetic:.7,fire:.8}},
 {id:'patient',name:'НУЛЕВОЙ ПАЦИЕНТ',hp:2800,speed:66,radius:30,damage:28,rate:2,credit:650,color:'#bba38c',kind:'boss',boss:true,resist:{kinetic:.85}},
 {id:'steel',name:'СТАЛЬНОЙ КОШМАР',hp:5200,speed:55,radius:32,damage:34,rate:1.6,credit:1100,color:'#9eb4c1',kind:'boss',boss:true,resist:{kinetic:.5,electric:1.35}},
 {id:'heart',name:'СЕРДЦЕ РЕАКТОРА',hp:6900,speed:60,radius:30,damage:32,rate:1.4,credit:1600,color:'#e2ad65',kind:'boss',boss:true,resist:{fire:.4,energy:.7}},
 {id:'queen',name:'МАТКА',hp:10500,speed:65,radius:34,damage:38,rate:1.5,credit:3000,color:'#c98ca9',kind:'boss',boss:true,resist:{kinetic:.75,fire:.8}}
];
X.upgrades = [{id:'health',name:'Биокаркас',desc:'+25 к максимальному здоровью',max:6,price:400},{id:'armor',name:'Керамическая броня',desc:'+20 к броне, восстановление между миссиями',max:5,price:350},{id:'speed',name:'Сервоприводы',desc:'+6% к скорости',max:4,price:500},{id:'reload',name:'Автоподача',desc:'Перезарядка быстрее на 9%',max:5,price:450},{id:'power',name:'Усилитель оружия',desc:'+10% урона всего арсенала',max:6,price:650}];
X.ammo = {light:{name:'Лёгкие патроны',pack:120,price:90},shell:{name:'Картечь',pack:30,price:120},heavy:{name:'Винтовочные патроны',pack:100,price:130},fuel:{name:'Топливо',pack:150,price:110},energy:{name:'Энергоячейки',pack:60,price:170},explosive:{name:'Взрывчатые заряды',pack:12,price:200}};
