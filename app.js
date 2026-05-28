// ── TIMES 임대 매물 관리 v1.2.8 (Supabase + 네이버 자동입력) ──
const APP_VERSION = 'v1.2.8';
const { useState, useEffect, useCallback } = React;

// ── 상수 ──
const PY  = 3.30579;
const STO_CRED = 'times-lease-sb';
const STO_INFO = 'times-lease-info';
const TBL = 'lease_listings';

// ── Supabase 클라이언트 ──
let _sb = null;
const getSB = () => _sb;
const initSB = (url, key) => {
  const { createClient } = window.supabase;
  _sb = createClient(url, key);
  return _sb;
};

// ── DB 조작 ──
const dbLoad = async () => {
  const { data, error } = await getSB()
    .from(TBL).select('*').order('updated_at', {ascending:true});
  if (error) throw error;
  return data.map(r => r.data);
};
const dbUpsert = async (listing) => {
  const { error } = await getSB().from(TBL)
    .upsert({ id: listing.id, data: listing, updated_at: new Date().toISOString() });
  if (error) throw error;
};
const dbDelete = async (id) => {
  const { error } = await getSB().from(TBL).delete().eq('id', id);
  if (error) throw error;
};

// ── 유틸 ──
const py2m  = v => v ? (parseFloat(v)*PY).toFixed(1) : null;
const n     = v => parseFloat(v) || 0;
const fmt   = v => {
  const a = Math.round(n(v));
  if (a <= 0) return '—';
  if (a >= 10000) {
    const uk = Math.floor(a/10000), man = a % 10000;
    return man > 0 ? uk+'억 '+man.toLocaleString()+'만원' : uk+'억원';
  }
  return a.toLocaleString()+'만원';
};
const fmtPy = (manwon, py) => {
  if (!manwon || !py || n(py)===0) return '—';
  return Math.round(n(manwon)/n(py)).toLocaleString()+'만원';
};
const uid   = () => Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const blank = () => ({
  id:uid(), createdAt:Date.now(),
  buildingName:'', alias:'', address:'', floor:'', totalFloor:'',
  exclusivePy:'', contractPy:'',
  deposit:'', rent:'', mgmtFee:'',
  parking:'', elevator:'', moveIn:'', useAprDate:'',
  rentFree:'', fitOut:'', notes:'',
  photo:null, printSel:true,
});
const loadInfo = () => { try { return JSON.parse(localStorage.getItem(STO_INFO)||'{}'); } catch { return {}; } };
const saveInfo = obj => localStorage.setItem(STO_INFO, JSON.stringify(obj));

const floorLabel = ls => {
  if (!ls.floor) return '—';
  return ls.floor+'층'+(ls.totalFloor ? ' / 총 '+ls.totalFloor+'층' : '');
};

// ── 비교표 컬럼 v1.2.8 (단가 인라인 통합) ──
const CMP_COLS = [
  // 면적
  { l:'전용면적', sec:'📐 면적',
    f:ls => ls.exclusivePy ? ls.exclusivePy+'평'+(py2m(ls.exclusivePy)?' ('+py2m(ls.exclusivePy)+'㎡)':'') : '—' },
  { l:'계약면적',
    f:ls => ls.contractPy  ? ls.contractPy+'평'+(py2m(ls.contractPy)?' ('+py2m(ls.contractPy)+'㎡)':'')   : '—' },
  // 임대 조건 (보증금·임대료·관리비에 평단가 인라인)
  { l:'보증금', sec:'💰 임대 조건',
    f:ls => {
      var a = fmt(ls.deposit); if (a==='—') return a;
      var u = (ls.contractPy && ls.deposit) ? fmtPy(ls.deposit, ls.contractPy) : null;
      if (u && u!=='—') return <>{a}<span style={{fontSize:'6pt',color:'#b0a090',marginLeft:'3pt',fontWeight:400}}>· {u}/평</span></>;
      return a;
    }
  },
  { l:'임대료/월',
    f:ls => {
      var a = fmt(ls.rent); if (a==='—') return a;
      var u = (ls.contractPy && ls.rent) ? fmtPy(ls.rent, ls.contractPy) : null;
      if (u && u!=='—') return <>{a}<span style={{fontSize:'6pt',color:'#b0a090',marginLeft:'3pt',fontWeight:400}}>· {u}/평</span></>;
      return a;
    }
  },
  { l:'관리비/월',
    f:ls => {
      var a = fmt(ls.mgmtFee); if (a==='—') return a;
      var u = (ls.contractPy && ls.mgmtFee) ? fmtPy(ls.mgmtFee, ls.contractPy) : null;
      if (u && u!=='—') return <>{a}<span style={{fontSize:'6pt',color:'#b0a090',marginLeft:'3pt',fontWeight:400}}>· {u}/평</span></>;
      return a;
    }
  },
  { l:'월 합계', hi:true,
    f:ls => (n(ls.rent)||n(ls.mgmtFee)) ? fmt(n(ls.rent)+n(ls.mgmtFee)) : '—' },
  { l:'NOC/전용평',
    f:ls => ls.exclusivePy&&(n(ls.rent)||n(ls.mgmtFee))
      ? Math.round((n(ls.rent)+n(ls.mgmtFee))/n(ls.exclusivePy)).toLocaleString()+'만원' : '—' },
  // 입주 조건
  { l:'입주가능일', sec:'📅 입주 조건', f:ls => ls.moveIn   || '—' },
  { l:'렌트프리',                      f:ls => ls.rentFree  || '—' },
  { l:'핏아웃',                        f:ls => ls.fitOut    || '—' },
  // 건물 정보
  { l:'주차',    sec:'🏢 건물 정보', f:ls => ls.parking    || '—' },
  { l:'승강기',  always:true,        f:ls => ls.elevator   || '—' },
  { l:'사용승인',                    f:ls => ls.useAprDate || '—' },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ── 면적 입력 컴포넌트 (평 ↔ ㎡ 자동변환) ──
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function AreaInput({ label, pyKey, ls, set }) {
  const [m2Draft,   setM2Draft]   = useState('');
  const [m2Focused, setM2Focused] = useState(false);

  const pyVal    = ls[pyKey] || '';
  const pyNum    = parseFloat(pyVal);
  const m2Computed = (pyVal && !isNaN(pyNum) && pyNum > 0) ? (pyNum * PY).toFixed(2) : '';

  const handlePyChange = (v) => { set(pyKey, v); };

  const handleM2Focus = () => {
    setM2Focused(true);
    setM2Draft(m2Computed);
  };
  const handleM2Change = (v) => {
    setM2Draft(v);
    const m = parseFloat(v);
    if (!isNaN(m) && m > 0) {
      set(pyKey, (m / PY).toFixed(2));
    } else if (!v) {
      set(pyKey, '');
    }
  };
  const handleM2Blur = () => { setM2Focused(false); };

  const m2DisplayVal = m2Focused ? m2Draft : m2Computed;

  return (
    <div>
      <div style={{fontSize:'10px',color:'#888',marginBottom:'4px'}}>{label}</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 18px 1fr',alignItems:'start',gap:'3px'}}>
        <div>
          <input value={pyVal} placeholder="35.5"
            onChange={e => handlePyChange(e.target.value)}
            style={{width:'100%',fontSize:'12px',padding:'5px 8px',border:'1px solid #e0dcd4',boxSizing:'border-box'}} />
          <div style={{fontSize:'9px',color:'#aaa',textAlign:'center',marginTop:'2px'}}>평</div>
        </div>
        <div style={{textAlign:'center',paddingTop:'5px',color:'#bbb',fontSize:'13px'}}>↔</div>
        <div>
          <input value={m2DisplayVal} placeholder="117.3"
            onFocus={handleM2Focus}
            onChange={e => handleM2Change(e.target.value)}
            onBlur={handleM2Blur}
            style={{width:'100%',fontSize:'12px',padding:'5px 8px',border:'1px solid #e0dcd4',boxSizing:'border-box'}} />
          <div style={{fontSize:'9px',color:'#aaa',textAlign:'center',marginTop:'2px'}}>㎡</div>
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ── 네이버 텍스트 파싱 모달 ──
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function NaverParseModal({ onParsed, onClose }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');

  const parse = async () => {
    if (!text.trim()) { setErr('텍스트를 붙여넣어 주세요'); return; }
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'API 오류 ' + res.status);
      onParsed(data);
    } catch(e) {
      setErr('파싱 실패: ' + (e.message || String(e)));
    } finally { setBusy(false); }
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(13,27,42,0.88)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}>
      <div style={{background:'white',width:'100%',maxWidth:'580px',padding:'24px',boxShadow:'0 8px 40px rgba(0,0,0,0.3)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'16px',borderBottom:'2px solid #0d1b2a',paddingBottom:'12px'}}>
          <div>
            <div style={{fontSize:'8px',letterSpacing:'.2em',color:'#c9a84c',marginBottom:'4px'}}>NAVER LISTING IMPORT</div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'20px',fontWeight:600,color:'#0d1b2a'}}>네이버 매물 자동 입력</div>
            <div style={{fontSize:'11px',color:'#888',marginTop:'3px'}}>매물 페이지 텍스트를 붙여넣으면 AI가 자동으로 분석합니다</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#888',lineHeight:1,marginLeft:'12px'}}>×</button>
        </div>
        <div style={{background:'#f5f2eb',border:'1px solid #e0dcd4',padding:'10px 12px',marginBottom:'14px',fontSize:'11px',color:'#666',lineHeight:1.8}}>
          <strong style={{color:'#0d1b2a',display:'block',marginBottom:'4px'}}>📋 사용 방법</strong>
          1. 네이버 부동산 매물 상세 페이지 열기<br/>
          2. 페이지에서 <strong>Ctrl+A</strong> → <strong>Ctrl+C</strong><br/>
          3. 아래 텍스트 박스에 <strong>Ctrl+V</strong><br/>
          4. <strong>자동 입력</strong> 버튼 클릭 → 건물명·주소만 직접 확인
        </div>
        <textarea value={text} onChange={e => setText(e.target.value)}
          placeholder="여기에 네이버 부동산 매물 텍스트를 붙여넣으세요 (Ctrl+V)"
          rows={11}
          style={{width:'100%',fontSize:'12px',padding:'10px',border:'1px solid #e0dcd4',resize:'vertical',fontFamily:'inherit',lineHeight:1.7,boxSizing:'border-box'}} />
        {err && (
          <div style={{fontSize:'11px',color:'#c0392b',background:'#fff5f4',border:'1px solid #f5c6c2',padding:'8px 10px',marginTop:'8px',lineHeight:1.5}}>
            ⚠ {err}
          </div>
        )}
        <div style={{fontSize:'10px',color:'#aaa',marginTop:'10px',lineHeight:1.6}}>
          💡 건물명과 주소는 자동 추출이 어려울 수 있습니다. 파싱 후 폼에서 직접 확인·입력해 주세요.
        </div>
        <div style={{display:'flex',gap:'8px',justifyContent:'flex-end',marginTop:'14px'}}>
          <button onClick={onClose}
            style={{padding:'8px 18px',background:'white',border:'1px solid #ccc',cursor:'pointer',fontSize:'12px',fontFamily:'inherit',color:'#555'}}>취소</button>
          <button onClick={parse} disabled={busy}
            style={{padding:'8px 22px',background:busy?'#aaa':'#0d1b2a',color:'#c9a84c',border:'none',cursor:busy?'not-allowed':'pointer',fontSize:'12px',fontFamily:'inherit',fontWeight:600,letterSpacing:'.04em',minWidth:'110px'}}>
            {busy ? '⏳ 분석 중…' : '✨ 자동 입력'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ── Supabase 연결 설정 모달 ──
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function SBSetup({ onConnect }) {
  const [url,  setUrl]  = useState('');
  const [key,  setKey]  = useState('');
  const [err,  setErr]  = useState('');
  const [busy, setBusy] = useState(false);

  const connect = async () => {
    if (!url.trim() || !key.trim()) { setErr('URL과 API Key를 모두 입력하세요'); return; }
    setBusy(true); setErr('');
    try {
      const client = initSB(url.trim(), key.trim());
      const { error } = await client.from(TBL).select('id').limit(1);
      if (error) throw error;
      localStorage.setItem(STO_CRED, JSON.stringify({ url:url.trim(), key:key.trim() }));
      onConnect();
    } catch(e) {
      _sb = null;
      setErr('연결 실패: ' + (e.message||String(e)));
    } finally { setBusy(false); }
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f7f4ef'}}>
      <div style={{background:'white',border:'1px solid #0d1b2a',padding:'32px',width:'100%',maxWidth:'440px'}}>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'9px',letterSpacing:'.25em',color:'#c9a84c',marginBottom:'6px'}}>TIMES REAL ESTATE</div>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'24px',fontWeight:600,color:'#0d1b2a',marginBottom:'4px'}}>임대 매물 관리</div>
        <div style={{fontSize:'11px',color:'#888',marginBottom:'24px'}}>Supabase 프로젝트에 연결하세요</div>
        <div style={{marginBottom:'12px'}}>
          <div style={{fontSize:'10px',color:'#888',marginBottom:'3px'}}>Supabase Project URL</div>
          <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://xxxx.supabase.co"
            style={{width:'100%',fontSize:'12px',padding:'8px 10px',border:'1px solid #e0dcd4',outline:'none'}} />
        </div>
        <div style={{marginBottom:'20px'}}>
          <div style={{fontSize:'10px',color:'#888',marginBottom:'3px'}}>anon / public API Key</div>
          <input value={key} onChange={e=>setKey(e.target.value)} placeholder="eyJ..." type="password"
            style={{width:'100%',fontSize:'12px',padding:'8px 10px',border:'1px solid #e0dcd4',outline:'none'}} />
          <div style={{fontSize:'10px',color:'#aaa',marginTop:'4px'}}>Supabase 대시보드 → Settings → API → anon public key</div>
        </div>
        {err && <div style={{fontSize:'11px',color:'#c0392b',background:'#fff5f4',padding:'8px',marginBottom:'12px'}}>{err}</div>}
        <div style={{background:'#f5f2eb',padding:'10px 12px',fontSize:'10px',color:'#888',marginBottom:'16px',lineHeight:1.7}}>
          <strong style={{color:'#0d1b2a'}}>Supabase 테이블 생성 SQL</strong><br/>
          SQL Editor에서 먼저 실행하세요:<br/>
          <code style={{fontSize:'9px',color:'#2471a3',display:'block',marginTop:'4px'}}>
            CREATE TABLE lease_listings (id TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW());<br/>
            ALTER TABLE lease_listings ENABLE ROW LEVEL SECURITY;<br/>
            CREATE POLICY "allow_all" ON lease_listings FOR ALL USING (true);
          </code>
        </div>
        <button onClick={connect} disabled={busy}
          style={{width:'100%',background:busy?'#888':'#0d1b2a',color:'#c9a84c',border:'none',padding:'10px',fontSize:'13px',cursor:busy?'not-allowed':'pointer',fontFamily:'inherit',letterSpacing:'.05em'}}>
          {busy ? '연결 중…' : '연결하기'}
        </button>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ── 입력 폼 모달 ──
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ListingForm({ init, onSave, onClose }) {
  const [ls, setLs]          = useState(init || blank());
  const [busy, setBusy]      = useState(false);
  const [showNaver, setShowNaver] = useState(false);
  const set = (k,v) => setLs(p=>({...p,[k]:v}));

  const fld = (label, key, ph, type, full) => (
    <div style={{gridColumn:full?'1 / -1':'auto'}}>
      <div style={{fontSize:'10px',color:'#888',marginBottom:'2px'}}>{label}</div>
      <input type={type||'text'} value={ls[key]||''} placeholder={ph||''}
        onChange={e=>set(key,e.target.value)}
        style={{width:'100%',fontSize:'12px',padding:'5px 8px',border:'1px solid #e0dcd4'}} />
    </div>
  );

  const handlePhoto = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => set('photo', ev.target.result);
    r.readAsDataURL(f);
  };

  const handleSave = async () => {
    if (!ls.buildingName.trim()) { alert('건물명을 입력하세요'); return; }
    setBusy(true);
    try { await dbUpsert(ls); onSave(ls); }
    catch(e) { alert('저장 실패: '+e.message); }
    finally { setBusy(false); }
  };

  const handleParsed = (parsed) => {
    setLs(prev => ({
      ...prev,
      buildingName: parsed.buildingName || prev.buildingName,
      address:      parsed.address      || prev.address,
      floor:        parsed.floor        || prev.floor,
      totalFloor:   parsed.totalFloor   || prev.totalFloor,
      exclusivePy:  parsed.exclusivePy  || prev.exclusivePy,
      contractPy:   parsed.contractPy   || prev.contractPy,
      deposit:      parsed.deposit      || prev.deposit,
      rent:         parsed.rent         || prev.rent,
      mgmtFee:      parsed.mgmtFee      || prev.mgmtFee,
      parking:      parsed.parking      || prev.parking,
      elevator:     parsed.elevator     || prev.elevator,
      moveIn:       parsed.moveIn       || prev.moveIn,
      useAprDate:   parsed.useAprDate   || prev.useAprDate,
      notes:        parsed.notes        || prev.notes,
    }));
    setShowNaver(false);
  };

  return (
    <>
      {showNaver && <NaverParseModal onParsed={handleParsed} onClose={() => setShowNaver(false)} />}

      <div style={{position:'fixed',inset:0,background:'rgba(13,27,42,0.75)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}>
        <div style={{background:'white',width:'100%',maxWidth:'680px',maxHeight:'90vh',overflowY:'auto',padding:'24px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px',borderBottom:'2px solid #0d1b2a',paddingBottom:'10px'}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'20px',fontWeight:600,color:'#0d1b2a'}}>
              {init ? '매물 수정' : '새 매물 등록'}
            </div>
            <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:'18px',color:'#888'}}>×</button>
          </div>

          {/* 네이버 자동입력 배너 */}
          <div style={{marginBottom:'18px',padding:'12px 14px',background:'#f0f6ff',border:'1px solid #b8d0f5',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px'}}>
            <div>
              <div style={{fontSize:'12px',fontWeight:600,color:'#1a3a6e',marginBottom:'2px'}}>📋 네이버 매물 텍스트로 자동 입력</div>
              <div style={{fontSize:'11px',color:'#5a7aaa'}}>네이버 부동산 매물 페이지 텍스트를 붙여넣으면 AI가 자동으로 필드를 채워드립니다</div>
            </div>
            <button onClick={() => setShowNaver(true)}
              style={{flexShrink:0,padding:'7px 16px',background:'#1a3a6e',color:'white',border:'none',cursor:'pointer',fontSize:'12px',fontFamily:'inherit',fontWeight:600,whiteSpace:'nowrap'}}>
              ✨ 자동 입력
            </button>
          </div>

          <div style={{fontSize:'11px',fontWeight:600,color:'#c9a84c',letterSpacing:'.1em',marginBottom:'8px'}}>기본 정보</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'16px'}}>
            {fld('건물명 *',            'buildingName', '예) 반포 파인빌딩')}
            {fld('별칭 (카드·비교표용)', 'alias',        '예) 반포파인 301호')}
            {fld('주소', 'address', '서울특별시 서초구...', 'text', true)}
            {fld('층 (해당층)', 'floor', '예) 3')}
            {fld('총층',       'totalFloor', '예) 6')}
            {fld('주차',     'parking',  '예) 전용 2대')}
            {fld('승강기',   'elevator', '예) 2대')}
          </div>

          <div style={{fontSize:'11px',fontWeight:600,color:'#c9a84c',letterSpacing:'.1em',marginBottom:'8px'}}>면적</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'16px'}}>
            <AreaInput label="전용면적" pyKey="exclusivePy" ls={ls} set={set} />
            <AreaInput label="계약면적" pyKey="contractPy"  ls={ls} set={set} />
          </div>

          <div style={{fontSize:'11px',fontWeight:600,color:'#c9a84c',letterSpacing:'.1em',marginBottom:'8px'}}>임대 조건 (만원)</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px',marginBottom:'16px'}}>
            {fld('보증금',    'deposit',  '예) 50000')}
            {fld('임대료/월', 'rent',     '예) 1200')}
            {fld('관리비/월', 'mgmtFee',  '예) 200')}
          </div>

          <div style={{fontSize:'11px',fontWeight:600,color:'#c9a84c',letterSpacing:'.1em',marginBottom:'8px'}}>일정</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'16px'}}>
            {fld('입주일정',   'moveIn',     '예) 2026-08-01 또는 즉시 입주')}
            {fld('사용승인일', 'useAprDate', '예) 2010-03-15')}
          </div>

          <div style={{fontSize:'11px',fontWeight:600,color:'#c9a84c',letterSpacing:'.1em',marginBottom:'8px'}}>
            추가 항목 <span style={{fontWeight:400,color:'#aaa',fontSize:'10px'}}>(입력 시에만 리포트에 출력)</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'16px'}}>
            {fld('렌트프리', 'rentFree', '예) 3개월')}
            {fld('핏아웃',   'fitOut',   '예) 3개월 + 50만원/평 지원')}
          </div>

          <div style={{marginBottom:'16px'}}>
            <div style={{fontSize:'10px',color:'#888',marginBottom:'2px'}}>비고</div>
            <textarea value={ls.notes||''} rows={3} onChange={e=>set('notes',e.target.value)}
              placeholder="층별 특이사항, 인테리어 상태, 임대인 조건 등"
              style={{width:'100%',resize:'vertical',fontSize:'12px',padding:'6px 8px',border:'1px solid #e0dcd4'}} />
          </div>

          <div style={{marginBottom:'20px'}}>
            <div style={{fontSize:'10px',color:'#888',marginBottom:'6px'}}>건물 사진 (1장)</div>
            <div style={{display:'flex',gap:'10px',alignItems:'flex-start'}}>
              {ls.photo ? (
                <div style={{position:'relative',flexShrink:0}}>
                  <img src={ls.photo} style={{width:'120px',height:'80px',objectFit:'cover',border:'1px solid #e0dcd4',display:'block'}} />
                  <button onClick={()=>set('photo',null)}
                    style={{position:'absolute',top:'2px',right:'2px',background:'rgba(0,0,0,0.6)',color:'white',border:'none',cursor:'pointer',fontSize:'11px',padding:'1px 5px'}}>×</button>
                </div>
              ) : (
                <label style={{width:'120px',height:'80px',border:'2px dashed #e0dcd4',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',background:'#fafaf8',flexShrink:0}}>
                  <span style={{fontSize:'10px',color:'#aaa'}}>📷 업로드</span>
                  <input type="file" accept="image/*" style={{display:'none'}} onChange={handlePhoto} />
                </label>
              )}
            </div>
          </div>

          <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
            <button onClick={onClose}
              style={{padding:'7px 16px',background:'white',border:'1px solid #ccc',cursor:'pointer',fontSize:'12px',fontFamily:'inherit'}}>취소</button>
            <button onClick={handleSave} disabled={busy}
              style={{padding:'7px 20px',background:busy?'#888':'#c9a84c',color:'white',border:'none',cursor:busy?'not-allowed':'pointer',fontSize:'12px',fontFamily:'inherit'}}>
              {busy ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ── 매물 카드 (v1.2.8 레이아웃 개선) ──
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function LCard({ ls, onEdit, onDelete, onToggle }) {
  const noc = ls.exclusivePy && (n(ls.rent)||n(ls.mgmtFee))
    ? Math.round((n(ls.rent)+n(ls.mgmtFee))/n(ls.exclusivePy)) : null;
  const totMon = n(ls.rent)+n(ls.mgmtFee);

  return (
    <div className="pci" style={{background:'white',border:'1px solid #e0dcd4',position:'relative',overflow:'hidden',display:'flex',flexDirection:'column'}}>
      <div style={{position:'absolute',left:0,top:0,bottom:0,width:'3px',background:ls.printSel?'#c9a84c':'#e0dcd4'}} />

      <div style={{padding:'14px 14px 10px 16px',flex:1}}>

        {/* ── 헤더 ── */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'18px',fontWeight:700,color:'#0d1b2a',lineHeight:1.2,marginBottom:'3px'}}>
              {ls.buildingName||'(건물명 없음)'}
            </div>
            {ls.floor && (
              <div style={{fontSize:'13px',color:'#c9a84c',fontWeight:700,marginBottom:'2px'}}>
                {ls.floor}층{ls.totalFloor ? ' / 총 '+ls.totalFloor+'층' : ''}
              </div>
            )}
            {ls.address && <div style={{fontSize:'11px',color:'#888',lineHeight:1.4}}>{ls.address}</div>}
          </div>
          <input type="checkbox" checked={ls.printSel} onChange={onToggle}
            title="출력 선택" style={{cursor:'pointer',marginLeft:'8px',flexShrink:0,width:'16px',height:'16px'}} />
        </div>

        {/* ── 사진 ── */}
        {ls.photo && (
          <img src={ls.photo} style={{width:'100%',height:'120px',objectFit:'cover',display:'block',marginBottom:'10px',borderRadius:'1px'}} />
        )}

        {/* ── 면적 ── */}
        {(ls.exclusivePy||ls.contractPy) && (
          <div style={{display:'flex',gap:'0',marginBottom:'10px',background:'#f7f4ef',borderRadius:'2px'}}>
            {ls.exclusivePy && (
              <div style={{flex:1,padding:'8px 10px',borderRight:ls.contractPy?'1px solid #ede9e1':'none'}}>
                <div style={{fontSize:'10px',color:'#aaa',marginBottom:'2px',letterSpacing:'.05em'}}>전 용</div>
                <div style={{fontSize:'17px',fontWeight:700,color:'#0d1b2a',lineHeight:1}}>
                  {ls.exclusivePy}<span style={{fontSize:'11px',fontWeight:400,color:'#888',marginLeft:'2px'}}>평</span>
                </div>
                <div style={{fontSize:'11px',color:'#aaa',marginTop:'2px'}}>{py2m(ls.exclusivePy)} ㎡</div>
              </div>
            )}
            {ls.contractPy && (
              <div style={{flex:1,padding:'8px 10px'}}>
                <div style={{fontSize:'10px',color:'#aaa',marginBottom:'2px',letterSpacing:'.05em'}}>계 약</div>
                <div style={{fontSize:'17px',fontWeight:700,color:'#0d1b2a',lineHeight:1}}>
                  {ls.contractPy}<span style={{fontSize:'11px',fontWeight:400,color:'#888',marginLeft:'2px'}}>평</span>
                </div>
                <div style={{fontSize:'11px',color:'#aaa',marginTop:'2px'}}>{py2m(ls.contractPy)} ㎡</div>
              </div>
            )}
          </div>
        )}

        {/* ── 임대 조건 ── */}
        <div style={{marginBottom:'8px'}}>
          {ls.deposit && (
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'3px 0',borderBottom:'1px solid #f5f2eb'}}>
              <span style={{fontSize:'12px',color:'#888'}}>보증금</span>
              <span style={{fontSize:'13px',fontWeight:600,color:'#0d1b2a'}}>{fmt(ls.deposit)}</span>
            </div>
          )}
          {ls.rent && (
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'3px 0',borderBottom:'1px solid #f5f2eb'}}>
              <span style={{fontSize:'12px',color:'#888'}}>임대료/월</span>
              <span style={{fontSize:'13px',fontWeight:600,color:'#0d1b2a'}}>{fmt(ls.rent)}</span>
            </div>
          )}
          {ls.mgmtFee && (
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'3px 0',borderBottom:'1px solid #f5f2eb'}}>
              <span style={{fontSize:'12px',color:'#888'}}>관리비/월</span>
              <span style={{fontSize:'12px',fontWeight:500,color:'#555'}}>{fmt(ls.mgmtFee)}</span>
            </div>
          )}
          {totMon > 0 && (
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0 2px'}}>
              <span style={{fontSize:'13px',fontWeight:700,color:'#0d1b2a'}}>월 합계</span>
              <span style={{fontSize:'15px',fontWeight:700,color:'#0d1b2a'}}>{fmt(totMon)}</span>
            </div>
          )}
        </div>

        {/* ── NOC ── */}
        {noc && (
          <div style={{background:'#fff3dc',padding:'5px 10px',marginBottom:'8px',display:'flex',justifyContent:'space-between',alignItems:'center',borderRadius:'2px'}}>
            <span style={{fontSize:'11px',color:'#a05800'}}>NOC / 전용평</span>
            <span style={{fontWeight:700,color:'#a05800',fontSize:'13px'}}>{noc.toLocaleString()}만원</span>
          </div>
        )}

        {/* ── 기타 정보 ── */}
        {(ls.parking||ls.elevator||ls.moveIn||ls.useAprDate||ls.rentFree||ls.fitOut) && (
          <div style={{fontSize:'11px',lineHeight:1.9,borderTop:'1px solid #f0ede6',paddingTop:'8px'}}>
            {ls.parking    && <div><span style={{color:'#aaa'}}>주차</span> <span style={{color:'#444'}}>{ls.parking}</span></div>}
            {ls.elevator   && <div><span style={{color:'#aaa'}}>승강기</span> <span style={{color:'#444'}}>{ls.elevator}</span></div>}
            {ls.moveIn     && <div><span style={{color:'#aaa'}}>입주</span> <span style={{color:'#444'}}>{ls.moveIn}</span></div>}
            {ls.useAprDate && <div><span style={{color:'#aaa'}}>사용승인</span> <span style={{color:'#444'}}>{ls.useAprDate}</span></div>}
            {ls.rentFree   && <div><span style={{color:'#aaa'}}>렌트프리</span> <span style={{color:'#2471a3',fontWeight:600}}>{ls.rentFree}</span></div>}
            {ls.fitOut     && <div><span style={{color:'#aaa'}}>핏아웃</span> <span style={{color:'#2471a3',fontWeight:600}}>{ls.fitOut}</span></div>}
          </div>
        )}
      </div>

      <div style={{borderTop:'1px solid #f0ede6',padding:'7px 14px',display:'flex',gap:'6px',justifyContent:'flex-end',background:'#fafaf8'}}>
        <button onClick={onEdit}
          style={{fontSize:'11px',padding:'4px 12px',background:'none',border:'1px solid #c9a84c',color:'#c9a84c',cursor:'pointer'}}>편집</button>
        <button onClick={onDelete}
          style={{fontSize:'11px',padding:'4px 12px',background:'none',border:'1px solid #ddd',color:'#888',cursor:'pointer'}}>삭제</button>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ── 비교표 v1.2.8 (B안 미니멀 + 세부 조정) ──
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function LCompare({ listings, reportTitle, reportDate, bizName, bizAddr, agentName, agentPhone, logoSrc }) {
  const sel = listings.filter(l=>l.printSel);
  if (!sel.length) return (
    <div style={{textAlign:'center',padding:'60px',color:'#aaa'}}>비교할 매물을 목록에서 선택(체크)하세요</div>
  );

  const CHUNK = 4;
  const chunks = [];
  for (let i=0; i<sel.length; i+=CHUNK) chunks.push(sel.slice(i,i+CHUNK));

  // ── 안1 스타일 v1.2.8 (골드 상단선 섹션, 인라인 단가) ──
  const labelColW = '80pt';
  const dataColW  = '130pt';
  const BD = '0.5pt solid #e8e4dc';
  const BD_HD = '2.5pt solid #c9a84c';
  const BD_SEC = '1.5pt solid #c9a84c';

  // 컬럼 헤더 — 흰 배경, 골드 하단선
  const thS = {
    background:'white', padding:'9pt 8pt 7pt',
    borderLeft:BD, borderRight:BD, borderTop:'none', borderBottom:BD_HD,
    verticalAlign:'bottom', textAlign:'center',
  };
  const thEmptyS = {background:'white', borderBottom:BD_HD, borderLeft:'none', borderRight:BD, borderTop:'none', padding:'0'};
  // 라벨 셀
  const plS = {
    background:'#fafaf8', padding:'4.5pt 6pt', color:'#666', fontWeight:600,
    border:BD, fontSize:'7.5pt', textAlign:'center',
    letterSpacing:'.05em', whiteSpace:'nowrap', verticalAlign:'middle',
  };
  const plShi = {
    background:'#fff8f0', padding:'5pt 6pt', color:'#8a4800', fontWeight:700,
    border:BD, fontSize:'8pt', textAlign:'center',
    letterSpacing:'.05em', whiteSpace:'nowrap', verticalAlign:'middle',
  };
  // 주소 행 — 베이지
  const addrLabelS = {
    background:'#f0ece2', padding:'4pt 6pt', color:'#6b4f2a', fontWeight:700,
    border:BD, fontSize:'7pt', textAlign:'center', letterSpacing:'.1em', verticalAlign:'middle',
  };
  const addrDataS = {
    background:'#f5f0e8', padding:'4pt 8pt', color:'#5a4a2a',
    border:BD, fontSize:'7pt', textAlign:'center', lineHeight:1.5, verticalAlign:'middle',
  };
  // 섹션 — 라벨열만 텍스트, 골드 상단선 전체 공유
  const secLblS = {
    background:'white', padding:'4pt 6pt', color:'#b07c20', fontWeight:700,
    borderTop:BD_SEC, borderLeft:BD, borderRight:BD, borderBottom:BD,
    fontSize:'7pt', textAlign:'center', letterSpacing:'.18em', verticalAlign:'middle',
  };
  const secCellS = {
    background:'white',
    borderTop:BD_SEC, borderLeft:BD, borderRight:BD, borderBottom:BD,
    padding:'4pt 6pt',
  };
  // 데이터 셀
  const tdS = (s, hi) => ({
    padding: hi?'5pt 8pt':'4.5pt 8pt',
    border:BD, fontSize: hi?'9pt':'7.5pt', fontWeight:hi?700:400,
    textAlign:'center', verticalAlign:'middle',
    background: hi?'#fff8f0':(s?'#fafaf8':'white'),
    color: hi?'#8a4800':'#1a1a1a',
    letterSpacing:'.02em',
  });

  return (
    <>
      {chunks.map((chunk, ci) => (
        <div key={ci} className="print-only"
          style={{pageBreakBefore:ci>0?'always':'auto',breakBefore:ci>0?'page':'auto'}}>

          {/* 타이틀 — 불필요한 굵은 선 제거, 가는 골드 라인으로 */}
          <div style={{borderBottom:'1pt solid #c9a84c',paddingBottom:'6pt',marginBottom:'10pt',display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
            <div>
              <div style={{fontSize:'7pt',letterSpacing:'.18em',color:'#c9a84c',marginBottom:'3pt'}}>TIMES REAL ESTATE · 타임즈부동산중개</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'22pt',fontWeight:600,lineHeight:1.1,color:'#0d1b2a'}}>{reportTitle||'임대 매물 비교표'}</div>
            </div>
            <div style={{textAlign:'right',fontSize:'8pt',color:'#aaa'}}>
              {reportDate}&nbsp;·&nbsp;총 {sel.length}건
              {chunks.length>1 && <span>&nbsp;·&nbsp;{ci+1}/{chunks.length} 페이지</span>}
            </div>
          </div>

          <table style={{borderCollapse:'collapse',tableLayout:'fixed',width:(parseInt(labelColW)+chunk.length*parseInt(dataColW))+'pt',maxWidth:'100%'}}>
            <colgroup>
              <col style={{width:labelColW}} />
              {chunk.map(l=><col key={l.id} style={{width:dataColW}} />)}
            </colgroup>
            <thead>
              {/* 건물명 행 — 흰 배경, 골드 하단 밑줄 */}
              <tr>
                <th style={thEmptyS}></th>
                {chunk.map(l=>(
                  <th key={l.id} style={thS}>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'12pt',fontWeight:700,color:'#0d1b2a',lineHeight:1.2,marginBottom:'4pt'}}>
                      {l.buildingName||'(이름없음)'}
                    </div>
                    {l.floor && (
                      <div style={{display:'inline-block',background:'rgba(201,168,76,0.15)',color:'#b07c20',fontSize:'7.5pt',fontWeight:700,padding:'1.5pt 8pt',border:'0.5pt solid #e0c87a',letterSpacing:'.04em'}}>
                        {l.floor}층{l.totalFloor?' / 총 '+l.totalFloor+'층':''}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
              {/* 주소 행 — A안 베이지 색상 */}
              {chunk.some(l=>l.address) && (
                <tr>
                  <td style={addrLabelS}>주소</td>
                  {chunk.map(l=>(
                    <td key={l.id} style={addrDataS}>{l.address || '—'}</td>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {(function(){
                var s = false;
                return CMP_COLS.map(function(col){
                  var hasVal = col.always || chunk.some(function(l){ var v=col.f(l); return v&&v!=='—'; });
                  if (!hasVal) return null;
                  s = !s;
                  return (
                    <React.Fragment key={col.l}>
                      {col.sec && (
                        <tr>
                          <td style={secLblS}>{col.sec.replace(/^[^\s]+\s/,'')}</td>
                          {chunk.map(function(l){ return <td key={l.id} style={secCellS}></td>; })}
                        </tr>
                      )}
                      <tr>
                        <td style={col.hi ? plShi : plS}>{col.l}</td>
                        {chunk.map(function(l){ return <td key={l.id} style={tdS(s,col.hi)}>{col.f(l)}</td>; })}
                      </tr>
                    </React.Fragment>
                  );
                });
              })()}
            </tbody>
          </table>

          {/* 하단 정보 */}
          <div style={{marginTop:'10pt',borderTop:'0.8pt solid #c9a84c',paddingTop:'5pt',fontSize:'7.5pt',color:'#555',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{display:'flex',alignItems:'center',gap:'6pt'}}>
              {logoSrc && <img src={logoSrc} style={{height:'16pt',objectFit:'contain'}} />}
              {bizName && <strong style={{color:'#0d1b2a'}}>{bizName}</strong>}
              {bizAddr && <span style={{color:'#777',marginLeft:'6pt'}}>{bizAddr}</span>}
            </span>
            <span>
              {agentName && <strong style={{color:'#0d1b2a',marginRight:'6pt'}}>{agentName}</strong>}
              {agentPhone && <span>{agentPhone}</span>}
            </span>
          </div>
        </div>
      ))}

      {/* ── 화면 미리보기 — B안 동일 스타일 ── */}
      <div className="screen-only" style={{overflowX:'auto'}}>
        <table style={{borderCollapse:'collapse',minWidth:'500px',fontSize:'12px',borderTop:'2px solid #c9a84c'}}>
          <thead>
            <tr>
              <th style={{background:'white',padding:'10px 12px',textAlign:'center',borderBottom:'3px solid #c9a84c',minWidth:'90px',borderRight:'0.5px solid #e8e4dc'}}></th>
              {sel.map(l=>(
                <th key={l.id} style={{background:'white',padding:'10px 14px',textAlign:'center',borderBottom:'3px solid #c9a84c',minWidth:'150px',borderRight:'0.5px solid #e8e4dc'}}>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'16px',fontWeight:700,color:'#0d1b2a',marginBottom:'4px'}}>{l.buildingName}</div>
                  {l.floor && <div style={{display:'inline-block',fontSize:'11px',color:'#b07c20',background:'rgba(201,168,76,0.12)',padding:'2px 10px',border:'0.5px solid #e0c87a',letterSpacing:'.04em'}}>{l.floor}층{l.totalFloor?' / 총 '+l.totalFloor+'층':''}</div>}
                </th>
              ))}
            </tr>
            {sel.some(l=>l.address) && (
              <tr>
                <td style={{background:'#f0ece2',padding:'5px 12px',textAlign:'center',fontSize:'11px',color:'#6b4f2a',fontWeight:700,letterSpacing:'.1em',borderRight:'0.5px solid #e8e4dc',borderBottom:'0.5px solid #e0dcd4'}}>주소</td>
                {sel.map(l=>(
                  <td key={l.id} style={{background:'#f5f0e8',padding:'5px 12px',textAlign:'center',fontSize:'11px',color:'#5a4a2a',borderRight:'0.5px solid #e8e4dc',borderBottom:'0.5px solid #e0dcd4'}}>{l.address||'—'}</td>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {(function(){
              var idx = 0;
              return CMP_COLS.map(function(col){
                var hasVal = col.always || sel.some(function(l){ var v=col.f(l); return v&&v!=='—'; });
                if (!hasVal) return null;
                idx++;
                return (
                  <React.Fragment key={col.l}>
                    {col.sec && (
                      <tr>
                        <td style={{background:'white',borderTop:'2px solid #c9a84c',borderBottom:'0.5px solid #eee',borderRight:'0.5px solid #eee',padding:'5px 12px',fontSize:'11px',fontWeight:700,color:'#b07c20',letterSpacing:'.16em',textAlign:'center'}}>
                          {col.sec.replace(/^[^\s]+\s/,'')}
                        </td>
                        {sel.map(function(l){ return <td key={l.id} style={{background:'white',borderTop:'2px solid #c9a84c',borderBottom:'0.5px solid #eee',borderRight:'0.5px solid #eee',padding:'5px'}}></td>; })}
                      </tr>
                    )}
                    <tr>
                      <td style={{padding:'6px 12px',background:col.hi?'#fff8f0':'#fafaf8',fontWeight:col.hi?700:600,fontSize:'12px',color:col.hi?'#8a4800':'#555',textAlign:'center',letterSpacing:'.06em',borderRight:'0.5px solid #e8e4dc',borderBottom:'0.5px solid #f0ede6'}}>{col.l}</td>
                      {sel.map(function(l){ return (
                        <td key={l.id} style={{padding:'6px 12px',textAlign:'center',borderRight:'0.5px solid #f0ede6',borderBottom:'0.5px solid #f0ede6',background:col.hi?'#fff8f0':(idx%2===0?'white':'#fafaf8'),fontWeight:col.hi?700:400,color:col.hi?'#8a4800':'#333',fontSize:col.hi?'14px':'12px',letterSpacing:'.02em'}}>
                          {col.f(l)}
                        </td>
                      ); })}
                    </tr>
                  </React.Fragment>
                );
              });
            })()}
          </tbody>
        </table>
      </div>
    </>
  );
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ── 리포트 카드 ──
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function LReportCard({ ls, reportTitle, reportDate, bizName, bizAddr, agentName, agentPhone, logoSrc, isFirst }) {
  const noc    = ls.exclusivePy && (n(ls.rent)||n(ls.mgmtFee))
                 ? Math.round((n(ls.rent)+n(ls.mgmtFee))/n(ls.exclusivePy)) : null;
  const totMon = n(ls.rent)+n(ls.mgmtFee);

  const hd = label => (
    <div style={{fontSize:'11px',fontWeight:600,color:'#0d1b2a',marginBottom:'6px',letterSpacing:'.05em',borderBottom:'1px solid #e0dcd4',paddingBottom:'4px'}}>{label}</div>
  );
  const row = (label, value, hi) => value ? (
    <tr>
      <td style={{padding:'3px 6px',background:hi?'#fff3dc':'#f5f2eb',color:hi?'#a05800':'#666',fontWeight:hi?700:500,width:'110px',borderBottom:'1px solid #eee',fontSize:'10px',whiteSpace:'nowrap'}}>{label}</td>
      <td style={{padding:'3px 8px',borderBottom:'1px solid #eee',color:'#1a1a2e',fontSize:hi?'14px':'12px',fontWeight:hi?700:400}}>{value}</td>
    </tr>
  ) : null;

  return (
    <div className="report-card" style={{background:'white',marginBottom:'24px',pageBreakBefore:isFirst?'auto':'always',breakBefore:isFirst?'auto':'page'}}>
      <div style={{background:'white',padding:'14px 20px 12px',borderBottom:'2.5px solid #0d1b2a'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <div style={{fontSize:'8px',letterSpacing:'.25em',color:'#c9a84c',marginBottom:'4px'}}>TIMES REAL ESTATE · 임대 매물 리포트</div>
            {reportTitle && <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'30px',fontWeight:700,color:'#0d1b2a',lineHeight:1.1,marginBottom:'4px'}}>{reportTitle}</div>}
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'18px',fontWeight:500,color:'#333',lineHeight:1.2}}>
              {ls.buildingName}{ls.floor ? ' '+floorLabel(ls) : ''}
            </div>
            {ls.address && <div style={{fontSize:'10px',color:'#888',marginTop:'4px'}}>{ls.address}</div>}
          </div>
          <div style={{textAlign:'right',fontSize:'11px',color:'#555',fontWeight:500,flexShrink:0,marginLeft:'12px'}}>{reportDate}</div>
        </div>
      </div>

      <div style={{padding:'22px 20px'}}>
        <div style={{display:'grid',gridTemplateColumns:'220px 1fr',gap:'24px',marginBottom:'14px',overflow:'hidden'}}>
          <div style={{display:'flex',flexDirection:'column'}}>
            <div aria-hidden="true" style={{visibility:'hidden',fontSize:'11px',fontWeight:600,paddingBottom:'4px',marginBottom:'6px',borderBottom:'1px solid transparent',letterSpacing:'.05em',flexShrink:0}}>X</div>
            <div style={{height:'155px',overflow:'hidden',background:'#f0ede6',border:'1px solid #e0dcd4',position:'relative',flexShrink:0}}>
              {ls.photo
                ? <img src={ls.photo} style={{width:'100%',height:'155px',objectFit:'cover',display:'block'}} />
                : <div className="print-only" style={{height:'155px',display:'flex',alignItems:'center',justifyContent:'center',color:'#ccc',fontSize:'11px'}}>사진 없음</div>
              }
            </div>
            {n(ls.deposit) > 0 && (
              <div style={{marginTop:'auto',paddingTop:'8px',flexShrink:0,WebkitPrintColorAdjust:'exact',printColorAdjust:'exact'}}>
                <div style={{padding:'7px 12px 8px',background:'#0d1b2a',borderLeft:'3px solid #c9a84c'}}>
                  <div style={{fontSize:'7px',color:'#c9a84c',letterSpacing:'.25em',fontWeight:600,marginBottom:'3px'}}>DEPOSIT</div>
                  <div style={{textAlign:'right',lineHeight:1}}>
                    <span style={{fontFamily:"'Noto Sans KR',Arial,sans-serif",fontSize:'20px',fontWeight:700,color:'white',letterSpacing:'-.02em'}}>{fmt(ls.deposit).replace('원','')}</span>
                    <span style={{fontSize:'11px',fontWeight:400,color:'#c9a84c',marginLeft:'3px'}}>원</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{overflow:'hidden',minWidth:0}}>
            {hd('📋 임대 조건')}
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <tbody>
                {row('전용면적', ls.exclusivePy ? ls.exclusivePy+'평 ('+(py2m(ls.exclusivePy)||'—')+'㎡)' : null)}
                {row('계약면적', ls.contractPy  ? ls.contractPy+'평 ('+(py2m(ls.contractPy)||'—')+'㎡)' : null)}
                {row('층',       ls.floor ? floorLabel(ls) : null)}
                {row('주차',     ls.parking    || null)}
                {row('승강기',   ls.elevator   || null)}
                {row('입주일정', ls.moveIn     || null)}
                {row('사용승인', ls.useAprDate || null)}
                {row('임대료/월',   ls.rent    ? fmt(ls.rent)    : null, true)}
                {row('관리비/월',   ls.mgmtFee ? fmt(ls.mgmtFee) : null)}
                {totMon > 0 && row('월 합계', fmt(totMon), true)}
              </tbody>
            </table>
          </div>
        </div>

        {(noc || ls.contractPy) && (
          <div style={{marginBottom:'14px'}}>
            {hd('💰 단가 분석')}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px'}}>
              {noc && <div style={{background:'#fff3dc',padding:'8px 10px',border:'1px solid #f0d47c'}}>
                <div style={{fontSize:'9px',color:'#a05800',marginBottom:'2px'}}>NOC (임대+관리/전용평)</div>
                <div style={{fontWeight:700,fontSize:'14px',color:'#a05800'}}>{noc.toLocaleString()}만원</div>
              </div>}
              {ls.rent && ls.contractPy && <div style={{background:'#f5f2eb',padding:'8px 10px'}}>
                <div style={{fontSize:'9px',color:'#888',marginBottom:'2px'}}>임대료/계약평</div>
                <div style={{fontWeight:700,color:'#0d1b2a'}}>{fmtPy(ls.rent,ls.contractPy)}</div>
              </div>}
              {ls.mgmtFee && ls.contractPy && <div style={{background:'#f5f2eb',padding:'8px 10px'}}>
                <div style={{fontSize:'9px',color:'#888',marginBottom:'2px'}}>관리비/계약평</div>
                <div style={{fontWeight:700,color:'#0d1b2a'}}>{fmtPy(ls.mgmtFee,ls.contractPy)}</div>
              </div>}
              {ls.deposit && ls.contractPy && <div style={{background:'#f5f2eb',padding:'8px 10px'}}>
                <div style={{fontSize:'9px',color:'#888',marginBottom:'2px'}}>보증금/계약평</div>
                <div style={{fontWeight:700,color:'#0d1b2a'}}>{fmtPy(ls.deposit,ls.contractPy)}</div>
              </div>}
            </div>
          </div>
        )}

        {(ls.rentFree || ls.fitOut) && (
          <div style={{marginBottom:'14px'}}>
            {hd('🎯 인센티브 조건')}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
              {ls.rentFree && <div style={{background:'#eaf4fb',padding:'8px 10px',border:'1px solid #aad4ed'}}>
                <div style={{fontSize:'9px',color:'#2471a3',marginBottom:'2px'}}>렌트프리</div>
                <div style={{fontWeight:700,color:'#2471a3',fontSize:'13px'}}>{ls.rentFree}</div>
              </div>}
              {ls.fitOut && <div style={{background:'#eaf4fb',padding:'8px 10px',border:'1px solid #aad4ed'}}>
                <div style={{fontSize:'9px',color:'#2471a3',marginBottom:'2px'}}>핏아웃</div>
                <div style={{fontWeight:700,color:'#2471a3',fontSize:'13px'}}>{ls.fitOut}</div>
              </div>}
            </div>
          </div>
        )}

        {ls.notes && (
          <div style={{marginBottom:'14px'}}>
            {hd('📝 비고')}
            <div style={{fontSize:'11px',color:'#1a1a2e',lineHeight:1.8,padding:'4px 0'}}>
              {ls.notes.split('\n').filter(l=>l.trim()).map((line,i)=>(
                <div key={i} style={{display:'flex',gap:'6px'}}>
                  <span style={{color:'#c9a84c',fontWeight:700,flexShrink:0}}>•</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="print-only" style={{margin:'4px 20px 14px',borderTop:'1pt solid #c9a84c',paddingTop:'5pt',fontSize:'7.5pt',color:'#555'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <tbody><tr style={{verticalAlign:'middle'}}>
            <td style={{verticalAlign:'middle'}}>
              {logoSrc && <img src={logoSrc} style={{height:'16pt',objectFit:'contain',marginRight:'6pt',verticalAlign:'middle'}} />}
              {bizName && <strong style={{color:'#0d1b2a'}}>{bizName}</strong>}
              {bizAddr && <span style={{color:'#777',marginLeft:'6pt'}}>{bizAddr}</span>}
            </td>
            {(agentName||agentPhone) && <td style={{textAlign:'right',whiteSpace:'nowrap',verticalAlign:'middle'}}>
              {agentName  && <strong style={{color:'#0d1b2a',marginRight:'4pt'}}>{agentName}</strong>}
              {agentPhone && <span>{agentPhone}</span>}
            </td>}
          </tr></tbody>
        </table>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ── 출력 정보 패널 ──
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function InfoPanel({ info, setInfo, onDisconnect }) {
  const [open, setOpen] = useState(false);
  const f = (k,v) => setInfo(p=>({...p,[k]:v}));
  const inp = (label, key, ph, type) => (
    <div>
      <div style={{fontSize:'10px',color:'#888',marginBottom:'2px'}}>{label}</div>
      <input value={info[key]||''} placeholder={ph} type={type||'text'} onChange={e=>f(key,e.target.value)}
        style={{width:'100%',fontSize:'11px',padding:'5px 7px',border:'1px solid #e0dcd4'}} />
    </div>
  );
  return (
    <div style={{borderTop:'1px solid #e0dcd4',marginTop:'8px',paddingTop:'8px'}}>
      <div onClick={()=>setOpen(!open)}
        style={{cursor:'pointer',fontSize:'11px',color:'#888',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span>{open?'▲':'▼'} 출력 정보 설정 (상호·담당자·로고)</span>
        <button onClick={e=>{e.stopPropagation();if(confirm('Supabase 연결을 해제하시겠습니까?'))onDisconnect();}}
          style={{fontSize:'10px',padding:'2px 8px',background:'none',border:'1px solid #ddd',color:'#888',cursor:'pointer'}}>연결 해제</button>
      </div>
      {open && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginTop:'10px'}}>
          {inp('상호',   'bizName',    '타임즈부동산중개')}
          {inp('주소',   'bizAddr',    '서울특별시 서초구 반포동 반포프라자')}
          {inp('담당자', 'agentName',  '성재윤')}
          {inp('연락처', 'agentPhone', '010-6655-5445')}
          <div style={{gridColumn:'1/-1'}}>
            <div style={{fontSize:'10px',color:'#888',marginBottom:'2px'}}>로고 이미지</div>
            <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
              {info.logoSrc && <img src={info.logoSrc} style={{height:'28px',objectFit:'contain',border:'1px solid #e0dcd4'}} />}
              <label style={{cursor:'pointer',fontSize:'11px',color:'#3a6fd8',border:'1px solid #b8ccff',padding:'4px 10px',background:'#f0f4ff'}}>
                로고 업로드
                <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{
                  const file=e.target.files[0]; if(!file) return;
                  const r=new FileReader(); r.onload=ev=>f('logoSrc',ev.target.result); r.readAsDataURL(file);
                }} />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ── 메인 앱 ──
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function App() {
  const [listings,  setListings]  = useState([]);
  const [view,      setView]      = useState('list');
  const [showForm,  setShowForm]  = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [dbReady,   setDbReady]   = useState(false);
  const [info,      setInfo]      = useState(() => ({
    bizName:'타임즈부동산중개', bizAddr:'서울특별시 서초구 반포동 반포프라자',
    agentName:'성재윤', agentPhone:'010-6655-5445', logoSrc:'',
    ...loadInfo()
  }));
  const [reportTitle, setRT] = useState('');
  const reportDate = new Date().toISOString().slice(0,10);

  useEffect(() => {
    const cred = localStorage.getItem(STO_CRED);
    if (cred) {
      try {
        const { url, key } = JSON.parse(cred);
        initSB(url, key);
        loadData();
      } catch(e) {}
    }
  }, []);

  useEffect(() => { saveInfo(info); }, [info]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await dbLoad();
      setListings(data);
      setDbReady(true);
    } catch(e) {
      alert('데이터 불러오기 실패: '+e.message);
    } finally { setLoading(false); }
  };

  const handleConnect    = () => { loadData(); };
  const handleDisconnect = () => {
    localStorage.removeItem(STO_CRED);
    _sb = null;
    setDbReady(false);
    setListings([]);
  };

  const onSave = ls => {
    setListings(p => {
      const idx = p.findIndex(x=>x.id===ls.id);
      return idx>=0 ? p.map(x=>x.id===ls.id?ls:x) : [...p, ls];
    });
    setShowForm(false); setEditing(null);
  };

  const onDelete = async (id, name) => {
    if (!confirm(name+' 매물을 삭제하시겠습니까?')) return;
    try {
      await dbDelete(id);
      setListings(p=>p.filter(x=>x.id!==id));
    } catch(e) { alert('삭제 실패: '+e.message); }
  };

  const onToggle = async (id) => {
    const updated = listings.map(x=>x.id===id?{...x,printSel:!x.printSel}:x);
    setListings(updated);
    const ls = updated.find(x=>x.id===id);
    if (ls) await dbUpsert(ls).catch(e=>console.warn(e));
  };

  const selCount = listings.filter(l=>l.printSel).length;

  if (!dbReady && !loading) {
    const cred = localStorage.getItem(STO_CRED);
    if (!cred) return <SBSetup onConnect={handleConnect} />;
  }

  const printCSS = view==='report'
    ? '@media print { @page { size:A4 portrait !important; margin:10mm 12mm 18mm; } .report-card { page-break-after:always; break-after:page; } }'
    : '@media print { @page { size:A4 landscape !important; margin:10mm 10mm 14mm; } .print-only { display:block !important; } }';

  const TABS = [
    {id:'list',    label:'📋 매물 목록'},
    {id:'compare', label:'≡ 비교표'},
    {id:'report',  label:'📄 리포트'},
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: printCSS}} />
      {showForm && (
        <ListingForm init={editing} onSave={onSave} onClose={()=>{setShowForm(false);setEditing(null);}} />
      )}

      <header className="no-print" style={{background:'#0d1b2a',padding:'12px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:'10px',letterSpacing:'.22em',color:'#c9a84c',marginBottom:'2px'}}>TIMES REAL ESTATE</div>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'22px',color:'white',fontWeight:500,lineHeight:1}}>
              임대 매물 관리
            </div>
            <span style={{fontSize:'12px',color:'#0d1b2a',background:'#c9a84c',padding:'2px 8px',fontWeight:700,letterSpacing:'.04em',borderRadius:'2px',fontFamily:'inherit'}}>
              {APP_VERSION}
            </span>
          </div>
        </div>
        <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
          {loading && <span style={{fontSize:'13px',color:'#c9a84c'}}>⏳ 동기화 중…</span>}
          {!loading && <span style={{fontSize:'13px',color:'#9aacbe'}}>☁ Supabase 연결됨 &nbsp;·&nbsp; 선택 {selCount}건</span>}
          {view!=='list' && <button onClick={()=>window.print()}
            style={{padding:'7px 16px',background:'#c9a84c',color:'white',border:'none',cursor:'pointer',fontSize:'13px',fontFamily:'inherit',fontWeight:600}}>🖨 인쇄</button>}
        </div>
      </header>

      <div className="no-print" style={{background:'#ede9e1',borderBottom:'1px solid #d8d4cc',padding:'0 24px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',maxWidth:'1200px',margin:'0 auto'}}>
          <div style={{display:'flex'}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setView(t.id)}
                style={{padding:'11px 20px',fontSize:'14px',border:'none',cursor:'pointer',background:'none',
                        borderBottom:view===t.id?'3px solid #c9a84c':'3px solid transparent',
                        color:view===t.id?'#0d1b2a':'#999',fontWeight:view===t.id?700:400,fontFamily:'inherit'}}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{display:'flex',gap:'8px',alignItems:'center',padding:'8px 0'}}>
            {view!=='list' && (
              <input value={reportTitle} onChange={e=>setRT(e.target.value)}
                placeholder="보고서 제목 (고객명)"
                style={{fontSize:'14px',padding:'6px 12px',border:'1px solid #ccc8c0',width:'220px'}} />
            )}
            {view==='list' && (
              <>
                <button onClick={()=>setListings(p=>p.map(x=>({...x,printSel:true})))}
                  style={{padding:'6px 14px',fontSize:'13px',background:'white',border:'1px solid #bbb',cursor:'pointer',fontFamily:'inherit'}}>전체 선택</button>
                <button onClick={()=>setListings(p=>p.map(x=>({...x,printSel:false})))}
                  style={{padding:'6px 14px',fontSize:'13px',background:'white',border:'1px solid #bbb',cursor:'pointer',fontFamily:'inherit'}}>선택 해제</button>
                <button onClick={()=>{setEditing(blank());setShowForm(true);}}
                  style={{padding:'7px 18px',background:'#c9a84c',color:'white',border:'none',cursor:'pointer',fontSize:'14px',fontFamily:'inherit',fontWeight:600}}>+ 새 매물 등록</button>
              </>
            )}
          </div>
        </div>
      </div>

      <main className="print-main" style={{padding:'16px 24px 60px',maxWidth:'1200px',margin:'0 auto'}}>
        {loading && (
          <div style={{textAlign:'center',padding:'60px',color:'#c9a84c'}}>
            <div style={{fontSize:'24px',marginBottom:'8px'}}>☁</div>
            <div style={{fontSize:'12px'}}>Supabase에서 데이터를 불러오는 중…</div>
          </div>
        )}

        {!loading && view==='list' && (
          <>
            {listings.length===0 ? (
              <div style={{textAlign:'center',padding:'80px 0',color:'#bbb'}}>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'24px',marginBottom:'10px',color:'#c9a84c'}}>등록된 매물이 없습니다</div>
                <div style={{fontSize:'12px',marginBottom:'20px'}}>+ 새 매물 등록 버튼을 눌러 매물을 추가하세요</div>
                <button onClick={()=>{setEditing(blank());setShowForm(true);}}
                  style={{padding:'10px 24px',background:'#c9a84c',color:'white',border:'none',cursor:'pointer',fontSize:'13px',fontFamily:'inherit'}}>+ 첫 매물 등록</button>
              </div>
            ) : (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))',gap:'16px'}}>
                {listings.map(ls=>(
                  <LCard key={ls.id} ls={ls}
                    onEdit={()=>{setEditing(ls);setShowForm(true);}}
                    onDelete={()=>onDelete(ls.id, ls.buildingName)}
                    onToggle={()=>onToggle(ls.id)} />
                ))}
              </div>
            )}
            <div className="no-print" style={{background:'white',border:'1px solid #e0dcd4',padding:'16px 20px',marginTop:'20px'}}>
              <InfoPanel info={info} setInfo={setInfo} onDisconnect={handleDisconnect} />
            </div>
          </>
        )}

        {!loading && view==='compare' && (
          <LCompare listings={listings} reportTitle={reportTitle||'임대 매물 비교표'} reportDate={reportDate}
            bizName={info.bizName} bizAddr={info.bizAddr} agentName={info.agentName} agentPhone={info.agentPhone} logoSrc={info.logoSrc} />
        )}

        {!loading && view==='report' && (
          <div>
            {listings.filter(l=>l.printSel).length===0
              ? <div style={{textAlign:'center',padding:'60px',color:'#aaa'}}>리포트 출력할 매물을 목록에서 선택(체크)하세요</div>
              : listings.filter(l=>l.printSel).map((l,i)=>(
                  <LReportCard key={l.id} ls={l} isFirst={i===0}
                    reportTitle={reportTitle} reportDate={reportDate}
                    bizName={info.bizName} bizAddr={info.bizAddr}
                    agentName={info.agentName} agentPhone={info.agentPhone} logoSrc={info.logoSrc} />
                ))}
          </div>
        )}
      </main>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
