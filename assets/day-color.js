/**
 * Boja dana — akcentna boja po Jyotish (vedskom) pravilu o planeti dana.
 * Jedan izvor za ceo sajt: index.html (--accent/--cta) i site.css (--gold*).
 * Dan se uzima iz lokalnog vremena posetioca. Bez JS-a ostaje brend žuta #F5B91E.
 * Četvrtak (Guru, žuta) je sama brend boja, pa se ne menja ništa.
 * Pregled drugog dana: ?day=0..6 (0 = nedelja).
 *
 * fill   akcenat na tamnoj temi (tamni tekst na njemu, >= 4.5:1)
 * fillL  podloga dugmeta na svetloj temi (tamni tekst na njoj, >= 4.5:1)
 * txL    akcenat kao tekst na svetloj temi (>= 4.5:1 na #e9e9ec i belom)
 * lt/dk  svetlija i tamnija nijansa za prelaze na tamnoj temi
 * txLdk  tamnija nijansa za svetlu temu
 */
(function () {
  var DAYS = [
    /* 0 nedelja  Surya   */ { warm: 1, fill: '#FF8A3D', fillL: '#FF8A3D', lt: '#FFB27A', dk: '#E06A1A', txL: '#A3480A', txLdk: '#7F3606' },
    /* 1 ponedeljak Chandra */ { fill: '#D5DCE6', fillL: '#AEB9C7', lt: '#EEF2F7', dk: '#AAB5C4', txL: '#4D5B6E', txLdk: '#3A4656' },
    /* 2 utorak   Mangal  */ { warm: 1, fill: '#FF5E52', fillL: '#FF5E52', lt: '#FF8A80', dk: '#E8463A', txL: '#B42318', txLdk: '#8E1B12' },
    /* 3 sreda    Budha   */ { fill: '#3DD68C', fillL: '#3DD68C', lt: '#7FE8B4', dk: '#22B26E', txL: '#136B3C', txLdk: '#0F5E35' },
    /* 4 četvrtak Guru    */ null,
    /* 5 petak    Shukra  */ { fill: '#F5C2D7', fillL: '#EBA3C1', lt: '#FBE1EC', dk: '#E79DBD', txL: '#A3305F', txLdk: '#7E2449' },
    /* 6 subota   Shani   */ { fill: '#7D93FF', fillL: '#7D93FF', lt: '#A9B8FF', dk: '#5C76F2', txL: '#2F47C2', txLdk: '#22379A' }
  ];

  var day = new Date().getDay();
  try {
    var q = /[?&]day=([0-6])\b/.exec(location.search);
    if (q) day = +q[1];
  } catch (e) {}

  var h = document.documentElement;
  h.setAttribute('data-day', day);
  var d = DAYS[day];
  if (!d) return;

  function rgb(hex) {
    return [1, 3, 5].map(function (i) { return parseInt(hex.substr(i, 2), 16); }).join(',');
  }

  // html[data-day] nadjačava :root, a [data-theme="light"] varijanta nadjačava svetle teme stranica.
  var css =
    'html[data-day]{' +
      '--accent:' + d.fill + ';--accent-tx:' + d.fill + ';--cta:' + d.fill + ';' +
      '--cta-ink:#141414;--cta-hover:' + d.lt + ';--cta-rgb:' + rgb(d.fill) + ';' +
      '--gold:' + d.fill + ';--gold-lt:' + d.lt + ';--gold-dk:' + d.dk + ';--gold-rgb:' + rgb(d.fill) + ';' +
      // assistant.css: widget ostaje taman u obe teme, pa uzima uvek svetlu nijansu
      '--day-fill:' + d.fill + ';--day-lt:' + d.lt + ';--day-dk:' + d.dk + ';--day-rgb:' + rgb(d.fill) + ';--day-txl:' + d.txL + ';' +
      // crvenkasti dani: prihod u primeru tovara ne sme da liči na troškove (--loss)
      (d.warm ? '--wf-in:var(--tx-2);' : '') + '}' +
    'html[data-day][data-theme="light"]{' +
      '--accent:' + d.fillL + ';--accent-tx:' + d.txL + ';--cta:' + d.fillL + ';--cta-hover:' + d.fill + ';' +
      '--gold:' + d.txL + ';--gold-lt:' + d.txL + ';--gold-dk:' + d.txLdk + '}';

  var s = document.createElement('style');
  s.id = 'day-color';
  s.textContent = css;
  (document.head || h).appendChild(s);
})();
