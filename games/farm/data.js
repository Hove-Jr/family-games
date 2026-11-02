/* Sunpatch Valley - game data. All names and art are original. */
(function () {
  'use strict';
  var M = 60, H = 3600;
  // ---------- items ----------  art: [shape, color1, color2]
  var CROPS = [
    ['wheat', 'Wheat', 1, 2 * M, ['grain', '#f0c95a', '#b8902a']],
    ['corn', 'Corn', 1, 5 * M, ['cob', '#f7d63c', '#5f9e45']],
    ['carrot', 'Carrots', 3, 10 * M, ['root', '#f08a24', '#4c9a2a']],
    ['soy', 'Soybeans', 4, 20 * M, ['pod', '#a5d36a', '#5f8a23']],
    ['cane', 'Sugarcane', 5, 30 * M, ['cane', '#8bc34a', '#4f7a1f']],
    ['cotton', 'Cotton', 7, 45 * M, ['boll', '#ffffff', '#8d6e63']],
    ['strawberry', 'Strawberries', 9, 60 * M, ['berry', '#e53950', '#3f9b3f']],
    ['potato', 'Potatoes', 11, 90 * M, ['tuber', '#c8a26a', '#8a6a3a']],
    ['tomato', 'Tomatoes', 13, 2 * H, ['round', '#e8412c', '#3e8e3e']],
    ['pumpkin', 'Pumpkins', 15, 2.5 * H, ['pumpkin', '#f39c2b', '#5d8f2e']],
    ['sunflower', 'Sunflowers', 16, 3 * H, ['flower', '#ffcc1a', '#7a4a1a']],
    ['lavender', 'Lavender', 19, 3.5 * H, ['spike', '#9b7fd4', '#5f8a3a']],
    ['cocoa', 'Cocoa pods', 21, 4 * H, ['cocoa', '#b0612d', '#5b8a32']],
    ['coffee', 'Coffee beans', 23, 5 * H, ['beans', '#7a4a29', '#3c2414']],
    ['grapes', 'Grapes', 25, 6 * H, ['grapes', '#8a45b0', '#4f8a2c']]
  ];
  var ITEMS = {}, ORDER = [];
  function item(id, n, kind, lvl, art, extra) { var it = { id: id, n: n, k: kind, lvl: lvl, art: art }; for (var k in extra || {}) it[k] = extra[k]; ITEMS[id] = it; ORDER.push(id); return it; }
  CROPS.forEach(function (c) { item(c[0], c[1], 'crop', c[2], c[4], { t: c[3] }); });

  // ---------- animal pens ----------
  var PENS = {
    hens: { n: 'Hen House', lvl: 1, pop: 0, cost: 100, bt: 30, feed: 'chickenfeed', out: 'egg', t: 15 * M, animal: 'hen', ground: '#d8c08a', shed: '#e8d3a0', roof: '#c0563a' },
    cows: { n: 'Cow Pasture', lvl: 3, pop: 30, cost: 300, bt: 2 * M, feed: 'cowfeed', out: 'milk', t: 30 * M, animal: 'cow', ground: '#9ed36a', shed: '#f2efe6', roof: '#3f6fb5' },
    sheep: { n: 'Sheep Meadow', lvl: 8, pop: 80, cost: 1200, bt: 10 * M, feed: 'sheepfeed', out: 'wool', t: 60 * M, animal: 'sheep', ground: '#a8da78', shed: '#e9d9b8', roof: '#7a5a3a' },
    goats: { n: 'Goat Hill', lvl: 12, pop: 140, cost: 3000, bt: 20 * M, feed: 'goatfeed', out: 'goatmilk', t: 90 * M, animal: 'goat', ground: '#c8c08a', shed: '#d9cbb0', roof: '#5a7a3a' },
    bees: { n: 'Bee Garden', lvl: 18, pop: 220, cost: 7000, bt: 40 * M, feed: 'beefeed', out: 'honey', t: 2 * H, animal: 'hive', ground: '#b5e08a', shed: '#fff1c1', roof: '#e0a020' }
  };
  item('egg', 'Eggs', 'animal', 1, ['egg', '#fff6e6', '#e3cfae']);
  item('milk', 'Milk', 'animal', 3, ['bottle', '#ffffff', '#4a90d9']);
  item('wool', 'Wool', 'animal', 8, ['fluff', '#f6f3ec', '#bfb6a2']);
  item('goatmilk', 'Goat milk', 'animal', 12, ['bottle', '#fffaf0', '#7cb342']);
  item('honey', 'Honey', 'animal', 18, ['jar', '#f5b301', '#8a5a00']);

  // ---------- factories ----------  recipe: [out, name, outCount, inputs, seconds, lvl, art]
  var FACTS = {
    mill: { n: 'Feed Mill', lvl: 1, pop: 0, cost: 50, bt: 30, wall: '#e9d7b0', wall2: '#cdb88c', roof: '#b5482f', rt: 'gable', H: 34, extra: 'silo', recipes: [
      ['chickenfeed', 'Hen feed', 3, { wheat: 2, corn: 1 }, 3 * M, 1, ['sack', '#f0c96a', '#b8862a']],
      ['cowfeed', 'Cow feed', 3, { corn: 2, carrot: 1 }, 6 * M, 3, ['sack', '#9cc86f', '#4f7a3a']],
      ['sheepfeed', 'Sheep feed', 3, { wheat: 2, soy: 2 }, 10 * M, 8, ['sack', '#f4a261', '#b0652a']],
      ['goatfeed', 'Goat feed', 3, { carrot: 2, soy: 1, corn: 1 }, 12 * M, 12, ['sack', '#c3a6e8', '#7a5aa8']],
      ['beefeed', 'Pollen mix', 3, { sunflower: 1, wheat: 2 }, 15 * M, 18, ['sack', '#ffd166', '#c49a1a']]] },
    bakery: { n: 'Bakehouse', lvl: 2, pop: 20, cost: 150, bt: 60, wall: '#f4e1c1', wall2: '#dcc39a', roof: '#d9773a', rt: 'hip', H: 30, extra: 'chimney', recipes: [
      ['bread', 'Country loaf', 1, { wheat: 3 }, 5 * M, 2, ['loaf', '#dc9a4e', '#a8662a']],
      ['cornbread', 'Cornbread', 1, { corn: 2, egg: 2 }, 12 * M, 4, ['loaf', '#f2c14e', '#c4902a']],
      ['cookies', 'Butter cookies', 1, { wheat: 2, egg: 2, sugar: 1 }, 25 * M, 7, ['cookie', '#d9a75a', '#5a3a1a']],
      ['muffin', 'Berry muffin', 1, { wheat: 2, strawberry: 1, butter: 1 }, 35 * M, 10, ['muffin', '#e5a45a', '#d63c5e']]] },
    creamery: { n: 'Creamery', lvl: 3, pop: 35, cost: 300, bt: 3 * M, wall: '#eef4fb', wall2: '#cbd8e8', roof: '#4f8fd6', rt: 'gable', H: 30, extra: 'awning', recipes: [
      ['cream', 'Cream', 1, { milk: 1 }, 8 * M, 3, ['bottle', '#fffdf3', '#f0c040']],
      ['butter', 'Butter', 1, { milk: 2 }, 15 * M, 4, ['block', '#ffe680', '#d9a520']],
      ['cheese', 'Cheese wheel', 1, { milk: 3 }, 30 * M, 6, ['wedge', '#ffcf40', '#d99a10']],
      ['goatcheese', 'Goat cheese', 1, { goatmilk: 2 }, 40 * M, 13, ['wedge', '#fff8e7', '#bfb290']]] },
    sugar: { n: 'Sugar Works', lvl: 5, pop: 50, cost: 500, bt: 5 * M, wall: '#fbeef3', wall2: '#e3c8d3', roof: '#c25b8a', rt: 'flat', H: 36, extra: 'chimney', recipes: [
      ['sugar', 'Sugar', 1, { cane: 1 }, 8 * M, 5, ['cube', '#ffffff', '#c8c8dc']],
      ['syrup', 'Cane syrup', 1, { cane: 2 }, 20 * M, 6, ['bottle', '#b5651d', '#7a3e10']],
      ['caramel', 'Caramel', 1, { sugar: 2, cream: 1 }, 30 * M, 9, ['candy', '#d08a33', '#8a5414']]] },
    loom: { n: 'Weaving Shed', lvl: 7, pop: 70, cost: 900, bt: 10 * M, wall: '#e6e0f5', wall2: '#c4bce0', roof: '#6a5acd', rt: 'gable', H: 32, extra: 'saw', recipes: [
      ['fabric', 'Cotton cloth', 1, { cotton: 2 }, 15 * M, 7, ['roll', '#5aa9e6', '#2f6fa8']],
      ['yarn', 'Yarn', 1, { wool: 2 }, 25 * M, 8, ['yarnball', '#ef6f8a', '#b8405a']]] },
    jam: { n: 'Jam Kitchen', lvl: 9, pop: 90, cost: 1500, bt: 15 * M, wall: '#fde8e8', wall2: '#e8c4c4', roof: '#d63c4e', rt: 'hip', H: 28, extra: 'awning', recipes: [
      ['jam', 'Berry jam', 1, { strawberry: 3, sugar: 1 }, 30 * M, 9, ['jar', '#d62f4b', '#8a1a2e']],
      ['jelly', 'Grape jelly', 1, { grapes: 3, sugar: 1 }, 40 * M, 25, ['jar', '#7a2fa0', '#4a1060']]] },
    tailor: { n: 'Tailor Studio', lvl: 10, pop: 105, cost: 2000, bt: 20 * M, wall: '#e8f4ee', wall2: '#bfdccc', roof: '#2e8b6a', rt: 'gable', H: 34, extra: 'awning', recipes: [
      ['shirt', 'Shirt', 1, { fabric: 2 }, 40 * M, 10, ['shirt', '#4caf7a', '#2e7d52']],
      ['scarf', 'Scarf', 1, { yarn: 1, fabric: 1 }, 45 * M, 11, ['scarf', '#f4a300', '#c05000']],
      ['sweater', 'Sweater', 1, { yarn: 2 }, 60 * M, 12, ['shirt', '#d9534f', '#a33a37']]] },
    snack: { n: 'Snack Shack', lvl: 11, pop: 120, cost: 2600, bt: 25 * M, wall: '#fff3d6', wall2: '#e6cf9c', roof: '#e0602a', rt: 'flat', H: 28, extra: 'awning', recipes: [
      ['chips', 'Potato chips', 1, { potato: 2 }, 15 * M, 11, ['bag', '#f6c445', '#e0602a']],
      ['popcorn', 'Popcorn', 1, { corn: 3, butter: 1 }, 20 * M, 12, ['tub', '#fff3c4', '#e04040']],
      ['fries', 'Fries', 1, { potato: 2, ketchup: 1 }, 30 * M, 14, ['tub', '#f5c542', '#2a7ad0']]] },
    sauce: { n: 'Sauce Works', lvl: 13, pop: 150, cost: 3500, bt: 30 * M, wall: '#f8e6dc', wall2: '#ddc0ae', roof: '#a83a2a', rt: 'gable', H: 32, extra: 'chimney', recipes: [
      ['ketchup', 'Ketchup', 1, { tomato: 3, sugar: 1 }, 30 * M, 13, ['bottle', '#d6281e', '#8a1a14']],
      ['soup', 'Tomato soup', 1, { tomato: 2, potato: 1, cream: 1 }, 45 * M, 14, ['bowl', '#e0552a', '#f2ece0']]] },
    pie: { n: 'Pie Parlor', lvl: 15, pop: 175, cost: 5000, bt: 40 * M, wall: '#fff0e0', wall2: '#e6cdb0', roof: '#8a4a2a', rt: 'hip', H: 30, extra: 'chimney', recipes: [
      ['pumpkinpie', 'Pumpkin pie', 1, { pumpkin: 1, wheat: 2, egg: 2 }, 45 * M, 15, ['pie', '#e8892a', '#c7843f']],
      ['berrypie', 'Berry pie', 1, { strawberry: 2, wheat: 2, butter: 1 }, 45 * M, 16, ['pie', '#c2304a', '#c7843f']]] },
    oil: { n: 'Oil Press', lvl: 16, pop: 200, cost: 6500, bt: 50 * M, wall: '#fbf6dc', wall2: '#e2d9a8', roof: '#9a8a20', rt: 'flat', H: 34, extra: 'silo', recipes: [
      ['oil', 'Sunflower oil', 1, { sunflower: 2 }, 30 * M, 16, ['bottle', '#f2d23c', '#8a7a10']]] },
    soapery: { n: 'Candle & Soap', lvl: 19, pop: 240, cost: 9000, bt: 60 * M, wall: '#f3eefb', wall2: '#d6cbe8', roof: '#8a6ac8', rt: 'hip', H: 30, extra: 'awning', recipes: [
      ['candle', 'Honey candle', 1, { honey: 1, oil: 1 }, 40 * M, 19, ['candle', '#fff1c1', '#f5a623']],
      ['soap', 'Lavender soap', 1, { lavender: 2, oil: 1 }, 50 * M, 20, ['soap', '#b49be0', '#7a5ab8']]] },
    choco: { n: 'Chocolatier', lvl: 21, pop: 280, cost: 12000, bt: 80 * M, wall: '#f2e2d2', wall2: '#d2b89e', roof: '#5a3220', rt: 'gable', H: 32, extra: 'awning', recipes: [
      ['chocolate', 'Chocolate bar', 1, { cocoa: 2, sugar: 1, milk: 1 }, 60 * M, 21, ['bar', '#6b3a1e', '#3e200e']],
      ['cocoadrink', 'Hot cocoa', 1, { cocoa: 1, milk: 2, sugar: 1 }, 45 * M, 22, ['cup', '#8b5a2b', '#f5efe0']]] },
    cafe: { n: 'Coffee House', lvl: 23, pop: 320, cost: 16000, bt: 100 * M, wall: '#efe6dc', wall2: '#cdbba6', roof: '#3a5a4a', rt: 'flat', H: 30, extra: 'awning', recipes: [
      ['coffeecup', 'Coffee', 1, { coffee: 2 }, 30 * M, 23, ['cup', '#4a2c17', '#ffffff']],
      ['latte', 'Latte', 1, { coffee: 1, milk: 1, sugar: 1 }, 40 * M, 24, ['cup', '#c8a07a', '#ffffff']]] },
    juice: { n: 'Juice Press', lvl: 25, pop: 360, cost: 21000, bt: 2 * H, wall: '#eef8e6', wall2: '#c8deb4', roof: '#6a2a8a', rt: 'hip', H: 30, extra: 'silo', recipes: [
      ['grapejuice', 'Grape juice', 1, { grapes: 3 }, 40 * M, 25, ['bottle', '#6a2a8a', '#3a1050']],
      ['punch', 'Fruit punch', 1, { grapes: 1, strawberry: 2, sugar: 1 }, 50 * M, 26, ['glass', '#e8505b', '#ffd54f']]] },
    icecream: { n: 'Ice Cream Parlor', lvl: 27, pop: 400, cost: 28000, bt: 2.5 * H, wall: '#fdf0f6', wall2: '#e8c8d8', roof: '#f28cb1', rt: 'hip', H: 30, extra: 'awning', recipes: [
      ['icecream', 'Vanilla cone', 1, { cream: 2, sugar: 1, milk: 1 }, 45 * M, 27, ['cone', '#fff4d6', '#c9894a']],
      ['sundae', 'Berry sundae', 1, { icecream: 1, strawberry: 2, caramel: 1 }, 60 * M, 28, ['cone', '#f28cb1', '#c9894a']]] },
    candy: { n: 'Candy Shop', lvl: 29, pop: 440, cost: 36000, bt: 3 * H, wall: '#fff6e6', wall2: '#e8d3b0', roof: '#ff5fa2', rt: 'gable', H: 32, extra: 'awning', recipes: [
      ['lollipop', 'Swirl pops', 1, { sugar: 2, syrup: 1 }, 30 * M, 29, ['lolli', '#ff5fa2', '#ffffff']],
      ['toffee', 'Toffee', 1, { butter: 1, sugar: 2, caramel: 1 }, 50 * M, 30, ['candy', '#b0702a', '#6a3a10']]] }
  };
  Object.keys(FACTS).forEach(function (fk) {
    var f = FACTS[fk]; f.w = 3; f.h = 3;
    f.recipes = f.recipes.map(function (r) {
      var it = item(r[0], r[1], fk === 'mill' ? 'feed' : 'good', r[5], r[6], { fac: fk });
      return { o: r[0], c: r[2], i: r[3], t: r[4], lvl: r[5] };
    });
  });
  // materials (stored in the toolshed, not the barn)
  var MATS = [['planks', 'Planks', ['plank', '#c98d4e', '#8a5a2b']], ['bricks', 'Bricks', ['brick', '#c4553a', '#8a3020']], ['glass', 'Glass', ['pane', '#a8dcf0', '#4a90b8']],
    ['bolts', 'Bolts', ['bolt', '#a8b0b8', '#58626e']], ['hinges', 'Hinges', ['hinge', '#bcc2ca', '#626c78']], ['varnish', 'Varnish', ['can', '#c0392b', '#8a949c']],
    ['shovel', 'Shovel', ['shovel', '#9a6a3b', '#a8b0b8']], ['stake', 'Survey stake', ['stake', '#c98d4e', '#e74c3c']], ['survey', 'Land map', ['scroll', '#f3e3b5', '#c0392b']]];
  MATS.forEach(function (m) { item(m[0], m[1], 'mat', 1, m[2]); });

  // ---------- values (auto-balanced from time + inputs) ----------
  var ANIMAL_T = {}; Object.keys(PENS).forEach(function (k) { ANIMAL_T[PENS[k].out] = PENS[k]; });
  var RECIPE_OF = {}; Object.keys(FACTS).forEach(function (fk) { FACTS[fk].recipes.forEach(function (r) { RECIPE_OF[r.o] = r; }); });
  function val(id) {
    var it = ITEMS[id]; if (it.v) return it.v;
    var v;
    if (it.k === 'crop') v = Math.round(1 + 0.6 * Math.pow(it.t / 60, 0.75));
    else if (it.k === 'mat') v = 10;
    else if (ANIMAL_T[id]) { var p = ANIMAL_T[id]; v = Math.round(val(p.feed) + 1 + 0.5 * Math.pow(p.t / 60, 0.8)); }
    else { var r = RECIPE_OF[id], s = 0; for (var k in r.i) s += val(k) * r.i[k]; v = Math.round(s / r.c + 1 + 0.5 * Math.pow(r.t / 60, 0.8)); }
    it.v = Math.max(1, v); it.xp = Math.max(1, Math.round(it.v / 3)); return it.v;
  }
  ORDER.forEach(val);

  // ---------- houses, community, decor ----------
  var HOUSES = {
    cottage: { n: 'Cottage', lvl: 1, cost: 40, pop: 10, bt: 30, w: 2, h: 2, H: 22, wall: '#fff4e0', wall2: '#e3cfae', roof: '#d9534f', rt: 'gable' },
    bungalow: { n: 'Bungalow', lvl: 3, cost: 120, pop: 15, bt: 2 * M, w: 2, h: 2, H: 20, wall: '#e8f1ff', wall2: '#c3d3ec', roof: '#3f6fb5', rt: 'hip' },
    townhouse: { n: 'Townhouse', lvl: 6, cost: 400, pop: 25, bt: 10 * M, w: 2, h: 2, H: 36, wall: '#f8e3cf', wall2: '#ddc0a2', roof: '#6b4a3a', rt: 'gable' },
    farmhouse: { n: 'Farmhouse', lvl: 9, cost: 900, pop: 35, bt: 20 * M, w: 2, h: 2, H: 28, wall: '#fffbe8', wall2: '#e6dcb4', roof: '#2e7d52', rt: 'gable' },
    villa: { n: 'Garden Villa', lvl: 14, cost: 2500, pop: 50, bt: 45 * M, w: 2, h: 2, H: 30, wall: '#fdf0e6', wall2: '#e8cfb8', roof: '#c25b3a', rt: 'hip' },
    brownstone: { n: 'Brownstone', lvl: 19, cost: 6000, pop: 70, bt: 90 * M, w: 2, h: 2, H: 46, wall: '#b7735a', wall2: '#965a44', roof: '#4a3a3a', rt: 'flat' },
    manor: { n: 'Manor', lvl: 24, cost: 14000, pop: 100, bt: 3 * H, w: 3, h: 3, H: 40, wall: '#f4f0ea', wall2: '#d6cec2', roof: '#3a4a6a', rt: 'hip' },
    lakehouse: { n: 'Lake House', lvl: 28, cost: 30000, pop: 140, bt: 5 * H, w: 3, h: 3, H: 34, wall: '#e6f4f8', wall2: '#bcd8e2', roof: '#2a6a8a', rt: 'gable' }
  };
  var COMM = {
    hall: { n: 'Town Hall', lvl: 99, cost: 0, cap: 60, bt: 0, w: 3, h: 3, H: 44, wall: '#f6efe2', wall2: '#d8cdb6', roof: '#4a6aa8', rt: 'hip', mats: {}, extra: 'clock' },
    post: { n: 'Post Office', lvl: 2, cost: 200, cap: 30, bt: 2 * M, w: 2, h: 2, H: 28, wall: '#e8f0ff', wall2: '#c0cfe8', roof: '#2a5aa8', rt: 'flat', mats: {} },
    school: { n: 'Schoolhouse', lvl: 4, cost: 500, cap: 40, bt: 5 * M, w: 3, h: 3, H: 32, wall: '#f8e0c8', wall2: '#dcbd9c', roof: '#b5482f', rt: 'gable', mats: { planks: 2, bricks: 2 }, extra: 'bell' },
    clinic: { n: 'Clinic', lvl: 6, cost: 1200, cap: 50, bt: 15 * M, w: 3, h: 3, H: 34, wall: '#ffffff', wall2: '#dfe6ea', roof: '#5aa0c8', rt: 'flat', mats: { bricks: 3, glass: 2 }, extra: 'cross' },
    fire: { n: 'Fire Station', lvl: 8, cost: 2500, cap: 60, bt: 30 * M, w: 3, h: 3, H: 34, wall: '#e8564a', wall2: '#b83c32', roof: '#5a5a5a', rt: 'flat', mats: { planks: 3, bricks: 3, glass: 2 } },
    library: { n: 'Library', lvl: 11, cost: 4500, cap: 70, bt: 45 * M, w: 3, h: 3, H: 34, wall: '#efe4cf', wall2: '#d0c0a0', roof: '#5a3a6a', rt: 'hip', mats: { planks: 4, glass: 4 }, extra: 'columns' },
    cinema: { n: 'Picture House', lvl: 14, cost: 8000, cap: 80, bt: 60 * M, w: 3, h: 3, H: 38, wall: '#2f3550', wall2: '#22283c', roof: '#e0b030', rt: 'flat', mats: { bricks: 5, glass: 5 } },
    market: { n: 'Market Hall', lvl: 17, cost: 12000, cap: 90, bt: 90 * M, w: 3, h: 3, H: 30, wall: '#fff0d8', wall2: '#e2cca8', roof: '#2e8b6a', rt: 'gable', mats: { planks: 6, bricks: 6 }, extra: 'awning' },
    museum: { n: 'Museum', lvl: 20, cost: 18000, cap: 100, bt: 2 * H, w: 3, h: 3, H: 40, wall: '#f2f0ea', wall2: '#d6d2c6', roof: '#8a8a7a', rt: 'hip', mats: { glass: 7, bricks: 7 }, extra: 'columns' },
    stadium: { n: 'Stadium', lvl: 23, cost: 28000, cap: 120, bt: 3 * H, w: 4, h: 4, H: 26, wall: '#d8dce4', wall2: '#b0b6c2', roof: '#3a8a3a', rt: 'flat', mats: { planks: 8, bricks: 8, glass: 8 } },
    concert: { n: 'Concert Hall', lvl: 26, cost: 40000, cap: 140, bt: 4 * H, w: 3, h: 3, H: 42, wall: '#f8ece6', wall2: '#dcc8bc', roof: '#a83a5a', rt: 'hip', mats: { planks: 10, glass: 10 }, extra: 'columns' },
    observatory: { n: 'Observatory', lvl: 29, cost: 60000, cap: 160, bt: 5 * H, w: 3, h: 3, H: 40, wall: '#eef0f6', wall2: '#c8ccd8', roof: '#3a4a7a', rt: 'dome', mats: { bricks: 12, glass: 12 } }
  };
  var DECOS = {
    path: { n: 'Stone path', lvl: 1, cost: 5, xp: 1, w: 1, h: 1 },
    oak: { n: 'Oak tree', lvl: 1, cost: 20, xp: 2, w: 1, h: 1 },
    flowers: { n: 'Flower bed', lvl: 1, cost: 30, xp: 3, w: 1, h: 1 },
    bench: { n: 'Park bench', lvl: 2, cost: 50, xp: 4, w: 1, h: 1 },
    lamp: { n: 'Lamp post', lvl: 3, cost: 60, xp: 4, w: 1, h: 1 },
    hedge: { n: 'Hedge', lvl: 4, cost: 40, xp: 3, w: 1, h: 1 },
    birch: { n: 'Birch tree', lvl: 5, cost: 45, xp: 3, w: 1, h: 1 },
    pine: { n: 'Pine tree', lvl: 6, cost: 60, xp: 4, w: 1, h: 1 },
    pond: { n: 'Duck pond', lvl: 7, cost: 300, xp: 15, w: 2, h: 2 },
    tulips: { n: 'Tulip patch', lvl: 8, cost: 120, xp: 8, w: 1, h: 1 },
    fountain: { n: 'Fountain', lvl: 10, cost: 800, xp: 30, w: 2, h: 2 },
    gazebo: { n: 'Gazebo', lvl: 13, cost: 1500, xp: 50, w: 2, h: 2 },
    windmill: { n: 'Windmill', lvl: 16, cost: 3000, xp: 80, w: 2, h: 2 },
    statue: { n: 'Statue', lvl: 20, cost: 6000, xp: 120, w: 1, h: 1 },
    clocktower: { n: 'Clock tower', lvl: 25, cost: 12000, xp: 200, w: 2, h: 2 },
    rosearch: { n: 'Rose arch', lvl: 22, cost: 4000, xp: 90, w: 1, h: 1 },
    bandstand: { n: 'Bandstand', lvl: 30, cost: 25000, xp: 300, w: 3, h: 3 }
  };
  var SPECIAL = {
    barn: { n: 'Barn', w: 3, h: 3, H: 38 },
    board: { n: 'Order Board', w: 2, h: 2, H: 0 },
    depot: { n: 'Freight Depot', w: 4, h: 2, H: 0, lvl: 4 }
  };
  window.FARM_DATA = { ITEMS: ITEMS, ORDER: ORDER, PENS: PENS, FACTS: FACTS, HOUSES: HOUSES, COMM: COMM, DECOS: DECOS, SPECIAL: SPECIAL, RECIPE_OF: RECIPE_OF, ANIMAL_T: ANIMAL_T, MAT_IDS: MATS.map(function (m) { return m[0]; }), val: val };
})();
