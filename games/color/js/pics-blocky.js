/* Blocky World: original Minecraft-style pixel pictures. */
(function () {
  const C = 'blocky';
  PIC({ id: 'b-grass', name: 'Grass Block', cat: C, size: 16, bg: '#8b5a2b', draw(g) {
    g.map((i, j) => { if (j < 3) return '#5cb83c'; if (j === 3) return (i * 7 + 3) % 5 < 3 ? '#5cb83c' : undefined; if (j === 4 && (i % 4 === 1)) return '#5cb83c'; });
  }, tex: { '#5cb83c': ['#3f9a2b', 0.3], '#8b5a2b': ['#6b4220', 0.28] } });
  PIC({ id: 'b-tnt', name: 'Boom Block', cat: C, rows: [
    'rRrrRrrrRrrrRrrR','rrRrrrRrrRrrrRrr','RrrrRrrrrrRrrrRr','rrRrrRrrRrrrRrrr','kkkkkkkkkkkkkkkk','wwwwwwwwwwwwwwww',
    'wwkkkwkwwkwkkkww','wwwkwwkkwkwwkwww','wwwkwwkwkkwwkwww','wwwkwwkwwkwwkwww','wwwwwwwwwwwwwwww','kkkkkkkkkkkkkkkk',
    'rrRrrrRrrRrrrRrr','RrrrRrrrrrRrrrRr','rRrrRrrrRrrrRrrR','rrRrrRrrRrrrRrrr'],
    pal: { r: '#e03b2f', R: '#a8231b', k: '#2b2b3a', w: '#f4f1e8' } });
  PIC({ id: 'b-diamond', name: 'Shiny Diamond', cat: C, bg: '#fdf6ff', rows: [
    '................','....kkkkkkkk....','...kwwcwcccbk...','..kwwcccccbbbk..','.kccccccccbbbdk.','.kbbbbbbbbbbddk.',
    '.kwcccccccbbbdk.','..kwccccccbbdk..','...kwcccccbdk...','....kwcccbdk....','.....kwccdk.....','......kcdk......','.......kk.......','................','................','................'],
    pal: { k: '#1d3b47', w: '#e8fffd', c: '#4ee6dd', b: '#22b3b0', d: '#13777a' } });
  PIC({ id: 'b-pickaxe', name: 'Diamond Pickaxe', cat: C, bg: '#e9f6ff', rows: [
    '................','.....kkkkkk.....','....kccwccck....','.....kkkkkcck...','..........kcck..','.........kbkcck.',
    '........kbk.kcck','.......kbk...kck','......kbk.....kk','.....kbk........','....kbk.........','...kbk..........','..kbk...........','.kbk............','.kk.............','................'],
    pal: { k: '#2b2b3a', c: '#4ee6dd', w: '#c9fffb', b: '#9b6a3c' } });
  PIC({ id: 'b-sword', name: 'Blocky Sword', cat: C, bg: '#fff4e0', rows: [
    '............kkkk','...........kwwck','..........kwwck.','.........kwwck..','........kwwck...','.......kwwck....',
    '..kk..kwwck.....','..kgkkwwck......','...kgkwck.......','....kgck........','....kbkgk.......','...kbk.kgk......','..kbk...kk......','.kbk............','.kk.............','................'],
    pal: { k: '#2b2b3a', w: '#e8fffd', c: '#4ee6dd', g: '#c8a24a', b: '#7a4a24' } });
  PIC({ id: 'b-pig', name: 'Blocky Piggy', cat: C, scale: 2, rows: ['pppppppp','pppppppp','wkppppkw','pppppppp','ppnnnnpp','ppdnndpp','pppppppp','pppppppp'],
    pal: { p: '#f4a3b4', w: '#ffffff', k: '#2b2b3a', n: '#f7c2cd', d: '#a8566a' }, tex: { '#f4a3b4': ['#ec8fa3', 0.22] } });
  PIC({ id: 'b-blob', name: 'Green Blocky Buddy', cat: C, scale: 2, rows: ['gggggggg','gggggggg','gkkggkkg','gkkggkkg','gggkkggg','ggkkkkgg','ggkkkkgg','ggkggkgg'],
    pal: { g: '#5cc95c', k: '#1f2a1f' }, tex: { '#5cc95c': ['#3e9e3e', 0.3] } });
  PIC({ id: 'b-sheep', name: 'Blocky Sheep', cat: C, scale: 2, rows: ['wwwwwwww','wwwwwwww','wssssssw','wskssksw','wssssssw','wsppppsw','wssssssw','wwwwwwww'],
    pal: { w: '#f4f4f4', s: '#e8c9a6', k: '#2b2b3a', p: '#f2a3b3' }, tex: { '#f4f4f4': ['#d9d9d9', 0.25] } });
  PIC({ id: 'b-hero', name: 'Blocky Hero', cat: C, scale: 2, rows: ['hhhhhhhh','hhhhhhhh','hssssssh','swgsswgs','ssssssss','sssnnsss','ssmmmmss','ssssssss'],
    pal: { h: '#e8762c', s: '#f1c28f', w: '#ffffff', g: '#3fa34d', n: '#c98d5a', m: '#8a3b2a' }, tex: { '#e8762c': ['#c75a17', 0.25] } });
  PIC({ id: 'b-cow', name: 'Blocky Cow', cat: C, scale: 2, rows: ['bbwwbbbb','bwwbbbww','bbbbbbbb','wkbbbbkw','bbbbbbbb','bppppppb','bpkppkpb','bppppppb'],
    pal: { b: '#5a3a24', w: '#f4f4f4', k: '#1b1b24', p: '#f2b8c0' } });
  PIC({ id: 'b-chest', name: 'Treasure Chest', cat: C, bg: '#d8f1ff', rows: [
    'kkkkkkkkkkkkkkkk','kbbbbbbbbbbbbbbk','kbddbbbbbbbbddbk','kbbbbbbbbbbbbbbk','kbbbbbbbbbbbbbbk','kkkkkkkyykkkkkkk','kbbbbbkyykbbbbbk',
    'kbbbbbkyykbbbbbk','kbbbbbbkkbbbbbbk','kbddbbbbbbbbddbk','kbbbbbbbbbbbbbbk','kbbbbbbbbbbbbbbk','kbddbbbbbbbbddbk','kkkkkkkkkkkkkkkk'],
    pal: { k: '#3b2412', b: '#b07a3f', d: '#8a5a2b', y: '#ffd23f' } });
  PIC({ id: 'b-ore', name: 'Diamond Ore', cat: C, size: 16, bg: '#8e8e8e', draw(g) {
    [[3, 3], [10, 2], [6, 9], [12, 11], [2, 12]].forEach(([x, y]) => { g.pxr(x, y, x + 1, y + 1, '#4ee6dd'); g.px(x + 2, y + 1, '#4ee6dd'); g.px(x, y, '#c9fffb'); });
  }, tex: { '#8e8e8e': ['#6f6f6f', 0.3] } });
  PIC({ id: 'b-island', name: 'Blocky Island', cat: C, size: 32, bg: '#8fd3ff', draw(g) {
    g.pxr(24, 2, 28, 6, '#ffe14d'); g.pxr(3, 4, 11, 6, '#ffffff'); g.pxr(5, 3, 8, 3, '#ffffff'); g.pxr(16, 6, 20, 7, '#ffffff');
    g.pxr(4, 16, 27, 17, '#5cc95c'); g.pxr(5, 18, 26, 21, '#9b6a3c'); g.pxr(7, 22, 24, 24, '#9b6a3c'); g.pxr(10, 25, 21, 26, '#8c8c8c'); g.pxr(13, 27, 18, 28, '#8c8c8c');
    g.pxr(9, 11, 10, 15, '#7a4a24'); g.pxr(6, 6, 13, 10, '#2f9e44'); g.pxr(7, 5, 12, 5, '#2f9e44');
    g.pxr(16, 12, 22, 15, '#d39b5a'); g.pxr(15, 10, 23, 11, '#b33b2e'); g.pxr(17, 9, 21, 9, '#b33b2e'); g.pxr(18, 13, 19, 15, '#5c3a1a'); g.px(21, 13, '#9fe3ff'); g.px(17, 13, '#9fe3ff');
    g.pxr(26, 18, 26, 31, '#3a86ff'); g.pxr(25, 18, 25, 19, '#3a86ff');
  }, tex: { '#5cc95c': ['#3f9a2b', 0.3], '#9b6a3c': ['#7a5230', 0.25], '#2f9e44': ['#237a34', 0.3], '#8c8c8c': ['#6f6f6f', 0.3] } });
})();
