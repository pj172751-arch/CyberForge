import React, { useEffect, useRef } from 'react';
import Matter from 'matter-js';

export default function FallingPhysics({ mode = 'both' }) {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const floorRef = useRef(null);
  const bgRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const stage = stageRef.current;
    const floor = floorRef.current;
    const bg = bgRef.current;
    if (!container || !stage || !floor || !bg) return;

    const THEMES = {
      attacker: { m: '#ff2a3d', l: '#ffdfe2', f: 'rgba(64,0,12,0.78)', d: '#8e1224', glow: 'rgba(255,30,60,0.8)', bg: '#2a0008' },
      defender: { m: '#2ab7ff', l: '#dbf5ff', f: 'rgba(0,30,72,0.78)', d: '#0f5a98', glow: 'rgba(40,170,255,0.8)', bg: '#001a3a' }
    };
    const T = THEMES[mode] || THEMES.attacker;
    const FONT = 'Segoe UI,Helvetica,Arial,sans-serif';

    // Page styling
    if (mode === 'both') {
      bg.style.background =
        'radial-gradient(ellipse at 22% 40%, ' + THEMES.attacker.bg + ' 0%, transparent 60%), radial-gradient(ellipse at 78% 40%, ' + THEMES.defender.bg + ' 0%, transparent 60%), #000';
      floor.style.background = 'linear-gradient(180deg, rgba(120,40,160,0.25), #000)';
      floor.style.borderTop = '2px solid transparent';
      floor.style.borderImage = 'linear-gradient(90deg,' + THEMES.attacker.m + ',' + THEMES.defender.m + ') 1';
      floor.style.boxShadow = '-30px -2px 26px ' + THEMES.attacker.glow + ', 30px -2px 26px ' + THEMES.defender.glow;
    } else {
      bg.style.background =
        'radial-gradient(ellipse at 50% 35%, ' + T.bg + ' 0%, #000 72%)';
      floor.style.background = 'linear-gradient(180deg,' + T.glow.replace('0.8', '0.28') + ',#000)';
      floor.style.borderTop = '2px solid ' + T.m;
      floor.style.boxShadow = '0 -2px 24px ' + T.glow;
    }

    // Helper functions
    function wrap(w, h, inner) {
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="100%">' + inner + '</svg>';
    }
    function card(w, h, th) {
      const c = 14;
      return '<path d="M' + c + ' 3H' + (w - c) + 'L' + (w - 3) + ' ' + c + 'V' + (h - c) + 'L' + (w - c) + ' ' + (h - 3) +
        'H' + c + 'L3 ' + (h - c) + 'V' + c + 'Z" fill="' + th.f + '" stroke="' + th.m + '" stroke-width="3" stroke-linejoin="round"/>';
    }
    function txt(x, y, s, size, fill, extra) {
      return '<text x="' + x + '" y="' + y + '" font-family="' + FONT + '" font-weight="700" font-size="' + size +
        '" fill="' + fill + '" ' + (extra || '') + '>' + s + '</text>';
    }
    function lockIcon(x, y, s, col) {
      return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
        '<path d="M22 46V32a18 18 0 0 1 36 0v14" fill="none" stroke="' + col + '" stroke-width="8" stroke-linecap="round"/>' +
        '<rect x="10" y="44" width="60" height="46" rx="8" fill="' + col + '"/>' +
        '<circle cx="40" cy="63" r="6.5" fill="#000"/><rect x="37" y="65" width="6" height="15" rx="2" fill="#000"/></g>';
    }
    function shieldPath() { return 'M50 4L92 18V58C92 84 70 104 50 112C30 104 8 84 8 58V18Z'; }
    function shieldIcon(x, y, s, inner, th) {
      return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
        '<path d="' + shieldPath() + '" fill="' + th.f + '" stroke="' + th.m + '" stroke-width="6" stroke-linejoin="round"/>' +
        '<path d="M50 14L82 25V58C82 78 66 94 50 101C34 94 18 78 18 58V25Z" fill="none" stroke="' + th.d + '" stroke-width="2.5"/>' +
        (inner || '') + '</g>';
    }
    function checkPath(x, y, s, col, wd) {
      return '<path transform="translate(' + x + ' ' + y + ') scale(' + s + ')" d="M4 18L15 29L36 4" fill="none" stroke="' + col +
        '" stroke-width="' + (wd || 6) + '" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    function hoodIcon(x, y, s, col, th) {
      col = col || th.m;
      return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
        '<path d="M6 94C10 72 22 64 31 57C21 40 29 10 52 6C74 10 82 38 72 57C80 64 92 72 96 94Z" fill="' + th.f + '" stroke="' + col + '" stroke-width="5" stroke-linejoin="round"/>' +
        '<ellipse cx="51" cy="40" rx="17" ry="21" fill="#000"/>' +
        '<circle cx="44" cy="38" r="3.4" fill="' + th.l + '"/><circle cx="58" cy="38" r="3.4" fill="' + th.l + '"/></g>';
    }
    function monitorIcon(x, y, s, inner, th) {
      return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
        '<rect x="0" y="0" width="80" height="54" rx="5" fill="' + th.f + '" stroke="' + th.m + '" stroke-width="4"/>' +
        '<path d="M40 54V68M24 70H56" stroke="' + th.m + '" stroke-width="4" stroke-linecap="round"/>' + (inner || '') + '</g>';
    }
    function server(x, y, w, s, th) {
      let o = '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">';
      for (let i = 0; i < 3; i++) {
        o += '<rect x="0" y="' + (i * 38) + '" width="' + w + '" height="30" rx="7" fill="' + th.f + '" stroke="' + th.m + '" stroke-width="4"/>' +
             '<circle cx="' + (w - 18) + '" cy="' + (i * 38 + 15) + '" r="4" fill="' + th.m + '"/>' +
             '<rect x="14" y="' + (i * 38 + 12) + '" width="' + (w * 0.45) + '" height="6" rx="3" fill="' + th.d + '"/>';
      }
      return o + '</g>';
    }
    function bricks(x, y, cols, rows, bw, bh, s, th) {
      let o = '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')" fill="' + th.f + '" stroke="' + th.m + '" stroke-width="3">';
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const off = (r % 2) ? bw / 2 : 0, bx = c * (bw + 4) - off;
        if (bx < -1 || bx + bw > cols * (bw + 4) - 4 + 1) continue;
        o += '<rect x="' + bx + '" y="' + (r * (bh + 4)) + '" width="' + bw + '" height="' + bh + '" rx="3"/>';
      }
      return o + '</g>';
    }
    function progress(x, y, n, filled, th) {
      let o = '<rect x="' + x + '" y="' + y + '" width="' + (n * 33 + 4) + '" height="40" rx="4" fill="none" stroke="' + th.m + '" stroke-width="3"/>';
      for (let i = 0; i < n; i++) o += '<rect x="' + (x + 4 + i * 33) + '" y="' + (y + 5) + '" width="28" height="30" fill="' + (i < filled ? th.m : 'none') + '" stroke="' + th.d + '" stroke-width="1.5"/>';
      return o;
    }
    function title(word, iconSvg, th) {
      return wrap(380, 126, card(380, 126, th) + iconSvg +
        txt(148, 70, word, 46, th.m) +
        '<path d="M146 88H350" stroke="' + th.m + '" stroke-width="3"/><path d="M350 88L362 74H368" stroke="' + th.m + '" stroke-width="3" fill="none"/>');
    }
    function bookItem(w, label, th) {
      return {
        w: w, h: 66, th: th, svg: wrap(w, 66,
          '<rect x="3" y="3" width="' + (w - 6) + '" height="60" rx="6" fill="' + th.f + '" stroke="' + th.m + '" stroke-width="3"/>' +
          '<rect x="3" y="3" width="18" height="60" rx="6" fill="' + th.d + '" opacity="0.55"/>' +
          '<path d="M' + (w - 14) + ' 8V58" stroke="' + th.d + '" stroke-width="2"/>' +
          txt(40, 43, label, 26, th.l))
      };
    }
    function codeLines(x, y, n, th) {
      let o = '', i, ind, wd;
      for (i = 0; i < n; i++) {
        ind = [0, 0, 18, 18, 36, 18, 0, 18, 36, 0][i % 10];
        wd = 40 + ((i * 53) % 110);
        o += '<rect x="' + (x + ind) + '" y="' + (y + i * 20) + '" width="' + wd + '" height="7" rx="3.5" fill="' + (i % 3 ? th.d : th.m) + '"/>' +
             '<rect x="' + (x + ind + wd + 8) + '" y="' + (y + i * 20) + '" width="' + (20 + (i * 29) % 50) + '" height="7" rx="3.5" fill="' + th.d + '"/>';
      }
      return o;
    }
    function binary(x, y, rows, cols, th) {
      let o = '';
      for (let r = 0; r < rows; r++) {
        let s = '';
        for (let c = 0; c < cols; c++) s += (Math.random() < 0.5 ? '0' : '1') + ' ';
        o += '<text x="' + x + '" y="' + (y + r * 21) + '" font-family="Consolas,monospace" font-size="16" fill="' + (r % 3 ? th.d : th.m) + '">' + s + '</text>';
      }
      return o;
    }

    const CONT = [
      'M50 70L110 52L150 62L170 90L150 120L125 140L112 168L96 150L88 120L60 100Z',
      'M122 176L152 170L170 196L158 232L140 250L128 222Z',
      'M200 66L250 58L275 72L262 98L228 104L206 92Z',
      'M210 112L262 108L286 140L270 200L240 218L222 170Z',
      'M282 64L370 56L408 84L388 124L340 140L308 118L290 94Z',
      'M350 178L396 170L410 196L376 212L350 200Z'
    ];

    // Build Attacker items
    const A = [];
    const Ath = THEMES.attacker;
    A.push({ w: 380, h: 126, th: Ath, svg: title('Attacker', hoodIcon(24, 20, 0.88, Ath.m, Ath), Ath) });

    (function () {
      const rows = ['Reconnaissance', 'Scanning', 'Exploitation', 'Privilege Escalation', 'Maintaining Access', 'Covering Tracks'];
      let o = card(380, 336, Ath);
      for (let i = 0; i < rows.length; i++) {
        const y = 46 + i * 50;
        o += '<rect x="26" y="' + (y - 18) + '" width="32" height="32" rx="4" fill="none" stroke="' + (i < 3 ? Ath.m : Ath.d) + '" stroke-width="3"/>';
        if (i < 3) o += checkPath(26, y - 17, 0.9, Ath.m, 5.5);
        o += txt(76, y + 8, rows[i], 25, Ath.l, 'font-weight="600"');
      }
      A.push({ w: 380, h: 336, th: Ath, svg: wrap(380, 336, o) });
    })();

    A.push({
      w: 380, h: 214, th: Ath, svg: wrap(380, 214, card(380, 214, Ath) + lockIcon(24, 28, 1.15, Ath.m) +
        txt(130, 66, 'Target Network', 30, Ath.m) + '<path d="M128 80H350" stroke="' + Ath.d + '" stroke-width="2"/>' +
        txt(130, 114, 'Breaching...', 27, Ath.m, 'font-weight="600"') + progress(24, 146, 10, 6, Ath))
    });

    A.push({
      w: 440, h: 280, th: Ath, svg: wrap(440, 280, card(440, 280, Ath) +
        '<g fill="' + Ath.d + '" opacity="0.85">' + CONT.map(p => '<path d="' + p + '"/>').join('') + '</g>' +
        '<path d="M95 88Q210 14 330 102" fill="none" stroke="' + Ath.m + '" stroke-width="2.5"/>' +
        '<circle cx="95" cy="88" r="15" fill="none" stroke="' + Ath.m + '" opacity="0.5" stroke-width="2"/><circle cx="95" cy="88" r="6.5" fill="' + Ath.m + '"/>' +
        '<circle cx="330" cy="102" r="15" fill="none" stroke="' + Ath.m + '" opacity="0.5" stroke-width="2"/><circle cx="330" cy="102" r="6.5" fill="' + Ath.m + '"/>')
    });

    A.push({
      w: 340, h: 310, th: Ath, svg: wrap(340, 310, card(340, 310, Ath) +
        '<g stroke="' + Ath.m + '" stroke-width="2.5" fill="none"><path d="M70 82L170 64M270 82L170 64M170 64V118M170 212L250 238"/></g>' +
        monitorIcon(30, 22, 0.72, '', Ath) + monitorIcon(250, 22, 0.72, '', Ath) + '<circle cx="170" cy="62" r="9" fill="' + Ath.m + '"/>' +
        server(116, 118, 108, 1, Ath) + bricks(214, 232, 5, 3, 22, 14, 1, Ath))
    });

    A.push({
      w: 390, h: 270, th: Ath, svg: wrap(390, 270,
        '<path d="M96 12L358 6L332 190L70 198Z" fill="' + Ath.f + '" stroke="' + Ath.m + '" stroke-width="4" stroke-linejoin="round"/>' +
        hoodIcon(160, 40, 1.05, Ath.m, Ath) +
        '<path d="M70 198L332 190L376 242L22 252Z" fill="' + Ath.d + '" opacity="0.6" stroke="' + Ath.m + '" stroke-width="4" stroke-linejoin="round"/>' +
        '<g fill="' + Ath.m + '" opacity="0.8">' + [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => '<rect x="' + (60 + i * 30) + '" y="214" width="20" height="6" rx="2"/>').join('') + '</g>')
    });

    A.push(bookItem(340, 'Network Security', Ath));
    A.push(bookItem(330, 'Ethical Hacking', Ath));
    A.push(bookItem(350, 'Penetration Testing', Ath));

    (function () {
      const inv = ['..#.....#..', '...#...#...', '..#######..', '.##.###.##.', '###########', '#.#######.#', '#.#.....#.#', '...##.##...'];
      let o = '';
      for (let r = 0; r < 8; r++) for (let c = 0; c < 11; c++) if (inv[r][c] === '#') o += '<rect x="' + (40 + c * 7) + '" y="' + (62 + r * 7) + '" width="7" height="7" fill="' + Ath.m + '"/>';
      A.push({
        w: 190, h: 190, th: Ath, svg: wrap(190, 190,
          '<path d="M142 56Q184 56 184 98Q184 140 142 140" fill="none" stroke="' + Ath.m + '" stroke-width="12" stroke-linecap="round"/>' +
          '<rect x="12" y="16" width="130" height="160" rx="16" fill="' + Ath.f + '" stroke="' + Ath.m + '" stroke-width="5"/>' + o)
      });
    })();

    A.push({
      w: 290, h: 220, th: Ath, svg: wrap(290, 220,
        '<path d="M44 150C44 14 246 14 246 150" fill="none" stroke="' + Ath.m + '" stroke-width="16" stroke-linecap="round"/>' +
        '<rect x="16" y="118" width="58" height="92" rx="22" fill="' + Ath.f + '" stroke="' + Ath.m + '" stroke-width="5"/>' +
        '<rect x="216" y="118" width="58" height="92" rx="22" fill="' + Ath.f + '" stroke="' + Ath.m + '" stroke-width="5"/>' +
        '<rect x="28" y="136" width="18" height="56" rx="9" fill="' + Ath.d + '"/><rect x="244" y="136" width="18" height="56" rx="9" fill="' + Ath.d + '"/>')
    });

    A.push({
      w: 340, h: 250, th: Ath, svg: wrap(340, 250, card(340, 250, Ath) +
        '<circle cx="28" cy="26" r="5" fill="' + Ath.m + '"/><circle cx="46" cy="26" r="5" fill="' + Ath.d + '"/><circle cx="64" cy="26" r="5" fill="' + Ath.d + '"/>' +
        codeLines(26, 52, 9, Ath))
    });

    A.push({
      w: 180, h: 170, th: Ath, svg: wrap(180, 170,
        '<path d="M92 8L170 160L12 160Z" fill="' + Ath.f + '" stroke="' + Ath.m + '" stroke-width="5" stroke-linejoin="round"/>' + hoodIcon(52, 62, 0.8, Ath.m, Ath))
    });

    A.push({ w: 130, h: 160, th: Ath, svg: wrap(130, 160, lockIcon(5, 4, 1.55, Ath.m)) });

    // Build Defender items
    const D = [];
    const Dth = THEMES.defender;
    D.push({ w: 380, h: 126, th: Dth, svg: title('Defender', shieldIcon(26, 12, 0.92, lockIcon(30, 36, 0.5, Dth.m), Dth), Dth) });

    D.push({
      w: 300, h: 350, th: Dth, svg: wrap(300, 350,
        '<g transform="translate(8 8) scale(2.84 2.98)"><path d="' + shieldPath() + '" fill="' + Dth.f + '" stroke="' + Dth.m + '" stroke-width="4" stroke-linejoin="round"/>' +
        '<path d="M50 14L82 25V58C82 78 66 94 50 101C34 94 18 78 18 58V25Z" fill="none" stroke="' + Dth.d + '" stroke-width="1.8"/></g>' +
        lockIcon(98, 112, 1.2, Dth.m))
    });

    (function () {
      let o = '<circle cx="160" cy="160" r="152" fill="' + Dth.f + '" stroke="' + Dth.m + '" stroke-width="4"/>';
      o += '<clipPath id="gc"><circle cx="160" cy="160" r="150"/></clipPath><g clip-path="url(#gc)"><g fill="' + Dth.d + '" opacity="0.85" transform="translate(-4 4) scale(0.78) translate(40 20)">' + CONT.map(p => '<path d="' + p + '"/>').join('') + '</g></g>';
      o += '<g fill="none" stroke="' + Dth.m + '" stroke-width="1.8" opacity="0.7"><ellipse cx="160" cy="160" rx="152" ry="60"/><ellipse cx="160" cy="160" rx="70" ry="152"/><ellipse cx="160" cy="160" rx="120" ry="152"/><path d="M8 160H312M160 8V312"/></g>';
      o += '<g fill="none" stroke="' + Dth.m + '" stroke-width="2.2"><path d="M70 120Q160 40 250 130"/><path d="M90 220Q170 160 240 200"/></g>';
      o += '<circle cx="70" cy="120" r="6" fill="' + Dth.m + '"/><circle cx="250" cy="130" r="6" fill="' + Dth.m + '"/><circle cx="240" cy="200" r="6" fill="' + Dth.m + '"/><circle cx="90" cy="220" r="6" fill="' + Dth.m + '"/>';
      D.push({ w: 320, h: 320, r: 160, th: Dth, svg: wrap(320, 320, o) });
    })();

    D.push({ w: 240, h: 210, th: Dth, svg: wrap(240, 210, card(240, 210, Dth) + lockIcon(60, 22, 1.5, Dth.m), Dth) });

    D.push({
      w: 290, h: 220, th: Dth, svg: wrap(290, 220, card(290, 220, Dth) + server(30, 30, 150, 1, Dth) +
        shieldIcon(186, 84, 0.78, checkPath(30, 34, 0.75, Dth.m, 7), Dth))
    });

    D.push({
      w: 290, h: 220, th: Dth, svg: wrap(290, 220, card(290, 220, Dth) + bricks(26, 46, 5, 5, 34, 22, 1, Dth) +
        '<g transform="translate(206 30) scale(0.95)"><path d="M40 0C48 24 78 36 70 72C64 96 34 98 22 78C14 60 30 48 34 34C40 48 48 38 40 0Z" fill="' + Dth.m + '" opacity="0.9"/>' +
        '<path d="M42 40C46 54 58 60 54 74C51 84 38 85 33 76C29 68 40 62 42 40Z" fill="#000" opacity="0.6"/></g>')
    });

    D.push({
      w: 310, h: 250, th: Dth, svg: wrap(310, 250, card(310, 250, Dth) +
        monitorIcon(52, 32, 2.5, '', Dth) + shieldIcon(124, 62, 0.78, checkPath(30, 34, 0.75, Dth.m, 7), Dth))
    });

    D.push({ w: 240, h: 270, th: Dth, svg: wrap(240, 270, card(240, 270, Dth) + shieldIcon(34, 26, 1.7, lockIcon(30, 36, 0.5, Dth.m), Dth)) });

    D.push({ w: 330, h: 210, th: Dth, svg: wrap(330, 210, card(330, 210, Dth) + binary(24, 38, 8, 15, Dth)) });

    (function () {
      let o = '<circle cx="150" cy="150" r="142" fill="' + Dth.f + '" stroke="' + Dth.m + '" stroke-width="3"/>' +
        '<circle cx="150" cy="150" r="118" fill="none" stroke="' + Dth.m + '" stroke-width="10" stroke-dasharray="30 12"/>' +
        '<circle cx="150" cy="150" r="90" fill="none" stroke="' + Dth.d + '" stroke-width="3"/>' +
        '<circle cx="150" cy="150" r="64" fill="none" stroke="' + Dth.m + '" stroke-width="4" stroke-dasharray="4 8"/>';
      for (let i = 0; i < 36; i++) o += '<path d="M150 8V' + (i % 3 ? 16 : 26) + '" stroke="' + Dth.m + '" stroke-width="2.5" transform="rotate(' + (i * 10) + ' 150 150)"/>';
      o += shieldIcon(116, 108, 0.6, checkPath(30, 34, 0.75, Dth.m, 7), Dth).replace('scale(0.6)', 'scale(0.6)');
      D.push({ w: 300, h: 300, r: 150, th: Dth, svg: wrap(300, 300, o) });
    })();

    D.push({ w: 150, h: 172, th: Dth, svg: wrap(150, 172, shieldIcon(8, 8, 1.4, checkPath(32, 36, 0.95, Dth.m, 7), Dth)) });

    D.push({
      w: 240, h: 100, th: Dth, svg: wrap(240, 100, card(240, 100, Dth) +
        '<path d="M28 82L84 18H118L62 82Z" fill="' + Dth.m + '"/><path d="M92 82L148 18H170L114 82Z" fill="' + Dth.m + '" opacity="0.7"/><path d="M146 82L194 28H206L158 82Z" fill="' + Dth.m + '" opacity="0.45"/>')
    });

    D.push({
      w: 380, h: 214, th: Dth, svg: wrap(380, 214, card(380, 214, Dth) +
        shieldIcon(26, 34, 1.15, checkPath(30, 34, 0.75, Dth.m, 7), Dth) +
        txt(142, 70, 'Network Protected', 24, Dth.m) + '<path d="M140 84H350" stroke="' + Dth.d + '" stroke-width="2"/>' +
        txt(142, 118, 'Monitoring...', 26, Dth.m, 'font-weight="600"') + progress(24, 146, 10, 10, Dth))
    });

    const ITEMS = mode === 'attacker' ? A : mode === 'defender' ? D : A.concat(D);

    // Matter.js setup
    const { Engine, Bodies, Body, Composite, Mouse, MouseConstraint, Events } = Matter;
    let W = container.clientWidth || 600;
    let H = container.clientHeight || 700;
    const FLOOR = 26;

    const engine = Engine.create({ enableSleeping: true });
    engine.gravity.y = 1.4;
    engine.positionIterations = 10;
    engine.velocityIterations = 8;

    const ground = Bodies.rectangle(W / 2, H - FLOOR + 100, W * 4, 200, { isStatic: true, friction: 0.8 });
    const wallL = Bodies.rectangle(-60, H / 2 - 1500, 120, 4000 + H, { isStatic: true });
    const wallR = Bodies.rectangle(W + 60, H / 2 - 1500, 120, 4000 + H, { isStatic: true });
    Composite.add(engine.world, [ground, wallL, wallR]);

    let area = 0;
    ITEMS.forEach(it => { area += it.w * it.h; });
    const S = Math.max(0.24, Math.min(Math.sqrt((mode === 'both' ? 0.38 : 0.32) * W * H / area), 0.95));

    const parts = [];

    function makeItem(it) {
      const w = it.w * S, h = it.h * S;
      const el = document.createElement('div');
      el.className = 'it';
      el.style.position = 'absolute';
      el.style.left = '0';
      el.style.top = '0';
      el.style.width = w + 'px';
      el.style.height = h + 'px';
      el.style.opacity = '0';
      el.style.willChange = 'transform';
      el.style.cursor = 'grab';
      el.style.userSelect = 'none';
      el.style.touchAction = 'none';
      const th = it.th || T;
      el.style.filter = 'drop-shadow(0 0 5px ' + th.glow + ') drop-shadow(0 0 16px ' + th.glow.replace('0.8', '0.35') + ')';
      el.innerHTML = it.svg;
      stage.appendChild(el);

      const body = it.r
        ? Bodies.circle(0, 0, it.r * S, { restitution: 0.3, friction: 0.5, frictionAir: 0.004, density: 0.0012 })
        : Bodies.rectangle(0, 0, w, h, { chamfer: { radius: 10 * S }, restitution: 0.25, friction: 0.55, frictionAir: 0.004, density: 0.0012 });

      return { el, body, w, h };
    }

    function shuffle(a) {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    }

    const n = ITEMS.length;
    const slots = [];
    for (let k = 0; k < n; k++) slots.push((k + 0.5) / n);
    shuffle(slots);
    const order = ITEMS.map((_, i) => i);
    shuffle(order);

    const timeouts = [];
    order.forEach((idx, i) => {
      const p = makeItem(ITEMS[idx]);
      parts.push(p);

      const to = setTimeout(() => {
        const m = p.w / 2 + 10;
        const x = Math.max(m, Math.min(W - m, slots[i] * W + (Math.random() - 0.5) * 60));
        Body.setPosition(p.body, { x: x, y: -p.h - 40 });
        Body.setAngle(p.body, (Math.random() - 0.5) * 0.55);
        Body.setAngularVelocity(p.body, (Math.random() - 0.5) * 0.025);
        Body.setVelocity(p.body, { x: (Math.random() - 0.5) * 2, y: 3.5 });
        Composite.add(engine.world, p.body);
        p.el.style.opacity = '1';
      }, 350 + i * 360 + Math.random() * 150);
      timeouts.push(to);
    });

    // Mouse / Touch drag constraint scoped directly to container
    const mouse = Mouse.create(container);
    // Prevent default scroll stealing
    mouse.element.removeEventListener('mousewheel', mouse.mousewheel);
    mouse.element.removeEventListener('DOMMouseScroll', mouse.mousewheel);

    const mc = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: { stiffness: 0.18, damping: 0.1, render: { visible: false } }
    });
    Composite.add(engine.world, mc);

    Events.on(engine, 'afterUpdate', () => {
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i], b = p.body;
        p.el.style.transform = 'translate3d(' + (b.position.x - p.w / 2) + 'px,' + (b.position.y - p.h / 2) + 'px,0) rotate(' + b.angle + 'rad)';
      }
    });

    const handleResize = () => {
      if (!container) return;
      W = container.clientWidth;
      H = container.clientHeight;
      Body.setPosition(ground, { x: W / 2, y: H - FLOOR + 100 });
      Body.setPosition(wallR, { x: W + 60, y: H / 2 - 1500 });
      Body.setPosition(wallL, { x: -60, y: H / 2 - 1500 });
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animId;
    let last = performance.now();
    function loop(now) {
      const dt = Math.min(now - last, 50);
      last = now;
      Engine.update(engine, dt);
      animId = requestAnimationFrame(loop);
    }
    animId = requestAnimationFrame(loop);

    // Cleanup on unmount or mode change
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      timeouts.forEach(clearTimeout);
      Events.off(engine, 'afterUpdate');
      Composite.clear(engine.world, false);
      Engine.clear(engine);
      stage.innerHTML = '';
    };
  }, [mode]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none">
      <div ref={bgRef} className="absolute inset-0 pointer-events-none" />
      <div ref={stageRef} className="absolute inset-0 overflow-hidden" />
      <div
        ref={floorRef}
        className="absolute left-0 right-0 bottom-0 pointer-events-none"
        style={{ height: '26px' }}
      />
    </div>
  );
}
