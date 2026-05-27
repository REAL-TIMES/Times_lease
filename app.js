/* ════════════════════════════════════════════════════
   타임즈부동산중개 — 건축물대장 비교 조회
   @babel/standalone 컴파일 | React 18 UMD 전역 사용
   주의: import/export 사용 금지 (Babel standalone 제약)
   ════════════════════════════════════════════════════ */

const VERSION = 'v1.5.7';
// v1.3.3: 제목중복 수정·사진업로드버튼 수정·지도로딩칸 제거·Gemini2.0 다중폴백·사진비율고정

const { useState } = React;

// ── 법정동코드 룩업 (c=sigunguCd, d={동명:bjdongCd}) ──
const R = {
  "서울특별시": {
    "강남구":  { c:"11680", d:{"역삼동":"10100","개포동":"10300","청담동":"10400","삼성동":"10500","대치동":"10600","신사동":"10700","논현동":"10800","압구정동":"11000","세곡동":"11100","자곡동":"11200","율현동":"11300","일원동":"11400","수서동":"11500","도곡동":"11800"} },
    "서초구":  { c:"11650", d:{"방배동":"10100","양재동":"10200","우면동":"10300","원지동":"10400","잠원동":"10600","반포동":"10700","서초동":"10800","내곡동":"10900","염곡동":"11000","신원동":"11100"} },
    "송파구":  { c:"11710", d:{"가락동":"10700","거여동":"10200","개롱동":"10600","마천동":"10300","문정동":"10800","방이동":"10400","삼전동":"11300","석촌동":"11400","성내동":"11600","신천동":"11200","오금동":"10500","위례동":"11000","잠실동":"11100","장지동":"10900","풍납동":"10100","송파동":"11500"} },
    "강동구":  { c:"11740", d:{"강일동":"10900","고덕동":"10200","길동":"10400","둔촌동":"10500","명일동":"10100","상일동":"10300","성내동":"10700","암사동":"10600","천호동":"10800","풍산동":"11000"} },
    "용산구":  { c:"11170", d:{"도원동":"11400","동빙고동":"12300","보광동":"13100","서빙고동":"12400","이촌동":"12000","이태원동":"12100","한남동":"12200","효창동":"11300"} },
    "마포구":  { c:"11440", d:{"공덕동":"10200","노고산동":"11000","도화동":"10400","동교동":"12100","망원동":"12300","마포동":"10700","상수동":"11500","서교동":"12000","아현동":"10100","연남동":"12400","합정동":"12200"} },
    "성동구":  { c:"11200", d:{"금호동1가":"10400","마장동":"11100","사근동":"11200","성수동1가":"11500","성수동2가":"11600","옥수동":"10800","왕십리동":"10100","응봉동":"10300","행당동":"10200"} },
    "광진구":  { c:"11215", d:{"광장동":"10600","구의동":"10500","군자동":"10200","능동":"10400","자양동":"10700","중곡동":"10300","화양동":"10100"} },
    "영등포구":{ c:"11560", d:{"당산동":"11700","대림동":"13300","도림동":"11800","문래동1가":"11900","신길동":"13200","양평동1가":"12500","양평동2가":"12600","양평동3가":"12700","양평동4가":"12800","양평동5가":"12900","양평동6가":"13000","여의도동":"11000","영등포동":"10100"} },
    "강서구":  { c:"11500", d:{"가양동":"10400","내발산동":"10600","등촌동":"10200","마곡동":"10500","방화동":"10900","염창동":"10100","화곡동":"10300"} },
    "동작구":  { c:"11590", d:{"노량진동":"10100","대방동":"10200","동작동":"10300","본동":"10400","사당동":"10500","상도동":"10600","신대방동":"10700","흑석동":"10800"} },
    "관악구":  { c:"11620", d:{"남현동":"10300","봉천동":"10100","신림동":"10200"} },
    "종로구":  { c:"11110", d:{"가회동":"14400","계동":"14600","낙원동":"13500","부암동":"18100","사직동":"11500","삼청동":"13800","인사동":"13400","창신동":"17100","청운동":"10100","평창동":"18000","효자동":"10400"} },
    "중구":    { c:"11140", d:{"다산동":"12500","신당동":"12400","약수동":"12600","장충동1가":"12200","장충동2가":"12300","청구동":"12700","황학동":"13200"} },
    "성북구":  { c:"11290", d:{"길음동":"11000","돈암동":"11700","보문동1가":"11600","성북동":"10100","월곡동":"11400","장위동":"11200","정릉동":"11100","종암동":"11500","하월곡동":"11300"} },
    "노원구":  { c:"11350", d:{"공릉동":"10100","상계동":"10400","월계동":"10200","중계동":"10500","하계동":"10300"} },
    "은평구":  { c:"11380", d:{"갈현동":"10200","구산동":"10300","대조동":"10400","불광동":"10100","수색동":"10900","신사동":"10700","역촌동":"10600","응암동":"10500","증산동":"10800","진관동":"11000"} },
    "서대문구":{ c:"11410", d:{"남가좌동":"11100","냉천동":"10600","대신동":"11000","대현동":"10900","북가좌동":"11200","북아현동":"10200","신촌동":"10700","연희동":"10500","창천동":"10800","천연동":"10400","홍은동":"10300","홍제동":"10100"} },
    "강북구":  { c:"11305", d:{"미아동":"10300","번동":"10100","수유동":"10200","우이동":"10400"} },
    "도봉구":  { c:"11320", d:{"도봉동":"10100","방학동":"10300","쌍문동":"10200","창동":"10400"} },
    "중랑구":  { c:"11260", d:{"망우동":"10500","면목동":"10100","묵동":"10400","상봉동":"10200","신내동":"10600","중화동":"10300"} },
    "동대문구":{ c:"11230", d:{"답십리동":"10400","신설동":"10900","용신동":"10100","이문동":"10700","전농동":"10300","제기동":"10200","장안동":"10500","청량리동":"10600","휘경동":"10800"} },
    "양천구":  { c:"11470", d:{"목동":"10100","신월동":"10300","신정동":"10200"} },
    "구로구":  { c:"11530", d:{"가리봉동":"10200","개봉동":"10400","고척동":"10300","구로동":"10100","궁동":"10600","신도림동":"10900","오류동":"10500","온수동":"10700","항동":"10800"} },
    "금천구":  { c:"11545", d:{"가산동":"10200","독산동":"10300","시흥동":"10100"} }
  },
  "경기도": {
    "과천시":        { c:"41290", d:{"갈현동":"10500","관문동":"10900","과천동":"10800","막계동":"10700","문원동":"10400","별양동":"10200","부림동":"10300","주암동":"10600","중앙동":"10100"} },
    "고양시 덕양구": { c:"41281", d:{"강매동":"10100","고양동":"10200","관산동":"10300","능곡동":"10500","대장동":"10600","원당동":"11300","원흥동":"11400","행신동":"11600","화정동":"11800"} },
    "고양시 일산동구":{ c:"41285", d:{"마두동":"10400","백석동":"10500","식사동":"10100","장항동":"10700","정발산동":"10300","중산동":"10200","풍동":"10600"} },
    "고양시 일산서구":{ c:"41287", d:{"가좌동":"10500","구산동":"10800","대화동":"10200","덕이동":"10600","일산동":"10400","주엽동":"10100","탄현동":"10300"} },
    "광명시":        { c:"41210", d:{"광명동":"10100","소하동":"10200","철산동":"10300","하안동":"10400","일직동":"10500"} },
    "구리시":        { c:"41310", d:{"갈매동":"10100","교문동":"10200","수택동":"10400","인창동":"10300","토평동":"10500"} },
    "남양주시":      { c:"41360", d:{"금곡동":"10400","도농동":"10700","별내동":"10100","양정동":"10500","지금동":"10600","평내동":"10300","호평동":"10200"} },
    "부천시":        { c:"41190", d:{"도당동":"10500","상동":"10900","소사동":"11000","심곡동":"11100","역곡동":"11200","오정동":"10200","원미동":"11300","원종동":"10400","중동":"10800","춘의동":"10600"} },
    "성남시 분당구": { c:"41135", d:{"대장동":"11200","백현동":"11000","분당동":"10100","삼평동":"10900","서현동":"10500","석운동":"11300","수내동":"10200","야탑동":"10700","운중동":"11100","이매동":"10600","정자동":"10300","판교동":"10800","율동":"10400"} },
    "성남시 수정구": { c:"41131", d:{"고등동":"11000","단대동":"10500","복정동":"10800","산성동":"10600","성남동":"10400","수진동":"10100","신흥동":"10200","양지동":"10700","창곡동":"10900","태평동":"10300"} },
    "성남시 중원구": { c:"41133", d:{"금광동":"10300","도촌동":"10700","상대원동":"10500","성남동":"10200","은행동":"10400","중앙동":"10100","하대원동":"10600"} },
    "수원시 영통구": { c:"41117", d:{"망포동":"10200","매탄동":"10300","영통동":"10100","원천동":"10400","이의동":"10500","하동":"10600"} },
    "수원시 장안구": { c:"41111", d:{"송죽동":"10300","영화동":"10200","율전동":"10600","이목동":"10500","정자동":"10400","조원동":"10100","천천동":"10800","파장동":"10700"} },
    "수원시 팔달구": { c:"41115", d:{"교동":"10500","우만동":"10700","인계동":"10600","장안동":"10400"} },
    "안양시 동안구": { c:"41173", d:{"관양동":"10100","귀인동":"10500","비산동":"10200","평촌동":"10400","호계동":"10300"} },
    "안양시 만안구": { c:"41171", d:{"박달동":"10200","석수동":"10300","안양동":"10100"} },
    "용인시 기흥구": { c:"41463", d:{"구갈동":"10200","기흥동":"10100","동백동":"11200","상갈동":"10300","신갈동":"10400","영덕동":"10500","청덕동":"10600"} },
    "용인시 수지구": { c:"41465", d:{"고기동":"10400","동천동":"10300","상현동":"10500","성복동":"10600","신봉동":"10200","죽전동":"10700","풍덕천동":"10100"} },
    "하남시":        { c:"41450", d:{"감일동":"10500","덕풍동":"11200","망월동":"11400","미사동":"11500","신장동":"11300","위례동":"12000","풍산동":"11100"} },
    "화성시":        { c:"41590", d:{"동탄동":"10100","반월동":"10200","병점동":"10300"} },
    "파주시":        { c:"41480", d:{"교하동":"10900","금촌동":"10400","운정동":"10200","야당동":"10100"} },
    "김포시":        { c:"41570", d:{"걸포동":"10700","구래동":"10500","마산동":"10600","북변동":"10900","사우동":"10200","운양동":"10400","장기동":"10300","풍무동":"10100"} }
  }
};

// ── 유틸리티 ──
const PY = 3.3058;
const py  = v => v ? (parseFloat(v) / PY).toFixed(1) : null;
const m2  = v => (v != null && v !== '' && parseFloat(v) > 0)
  ? py(v) + '평 (' + parseFloat(v).toFixed(0) + '㎡)' : '—';
const pct = v => (v != null && v !== '' && parseFloat(v) > 0) ? parseFloat(v).toFixed(1) + '%' : '—';
// 억/만원 혼합 포맷: 23,000만원 → 2억 3,000만원
const fmtAmt = (manwon) => {
  const n = Math.round(parseFloat(manwon) || 0);
  if (n <= 0) return '—';
  if (n >= 10000) {
    const uk  = Math.floor(n / 10000);
    const man = n % 10000;
    return man > 0 ? uk + '억 ' + man.toLocaleString() + '만원' : uk + '억원';
  }
  return n.toLocaleString() + '만원';
};
const dt  = v => {
  if (!v) return '—';
  const s = String(v).replace(/-/g, '');
  return s.length >= 8 ? s.slice(0,4) + '.' + s.slice(4,6) + '.' + s.slice(6,8) : String(v);
};
const p4  = n => String(parseInt(n) || 0).padStart(4, '0');
const parseBJ = str => {
  const m = str.trim().replace(/\s/g, '').match(/^(\d+)(?:-(\d+))?$/);
  return m ? { bun: p4(m[1]), ji: p4(m[2] || 0) } : null;
};

// ── 비교표 항목 (높이 제거, 용도지역 추가) ──
const COLS = [
  { l:'주용도',          f: i => [i.mainPurpsCdNm, i.etcPurps].filter(Boolean).join(' / ') || '—' },
  { l:'용도지역',        f: i => i.jiyukCdNm || '—' },
  { l:'주구조',          f: i => i.strctCdNm || i.mainStrctCdNm || '—' },
  { l:'대지면적',        f: i => m2(i.platArea) },
  { l:'연면적',          f: i => m2(i.totArea) },
  { l:'건축면적',        f: i => m2(i.archArea) },
  { l:'용적률산정연면적',f: i => m2(i.vlRatEstmTotArea) },
  { l:'건폐율',          f: i => pct(i.bcRat) },
  { l:'용적률',          f: i => pct(i.vlRat) },
  { l:'층수',            f: i => '지상 ' + (i.grndFlrCnt||0) + '층 / 지하 ' + (i.ugrndFlrCnt||0) + '층' },
  { l:'세대수',          f: i => i.hhldCnt ? parseInt(i.hhldCnt).toLocaleString() + '세대' : '—' },
  { l:'승강기',          f: i => {
    const r = parseInt(i.rideUseElvtCnt) || 0, e = parseInt(i.emgenUseElvtCnt) || 0;
    return (r || e) ? '승용 ' + r + '대 / 비상 ' + e + '대' : '—';
  }},
  { l:'사용승인일',      f: i => dt(i.useAprDay) },
];

// ── 엔트리 팩토리 ──
let _id = 2;
const mk = id => ({
  id, sido:'서울특별시', sg:'강남구', dong:'', bj:'', alias:'',
  man:false, mSg:'', mD:'', res:null, ld:false, err:null,
  price:'',
  printSel:true,
  manual:{},
  photos:[],
  mapPhoto:null,    // 지도 스크린샷 (base64)
  mapCoords:null,   // {lat, lon} 자동 지오코딩 결과
  analysis:{ traffic:'', commercial:'', population:'', development:'' },
  income:{ deposit:'', monthlyRent:'', mgmtFee:'', loanAmt:'', loanRate:'5.0', acquiTax:'4.6', targetYield:'' },
  notes:''   // 추가 설명 (각 줄 앞에 • 자동 처리)
});

// ════════════════════════════════════════════════════
// 메인 컴포넌트
// ════════════════════════════════════════════════════
function App() {
  const [ents, setE]         = useState([mk(1)]);
  const [vw, setV]           = useState('cards');
  const [reportTitle, setRT] = useState('');
  const [reportDate,  setRD] = useState(() => {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth()+1).padStart(2,'0') + '-' +
      String(d.getDate()).padStart(2,'0');
  });
  const [printMode,   setPM] = useState('landscape');
  const [showBiz,     setSB] = useState(false);
  const [bizName,     setBN] = useState('타임즈부동산중개');
  const [bizAddr,     setBA] = useState('서울특별시 서초구 반포동 반포프라자');
  const [agentName,   setAN] = useState('성재윤');
  const [agentPhone,  setAP] = useState('010-6655-5445');
  const [logoSrc,     setLG] = useState('');

  const up          = (id, d) => setE(p => p.map(e => e.id === id ? {...e, ...d} : e));
  const upManual    = (id, field, val) => setE(p => p.map(e => e.id === id ? {...e, manual:{...(e.manual||{}), [field]:val}} : e));
  const upAnalysis  = (id, field, val) => setE(p => p.map(e => e.id === id ? {...e, analysis:{...(e.analysis||{}), [field]:val}} : e));
  const upIncome    = (id, field, val) => setE(p => p.map(e => e.id === id ? {...e, income:{...(e.income||{}), [field]:val}} : e));
  const addPhoto    = (id, src) => setE(p => p.map(e => e.id === id ? {...e, photos:[...(e.photos||[]),src].slice(0,3)} : e));
  const rmPhoto     = (id, idx) => setE(p => p.map(e => e.id === id ? {...e, photos:(e.photos||[]).filter((_,i)=>i!==idx)} : e));
  const setMapPhoto = (id, src) => setE(p => p.map(e => e.id === id ? {...e, mapPhoto:src} : e));
  const upNotes     = (id, val) => setE(p => p.map(e => e.id === id ? {...e, notes:val} : e));
  const add         = ()      => setE(p => [...p, mk(_id++)]);
  const rm          = id      => setE(p => p.filter(e => e.id !== id));
  const togglePrint = id      => setE(p => p.map(e => e.id === id ? {...e, printSel:!e.printSel} : e));

  // 주소 → 좌표 자동 지오코딩 (Nominatim)
  const geocode = async (id, addr) => {
    if (!addr) return;
    try {
      const res = await fetch(
        'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(addr) +
        '&format=json&limit=1&countrycodes=kr',
        { headers: { 'Accept': 'application/json', 'Accept-Language': 'ko' } }
      );
      const data = await res.json();
      if (data && data[0]) {
        up(id, { mapCoords: { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) } });
      }
    } catch(e) { /* 지오코딩 실패 — 사용자가 수동 설정 */ }
  };

  const go = async ent => {
    up(ent.id, { ld:true, err:null });
    try {
      let sC, bC;
      if (ent.man) {
        if (!ent.mSg || !ent.mD) throw new Error('시군구코드·법정동코드를 입력하세요');
        sC = ent.mSg.trim(); bC = ent.mD.trim();
      } else {
        const g = R[ent.sido] && R[ent.sido][ent.sg];
        if (!g) throw new Error('시군구를 선택하세요');
        sC = g.c; bC = g.d[ent.dong];
        if (!bC) throw new Error(ent.dong ? "'" + ent.dong + "' 코드 미등록" : '동을 선택하세요');
      }
      const p = parseBJ(ent.bj);
      if (!p) throw new Error('번지 형식 오류 (예: 1-1, 100)');

      const res = await fetch(
        '/api/building?sigunguCd=' + sC +
        '&bjdongCd=' + bC +
        '&bun=' + p.bun +
        '&ji='  + p.ji +
        '&_t='  + Date.now()
      );
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const d = await res.json();

      if (d.response && d.response.header && d.response.header.resultCode !== '00')
        throw new Error(d.response.header.resultMsg || '조회 실패');

      const raw = d.response && d.response.body && d.response.body.items && d.response.body.items.item;
      const itemArr = !raw ? [] : (Array.isArray(raw) ? raw : [raw]);
      if (itemArr.length === 0) throw new Error('결과 없음 — 네이버 지도에서 지번을 확인하세요');

      const main = itemArr.find(i => i.mainAtchGbCd === '0') || itemArr[0];
      up(ent.id, { ld:false, res:main });
      // 지오코딩 — 비동기로 좌표 자동 획득
      geocode(ent.id, main.newPlatPlc || main.platPlc);
    } catch(e) {
      up(ent.id, { ld:false, err: e.message });
    }
  };

  const sgs   = s     => Object.keys(R[s] || {}).sort();
  const ds    = (s,g) => Object.keys((R[s] && R[s][g] && R[s][g].d) || {}).sort();
  const sidos = Object.keys(R);
  const rE    = ents.filter(e => e.res);
  const hasR  = rE.length > 0;

  return (
    <div style={{fontFamily:"'Noto Sans KR',sans-serif",background:'#f7f4ef',minHeight:'100vh',color:'#1a1a2e'}}>

      {/* 헤더 — 화면 전용 */}
      <header className="no-print" style={{background:'#0d1b2a',padding:'18px 28px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:'10px',letterSpacing:'0.15em',color:'#c9a84c',marginBottom:'3px'}}>TIMES REAL ESTATE · 타임즈부동산중개</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'22px',color:'#f7f4ef',fontWeight:400}}>건축물대장 비교 조회</div>
        </div>
        <div style={{fontSize:'11px',color:'#c9a84c',border:'1px solid #c9a84c',padding:'6px 12px',display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'2px'}}>
          <span>건축물대장정보 서비스</span>
          <span style={{fontSize:'9px',opacity:0.7,letterSpacing:'0.05em'}}>{VERSION}</span>
        </div>
      </header>

      {/* 입력 패널 — 화면 전용 */}
      <section className="no-print" style={{background:'#ede9e1',padding:'18px 28px 20px',borderBottom:'1px solid #d8d4cc'}}>
        <div style={{maxWidth:'1280px',margin:'0 auto'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
            <span style={{fontSize:'11px',color:'#888'}}>조회 건물 목록 · {ents.length}건</span>
            <div style={{display:'flex',gap:'8px'}}>
              {ents.length > 1 && (
                <button className="blt" style={{fontSize:'11px',padding:'6px 14px',color:'#c0392b',borderColor:'#e8b4b0'}}
                  onClick={() => { if(window.confirm('모든 건물을 삭제하시겠습니까?')) setE([mk(1)]); }}>
                  전체삭제
                </button>
              )}
              <button className="bdk" onClick={() => ents.forEach(e => go(e))}>
                {ents.some(e => e.ld) ? '조회 중…' : '전체 조회 ▶'}
              </button>
            </div>
          </div>
          {ents.map((e, i) => <ERow key={e.id} e={e} i={i} n={ents.length} sidos={sidos} sgs={sgs} ds={ds} up={up} rm={rm} go={go} />)}

          {/* 건물 추가 — 마지막 행 바로 아래 */}
          <button className="blt" style={{fontSize:'12px',padding:'8px 18px',marginTop:'4px',display:'flex',alignItems:'center',gap:'6px'}}
            onClick={add}>
            <span style={{fontSize:'16px',lineHeight:1}}>+</span> 건물 추가
          </button>
          <p style={{fontSize:'11px',color:'#aaa',marginTop:'8px',lineHeight:1.7}}>
            ※ 동 코드가 없으면 "코드 직접입력"으로 시군구코드(5자리)·법정동코드(5자리)를 직접 입력하세요.
          </p>
        </div>
      </section>

      {/* 뷰 전환 + 인쇄 — 화면 전용 */}
      {hasR && (
        <div className="no-print" style={{padding:'12px 28px',display:'flex',gap:'8px',justifyContent:'space-between',maxWidth:'1280px',margin:'0 auto'}}>
          <div style={{display:'flex',gap:'6px'}}>
            <button className={vw==='cards'  ? 'bdk' : 'blt'} style={{fontSize:'12px',padding:'7px 14px'}} onClick={() => setV('cards')}>▣ 카드</button>
            <button className={vw==='table'  ? 'bdk' : 'blt'} style={{fontSize:'12px',padding:'7px 14px'}} onClick={() => setV('table')}>≡ 비교표</button>
            <button className={vw==='report' ? 'bdk' : 'blt'} style={{fontSize:'12px',padding:'7px 14px'}} onClick={() => setV('report')}>📄 리포트</button>
          </div>
          <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
            {vw === 'cards' && <>
              <span style={{fontSize:'11px',color:'#aaa'}}>인쇄 방향:</span>
              <button className={printMode==='landscape' ? 'bdk' : 'blt'} style={{fontSize:'11px',padding:'5px 10px'}} onClick={() => setPM('landscape')}>가로 3칸</button>
              <button className={printMode==='portrait'  ? 'bdk' : 'blt'} style={{fontSize:'11px',padding:'5px 10px'}} onClick={() => setPM('portrait')}>세로 4칸</button>
            </>}
            <input type="text" placeholder="보고서 제목" value={reportTitle}
              onChange={v => setRT(v.target.value)}
              style={{width:'180px',fontSize:'12px'}} />
            <input type="date" value={reportDate}
              onChange={v => setRD(v.target.value)}
              style={{fontSize:'12px',width:'140px'}} />
            <button className="blt" style={{fontSize:'12px'}} onClick={() => window.print()}>🖨 인쇄 / PDF</button>
          </div>
        </div>
      )}

      {/* 인쇄 방향 동적 스타일 */}
      <style dangerouslySetInnerHTML={{__html:
        vw === 'report'
          ? '@media print { @page { size: A4 portrait !important; margin: 10mm 12mm 18mm; } .report-card { page-break-after: always; break-after: page; } }'
          : vw === 'table'
            ? ('@media print { @page { size: A4 landscape !important; margin: 10mm 10mm 16mm;'
              + ' @bottom-left { content: "' + (bizName||'') + (bizAddr ? '  |  ' + bizAddr : '') + '"; font-size: 8pt; color: #555; font-family: sans-serif; }'
              + ' @bottom-right { content: "' + (agentName||'') + (agentPhone ? '   ' + agentPhone : '') + '"; font-size: 8pt; color: #555; font-family: sans-serif; }'
              + ' } }')
            : printMode === 'landscape'
              ? ('@media print { @page { size: A4 landscape !important; margin: 20mm 10mm 16mm;'
                + ' @top-left { content: "' + (reportTitle||'건축물대장 비교 보고서') + '"; font-size: 18pt; font-weight: bold; color: #0d1b2a; font-family: "Cormorant Garamond", serif; }'
                + ' @top-center { content: "TIMES REAL ESTATE · 타임즈부동산중개"; font-size: 7pt; color: #c9a84c; font-family: sans-serif; }'
                + ' @top-right { content: "' + reportDate + '"; font-size: 8pt; color: #888; font-family: sans-serif; }'
                + ' @bottom-left { content: "' + (bizName||'') + (bizAddr ? '  |  ' + bizAddr : '') + '"; font-size: 8pt; color: #555; font-family: sans-serif; }'
                + ' @bottom-right { content: "' + (agentName||'') + (agentPhone ? '   ' + agentPhone : '') + '"; font-size: 8pt; color: #555; font-family: sans-serif; }'
                + ' } .ph { display: none !important; } .cg { grid-template-columns: 1fr 1fr 1fr !important; padding-top: 0 !important; } }')
              : ('@media print { @page { size: A4 portrait !important; margin: 20mm 10mm 16mm;'
                + ' @top-left { content: "' + (reportTitle||'건축물대장 비교 보고서') + '"; font-size: 18pt; font-weight: bold; color: #0d1b2a; font-family: "Cormorant Garamond", serif; }'
                + ' @top-center { content: "TIMES REAL ESTATE · 타임즈부동산중개"; font-size: 7pt; color: #c9a84c; font-family: sans-serif; }'
                + ' @top-right { content: "' + reportDate + '"; font-size: 8pt; color: #888; font-family: sans-serif; }'
                + ' @bottom-left { content: "' + (bizName||'') + (bizAddr ? '  |  ' + bizAddr : '') + '"; font-size: 9pt; font-weight: bold; color: #0d1b2a; font-family: sans-serif; }'
                + ' @bottom-right { content: "' + (agentName||'') + (agentPhone ? '   ' + agentPhone : '') + '"; font-size: 9pt; font-weight: bold; color: #0d1b2a; font-family: sans-serif; }'
                + ' } .ph { display: none !important; } .cg { grid-template-columns: 1fr 1fr !important; padding-top: 0 !important; } .pci { font-size: 9pt !important; } .pci table td, .pci table th { padding: 3pt 4pt !important; font-size: 8pt !important; } }')
      }} />

      {/* 인쇄 헤더 — 카드 뷰에서만 표시 */}
      {/* 카드 인쇄 헤더는 CSS @top-left/@top-center/@top-right 마진박스로 처리 (DOM 제거) */}

      {/* 결과 영역 */}
      <main style={{padding:'10px 28px 48px',maxWidth:'1280px',margin:'0 auto'}} className="print-main">
        {!hasR && (
          <div style={{textAlign:'center',padding:'80px 0',color:'#ccc'}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'28px',marginBottom:'10px'}}>건물을 조회하면 결과가 표시됩니다</div>
            <div style={{fontSize:'12px',color:'#bbb'}}>번지를 입력하고 조회 버튼을 누르세요</div>
          </div>
        )}
        {hasR && vw==='cards' && (
          <>
            <div className="cg" style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'18px',paddingTop:'8px',paddingBottom:'0'}}>
              {rE.map((e, i) => <RCard key={e.id} e={e} i={i} onTogglePrint={togglePrint} onDelete={() => rm(e.id)} onManual={upManual} />)}
            </div>

            {/* 카드 하단 건물추가 + 전체삭제 */}
            <div className="no-print" style={{display:'flex',justifyContent:'center',gap:'10px',marginTop:'24px',paddingBottom:'8px'}}>
              <button className="blt" style={{fontSize:'12px',padding:'9px 22px'}}
                onClick={() => { add(); window.scrollTo({top:0, behavior:'smooth'}); }}>
                + 건물 추가
              </button>
              {ents.length > 1 && (
                <button className="blt" style={{fontSize:'12px',padding:'9px 22px',color:'#c0392b',borderColor:'#e8b4b0'}}
                  onClick={() => { if(window.confirm('모든 건물을 삭제하시겠습니까?')) setE([mk(1)]); }}>
                  전체 삭제
                </button>
              )}
            </div>

            {/* 카드 인쇄 푸터 — @bottom-center CSS로 대체됨 */}
          </>
        )}
        {hasR && vw==='table'  && <CmpT entries={rE} togglePrint={togglePrint} printMode={printMode} reportTitle={reportTitle} reportDate={reportDate} totalSel={rE.filter(e=>e.printSel).length} bizName={bizName} bizAddr={bizAddr} agentName={agentName} agentPhone={agentPhone} logoSrc={logoSrc} />}
        {hasR && vw==='report' && <ReportView entries={rE} reportTitle={reportTitle} reportDate={reportDate} bizName={bizName} bizAddr={bizAddr} agentName={agentName} agentPhone={agentPhone} logoSrc={logoSrc} upAnalysis={upAnalysis} upIncome={upIncome} addPhoto={addPhoto} rmPhoto={rmPhoto} setMapPhoto={setMapPhoto} upNotes={upNotes} />}
      </main>

      {/* ── 출력 정보 설정 패널 (화면 전용) ── */}
      <div className="no-print" style={{position:'fixed',bottom:0,left:0,right:0,background:'#ede9e1',borderTop:'1px solid #d8d4cc',zIndex:100}}>
        <div style={{maxWidth:'1280px',margin:'0 auto',padding:'0 28px'}}>
          <button onClick={() => setSB(p => !p)}
            style={{background:'none',border:'none',cursor:'pointer',padding:'8px 0',fontSize:'11px',color:'#888',width:'100%',textAlign:'left',display:'flex',alignItems:'center',gap:'6px'}}>
            <span style={{fontSize:'14px'}}>{showBiz ? '▲' : '▲'}</span>
            출력 정보 설정 (로고·상호·담당자·연락처)
            <span style={{marginLeft:'auto',fontSize:'10px',color:'#c9a84c'}}>
              {showBiz ? '접기 ▼' : '펼치기 ▲'}
            </span>
          </button>
          {showBiz && (
            <div style={{paddingBottom:'14px',display:'flex',gap:'10px',flexWrap:'wrap',alignItems:'flex-end'}}>
              {/* 로고 */}
              <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
                <span style={{fontSize:'10px',color:'#888'}}>로고 이미지</span>
                <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
                  <label style={{background:'#0d1b2a',color:'#c9a84c',padding:'5px 10px',fontSize:'11px',cursor:'pointer',border:'none'}}>
                    파일 선택
                    <input type="file" accept="image/*" style={{display:'none'}}
                      onChange={ev => {
                        const file = ev.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = e => setLG(e.target.result);
                        reader.readAsDataURL(file);
                      }} />
                  </label>
                  {logoSrc && <img src={logoSrc} style={{height:'32px',objectFit:'contain',border:'1px solid #e0dcd4'}} />}
                  {logoSrc && <button onClick={() => setLG('')} style={{background:'none',border:'none',color:'#ccc',cursor:'pointer',fontSize:'16px'}}>×</button>}
                </div>
              </div>
              {/* 상호 */}
              <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
                <span style={{fontSize:'10px',color:'#888'}}>상호</span>
                <input type="text" value={bizName} onChange={v => setBN(v.target.value)} style={{width:'160px',fontSize:'12px'}} />
              </div>
              {/* 주소 */}
              <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
                <span style={{fontSize:'10px',color:'#888'}}>주소</span>
                <input type="text" value={bizAddr} onChange={v => setBA(v.target.value)} style={{width:'260px',fontSize:'12px'}} />
              </div>
              {/* 담당자 */}
              <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
                <span style={{fontSize:'10px',color:'#888'}}>담당자</span>
                <input type="text" placeholder="이름" value={agentName} onChange={v => setAN(v.target.value)} style={{width:'100px',fontSize:'12px'}} />
              </div>
              {/* 연락처 */}
              <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
                <span style={{fontSize:'10px',color:'#888'}}>연락처</span>
                <input type="text" placeholder="010-0000-0000" value={agentPhone} onChange={v => setAP(v.target.value)} style={{width:'130px',fontSize:'12px'}} />
              </div>
            </div>
          )}
        </div>
      </div>
      {/* 고정 패널 높이만큼 여백 */}
      <div className="no-print" style={{height: showBiz ? '120px' : '40px'}} />
    </div>
  );
}

// ── 인쇄 푸터 ──
function PrintFooter({ bizName, bizAddr, agentName, agentPhone, logoSrc }) {
  if (!bizName && !bizAddr && !agentName && !agentPhone && !logoSrc) return null;
  return (
    <div style={{marginTop:'10pt',paddingTop:'6pt',borderTop:'0.8pt solid #c9a84c',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'8pt',color:'#555',lineHeight:1.4}}>
      <div style={{display:'flex',alignItems:'center',gap:'8pt'}}>
        {logoSrc && <img src={logoSrc} style={{height:'22pt',objectFit:'contain',marginRight:'4pt'}} />}
        <div>
          {bizName && <div style={{fontWeight:700,fontSize:'9pt',color:'#0d1b2a',letterSpacing:'0.03em'}}>{bizName}</div>}
          {bizAddr && <div style={{color:'#666'}}>{bizAddr}</div>}
        </div>
      </div>
      {(agentName || agentPhone) && (
        <div style={{textAlign:'right'}}>
          {agentName && <div style={{fontWeight:600,color:'#0d1b2a'}}>{agentName}</div>}
          {agentPhone && <div style={{color:'#666'}}>{agentPhone}</div>}
        </div>
      )}
    </div>
  );
}

// ── 입력 행 ──
function ERow({ e, i, n, sidos, sgs, ds, up, rm, go }) {
  return (
    <div style={{background:'white',border:'1px solid #e0dcd4',padding:'12px 14px',marginBottom:'8px'}}>
      <div style={{display:'flex',gap:'8px',alignItems:'flex-start',flexWrap:'wrap'}}>
        <div style={{width:'26px',height:'26px',background:'#0d1b2a',color:'#c9a84c',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:700,flexShrink:0,marginTop:'2px'}}>
          {i+1}
        </div>

        {!e.man ? (
          <>
            <select value={e.sido} style={{width:'130px',flexShrink:0}}
              onChange={v => { const s = v.target.value; up(e.id, {sido:s, sg:sgs(s)[0]||'', dong:''}); }}>
              {sidos.map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={e.sg} style={{width:'130px',flexShrink:0}}
              onChange={v => up(e.id, {sg:v.target.value, dong:''})}>
              <option value="">구/군 선택</option>
              {sgs(e.sido).map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={e.dong} style={{width:'110px',flexShrink:0}}
              onChange={v => up(e.id, {dong:v.target.value})}>
              <option value="">동 선택</option>
              {ds(e.sido, e.sg).map(d => <option key={d}>{d}</option>)}
            </select>
          </>
        ) : (
          <>
            <input type="text" placeholder="시군구코드 5자리" value={e.mSg}
              onChange={v => up(e.id, {mSg:v.target.value})} style={{width:'140px',flexShrink:0}} />
            <input type="text" placeholder="법정동코드 5자리" value={e.mD}
              onChange={v => up(e.id, {mD:v.target.value})} style={{width:'140px',flexShrink:0}} />
          </>
        )}

        <input type="text" placeholder="번지 (예: 1-1)" value={e.bj}
          onChange={v => up(e.id, {bj:v.target.value})}
          onKeyDown={k => k.key === 'Enter' && go(e)}
          style={{width:'100px',flexShrink:0}} />

        <input type="text" placeholder="별칭 (선택)" value={e.alias}
          onChange={v => up(e.id, {alias:v.target.value})} style={{width:'100px',flexShrink:0}} />

        <input type="text" inputMode="decimal" placeholder="매매가(억)" value={e.price}
          onChange={v => up(e.id, {price:v.target.value})}
          onKeyDown={k => (k.key === 'Enter' || k.keyCode === 13) && go(e)}
          style={{width:'88px',flexShrink:0}} />

        <label style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'11px',color:'#999',cursor:'pointer',whiteSpace:'nowrap',paddingTop:'8px',userSelect:'none',flexShrink:0}}>
          <input type="checkbox" checked={e.man} onChange={v => up(e.id, {man:v.target.checked})} />
          코드 직접입력
        </label>

        <button className="bdk" style={{fontSize:'12px',padding:'7px 14px',flexShrink:0,minWidth:'72px'}}
          onClick={() => go(e)} disabled={e.ld}>
          {e.ld ? '조회 중…' : '조회'}
        </button>

        {n > 1 && (
          <button onClick={() => rm(e.id)}
            style={{background:'transparent',border:'none',color:'#ccc',fontSize:'18px',cursor:'pointer',lineHeight:1,padding:'4px 6px',marginLeft:'auto',flexShrink:0}}>×</button>
        )}
      </div>
      {e.err && <div style={{marginTop:'8px',marginLeft:'34px',fontSize:'12px',color:'#c0392b',background:'#fff5f4',padding:'6px 10px'}}>⚠ {e.err}</div>}
      {e.res && <div style={{marginTop:'8px',marginLeft:'34px',fontSize:'12px',color:'#2e7d32',background:'#f1f8e9',padding:'6px 10px'}}>
        ✓ {e.res.platPlc} — {[e.res.mainPurpsCdNm, e.res.etcPurps].filter(Boolean).join(' / ')}
        {e.res.jiyukCdNm && <span style={{marginLeft:'8px',color:'#666'}}>│ {e.res.jiyukCdNm}</span>}
      </div>}
    </div>
  );
}

// ── 결과 카드 ──
function RCard({ e, i, onTogglePrint, onDelete, onManual }) {
  const it = e.res;
  const m  = e.manual || {};
  const [showManual, setShowManual] = React.useState(false);

  // 값 해석: manual 우선, 없으면 API 데이터
  const val = (field) => {
    if (m[field] && parseFloat(m[field]) > 0) return m[field];
    return it[field];
  };

  // 수기 대지면적으로 건폐율·용적률 자동 계산
  const manualPlat = m.platArea && parseFloat(m.platArea) > 0 ? parseFloat(m.platArea) : null;
  const autoBcRat = (manualPlat && it.archArea && parseFloat(it.archArea) > 0)
    ? (parseFloat(it.archArea) / manualPlat * 100).toFixed(1) : null;
  const autoVlRat = (manualPlat && parseFloat(it.vlRatEstmTotArea || it.totArea || '0') > 0)
    ? (parseFloat(it.vlRatEstmTotArea || it.totArea) / manualPlat * 100).toFixed(1) : null;

  const platArea = val('platArea');
  const bcRat    = m.bcRat || autoBcRat || it.bcRat;   // 수기 > 자동계산 > API
  const vlRat    = m.vlRat || autoVlRat || it.vlRat;
  const hhldCnt  = val('hhldCnt');

  // 누락된 핵심 필드 확인
  const missingPlatArea = !platArea || parseFloat(platArea) <= 0;
  const hasMissing = missingPlatArea ||
    !bcRat || parseFloat(bcRat) <= 0 ||
    !vlRat || parseFloat(vlRat) <= 0;

  // 토지이음 PNU: sigunguCd(5) + bjdongCd(5) + 산여부(1: 대지=1,산=2) + bun(4) + ji(4)
  // 건축물대장 platGbCd: 0=대지, 1=산 → PNU: 1=대지, 2=산
  const pnuGbn = it.platGbCd === '1' ? '2' : '1';
  const pnu = (it.sigunguCd && it.bjdongCd && it.bun)
    ? it.sigunguCd + it.bjdongCd + pnuGbn + it.bun + (it.ji || '0000')
    : null;
  const eumUrl  = pnu
    ? 'https://www.eum.go.kr/web/ar/lu/luLandUseInfo.do?pnu=' + pnu
    : 'https://www.eum.go.kr';
  // 서울 부동산정보광장 — 지번 검색
  const landUrl = 'https://land.seoul.go.kr/land/central/LandCentralSearch.do?searchKeyword='
    + encodeURIComponent((it.platPlc||'').replace('번지','').trim());
  // 네이버 지도 검색 (항상 작동하는 대안)
  const naverUrl = 'https://map.naver.com/v5/search/' + encodeURIComponent(it.platPlc||'');

  const title = e.alias || it.bldNm || it.platPlc;

  // 매매가 & 대지 평단가
  const priceNum = e.price && parseFloat(e.price) > 0 ? parseFloat(e.price) : null;
  const platPy   = platArea && parseFloat(platArea) > 0 ? parseFloat(platArea) / PY : null;
  const ppPy     = (priceNum && platPy) ? Math.round(priceNum * 10000 / platPy).toLocaleString() : null;

  // 상단 3칸
  const s3 = [
    { l:'건폐율', v: pct(bcRat) },
    { l:'용적률', v: pct(vlRat) },
    { l:'세대수', v: hhldCnt ? parseInt(hhldCnt).toLocaleString() + '세대' : '—' },
  ];

  // 하단 rows
  const elvt = (parseInt(it.rideUseElvtCnt) || parseInt(it.emgenUseElvtCnt))
    ? '승용 ' + (parseInt(it.rideUseElvtCnt)||0) + '대 / 비상 ' + (parseInt(it.emgenUseElvtCnt)||0) + '대' : '—';
  const rows = [
    { l:'연면적',   v: m2(it.totArea) },
    { l:'건축면적', v: m2(it.archArea) },
    { l:'층수',     v: '지상 ' + (it.grndFlrCnt||0) + '층 / 지하 ' + (it.ugrndFlrCnt||0) + '층' },
    { l:'승강기',   v: elvt },
    { l:'사용승인', v: dt(it.useAprDay) },
  ];

  return (
    <div className={'pci' + (e.printSel ? '' : ' print-hide')}
         style={{background:'white',border:'1px solid #e0dcd4',padding:'24px',position:'relative'}}>

      {/* 인쇄 선택 체크박스 — 화면 전용 */}
      <label className="screen-only" style={{position:'absolute',top:'7px',left:'7px',display:'flex',alignItems:'center',gap:'3px',fontSize:'10px',color:'#aaa',cursor:'pointer',zIndex:1}}>
        <input type="checkbox" checked={e.printSel} onChange={() => onTogglePrint(e.id)} />
        출력
      </label>

      {/* 번호 + 삭제 버튼 */}
      <div style={{position:'absolute',top:0,right:0,display:'flex',alignItems:'center'}}>
        <button className="screen-only" onClick={onDelete}
          title="삭제"
          style={{background:'transparent',border:'none',color:'#ccc',fontSize:'16px',cursor:'pointer',padding:'6px 8px',lineHeight:1,transition:'color 0.15s'}}
          onMouseEnter={ev => ev.target.style.color='#c0392b'}
          onMouseLeave={ev => ev.target.style.color='#ccc'}>×</button>
        <div style={{background:'#0d1b2a',color:'#c9a84c',width:'32px',height:'32px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:700}}>{i+1}</div>
      </div>

      {/* 제목 영역 */}
      <div style={{paddingRight:'40px',paddingLeft:'22px',marginBottom:'8px'}}>
        <div style={{fontSize:'10px',letterSpacing:'0.1em',color:'#c9a84c',marginBottom:'2px'}}>
          {[it.mainPurpsCdNm, it.etcPurps].filter(Boolean).join(' · ')}
        </div>
        {(it.jiyukCdNm || m.jiyukCdNm) && (
          <div style={{fontSize:'10px',color:'#888',marginBottom:'4px'}}>
            {m.jiyukCdNm || it.jiyukCdNm}
            {m.jiyukCdNm && <span className="no-print" style={{color:'#c9a84c',marginLeft:'4px',fontSize:'9px'}}>✓수기</span>}
          </div>
        )}
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'20px',fontWeight:600,lineHeight:1.2,marginBottom:'4px',color:'#0d1b2a'}}>{title}</div>
        <div style={{fontSize:'11px',color:'#999'}}>{it.platPlc}</div>
        {it.newPlatPlc && <div style={{fontSize:'10px',color:'#bbb',marginTop:'2px'}}>{it.newPlatPlc}</div>}
      </div>

      {/* 매매가 — 블랙박스 (리포트와 동일 스타일) */}
      {priceNum && (
        <div style={{marginBottom:'8px',WebkitPrintColorAdjust:'exact',printColorAdjust:'exact'}}>
          <div style={{background:'#0d1b2a',borderLeft:'3px solid #c9a84c',padding:'7px 12px 8px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:'7px',color:'#c9a84c',letterSpacing:'0.2em',fontWeight:600}}>ASKING PRICE</span>
            <span style={{fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',Arial,sans-serif",fontSize:'24px',fontWeight:700,color:'white',letterSpacing:'-0.02em',lineHeight:1}}>
              {priceNum.toLocaleString()}
              <span style={{fontSize:'12px',fontWeight:400,marginLeft:'4px',color:'#c9a84c'}}>억원</span>
            </span>
          </div>
          {ppPy && <div style={{textAlign:'right',fontSize:'9px',color:'#888',marginTop:'2px'}}>평당 {ppPy}만원</div>}
        </div>
      )}

      {/* 상단 3칸 */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1px',background:'#e0dcd4',marginBottom:'12px'}}>
        {s3.map(s => (
          <div key={s.l} style={{background:'#faf9f5',padding:'10px 6px',textAlign:'center'}}>
            <div style={{fontSize:'10px',color:'#aaa',marginBottom:'3px'}}>{s.l}</div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'18px',fontWeight:600,color:'#0d1b2a'}}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* 대지면적 강조 박스 */}
      <div style={{background: missingPlatArea && !m.platArea ? '#fff5f4' : '#f5f2eb', padding:'9px 12px',marginBottom:'4px',display:'flex',justifyContent:'space-between',alignItems:'center',borderLeft:'3px solid ' + (missingPlatArea && !m.platArea ? '#e74c3c' : '#c9a84c')}}>
        <span style={{fontSize:'11px',color:'#888'}}>대지면적
          {missingPlatArea && !m.platArea && <span style={{color:'#e74c3c',marginLeft:'4px',fontSize:'10px'}}>미확인</span>}
          {m.platArea && <span className="no-print" style={{color:'#2e7d32',marginLeft:'4px',fontSize:'10px'}}>✓수기</span>}
        </span>
        <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'18px',fontWeight:600,color:'#0d1b2a'}}>
          {platArea && parseFloat(platArea) > 0 ? (
            <>{py(platArea)}<span style={{fontSize:'12px',fontWeight:400,marginLeft:'2px'}}>평</span>
              <span style={{fontSize:'12px',fontWeight:400,color:'#aaa',marginLeft:'6px'}}>({parseFloat(platArea).toFixed(0)}㎡)</span>
            </>
          ) : '—'}
        </span>
      </div>

      <div style={{height:'8px'}} />

      {/* 하단 rows */}
      <div>
        {rows.map(r => (
          <div key={r.l} style={{display:'flex',gap:'12px',fontSize:'12px',padding:'5px 0',borderBottom:'1px solid #f0ece4'}}>
            <div style={{width:'58px',color:'#999',flexShrink:0}}>{r.l}</div>
            <div style={{color:'#1a1a2e'}}>{r.v}</div>
          </div>
        ))}
      </div>

      {/* 외부 링크 + 수기 입력 섹션 (화면 전용) */}
      <div className="screen-only" style={{marginTop:'10px',borderTop:'1px solid #f0ece4',paddingTop:'8px'}}>
        {/* 외부 링크 버튼 */}
        <div style={{display:'flex',gap:'5px',marginBottom:'7px',flexWrap:'wrap'}}>
          {/* 네이버지도 — 항상 작동 */}
          <a href={naverUrl} target="_blank" rel="noreferrer"
            style={{fontSize:'10px',padding:'3px 8px',background:'#f5f5f5',color:'#555',border:'1px solid #ddd',textDecoration:'none'}}>
            🗺 네이버지도
          </a>
          {/* 카카오맵 */}
          <a href={'https://map.kakao.com/?q=' + encodeURIComponent(it.platPlc||'')}
            target="_blank" rel="noreferrer"
            style={{fontSize:'10px',padding:'3px 8px',background:'#fff9e6',color:'#7a5c00',border:'1px solid #f0d060',textDecoration:'none'}}>
            🗺 카카오맵
          </a>
          {/* 토지이음 메인 (세션 필요로 직접 접근 불가 — 메인 이동 후 주소로 검색) */}
          <a href="https://www.eum.go.kr/" target="_blank" rel="noreferrer"
            title={'토지이음에서 아래 주소로 검색하세요:\n' + (it.platPlc||'').replace('번지','')}
            style={{fontSize:'10px',padding:'3px 8px',background:'#f0f4ff',color:'#3a6fd8',border:'1px solid #b8ccff',textDecoration:'none'}}>
            📋 토지이음
          </a>
          {/* 서울부동산정보광장 */}
          {it.platPlc && it.platPlc.includes('서울') && (
            <a href="https://land.seoul.go.kr/land/" target="_blank" rel="noreferrer"
              title={'서울부동산정보광장에서 아래 주소로 검색하세요:\n' + (it.platPlc||'')}
              style={{fontSize:'10px',padding:'3px 8px',background:'#f0fff4',color:'#2e7d32',border:'1px solid #a8d5b0',textDecoration:'none'}}>
              🏙 서울부동산정보광장
            </a>
          )}
          {/* 주소 복사 */}
          <button
            onClick={() => { navigator.clipboard.writeText((it.platPlc||'').replace('번지','')); }}
            title="검색용 주소를 클립보드에 복사합니다"
            style={{fontSize:'10px',padding:'3px 8px',background:'#f7f4ef',color:'#888',border:'1px solid #e0dcd4',cursor:'pointer'}}>
            📋 주소 복사
          </button>
        </div>

        {/* 수기 입력 토글 버튼 */}
        <button onClick={() => setShowManual(p => !p)}
          style={{fontSize:'11px',background:'none',border:'1px dashed ' + (Object.keys(m).some(k=>m[k]) ? '#c9a84c' : '#e0dcd4'),color: Object.keys(m).some(k=>m[k]) ? '#c9a84c' : '#aaa',padding:'4px 10px',cursor:'pointer',width:'100%',textAlign:'left'}}>
          ✏ 누락 정보 수기 입력 {showManual ? '▲' : '▼'}
          {Object.keys(m).some(k=>m[k]) && <span style={{marginLeft:'6px',fontSize:'10px',background:'#c9a84c',color:'white',padding:'1px 5px'}}>입력됨</span>}
        </button>

        {showManual && (
          <div style={{marginTop:'6px',background:'#fafaf8',border:'1px solid #e8e4dc',padding:'10px'}}>
            <div style={{fontSize:'10px',color:'#aaa',marginBottom:'8px'}}>
              API에 없는 항목을 입력하세요. 대지면적 입력 시 건폐율·용적률이 자동 계산됩니다.
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
              {/* 대지면적 */}
              <div>
                <div style={{fontSize:'10px',color:'#888',marginBottom:'2px'}}>대지면적 (㎡)</div>
                <input type="text" value={m.platArea||''} placeholder="직접 입력"
                  onChange={ev => onManual(e.id, 'platArea', ev.target.value)}
                  style={{width:'100%',fontSize:'12px',padding:'4px 6px',border:'1px solid ' + (m.platArea ? '#c9a84c' : '#e0dcd4'),boxSizing:'border-box'}} />
              </div>
              {/* 건폐율 — 자동계산 표시 */}
              <div>
                <div style={{fontSize:'10px',color:'#888',marginBottom:'2px'}}>
                  건폐율 (%)
                  {autoBcRat && !m.bcRat && <span style={{color:'#2e7d32',marginLeft:'4px'}}>자동: {autoBcRat}%</span>}
                  {m.bcRat && <span className="no-print" style={{color:'#c9a84c',marginLeft:'4px'}}>수기입력</span>}
                </div>
                <input type="text" value={m.bcRat||''}
                  placeholder={autoBcRat ? '자동계산: ' + autoBcRat + '%' : '직접 입력'}
                  onChange={ev => onManual(e.id, 'bcRat', ev.target.value)}
                  style={{width:'100%',fontSize:'12px',padding:'4px 6px',border:'1px solid ' + (m.bcRat ? '#c9a84c' : autoBcRat ? '#a8d5b0' : '#e0dcd4'),boxSizing:'border-box',background: autoBcRat && !m.bcRat ? '#f0fff4' : 'white'}} />
              </div>
              {/* 용적률 — 자동계산 표시 */}
              <div>
                <div style={{fontSize:'10px',color:'#888',marginBottom:'2px'}}>
                  용적률 (%)
                  {autoVlRat && !m.vlRat && <span style={{color:'#2e7d32',marginLeft:'4px'}}>자동: {autoVlRat}%</span>}
                  {m.vlRat && <span className="no-print" style={{color:'#c9a84c',marginLeft:'4px'}}>수기입력</span>}
                </div>
                <input type="text" value={m.vlRat||''}
                  placeholder={autoVlRat ? '자동계산: ' + autoVlRat + '%' : '직접 입력'}
                  onChange={ev => onManual(e.id, 'vlRat', ev.target.value)}
                  style={{width:'100%',fontSize:'12px',padding:'4px 6px',border:'1px solid ' + (m.vlRat ? '#c9a84c' : autoVlRat ? '#a8d5b0' : '#e0dcd4'),boxSizing:'border-box',background: autoVlRat && !m.vlRat ? '#f0fff4' : 'white'}} />
              </div>
              {/* 세대수 */}
              <div>
                <div style={{fontSize:'10px',color:'#888',marginBottom:'2px'}}>세대수</div>
                <input type="text" value={m.hhldCnt||''} placeholder="직접 입력"
                  onChange={ev => onManual(e.id, 'hhldCnt', ev.target.value)}
                  style={{width:'100%',fontSize:'12px',padding:'4px 6px',border:'1px solid ' + (m.hhldCnt ? '#c9a84c' : '#e0dcd4'),boxSizing:'border-box'}} />
              </div>
              {/* 용도지역 — 드롭다운 선택 */}
              <div style={{gridColumn:'1 / -1'}}>
                <div style={{fontSize:'10px',color:'#888',marginBottom:'2px'}}>
                  용도지역
                  {it.jiyukCdNm && !m.jiyukCdNm && <span style={{color:'#ccc',marginLeft:'4px'}}>(API: {it.jiyukCdNm})</span>}
                  {m.jiyukCdNm && <span style={{color:'#c9a84c',marginLeft:'4px'}}>선택됨</span>}
                </div>
                <select value={m.jiyukCdNm||''}
                  onChange={ev => onManual(e.id, 'jiyukCdNm', ev.target.value)}
                  style={{width:'100%',fontSize:'12px',padding:'5px 6px',border:'1px solid '+(m.jiyukCdNm?'#c9a84c':'#e0dcd4'),boxSizing:'border-box',background:'white'}}>
                  <option value=''>-- 선택 (API값 사용) --</option>
                  <optgroup label="주거지역">
                    {['제1종전용주거지역','제2종전용주거지역','제1종일반주거지역','제2종일반주거지역','제3종일반주거지역','준주거지역'].map(z=>(
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </optgroup>
                  <optgroup label="상업지역">
                    {['중심상업지역','일반상업지역','근린상업지역','유통상업지역'].map(z=>(
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </optgroup>
                  <optgroup label="공업지역">
                    {['전용공업지역','일반공업지역','준공업지역'].map(z=>(
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </optgroup>
                  <optgroup label="녹지지역">
                    {['보전녹지지역','생산녹지지역','자연녹지지역'].map(z=>(
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              {/* 법정 최대 용적률 — 리포트 신축여력 계산에 사용 */}
              <div style={{gridColumn:'1 / -1'}}>
                <div style={{fontSize:'10px',color:'#888',marginBottom:'2px'}}>
                  법정 최대 용적률 (%)
                  <span style={{color:'#aaa',marginLeft:'4px',fontSize:'9px'}}>리포트 신축여력 계산에 사용</span>
                  {m.maxVlRat && <span style={{color:'#c9a84c',marginLeft:'4px'}}>수기입력</span>}
                </div>
                <input type="text" value={m.maxVlRat||''}
                  placeholder='예: 250 (용도지역이 자동매칭 안될 때 입력)'
                  onChange={ev => onManual(e.id, 'maxVlRat', ev.target.value)}
                  style={{width:'100%',fontSize:'12px',padding:'4px 6px',border:'1px solid ' + (m.maxVlRat ? '#c9a84c' : '#e0dcd4'),boxSizing:'border-box'}} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 수기 입력 + 자동 계산 병합 (RCard·CmpT 공통 사용) ──
const mergeEntry = (e) => {
  const it = e.res;
  const m  = e.manual || {};
  const manualPlat = m.platArea && parseFloat(m.platArea) > 0 ? parseFloat(m.platArea) : null;
  const autoBcRat  = (manualPlat && it.archArea && parseFloat(it.archArea) > 0)
    ? (parseFloat(it.archArea) / manualPlat * 100).toFixed(1) : null;
  const autoVlRat  = (manualPlat && parseFloat(it.vlRatEstmTotArea || it.totArea || '0') > 0)
    ? (parseFloat(it.vlRatEstmTotArea || it.totArea) / manualPlat * 100).toFixed(1) : null;
  return {
    ...it,
    platArea:  m.platArea  || it.platArea,
    bcRat:     m.bcRat     || autoBcRat || it.bcRat,
    vlRat:     m.vlRat     || autoVlRat || it.vlRat,
    hhldCnt:   m.hhldCnt   || it.hhldCnt,
    jiyukCdNm: m.jiyukCdNm || it.jiyukCdNm,
    maxVlRat:  m.maxVlRat  || null,   // 법정 최대 용적률 수기 입력
  };
};

// ── 비교 테이블 ──
function CmpT({ entries, togglePrint, printMode, reportTitle, reportDate, totalSel, bizName, bizAddr, agentName, agentPhone, logoSrc }) {
  const printEntries = entries.filter(e => e.printSel);
  const splitSize    = 5;
  const chunks       = [];
  for (let i = 0; i < printEntries.length; i += splitSize) {
    chunks.push({ items: printEntries.slice(i, i + splitSize), startIdx: i });
  }

  // ── 화면용 스타일 ──
  const sThBase  = { background:'#0d1b2a',color:'#f7f4ef',padding:'10px 12px',border:'1px solid #0d1b2a',fontWeight:500,fontSize:'12px',verticalAlign:'middle' };
  const sPlcBase = { background:'#f0ede6',padding:'8px 10px',color:'#555',fontWeight:600,border:'1px solid #ddd8d0',whiteSpace:'nowrap',verticalAlign:'middle',fontSize:'11px',textAlign:'center' };
  const sGolBase = { background:'#fff3dc',padding:'8px 10px',color:'#b86c00',fontWeight:700,border:'1px solid #ddd8d0',whiteSpace:'nowrap',verticalAlign:'middle',fontSize:'11px',textAlign:'center' };
  const sTd = (stripe) => ({
    padding:'8px 10px', border:'1px solid #ddd8d0', verticalAlign:'middle',
    fontSize:'12px', lineHeight:1.5, textAlign:'center',
    background: stripe ? '#faf9f6' : 'white',
    whiteSpace:'normal', wordBreak:'keep-all',
  });

  // ── 인쇄용 스타일 (더 컴팩트) ──
  const pThBase  = { background:'#0d1b2a',color:'#f7f4ef',padding:'5pt 6pt',border:'1px solid #0d1b2a',fontWeight:600,fontSize:'8.5pt',verticalAlign:'middle' };
  const pPlcBase = { background:'#ede9e1',padding:'4pt 6pt',color:'#444',fontWeight:700,border:'1px solid #ccc8c0',whiteSpace:'nowrap',verticalAlign:'middle',fontSize:'8pt',textAlign:'center' };
  const pGolBase = { background:'#fff0cc',padding:'4pt 6pt',color:'#a05800',fontWeight:700,border:'1px solid #ccc8c0',whiteSpace:'nowrap',verticalAlign:'middle',fontSize:'8pt',textAlign:'center' };
  const pTd = (stripe) => ({
    padding:'4pt 6pt', border:'1px solid #ccc8c0', verticalAlign:'middle',
    fontSize:'8.5pt', lineHeight:1.3, textAlign:'center',
    background: stripe ? '#faf8f4' : 'white',
    whiteSpace:'normal', wordBreak:'keep-all',
    overflow:'hidden',
  });

  const buildRows = (cols, isP) => {
    const pl = isP ? pPlcBase : sPlcBase;
    const gl = isP ? pGolBase : sGolBase;
    const tdFn = isP ? pTd : sTd;
    let ri = 0;
    const s = () => ri++ % 2 === 0;
    const s0=s(), s1=s(), s2=s();
    return (
      <tbody>
        <tr>
          <td style={{...pl, background: s0 ? pl.background : '#e0dcd4'}}>주소</td>
          {cols.map(e => <td key={e.id} style={tdFn(s0)}>{e.res ? (e.res.platPlc||'—') : '—'}</td>)}
        </tr>
        <tr>
          <td style={{...gl, background: s1 ? gl.background : '#f5dfa0'}}>매매가</td>
          {cols.map(e => <td key={e.id} style={{...tdFn(s1),fontWeight:600,color:'#1a1a2e'}}>
            {e.price && parseFloat(e.price)>0 ? parseFloat(e.price)+'억원' : '—'}
          </td>)}
        </tr>
        <tr>
          <td style={{...gl, background: s2 ? gl.background : '#f5dfa0'}}>평단가</td>
          {cols.map(e => {
            const merged = e.res ? mergeEntry(e) : {};
            const pPy = merged.platArea && parseFloat(merged.platArea)>0 ? parseFloat(merged.platArea)/PY : null;
            const pN  = e.price && parseFloat(e.price)>0 ? parseFloat(e.price) : null;
            const pp  = (pN && pPy) ? Math.round(pN*10000/pPy).toLocaleString() : null;
            return <td key={e.id} style={{...tdFn(s2),fontWeight:600,color:'#1a1a2e'}}>{pp ? pp+'만원/평' : '—'}</td>;
          })}
        </tr>
        {COLS.slice(1).map(col => {
          const sv = s();
          return (
            <tr key={col.l}>
              <td style={{...pl, background: sv ? pl.background : '#e0dcd4'}}>{col.l}</td>
              {cols.map(e => <td key={e.id} style={tdFn(sv)}>{e.res ? col.f(mergeEntry(e)) : '—'}</td>)}
            </tr>
          );
        })}
      </tbody>
    );
  };

  const buildHead = (cols, showCheck, startIdx, isP) => {
    const th = isP ? pThBase : sThBase;
    const pl = isP ? pPlcBase : sPlcBase;
    return (
      <thead>
        <tr>
          <th style={{...pl, minWidth: isP ? '0' : '80px', background:'#0d1b2a', color:'#c9a84c'}}>항목</th>
          {cols.map((e, i) => (
            <th key={e.id} className="ptk" style={{...th, textAlign:'left'}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:'5px'}}>
                {showCheck && (
                  <label className="screen-only" style={{cursor:'pointer',display:'flex',alignItems:'center',gap:'3px',fontSize:'10px',color:'#c9a84c',flexShrink:0,paddingTop:'2px'}}>
                    <input type="checkbox" checked={e.printSel} onChange={() => togglePrint(e.id)} />출력
                  </label>
                )}
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                    <span style={{background:'#c9a84c',color:'white',minWidth:'16px',height:'16px',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontWeight:700,flexShrink:0}}>{startIdx+i+1}</span>
                    <span style={{fontWeight:600,fontSize: isP ? '8.5pt' : '12px'}}>{e.alias||(e.res&&e.res.bldNm)||('건물'+(startIdx+i+1))}</span>
                  </div>
                </div>
              </div>
            </th>
          ))}
        </tr>
      </thead>
    );
  };

  return (
    <>
      {/* 화면: 전체 테이블 가로 스크롤 */}
      <div className="screen-only" style={{overflowX:'auto',marginTop:'8px',borderRadius:'2px',boxShadow:'0 1px 4px rgba(0,0,0,0.08)'}}>
        <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'auto'}}>
          {buildHead(entries, true, 0, false)}
          {buildRows(entries, false)}
        </table>
      </div>

      {/* 인쇄: 선택 항목 페이지 분할 */}
      {chunks.map((chunk, ci) => (
        <div key={ci} className="print-only"
          style={{pageBreakBefore: ci>0 ? 'always' : 'auto', breakBefore: ci>0 ? 'page' : 'auto',
                  paddingTop: ci>0 ? '0' : '0'}}>

          {/* 각 페이지 자체 헤더 */}
          <div style={{borderBottom:'1.5pt solid #0d1b2a',paddingBottom:'6pt',marginBottom:'8pt',display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
            <div>
              <div style={{fontSize:'7pt',letterSpacing:'0.12em',color:'#c9a84c'}}>TIMES REAL ESTATE · 타임즈부동산중개</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'22pt',fontWeight:600,lineHeight:1.1}}>{reportTitle||'건축물대장 비교 보고서'}</div>
            </div>
            <div style={{textAlign:'right',fontSize:'8pt',color:'#888'}}>
              {reportDate}&nbsp;·&nbsp;총 {totalSel}건
              {chunks.length > 1 && <span>&nbsp;·&nbsp;{ci+1}/{chunks.length} 페이지</span>}
            </div>
          </div>

          {/* 칸 폭 고정: 항목열 65pt + 건물열 140pt씩 (페이지에 관계없이 동일) */}
          <table style={{borderCollapse:'collapse', tableLayout:'fixed'}}>
            <colgroup>
              <col style={{width:'65pt'}} />
              {chunk.items.map(e => <col key={e.id} style={{width:'140pt'}} />)}
            </colgroup>
            {buildHead(chunk.items, false, chunk.startIdx, true)}
            {buildRows(chunk.items, true)}
          </table>
          {/* 바닥글은 CSS @bottom-* 마진박스로 처리 */}
        </div>
      ))}
    </>
  );
}

// ── 용도지역별 법정 최대 용적률 ──
const LEGAL_VL = {
  '제1종전용주거지역':100,'제2종전용주거지역':150,
  '제1종일반주거지역':200,'제2종일반주거지역':250,'제3종일반주거지역':300,
  '준주거지역':500,
  '중심상업지역':1500,'일반상업지역':1300,'근린상업지역':900,'유통상업지역':1100,
  '전용공업지역':300,'일반공업지역':350,'준공업지역':400,
  '보전녹지지역':80,'생산녹지지역':100,'자연녹지지역':100,
};

// ── 리포트 뷰 ──
function ReportView({ entries, reportTitle, reportDate, bizName, bizAddr, agentName, agentPhone, logoSrc, upAnalysis, upIncome, addPhoto, rmPhoto, setMapPhoto, upNotes }) {
  return (
    <div>
      {entries.map((e, i) => (
        <ReportCard key={e.id} e={e} i={i}
          reportTitle={reportTitle} reportDate={reportDate}
          bizName={bizName} bizAddr={bizAddr} agentName={agentName} agentPhone={agentPhone} logoSrc={logoSrc}
          upAnalysis={upAnalysis} upIncome={upIncome} addPhoto={addPhoto} rmPhoto={rmPhoto} setMapPhoto={setMapPhoto} upNotes={upNotes} />
      ))}
    </div>
  );
}

// ── 개별 건물 리포트 카드 ──
function ReportCard({ e, i, reportTitle, reportDate, bizName, bizAddr, agentName, agentPhone, logoSrc, upAnalysis, upIncome, addPhoto, rmPhoto, setMapPhoto, upNotes }) {
  const it      = e.res;
  const mg      = mergeEntry(e);
  const an      = e.analysis  || {};
  const ic      = e.income    || {};
  const photos  = e.photos    || [];
  const coords  = e.mapCoords;   // {lat, lon}
  const title   = e.alias || it.bldNm || it.platPlc;

  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError,   setAiError]   = React.useState('');

  const runAI = async () => {
    setAiLoading(true); setAiError('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address:   it.platPlc,
          zoning:    mg.jiyukCdNm,
          usage:     [mg.mainPurpsCdNm, mg.etcPurps].filter(Boolean).join('/'),
          platArea:  mg.platArea,
          totalArea: mg.totArea,
          floors:    '지상'+(mg.grndFlrCnt||0)+'층/지하'+(mg.ugrndFlrCnt||0)+'층',
          useAprDay: dt(mg.useAprDay),
          price:     e.price,
        })
      });
      const data = await res.json();
      if (data.error) { setAiError(data.error); return; }
      ['traffic','commercial','population','development'].forEach(k => {
        if (data[k]) upAnalysis(e.id, k, data[k]);
      });
    } catch(err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // ── 수익률 계산 ──
  const prM  = parseFloat(e.price  || 0) * 10000;
  const dep  = parseFloat(ic.deposit     || 0);
  const mRnt = parseFloat(ic.monthlyRent || 0);
  const mFee = parseFloat(ic.mgmtFee     || 0);
  const lnM  = parseFloat(ic.loanAmt     || 0);  // 만원 단위 직접 입력
  const lnR  = parseFloat(ic.loanRate    || 0);
  const acR  = parseFloat(ic.acquiTax    || 0);
  const tyR  = parseFloat(ic.targetYield || 0);
  const annInc  = (mRnt + mFee) * 12;
  const annInt  = lnM * lnR / 100;
  const annNet  = annInc - annInt;
  const acqAmt  = prM * acR / 100;
  const realInv = prM - dep - lnM + acqAmt;
  const yldRate = realInv > 0 ? (annNet / realInv * 100) : 0;
  const neededMon = tyR > 0 ? (realInv * tyR / 100 + annInt) / 12 : 0;

  // ── 신축여력 계산 ──
  const platA   = mg.platArea ? parseFloat(mg.platArea) : 0;
  const zoning  = mg.jiyukCdNm || '';
  // 용도지역 문자열 정규화 (공백·띄어쓰기 제거 후 매칭)
  const zoningKey = zoning.replace(/\s/g, '');
  const found = Object.entries(LEGAL_VL).find(([k]) => k.replace(/\s/g,'') === zoningKey);
  const legalVlFromTable = found ? found[1] : 0;
  // 수기 입력 maxVlRat 우선 적용
  const legalVl = mg.maxVlRat ? parseFloat(mg.maxVlRat) : legalVlFromTable;
  const currVl  = mg.vlRat ? parseFloat(mg.vlRat) : 0;
  const maxArea = platA && legalVl ? +(platA * legalVl / 100).toFixed(1) : null;
  const currArea = mg.totArea ? +parseFloat(mg.totArea).toFixed(1) : null;
  const extraArea = (maxArea && currArea) ? +(maxArea - currArea).toFixed(1) : null;
  // 건물 노후도
  const useDay = mg.useAprDay ? String(mg.useAprDay).slice(0,4) : null;
  const bldAge = useDay ? (new Date().getFullYear() - parseInt(useDay)) : null;
  const ageLabel = bldAge
    ? bldAge >= 40 ? '🔴 고령 건물 ('+bldAge+'년) — 신축 적극 검토'
    : bldAge >= 30 ? '🟡 노후 건물 ('+bldAge+'년) — 신축 검토 가능'
    : '🟢 준공 '+bldAge+'년 — 양호' : null;

  // 지도 URL
  const naverMapUrl = 'https://map.naver.com/v5/search/' + encodeURIComponent(it.platPlc||'');
  const kakaoMapUrl = 'https://map.kakao.com/?q=' + encodeURIComponent(it.platPlc||'');

  const iSt  = { fontSize:'12px', padding:'6px 8px', border:'1px solid #e0dcd4', width:'100%', boxSizing:'border-box', resize:'vertical', fontFamily:"'Noto Sans KR',sans-serif", lineHeight:1.6 };
  const numSt = { fontSize:'12px', padding:'5px 8px', border:'1px solid #e0dcd4', width:'100%', boxSizing:'border-box', textAlign:'right' };
  const fmt  = v => v > 0 ? Math.round(v).toLocaleString() : '—';
  const hd   = (label, badge) => (
    <div style={{fontSize:'11px',fontWeight:600,color:'#0d1b2a',marginBottom:'6px',letterSpacing:'0.05em',borderBottom:'1px solid #e0dcd4',paddingBottom:'4px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <span>{label}</span>
      {badge && <span style={{fontSize:'9px',fontWeight:400,color:'#2471a3',background:'#eaf4fb',padding:'1px 7px',letterSpacing:'0',border:'0.5px solid #aad4ed'}}>{badge}</span>}
    </div>
  );

  return (
    <div className="report-card" style={{background:'white',marginBottom:'28px'}}>

      {/* ── 리포트 헤더 ── */}
      <div style={{background:'white',padding:'14px 20px 12px',borderBottom:'2.5px solid #0d1b2a'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <div style={{fontSize:'8px',letterSpacing:'0.25em',color:'#c9a84c',marginBottom:'4px'}}>TIMES REAL ESTATE · 건물 분석 리포트</div>
            {reportTitle && (
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'30px',fontWeight:700,color:'#0d1b2a',lineHeight:1.1,marginBottom:'4px',letterSpacing:'0.01em'}}>{reportTitle}</div>
            )}
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'16px',fontWeight:400,color:'#444',lineHeight:1.2}}>{title}</div>
            <div style={{fontSize:'10px',color:'#888',marginTop:'4px'}}>{it.platPlc}</div>
          </div>
          <div style={{textAlign:'right',flexShrink:0,marginLeft:'12px',marginTop:'2px'}}>
            <div style={{fontSize:'11px',color:'#555',fontWeight:500}}>{reportDate}</div>
          </div>
        </div>
      </div>

      <div style={{padding:'22px 20px'}}>

        {/* ── 2열: 좌(건물사진) / 우(건물기본정보) ── */}
        <div style={{display:'grid',gridTemplateColumns:'260px 1fr',gap:'24px',marginBottom:'14px',overflow:'hidden'}}>

          {/* 좌: 사진 + 매매가 — flex 컬럼으로 매매가를 사용승인 라인에 맞춤 */}
          <div style={{overflow:'hidden',minWidth:0,display:'flex',flexDirection:'column'}}>

            {/* 건물기본정보 헤더(hd)와 동일 높이 투명 스페이서 → 사진이 주용도 라인에 정렬 */}
            <div aria-hidden="true" style={{visibility:'hidden',fontSize:'11px',fontWeight:600,paddingBottom:'4px',marginBottom:'6px',borderBottom:'1px solid transparent',letterSpacing:'0.05em',flexShrink:0}}>X</div>

            {/* 사진 컨테이너 — 175px 고정 */}
            <div style={{width:'100%',height:'175px',overflow:'hidden',background:'#f0ede6',border:'1px solid #e0dcd4',position:'relative',flexShrink:0}}>
              {photos.length === 0 && (
                <div className="print-only" style={{height:'175px',display:'flex',alignItems:'center',justifyContent:'center',color:'#ccc',fontSize:'11px'}}>사진 없음</div>
              )}
              {photos.length === 1 && (
                <img src={photos[0]} style={{width:'100%',height:'175px',objectFit:'cover',display:'block'}} />
              )}
              {photos.length === 2 && (
                <div style={{display:'flex',height:'175px',gap:'2px',overflow:'hidden'}}>
                  {photos.map((src,idx) => (
                    <img key={idx} src={src} style={{flex:1,minWidth:0,height:'175px',objectFit:'cover',display:'block'}} />
                  ))}
                </div>
              )}
              {photos.length >= 3 && (
                <div style={{display:'flex',height:'175px',gap:'2px',overflow:'hidden'}}>
                  <img src={photos[0]} style={{width:'50%',flexShrink:0,height:'175px',objectFit:'cover',display:'block'}} />
                  <div style={{width:'50%',flexShrink:0,display:'flex',flexDirection:'column',gap:'2px',height:'175px',overflow:'hidden'}}>
                    <img src={photos[1]} style={{width:'100%',height:'87px',objectFit:'cover',display:'block'}} />
                    <img src={photos[2]} style={{width:'100%',height:'87px',objectFit:'cover',display:'block'}} />
                  </div>
                </div>
              )}
              {/* 삭제 버튼 */}
              {photos.map((_, idx) => (
                <button key={idx} className="no-print" onClick={() => rmPhoto(e.id, idx)}
                  style={{position:'absolute',top:'4px',right:idx===0?(photos.length>=2?'calc(50% + 4px)':'4px'):'4px',
                    background:'rgba(0,0,0,0.55)',color:'white',border:'none',cursor:'pointer',fontSize:'11px',padding:'1px 6px',lineHeight:1.4,zIndex:10}}>
                  {photos.length > 1 ? (idx+1)+'×' : '×'}
                </button>
              ))}
            </div>

            {/* 사진 업로드 버튼 (화면 전용) */}
            {photos.length < 3 && (
              <label className="no-print" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'5px',cursor:'pointer',padding:'5px',border:'1px dashed #e0dcd4',background:'#fafaf8',fontSize:'10px',color:'#888',marginTop:'4px',flexShrink:0}}>
                📷 {photos.length===0 ? '사진 업로드 (최대 3장)' : '사진 추가 ('+photos.length+'/3)'}
                <input type="file" accept="image/*" multiple style={{display:'none'}} onChange={ev => {
                  Array.from(ev.target.files).slice(0,3-photos.length).forEach(f=>{const r=new FileReader();r.onload=ev2=>addPhoto(e.id,ev2.target.result);r.readAsDataURL(f);});
                }} />
              </label>
            )}

            {/* 매매가 — marginTop:auto로 사용승인 라인 높이에 자동 정렬 */}
            {e.price && parseFloat(e.price) > 0 && (
              <div style={{marginTop:'auto',paddingTop:'8px',flexShrink:0,WebkitPrintColorAdjust:'exact',printColorAdjust:'exact'}}>
                <div style={{padding:'7px 12px 8px',background:'#0d1b2a',borderLeft:'3px solid #c9a84c'}}>
                  <div style={{fontSize:'7px',color:'#c9a84c',letterSpacing:'0.25em',fontWeight:600,marginBottom:'3px'}}>ASKING PRICE</div>
                  <div style={{textAlign:'right',lineHeight:1}}>
                    <span style={{fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',Arial,sans-serif",fontSize:'24px',fontWeight:700,color:'white',letterSpacing:'-0.02em'}}>
                      {parseFloat(e.price).toLocaleString()}
                    </span>
                    <span style={{fontFamily:"'Noto Sans KR',sans-serif",fontSize:'12px',fontWeight:400,color:'#c9a84c',marginLeft:'4px'}}>억원</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 우: 건물 기본 정보 */}
          <div style={{overflow:'hidden',minWidth:0}}>
            {hd('🏢 건물 기본 정보')}
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
              <tbody>
                {[
                  ['주용도',   [mg.mainPurpsCdNm,mg.etcPurps].filter(Boolean).join('/')||'—'],
                  ['주구조',   mg.strctCdNm||mg.mainStrctCdNm||'—'],
                  ['대지면적', platA>0 ? py(mg.platArea)+'평 ('+parseFloat(mg.platArea).toFixed(0)+'㎡)' : '—'],
                  ['연면적',   mg.totArea&&parseFloat(mg.totArea)>0 ? py(mg.totArea)+'평 ('+parseFloat(mg.totArea).toFixed(0)+'㎡)' : '—'],
                  ['건폐율',   pct(mg.bcRat)],
                  ['용적률',   pct(mg.vlRat)],
                  ['층수',     '지상'+(mg.grndFlrCnt||0)+'층/지하'+(mg.ugrndFlrCnt||0)+'층'],
                  ['세대수',   mg.hhldCnt ? parseInt(mg.hhldCnt).toLocaleString()+'세대' : '—'],
                  ['사용승인', dt(mg.useAprDay) + (bldAge ? ' ('+bldAge+'년차)' : '')],
                ].map(([k,v,big]) => (
                  <tr key={k}>
                    <td style={{padding:'4px 6px',background:big?'#fff3dc':'#f5f2eb',color:big?'#a05800':'#666',fontWeight:500,width:'62px',borderBottom:'1px solid #eee',whiteSpace:'nowrap',fontSize:'10px'}}>{k}</td>
                    <td style={{padding:'4px 8px',borderBottom:'1px solid #eee',color:'#1a1a2e',fontSize:big?'15px':'12px',fontWeight:big?700:400}}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>


        {/* ── 수익률 분석 ── */}
        <div style={{marginBottom:'14px'}}>
          {hd('💰 수익률 분석')}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
            <div>
              <div style={{fontSize:'10px',color:'#888',marginBottom:'5px'}}>입력 조건</div>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
                <tbody>
                  {[
                    {label:'보증금 (만원)',field:'deposit'},
                    {label:'월세 (만원)',  field:'monthlyRent'},
                    {label:'관리비 (만원)',field:'mgmtFee'},
                    {label:'대출금액 (만원)',field:'loanAmt'},
                    {label:'대출금리 (%)', field:'loanRate'},
                    {label:'취득세율 (%)', field:'acquiTax'},
                  ].map(({label, field}) => (
                    <tr key={label}>
                      <td style={{padding:'3px 6px',background:'#f5f2eb',color:'#666',width:'100px',borderBottom:'1px solid #eee',fontSize:'10px',whiteSpace:'nowrap'}}>{label}</td>
                      <td style={{padding:'3px 8px',borderBottom:'1px solid #eee',textAlign:'right'}}>
                        <input type="text" className="screen-only" value={ic[field]||''} placeholder="0"
                          onChange={ev => upIncome(e.id, field, ev.target.value)} style={{...numSt,background:'white',textAlign:'right'}} />
                        <span className="print-only" style={{fontSize:'12px',display:'block',textAlign:'right'}}>
                          {ic[field]
                            ? label.includes('%')
                              ? parseFloat(ic[field]) + '%'
                              : fmtAmt(ic[field])
                            : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <div style={{fontSize:'10px',color:'#888',marginBottom:'5px'}}>분석 결과</div>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px',marginBottom:'10px'}}>
                <tbody>
                  {[
                    {label:'연간 임대수입', val:fmtAmt(annInc), hi:false},
                    {label:'연간 이자비용', val:fmtAmt(annInt), hi:false},
                    {label:'연간 순수익',   val:fmtAmt(annNet), hi:true},
                    {label:'취득세',        val:fmtAmt(acqAmt), hi:false},
                    {label:'실 투자금',     val:fmtAmt(realInv), hi:false},
                    {label:'연간 수익률',   val:realInv>0?yldRate.toFixed(2)+'%':'—', hi:true},
                  ].map(({label, val, hi}) => (
                    <tr key={label}>
                      <td style={{padding:'3px 6px',background:hi?'#fff3dc':'#f5f2eb',color:hi?'#a05800':'#666',width:'100px',borderBottom:'1px solid #eee',fontSize:'10px',fontWeight:hi?700:400,whiteSpace:'nowrap'}}>{label}</td>
                      <td style={{padding:'3px 8px',borderBottom:'1px solid #eee',fontWeight:hi?700:400,color:hi?'#0d1b2a':'#333',textAlign:'right',fontSize:'12px'}}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="no-print" style={{background:'#f0f4ff',padding:'8px 10px',border:'1px solid #c0cff8'}}>
                <div style={{fontSize:'10px',color:'#3a6fd8',fontWeight:600,marginBottom:'5px'}}>🔄 역산 — 목표수익률 → 필요 임대료</div>
                <div style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'11px',flexWrap:'wrap'}}>
                  <span style={{color:'#666'}}>목표</span>
                  <input type="text" className="screen-only" value={ic.targetYield||''} placeholder="예: 5"
                    onChange={ev => upIncome(e.id,'targetYield',ev.target.value)}
                    style={{width:'50px',fontSize:'12px',padding:'3px 5px',border:'1px solid #b8ccff',textAlign:'right'}} />
                  <span className="print-only" style={{fontSize:'12px',fontWeight:600}}>{ic.targetYield||'—'}</span>
                  <span style={{color:'#666'}}>%</span>
                  {tyR > 0 && realInv > 0 && (
                    <span style={{color:'#0d1b2a',fontWeight:700,marginLeft:'4px'}}>
                      → 월 {Math.round(neededMon).toLocaleString()}만원 필요
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 신축·증축 여력 분석 ── */}
        <div style={{marginBottom:'10px'}}>
          {hd('🏗 신축·증축 여력 분석',
            extraArea === null ? null :
            extraArea > 0
              ? '증축 여력 ' + (extraArea/PY).toFixed(1) + '평 · ' + (currArea ? ((extraArea/parseFloat(currArea))*100).toFixed(0)+'% 추가 가능' : '')
              : '현재 연면적 법정 최대 근접'
          )}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px',marginBottom:'8px',fontSize:'11px'}}>
            {/* 행1 */}
            <div style={{background:'#f5f2eb',padding:'7px 10px'}}>
              <div style={{fontSize:'9px',color:'#aaa',marginBottom:'2px'}}>용도지역</div>
              <div style={{fontWeight:600,color:'#0d1b2a',fontSize:'12px'}}>{zoning||'—'}</div>
            </div>
            <div style={{background:'#f5f2eb',padding:'7px 10px'}}>
              <div style={{fontSize:'9px',color:'#aaa',marginBottom:'2px'}}>법정 최대 용적률</div>
              <div style={{fontWeight:600,color:'#0d1b2a',fontSize:'12px'}}>{legalVl ? legalVl+'%' : '확인 필요'}</div>
            </div>
            <div style={{background:'#f5f2eb',padding:'7px 10px'}}>
              <div style={{fontSize:'9px',color:'#aaa',marginBottom:'2px'}}>현재 용적률</div>
              <div style={{fontWeight:700,fontSize:'13px',
                color: currVl>0&&legalVl>0 ? (currVl>legalVl ? '#e74c3c' : '#2471a3') : '#0d1b2a',
                display:'flex',alignItems:'center',gap:'4px'}}>
                {pct(mg.vlRat)}
                {currVl>0 && legalVl>0 && (
                  <span style={{fontSize:'9px',fontWeight:500,
                    background: currVl>legalVl ? '#fdecea' : '#eaf4fb',
                    color: currVl>legalVl ? '#e74c3c' : '#2471a3',
                    padding:'1px 4px',borderRadius:'2px',border:'0.5px solid currentColor'}}>
                    {currVl>legalVl ? '초과' : '여유'}
                  </span>
                )}
              </div>
            </div>
            {/* 행2 */}
            <div style={{background:'#f5f2eb',padding:'7px 10px'}}>
              <div style={{fontSize:'9px',color:'#aaa',marginBottom:'2px'}}>대지면적</div>
              <div style={{fontWeight:600,color:'#0d1b2a',fontSize:'12px'}}>{platA>0 ? py(mg.platArea)+'평' : '—'}</div>
            </div>
            <div style={{background:'#f5f2eb',padding:'7px 10px'}}>
              <div style={{fontSize:'9px',color:'#aaa',marginBottom:'2px'}}>최대 건축 가능 연면적</div>
              <div style={{fontWeight:600,color:'#0d1b2a',fontSize:'12px'}}>{maxArea ? (parseFloat(maxArea)/PY).toFixed(1)+'평' : '—'}</div>
            </div>
            <div style={{background:'#f5f2eb',padding:'7px 10px'}}>
              <div style={{fontSize:'9px',color:'#aaa',marginBottom:'2px'}}>현재 연면적</div>
              <div style={{fontWeight:700,fontSize:'13px',
                color: currArea&&maxArea ? (parseFloat(currArea)>parseFloat(maxArea) ? '#e74c3c' : '#2471a3') : '#0d1b2a',
                display:'flex',alignItems:'center',gap:'4px'}}>
                {currArea ? (parseFloat(currArea)/PY).toFixed(1)+'평' : '—'}
                {currArea && maxArea && (
                  <span style={{fontSize:'9px',fontWeight:500,
                    background: parseFloat(currArea)>parseFloat(maxArea) ? '#fdecea' : '#eaf4fb',
                    color: parseFloat(currArea)>parseFloat(maxArea) ? '#e74c3c' : '#2471a3',
                    padding:'1px 4px',borderRadius:'2px',border:'0.5px solid currentColor'}}>
                    {parseFloat(currArea)>parseFloat(maxArea) ? '초과' : '여유'}
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* 건물 노후도 — 사용승인 옆에 표시, 여기선 제거 */}
        </div>

        {/* ── 추가 설명 ── */}
        <div style={{marginTop:'10px'}}>
          {hd('📝 추가 설명')}
          {/* 화면: 입력창 */}
          <textarea className="no-print" rows={4}
            placeholder={'한 줄씩 입력 → 인쇄 시 • 자동 추가, 2열로 배치됩니다.\n예) 주차 10대 가능\n예) 1층 상가 임대 중\n예) 엘리베이터 1대'}
            value={e.notes||''}
            onChange={ev => upNotes(e.id, ev.target.value)}
            style={{width:'100%',fontSize:'12px',padding:'8px 10px',border:'1px solid #e0dcd4',resize:'vertical',lineHeight:1.7,fontFamily:"'Noto Sans KR',sans-serif",boxSizing:'border-box'}} />
          {e.notes && e.notes.split('\n').filter(l=>l.trim()).length > 6 && (
            <div className="no-print" style={{fontSize:'10px',color:'#e67e22',marginTop:'3px'}}>
              ⚠ 인쇄 시 6줄(2열)까지만 표시됩니다. 현재 입력 초과.
            </div>
          )}
          {/* 인쇄: 2열 레이아웃, break-inside:avoid */}
          {e.notes && (
            <div className="print-only" style={{columnCount:2,columnGap:'16px',fontSize:'11px',color:'#1a1a2e',lineHeight:1.8,padding:'4px 0',breakInside:'avoid',maxHeight:'80px',overflow:'hidden'}}>
              {e.notes.split('\n').filter(l => l.trim()).map((line, idx) => (
                <div key={idx} style={{display:'flex',gap:'5px',marginBottom:'1px',breakInside:'avoid',pageBreakInside:'avoid'}}>
                  <span style={{color:'#c9a84c',fontWeight:700,flexShrink:0}}>•</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 리포트 푸터 — CSS table (인쇄 안정) */}
      <div className="print-only" style={{margin:'8px 20px 14px',borderTop:'1pt solid #c9a84c',paddingTop:'6pt',fontSize:'8pt',color:'#555'}}>
        <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
          <tbody>
            <tr style={{verticalAlign:'middle'}}>
              {/* 좌: 로고 + 상호 + 주소 */}
              <td style={{verticalAlign:'middle',paddingRight:'8pt'}}>
                <span style={{display:'inline-flex',alignItems:'center',gap:'6pt'}}>
                  {logoSrc && <img src={logoSrc} style={{height:'18pt',objectFit:'contain',verticalAlign:'middle'}} />}
                  {bizName && <strong style={{color:'#0d1b2a',fontSize:'9pt'}}>{bizName}</strong>}
                  {bizName && bizAddr && <span style={{color:'#ccc',margin:'0 4pt'}}>|</span>}
                  {bizAddr && <span style={{color:'#777'}}>{bizAddr}</span>}
                </span>
              </td>
              {/* 우: 담당자 + 연락처 (같은 셀, 우측 정렬) */}
              {(agentName||agentPhone) && (
                <td style={{textAlign:'right',whiteSpace:'nowrap',verticalAlign:'middle',width:'120pt'}}>
                  {agentName  && <strong style={{color:'#0d1b2a',fontSize:'9pt'}}>{agentName}</strong>}
                  {agentName && agentPhone && <span style={{color:'#ccc',margin:'0 4pt'}}>|</span>}
                  {agentPhone && <span>{agentPhone}</span>}
                </td>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
// ── 마운트 ──
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
