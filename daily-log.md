# Dnevnik rada

## 2026-10-19

**Izmene**
- Objavljen PR #2: meni na telefonu na početnoj, fontovi bez Google-a, čitljiva svetla tema (glosar je bio beo na belom), stranice kalkulatora sređene, blok za $49 Load Check ispod deadhead, fuel surcharge i detention kalkulatora.
- Otvoren PR #3 („Kalkulatori besplatni kao lead magnet za Load Check“): pretraga nije našla naplatu ni paywall na kalkulatorima; dodat kratak CTA ka `work.html#check` na ETA, factoring, IFTA, maintenance, take-home kalkulator i na `calculators.html`.

**Otvorena pitanja (u PR #3)**
- Jezik CTA teksta: sajt je na engleskom, CTA je na engleskom.
- Svaka `calc-*.html` stranica nosi JS svih osam kalkulatora.
- `assets/assistant.js:124` vodi na nepostojeće sidro `legal.html#entity`.

**Sledeći predlog**
- Popraviti mrtav link u asistentu (`#entity` → `#who`) i ukloniti nekorišćeni JS iz `calc-*.html` stranica, u jednom malom PR-u, kad vlasnik odobri.
