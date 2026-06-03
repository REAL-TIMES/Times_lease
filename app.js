// ── TIMES 임대 매물 관리 v1.8.0 (Supabase + 네이버 자동입력) ──
const APP_VERSION = 'v1.8.2';

const { useState, useEffect, useCallback, useRef } = React;

// ── 상수 ──
const PY  = 3.30579;
const STO_CRED  = 'times-lease-sb';
const STO_INFO  = 'times-lease-info';
const STO_CACHE = 'times-lease-cache';
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
  const { data, error } = await getSB().rpc('get_listings_no_photo');
  if (error) {
    const { data: d2, error: e2 } = await getSB()
      .from(TBL).select('id, data, updated_at')
      .order('updated_at', {ascending:true}).limit(200);
    if (e2) throw e2;
    return d2.map(r => {
      var d = Object.assign({}, r.data || {});
      delete d.photo;
      return d;
    });
  }
  return data.map(r => Object.assign({}, r.listing_data || {}));
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
  buildingName:'', alias:'', address:'', floor:'', totalFloor:'', sortOrder:0,
  exclusivePy:'', contractPy:'',
  deposit:'', rent:'', mgmtFee:'',
  parking:'', elevator:'', moveIn:'', useAprDate:'',
  rentFree:'', fitOut:'', notes:'',
  photo:null, printSel:true,
});
const loadInfo = () => { try { return JSON.parse(localStorage.getItem(STO_INFO)||'{}'); } catch { return {}; } };
const saveInfo = obj => localStorage.setItem(STO_INFO, JSON.stringify(obj));
const floorLabel = ls => ls.floor + '층' + (ls.totalFloor ? ' / 총 ' + ls.totalFloor + '층' : '');
const shortAddr = addr => {
  if (!addr) return '—';
  var parts = addr.split(' ');
  for (var i = 0; i < parts.length; i++) {
    if (/[동읍면리가로길]\d*$/.test(parts[i]) || /^\d/.test(parts[i])) {
      return parts.slice(i).join(' ');
    }
  }
  return addr;
};

// ── 비교표 컬럼 v1.8.0 ──
const CMP_COLS = [
  { l:'전용면적', sec:'면  적', f:ls => ls.exclusivePy ? ls.exclusivePy+'평' : '—' },
  { l:'계약면적',              f:ls => ls.contractPy   ? ls.contractPy+'평'  : '—' },
  { l:'보증금',   sec:'조  건', f:ls => fmt(ls.deposit) },
  { l:'임대료/월', disp:<>임대료/월{<span style={{fontSize:'5pt',color:'#aaa',fontWeight:400,display:'block',letterSpacing:'.01em',lineHeight:1.4}}>부가세 별도</span>}</>, f:ls => fmt(ls.rent) },
  { l:'관리비/월', disp:<>관리비/월{<span style={{fontSize:'5pt',color:'#aaa',fontWeight:400,display:'block',letterSpacing:'.01em',lineHeight:1.4}}>부가세 별도</span>}</>, f:ls => fmt(ls.mgmtFee) },
  { l:'월 합계',  hi:true, disp:<>월 합계{<span style={{fontSize:'5pt',color:'#aaa',fontWeight:400,display:'block',letterSpacing:'.01em',lineHeight:1.4}}>부가세 별도</span>}</>, f:ls => (n(ls.rent)||n(ls.mgmtFee)) ? fmt(n(ls.rent)+n(ls.mgmtFee)) : '—' },
  { l:'NOC전용평', disp:<>NOC<span style={{fontSize:'5.5pt',opacity:.75,letterSpacing:'.01em'}}>(전용평)</span></>, f:ls => ls.exclusivePy&&(n(ls.rent)||n(ls.mgmtFee))
                                  ? Math.round((n(ls.rent)+n(ls.mgmtFee))/n(ls.exclusivePy)).toLocaleString()+'만원' : '—' },
  { l:'주차',     sec:'정  보', f:ls => ls.parking    || '—' },
  { l:'승강기',   always:true,  f:ls => ls.elevator   || '—' },
  { l:'사용승인',              f:ls => ls.useAprDate || '—' },
  { l:'입주가능일',            f:ls => ls.moveIn     || '—' },
  { l:'렌트프리',              f:ls => ls.rentFree   || '—' },
  { l:'핏아웃',                f:ls => ls.fitOut     || '—' },
];

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
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ text: text.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'API 오류 ' + res.status);
      onParsed(data);
    } catch(e) { setErr('파싱 실패: ' + (e.message || String(e))); }
    finally { setBusy(false); }
  };
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(13,27,42,0.88)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}>
      <div style={{background:'white',width:'100%',maxWidth:'580px',padding:'24px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'16px',borderBottom:'2px solid #0d1b2a',paddingBottom:'12px'}}>
          <div>
            <div style={{fontSize:'8px',letterSpacing:'.2em',color:'#c9a84c',marginBottom:'4px'}}>NAVER LISTING IMPORT</div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'20px',fontWeight:600,color:'#0d1b2a'}}>네이버 매물 자동 입력</div>
            <div style={{fontSize:'11px',color:'#888',marginTop:'3px'}}>매물 페이지 텍스트를 붙여넣으면 AI가 자동으로 분석합니다</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#888'}}>×</button>
        </div>
        <div style={{background:'#f5f2eb',padding:'10px 12px',marginBottom:'14px',fontSize:'11px',color:'#666',lineHeight:1.8}}>
          <strong style={{color:'#0d1b2a',display:'block',marginBottom:'4px'}}>📋 사용 방법</strong>
          1. 네이버 부동산 매물 상세 페이지 열기<br/>
          2. <strong>Ctrl+A</strong> → <strong>Ctrl+C</strong> (전체 복사)<br/>
          3. 아래 박스에 <strong>Ctrl+V</strong> (붙여넣기)<br/>
          4. <strong>자동 입력</strong> 클릭 → 건물명·주소 직접 확인
        </div>
        <textarea value={text} onChange={e=>setText(e.target.value)}
          placeholder="네이버 부동산 매물 텍스트를 여기에 붙여넣으세요" rows={10}
          style={{width:'100%',fontSize:'12px',padding:'10px',border:'1px solid #e0dcd4',resize:'vertical',fontFamily:'inherit',lineHeight:1.7,boxSizing:'border-box'}} />
        {err && <div style={{fontSize:'11px',color:'#c0392b',background:'#fff5f4',padding:'8px',marginTop:'8px'}}>{err}</div>}
        <div style={{fontSize:'10px',color:'#aaa',marginTop:'8px'}}>💡 건물명·주소는 파싱 후 직접 확인해 주세요.</div>
        <div style={{display:'flex',gap:'8px',justifyContent:'flex-end',marginTop:'14px'}}>
          <button onClick={onClose} style={{padding:'8px 18px',background:'white',border:'1px solid #ccc',cursor:'pointer',fontSize:'12px',fontFamily:'inherit'}}>취소</button>
          <button onClick={parse} disabled={busy}
            style={{padding:'8px 22px',background:busy?'#aaa':'#0d1b2a',color:'#c9a84c',border:'none',cursor:busy?'not-allowed':'pointer',fontSize:'12px',fontFamily:'inherit',fontWeight:600,minWidth:'110px'}}>
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
          <input value={key} onChange={e=>setKey(e.target.value)} placeholder="eyJ..."
            type="password"
            style={{width:'100%',fontSize:'12px',padding:'8px 10px',border:'1px solid #e0dcd4',outline:'none'}} />
          <div style={{fontSize:'10px',color:'#aaa',marginTop:'4px'}}>
            Supabase 대시보드 → Settings → API → anon public key
          </div>
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
  const [ls, setLs]       = useState(init || blank());
  const [busy, setBusy]   = useState(false);
  const [showNaver, setShowNaver] = useState(false);
  const set = (k,v) => setLs(p=>({...p,[k]:v}));
  const handleParsed = parsed => {
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

  const fld = (label, key, ph='', type='text', full=false) => (
    <div style={{gridColumn:full?'1 / -1':'auto'}}>
      <div style={{fontSize:'10px',color:'#888',marginBottom:'2px'}}>{label}</div>
      <input type={type} value={ls[key]||''} placeholder={ph}
        onChange={e=>set(key,e.target.value)}
        style={{width:'100%',fontSize:'12px',padding:'5px 8px',border:'1px solid #e0dcd4'}} />
    </div>
  );

  const handlePhoto = e => {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const MAX_W = 900, MAX_H = 675, QUALITY = 0.72;
        var w = img.width, h = img.height;
        if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }
        if (h > MAX_H) { w = Math.round(w * MAX_H / h); h = MAX_H; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', QUALITY);
        set('photo', compressed);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(f);
  };

  const handleSave = async () => {
    if (!ls.buildingName.trim()) { alert('건물명을 입력하세요'); return; }
    setBusy(true);
    try {
      await dbUpsert(ls);
      onSave(ls);
    } catch(e) {
      alert('저장 실패: '+e.message);
    } finally { setBusy(false); }
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(13,27,42,0.75)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}>
      <div style={{background:'white',width:'100%',maxWidth:'680px',maxHeight:'90vh',overflowY:'auto',padding:'24px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'18px',borderBottom:'2px solid #0d1b2a',paddingBottom:'10px'}}>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'20px',fontWeight:600,color:'#0d1b2a'}}>
            {init ? '매물 수정' : '새 매물 등록'}
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:'18px',color:'#888'}}>×</button>
        </div>

        {showNaver && <NaverParseModal onParsed={handleParsed} onClose={()=>setShowNaver(false)} />}
        <div style={{marginBottom:'18px',padding:'12px 14px',background:'#f0f6ff',border:'1px solid #b8d0f5',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px'}}>
          <div>
            <div style={{fontSize:'12px',fontWeight:600,color:'#1a3a6e',marginBottom:'2px'}}>📋 네이버 매물 텍스트로 자동 입력</div>
            <div style={{fontSize:'11px',color:'#5a7aaa'}}>네이버 텍스트 붙여넣기 → AI가 자동으로 채워드립니다</div>
          </div>
          <button onClick={()=>setShowNaver(true)}
            style={{flexShrink:0,padding:'7px 16px',background:'#1a3a6e',color:'white',border:'none',cursor:'pointer',fontSize:'12px',fontFamily:'inherit',fontWeight:600}}>
            ✨ 자동 입력
          </button>
        </div>
        <div style={{fontSize:'11px',fontWeight:600,color:'#c9a84c',letterSpacing:'.1em',marginBottom:'8px'}}>기본 정보</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'16px'}}>
          {fld('건물명 *',               'buildingName', '예) 반포 파인빌딩')}
          {fld('별칭 (카드·비교표용)',    'alias',        '예) 반포파인 301호')}
          {fld('주소',                   'address',      '서울특별시 서초구...', 'text', true)}
          {fld('층',                     'floor',        '예) 3')}
          {fld('총층',                   'totalFloor',   '예) 6')}
          {fld('전용면적 (평)',           'exclusivePy',  '예) 35.5')}
          {fld('계약면적 (평)',           'contractPy',   '예) 42.0')}
          {fld('주차',                   'parking',      '예) 전용 2대')}
          {fld('승강기',                 'elevator',     '예) 2대')}
        </div>

        <div style={{fontSize:'11px',fontWeight:600,color:'#c9a84c',letterSpacing:'.1em',marginBottom:'8px'}}>임대 조건 (만원)</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px',marginBottom:'16px'}}>
          {fld('보증금',    'deposit',  '예) 50000')}
          {fld('임대료/월', 'rent',     '예) 1200')}
          {fld('관리비/월', 'mgmtFee',  '예) 200')}
        </div>

        <div style={{fontSize:'11px',fontWeight:600,color:'#c9a84c',letterSpacing:'.1em',marginBottom:'8px'}}>일정</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'16px'}}>
          {fld('입주일정',   'moveIn',      '예) 2026-08-01 또는 즉시 입주')}
          {fld('사용승인일', 'useAprDate',  '예) 2010-03-15')}
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
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ── 매물 카드 ──
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function LCard({ ls, onEdit, onDelete, onToggle, onDragStart, onDragOver, onDrop, isDragging }) {
  const noc = ls.exclusivePy && (n(ls.rent)||n(ls.mgmtFee))
    ? Math.round((n(ls.rent)+n(ls.mgmtFee))/n(ls.exclusivePy)) : null;

  return (
    <div className="pci"
      draggable={true}
      onDragStart={onDragStart}
      onDragOver={e=>{e.preventDefault();onDragOver();}}
      onDrop={onDrop}
      style={{background:'white',border:'1px solid #e0dcd4',position:'relative',overflow:'hidden',
        opacity:isDragging?0.4:1,cursor:'grab',transition:'opacity .15s'}}>
      <div style={{position:'absolute',left:0,top:0,bottom:0,width:'3px',background:ls.printSel?'#c9a84c':'#e0dcd4'}} />
      <div style={{padding:'12px 12px 8px 15px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'16px',fontWeight:600,color:'#0d1b2a',lineHeight:1.2,marginBottom:'2px'}}>
              {ls.buildingName||'(건물명 없음)'}
            </div>
            {ls.floor && <div style={{fontSize:'11px',color:'#c9a84c',fontWeight:600}}>{ls.floor}층{ls.totalFloor?' / 총 '+ls.totalFloor+'층':''}</div>}
            {ls.address && <div style={{fontSize:'10px',color:'#888',marginTop:'2px',lineHeight:1.3}}>{ls.address}</div>}
          </div>
          <input type="checkbox" checked={ls.printSel} onChange={onToggle}
            title="출력 선택" style={{cursor:'pointer',marginLeft:'8px',flexShrink:0}} />
        </div>

        {(ls.photo||ls._photo) && <img src={ls.photo||ls._photo} style={{width:'100%',height:'100px',objectFit:'cover',display:'block',marginBottom:'8px'}} />}

        {(ls.exclusivePy||ls.contractPy) && (
          <div style={{display:'flex',gap:'12px',marginBottom:'8px',background:'#f7f4ef',padding:'6px 8px'}}>
            {ls.exclusivePy && <div>
              <div style={{fontSize:'9px',color:'#aaa'}}>전용</div>
              <div style={{fontSize:'14px',fontWeight:600,color:'#0d1b2a',lineHeight:1}}>
                {ls.exclusivePy}<span style={{fontSize:'10px',fontWeight:400}}>평</span>
              </div>
              <div style={{fontSize:'9px',color:'#aaa'}}>{py2m(ls.exclusivePy)}㎡</div>
            </div>}
            {ls.contractPy && <div>
              <div style={{fontSize:'9px',color:'#aaa'}}>계약</div>
              <div style={{fontSize:'14px',fontWeight:600,color:'#0d1b2a',lineHeight:1}}>
                {ls.contractPy}<span style={{fontSize:'10px',fontWeight:400}}>평</span>
              </div>
              <div style={{fontSize:'9px',color:'#aaa'}}>{py2m(ls.contractPy)}㎡</div>
            </div>}
          </div>
        )}

        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px',marginBottom:'6px'}}>
          <tbody>
            {ls.deposit && <tr>
              <td style={{padding:'2px 0',color:'#888',width:'56px'}}>보증금</td>
              <td style={{fontWeight:600,color:'#0d1b2a',textAlign:'right'}}>{fmt(ls.deposit)}</td>
            </tr>}
            {ls.rent && <tr>
              <td style={{padding:'2px 0',color:'#888'}}>임대료/월</td>
              <td style={{fontWeight:600,color:'#0d1b2a',textAlign:'right'}}>{fmt(ls.rent)}</td>
            </tr>}
            {ls.mgmtFee && <tr>
              <td style={{padding:'2px 0',color:'#888'}}>관리비/월</td>
              <td style={{fontWeight:600,color:'#555',textAlign:'right'}}>{fmt(ls.mgmtFee)}</td>
            </tr>}
            {(n(ls.rent)||n(ls.mgmtFee)) > 0 && <tr style={{borderTop:'1px solid #f0ede6'}}>
              <td style={{padding:'3px 0 2px',color:'#0d1b2a',fontWeight:700}}>월 합계</td>
              <td style={{fontWeight:700,color:'#0d1b2a',textAlign:'right'}}>{fmt(n(ls.rent)+n(ls.mgmtFee))}</td>
            </tr>}
          </tbody>
        </table>

        {noc && (
          <div style={{background:'#fff3dc',padding:'4px 8px',marginBottom:'6px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:'10px',color:'#a05800'}}>NOC /전용평</span>
            <span style={{fontWeight:700,color:'#a05800',fontSize:'12px'}}>{noc.toLocaleString()}만원</span>
          </div>
        )}

        <div style={{fontSize:'10px',color:'#888',lineHeight:1.7}}>
          {ls.parking  && <div>주차: {ls.parking}</div>}
          {ls.elevator && <div>승강기: {ls.elevator}</div>}
          {ls.moveIn   && <div>입주: {ls.moveIn}</div>}
          {ls.rentFree && <div style={{color:'#2471a3'}}>렌트프리: {ls.rentFree}</div>}
          {ls.fitOut   && <div style={{color:'#2471a3'}}>핏아웃: {ls.fitOut}</div>}
        </div>
      </div>

      <div style={{borderTop:'1px solid #f0ede6',padding:'6px 12px',display:'flex',gap:'6px',justifyContent:'flex-end',background:'#fafaf8'}}>
        <button onClick={onEdit}
          style={{fontSize:'10px',padding:'3px 10px',background:'none',border:'1px solid #c9a84c',color:'#c9a84c',cursor:'pointer'}}>편집</button>
        <button onClick={onDelete}
          style={{fontSize:'10px',padding:'3px 10px',background:'none',border:'1px solid #ddd',color:'#888',cursor:'pointer'}}>삭제</button>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ── 비교표 v1.8.0 ──
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function LCompare({ listings, reportTitle, reportDate, bizName, bizAddr, agentName, agentPhone, logoSrc }) {
  const sel = listings.filter(l=>l.printSel);
  if (!sel.length) return (
    <div style={{textAlign:'center',padding:'60px',color:'#aaa'}}>비교할 매물을 목록에서 선택(체크)하세요</div>
  );

  const CHUNK = 5;
  const chunks = [];
  for (let i=0; i<sel.length; i+=CHUNK) chunks.push(sel.slice(i,i+CHUNK));

  const labelColW = '78pt';
  const dataColW  = '118pt';
  const BD        = '0.5pt solid #e8e4dc';
  const BD_HD     = '2.5pt solid #c9a84c';
  const BD_SEC    = '1pt solid #ccc8c0';

  const thS = {
    background:'white', padding:'9pt 8pt 7pt',
    borderLeft:'none', borderRight:'none', borderTop:'none', borderBottom:BD_HD,
    verticalAlign:'bottom', textAlign:'center',
  };
  const thEmptyS = {background:'white', borderLeft:'none', borderTop:'none', borderRight:'none', borderBottom:BD_HD, padding:'0'};
  const plS = {
    background:'#fafaf8', padding:'4.5pt 6pt', color:'#555', fontWeight:600,
    borderTop:BD, borderBottom:BD, borderLeft:BD, borderRight:'none',
    fontSize:'7.5pt', textAlign:'center', letterSpacing:'.05em',
    whiteSpace:'nowrap', verticalAlign:'middle',
  };
  const plShi = {
    background:'#fff8f0', padding:'5pt 6pt', color:'#7a3800', fontWeight:700,
    borderTop:BD, borderBottom:BD, borderLeft:BD, borderRight:'none',
    fontSize:'8pt', textAlign:'center', letterSpacing:'.05em',
    whiteSpace:'nowrap', verticalAlign:'middle',
  };
  const addrLabelS = {
    background:'#f0ece2', padding:'4pt 6pt', color:'#6b4f2a', fontWeight:700,
    borderTop:BD, borderBottom:BD, borderLeft:BD, borderRight:'none',
    fontSize:'8.5pt', textAlign:'center', letterSpacing:'.1em', verticalAlign:'middle',
  };
  const addrDataS = {
    background:'#f5f0e8', padding:'4pt 8pt', color:'#5a4a2a',
    borderTop:BD, borderBottom:BD, borderLeft:BD, borderRight:'none',
    fontSize:'8.5pt', textAlign:'center', lineHeight:1.5, verticalAlign:'middle',
  };
  const secLblS = {
    background:'white', padding:'5pt 6pt', color:'#888', fontWeight:700,
    borderTop:BD_SEC, borderBottom:'none', borderLeft:'none', borderRight:'none',
    fontSize:'6.5pt', textAlign:'left', letterSpacing:'.2em', verticalAlign:'middle',
  };
  const secCellS = {
    background:'white',
    borderTop:BD_SEC, borderBottom:'none', borderLeft:'none', borderRight:'none',
    padding:'0',
  };
  const tdS = (s, hi, isLast) => ({
    padding: hi?'5pt 10pt':'4.5pt 10pt',
    borderTop:BD, borderBottom:BD, borderLeft:BD, borderRight:isLast?BD:'none',
    fontSize: hi?'9.5pt':'8.5pt', fontWeight: hi?700:500,
    textAlign:'center', verticalAlign:'middle',
    background: hi?'#fff8f0':(s?'#fafaf8':'white'),
    color: hi?'#7a3800':'#0d1b2a', letterSpacing:'.01em',
  });

  return (
    <>
      {chunks.map((chunk, ci) => (
        <div key={ci}
          style={{pageBreakBefore:ci>0?'always':'auto',breakBefore:ci>0?'page':'auto',marginBottom:'32px'}}>

          <div style={{borderBottom:'1pt solid #c9a84c',paddingBottom:'8pt',marginBottom:'12pt',display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
            <div>
              <div style={{fontSize:'7pt',letterSpacing:'.22em',color:'#c9a84c',marginBottom:'7pt'}}>TIMES REAL ESTATE</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'26pt',fontWeight:600,lineHeight:1.05,color:'#0d1b2a'}}>{reportTitle||'임대 매물 비교표'}</div>
            </div>
            <div style={{textAlign:'right',fontSize:'8pt',color:'#aaa',paddingBottom:'2pt'}}>
              {reportDate}&nbsp;·&nbsp;총 {sel.length}건
              {chunks.length>1 && <span>&nbsp;·&nbsp;{ci+1}/{chunks.length} 페이지</span>}
            </div>
          </div>

          <table style={{borderCollapse:'collapse',tableLayout:'fixed',width:chunk.length===CHUNK?'100%':(parseInt(labelColW)+chunk.length*parseInt(dataColW))+'pt',maxWidth:'100%'}}>
            <colgroup>
              <col style={{width:labelColW}} />
              {chunk.map(l=><col key={l.id} style={{width:dataColW}} />)}
            </colgroup>
            <thead>
              <tr>
                <th style={thEmptyS}></th>
                {chunk.map((l,li)=>(
                  <th key={l.id} style={thS}>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'12pt',fontWeight:700,color:'#0d1b2a',lineHeight:1.2,marginBottom:'3pt'}}>
                      {l.buildingName||'(이름없음)'}
                    </div>
                    {l.floor && (
                      <div style={{fontSize:'7.5pt',color:'#b07c20',fontWeight:600,letterSpacing:'.06em'}}>
                        {l.floor}층
                      </div>
                    )}
                  </th>
                ))}
              </tr>
              {chunk.some(l=>l.address) && (
                <tr>
                  <td style={addrLabelS}>주소</td>
                  {chunk.map((l,li)=>(
                    <td key={l.id} style={{...addrDataS,borderRight:li===chunk.length-1?BD:'none'}}>{shortAddr(l.address)}</td>
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
                          <td style={secLblS}>{col.sec}</td>
                          {chunk.map(function(l){ return <td key={l.id} style={secCellS}></td>; })}
                        </tr>
                      )}
                      <tr>
                        <td style={col.hi ? plShi : plS}>{col.disp || col.l}</td>
                        {chunk.map(function(l,li){ return <td key={l.id} style={tdS(s,col.hi,li===chunk.length-1)}>{col.f(l)}</td>; })}
                      </tr>
                    </React.Fragment>
                  );
                });
              })()}
            </tbody>
          </table>
          <div className="cmp-footer" style={{marginTop:'8pt',borderTop:'1pt solid #c9a84c',paddingTop:'5pt',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{display:'flex',alignItems:'center',gap:'8pt'}}>
              {logoSrc && <img src={logoSrc} style={{height:'20pt',objectFit:'contain'}} />}
              {bizName && <strong style={{color:'#0d1b2a',fontSize:'10pt',letterSpacing:'.02em'}}>{bizName}</strong>}
              {bizAddr && <span style={{color:'#888',fontSize:'8pt',marginLeft:'8pt'}}>{bizAddr}</span>}
            </span>
            <span style={{display:'flex',alignItems:'center',gap:'10pt'}}>
              {agentName  && <strong style={{color:'#0d1b2a',fontSize:'10pt',letterSpacing:'.02em'}}>{agentName}</strong>}
              {agentPhone && <span style={{color:'#555',fontSize:'9pt'}}>{agentPhone}</span>}
            </span>
          </div>
        </div>
      ))}

      <div className="no-print" style={{overflowX:'auto',marginTop:'24px'}}>
        <table style={{borderCollapse:'collapse',minWidth:'500px',fontSize:'12px',borderTop:'2px solid #c9a84c'}}>
          <thead>
            <tr>
              <th style={{background:'white',padding:'10px 12px',textAlign:'center',borderBottom:'3px solid #c9a84c',minWidth:'90px',borderRight:'0.5px solid #e8e4dc'}}></th>
              {sel.map(l=>(
                <th key={l.id} style={{background:'white',padding:'10px 14px',textAlign:'center',borderBottom:'3px solid #c9a84c',minWidth:'150px',borderRight:'0.5px solid #e8e4dc'}}>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'16px',fontWeight:700,color:'#0d1b2a',marginBottom:'4px'}}>{l.buildingName}</div>
                  {l.floor && <div style={{fontSize:'11px',color:'#b07c20',fontWeight:600,marginTop:'2px'}}>{l.floor}층</div>}
                </th>
              ))}
            </tr>
            {sel.some(l=>l.address) && (
              <tr>
                <td style={{background:'#f0ece2',padding:'5px 12px',textAlign:'center',fontSize:'12px',color:'#6b4f2a',fontWeight:700,letterSpacing:'.1em',borderRight:'0.5px solid #e8e4dc',borderBottom:'0.5px solid #e0dcd4'}}>주소</td>
                {sel.map(l=>(
                  <td key={l.id} style={{background:'#f5f0e8',padding:'5px 12px',textAlign:'center',fontSize:'13px',color:'#5a4a2a',borderRight:'0.5px solid #e8e4dc',borderBottom:'0.5px solid #e0dcd4'}}>{shortAddr(l.address)}</td>
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
                        <td colSpan={sel.length+1} style={{background:'white',borderTop:'1px solid #ccc8c0',borderBottom:'none',padding:'6px 12px',fontSize:'10px',fontWeight:700,color:'#999',letterSpacing:'.2em',textAlign:'left'}}>
                          {col.sec}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td style={{padding:'6px 12px',background:col.hi?'#fff8f0':'#fafaf8',fontWeight:col.hi?700:600,fontSize:'12px',color:col.hi?'#7a3800':'#555',textAlign:'center',letterSpacing:'.05em',borderBottom:'0.5px solid #f0ede6'}}>{col.l}</td>
                      {sel.map(function(l){ return (
                        <td key={l.id} style={{padding:'6px 12px',textAlign:'center',borderBottom:'0.5px solid #f0ede6',background:col.hi?'#fff8f0':(idx%2===0?'white':'#fafaf8'),fontWeight:col.hi?700:500,color:col.hi?'#7a3800':'#0d1b2a',fontSize:col.hi?'14px':'13px',letterSpacing:'.01em'}}>
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
function LReportCard({ ls, reportTitle, reportDate, bizName, bizAddr, agentName, agentPhone, logoSrc, kakaoKey, isFirst }) {
  const noc    = ls.exclusivePy && (n(ls.rent)||n(ls.mgmtFee))
                 ? Math.round((n(ls.rent)+n(ls.mgmtFee))/n(ls.exclusivePy)) : null;
  const totMon = n(ls.rent)+n(ls.mgmtFee);

  const hd = label => (
    <div style={{fontSize:'13px',fontWeight:600,color:'#0d1b2a',marginBottom:'8px',
      letterSpacing:'.04em',borderBottom:'1px solid #e0dcd4',paddingBottom:'5px'}}>{label}</div>
  );

  const row = (label, value, hi) => value ? (
    <tr>
      <td style={{
        padding:'5px 10px',
        background:hi?'#fff3dc':'#f5f2eb',
        color:hi?'#a05800':'#555',
        fontWeight:hi?700:600,
        width:'86px', minWidth:'80px',
        borderBottom:'1px solid #eee',
        fontSize:'12px',
        textAlign:'center',
        letterSpacing:'.02em',
        whiteSpace:'nowrap',
      }}>{label}</td>
      <td style={{
        padding:'5px 10px',
        borderBottom:'1px solid #eee',
        color: hi?'#a05800':'#0d1b2a',
        fontSize: hi?'15px':'13px',
        fontWeight: hi?700:400,
        textAlign:'center',
      }}>{value}</td>
    </tr>
  ) : null;

  const amtCard = (label, value, dark) => (
    <div style={{
      background: dark?'#0d1b2a':'#f5f2eb',
      padding:'10px 14px',
      borderLeft: dark?'3px solid #c9a84c':'3px solid #e0dcd4',
    }}>
      <div style={{fontSize:'9px',color: dark?'#c9a84c':'#888',letterSpacing:'.18em',marginBottom:'4px',fontWeight:600}}>{label}</div>
      <div style={{fontSize:'16px',fontWeight:700,color: dark?'white':'#0d1b2a',lineHeight:1,letterSpacing:'-.01em'}}>{value}</div>
    </div>
  );

  const floorDisp = ls.floor
    ? (ls.totalFloor ? ls.floor + ' / ' + ls.totalFloor + '층' : ls.floor + '층')
    : null;

  return (
    <div className="report-card" style={{background:'white',marginBottom:'24px',pageBreakBefore:isFirst?'auto':'always',breakBefore:isFirst?'auto':'page'}}>

      <div style={{background:'white',padding:'16px 20px 14px',borderBottom:'2.5px solid #0d1b2a'}}>
        <div style={{fontSize:'9px',letterSpacing:'.22em',color:'#c9a84c',marginBottom:'10px'}}>TIMES REAL ESTATE · 임대 매물 리포트</div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:'5px'}}>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'24px',fontWeight:600,color:'#0d1b2a',lineHeight:1.2}}>
            {ls.buildingName}
          </div>
          {reportTitle && (
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'26px',fontWeight:700,color:'#0d1b2a',lineHeight:1.1,textAlign:'right',marginLeft:'16px'}}>
              {reportTitle}
            </div>
          )}
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          {ls.address
            ? <div style={{fontSize:'10px',color:'#888'}}>{ls.address}</div>
            : <div></div>}
          <div style={{fontSize:'11px',color:'#888',fontWeight:400,flexShrink:0,marginLeft:'16px'}}>{reportDate}</div>
        </div>
      </div>

      <div style={{padding:'18px 20px 14px'}}>

        {hd('📋 임대 조건')}

        <div style={{display:'flex',gap:'20px',marginBottom:'12px',alignItems:'stretch'}}>

          <div style={{width:'260px',flexShrink:0,overflow:'hidden',background:'#f0ede6',border:'1px solid #e0dcd4',minHeight:'180px',display:'flex',alignItems:'stretch'}}>
            {(ls.photo||ls._photo)
              ? <img src={ls.photo||ls._photo} style={{width:'100%',objectFit:'cover',display:'block'}} />
              : (ls.address && kakaoKey)
                ? <KakaoMapView address={ls.address} kakaoKey={kakaoKey} />
                : <div style={{width:'100%',flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#f5f2eb',gap:'10px',padding:'20px 0'}}>
                    {logoSrc
                      ? <img src={logoSrc} style={{maxWidth:'70%',maxHeight:'60px',objectFit:'contain',opacity:.55}} />
                      : <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'13px',fontWeight:600,color:'#c9a84c',letterSpacing:'.22em',textAlign:'center',lineHeight:1.4}}><div>TIMES</div><div style={{fontSize:'10px',letterSpacing:'.25em',fontWeight:400}}>REAL ESTATE</div></div>
                    }
                    <div style={{fontSize:'8px',color:'#ccc',letterSpacing:'.15em',marginTop:'6px'}}>사진 준비 중</div>
                  </div>
            }
          </div>

          <div style={{flex:1,minWidth:0}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <tbody>
                {row('전용면적', ls.exclusivePy ? ls.exclusivePy+'평 ('+(py2m(ls.exclusivePy)||'—')+'㎡)' : null)}
                {row('계약면적', ls.contractPy  ? ls.contractPy+'평 ('+(py2m(ls.contractPy)||'—')+'㎡)' : null)}
                {row('층',       floorDisp)}
                {row('주차',     ls.parking    || null)}
                {row('승강기',   ls.elevator   || null)}
                {row('사용승인', ls.useAprDate || null)}
                {row('입주일정', ls.moveIn     || null)}
              </tbody>
            </table>
          </div>
        </div>

        {(ls.deposit || ls.rent || ls.mgmtFee) && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px',marginBottom:'14px',WebkitPrintColorAdjust:'exact',printColorAdjust:'exact'}}>
            {ls.deposit && amtCard('DEPOSIT / 보증금',   fmt(ls.deposit),   false)}
            {ls.rent    && amtCard('RENT / 임대료',      fmt(ls.rent),      false)}
            {ls.mgmtFee && amtCard('MGMT / 관리비',      fmt(ls.mgmtFee),   false)}
            {totMon > 0 && amtCard('TOTAL / 월 합계',    fmt(totMon),       true)}
          </div>
        )}

        {(ls.rent || ls.mgmtFee) && (
          <div style={{textAlign:'right',fontSize:'10px',color:'#aaa',letterSpacing:'.04em',marginTop:'-8px',marginBottom:'10px',fontWeight:400}}>
            임대료·관리비 부가세 별도
          </div>
        )}

        {(noc || ls.contractPy) && (
          <div style={{marginBottom:'14px'}}>
            {hd('💰 단가 분석')}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px'}}>
              {ls.deposit && ls.contractPy && <div style={{background:'#f5f2eb',padding:'8px 10px'}}>
                <div style={{fontSize:'9px',color:'#888',marginBottom:'2px'}}>보증금/계약평</div>
                <div style={{fontWeight:700,color:'#0d1b2a'}}>{fmtPy(ls.deposit,ls.contractPy)}</div>
              </div>}
              {ls.rent && ls.contractPy && <div style={{background:'#f5f2eb',padding:'8px 10px'}}>
                <div style={{fontSize:'9px',color:'#888',marginBottom:'2px'}}>임대료/계약평</div>
                <div style={{fontWeight:700,color:'#0d1b2a'}}>{fmtPy(ls.rent,ls.contractPy)}</div>
              </div>}
              {ls.mgmtFee && ls.contractPy && <div style={{background:'#f5f2eb',padding:'8px 10px'}}>
                <div style={{fontSize:'9px',color:'#888',marginBottom:'2px'}}>관리비/계약평</div>
                <div style={{fontWeight:700,color:'#0d1b2a'}}>{fmtPy(ls.mgmtFee,ls.contractPy)}</div>
              </div>}
              {noc && <div style={{background:'#fff3dc',padding:'8px 10px',border:'1px solid #f0d47c'}}>
                <div style={{fontSize:'9px',color:'#a05800',marginBottom:'2px'}}>NOC / 전용평</div>
                <div style={{fontWeight:700,fontSize:'14px',color:'#a05800'}}>{noc.toLocaleString()}만원</div>
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
            {hd('📝 부가설명')}
            <div style={{fontSize:'13px',color:'#1a1a2e',lineHeight:1.9,padding:'4px 0'}}>
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

      <div className="print-only" style={{margin:'8px 20px 16px',borderTop:'1pt solid #c9a84c',paddingTop:'7pt',fontSize:'9pt',color:'#444'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <tbody><tr style={{verticalAlign:'middle'}}>
            <td style={{verticalAlign:'middle'}}>
              {logoSrc && <img src={logoSrc} style={{height:'20pt',objectFit:'contain',marginRight:'8pt',verticalAlign:'middle'}} />}
              {bizName && <strong style={{color:'#0d1b2a',fontSize:'9.5pt'}}>{bizName}</strong>}
              {bizAddr && <span style={{color:'#777',marginLeft:'6pt'}}>{bizAddr}</span>}
            </td>
            {(agentName||agentPhone) && <td style={{textAlign:'right',whiteSpace:'nowrap',verticalAlign:'middle'}}>
              {agentName  && <strong style={{color:'#0d1b2a',marginRight:'6pt',fontSize:'9.5pt'}}>{agentName}</strong>}
              {agentPhone && <span>{agentPhone}</span>}
            </td>}
          </tr></tbody>
        </table>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ── 카카오맵 뷰 ──
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function KakaoMapView({ address, kakaoKey }) {
  var [tileInfo, setTileInfo] = useState(null);
  var [mapErr,   setMapErr]   = useState(false);

  useEffect(function() {
    if (!address || !kakaoKey) return;
    setTileInfo(null); setMapErr(false);
    fetch('/api/geocode?address=' + encodeURIComponent(address))
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (!d.lat || !d.lng) { setMapErr(true); return; }
        var lat = parseFloat(d.lat), lng = parseFloat(d.lng), z = 17;
        var nTiles = Math.pow(2, z);
        var tileX = (lng + 180) / 360 * nTiles;
        var sinLat = Math.sin(lat * Math.PI / 180);
        var tileY = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * nTiles;
        var tx = Math.floor(tileX);
        var ty = Math.floor(tileY);
        var px = Math.floor((tileX - tx) * 256);
        var py = Math.floor((tileY - ty) * 256);
        var tiles3 = [];
        for (var di = -1; di <= 1; di++) {
          for (var dj = -1; dj <= 1; dj++) {
            tiles3.push({
              url: 'https://tile.openstreetmap.org/'+z+'/'+(tx+di)+'/'+(ty+dj)+'.png',
              dx: di * 256,
              dy: dj * 256
            });
          }
        }
        setTileInfo({ tiles: tiles3, px: px, py: py });
      })
      .catch(function() { setMapErr(true); });
  }, [address, kakaoKey]);

  if (!tileInfo && !mapErr) {
    return <div style={{width:'260px',height:'195px',background:'#f0ede6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',color:'#aaa'}}>지도 로딩 중...</div>;
  }
  if (mapErr || !tileInfo) {
    return <div style={{width:'260px',height:'195px',background:'#f5f2eb',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',color:'#aaa'}}>지도를 불러올 수 없습니다</div>;
  }

  var offX = 130 - tileInfo.px;
  var offY = 97  - tileInfo.py;
  var markerL = 130 - 7;
  var markerT = 97  - 7;

  return (
    <div style={{width:'260px',height:'195px',position:'relative',overflow:'hidden',background:'#e8e4e0'}}>
      {tileInfo.tiles.map(function(t, i) {
        return <div key={i} style={{position:'absolute',width:'256px',height:'256px',
          left:(offX+t.dx)+'px',top:(offY+t.dy)+'px',
          backgroundImage:'url('+t.url+')',backgroundSize:'256px 256px'}} />;
      })}
      <div style={{position:'absolute',left:markerL+'px',top:markerT+'px',width:'14px',height:'14px',
        borderRadius:'50%',background:'#e74c3c',border:'2px solid white',
        boxShadow:'0 1px 3px rgba(0,0,0,0.5)',zIndex:10}} />
      <div style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(0,0,0,0.4)',
        padding:'3px 6px',fontSize:'9px',color:'white',textAlign:'center',zIndex:10}}>
        {address}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ── 삭제 확인 모달 ──
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ConfirmModal({ message, subMessage, onConfirm, onCancel, busy }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(13,27,42,0.7)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{background:'white',width:'100%',maxWidth:'360px',padding:'28px 24px'}}>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'20px',fontWeight:600,color:'#0d1b2a',marginBottom:'10px'}}>삭제 확인</div>
        <div style={{fontSize:'13px',color:'#333',marginBottom:'6px',lineHeight:1.6}}>{message}</div>
        {subMessage && <div style={{fontSize:'11px',color:'#c0392b',background:'#fff5f4',padding:'8px 10px',marginBottom:'4px'}}>{subMessage}</div>}
        <div style={{display:'flex',gap:'8px',justifyContent:'flex-end',marginTop:'20px'}}>
          <button onClick={onCancel} disabled={busy}
            style={{padding:'8px 20px',background:'white',border:'1px solid #ccc',cursor:'pointer',fontSize:'13px',fontFamily:'inherit'}}>취소</button>
          <button onClick={onConfirm} disabled={busy}
            style={{padding:'8px 20px',background:busy?'#aaa':'#c0392b',color:'white',border:'none',cursor:busy?'not-allowed':'pointer',fontSize:'13px',fontFamily:'inherit',fontWeight:600}}>
            {busy ? '삭제 중…' : '삭제'}
          </button>
        </div>
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
  const inp = (label, key, ph) => (
    <div>
      <div style={{fontSize:'10px',color:'#888',marginBottom:'2px'}}>{label}</div>
      <input value={info[key]||''} placeholder={ph} onChange={e=>f(key,e.target.value)}
        style={{width:'100%',fontSize:'12px',padding:'6px 8px',border:'1px solid #e0dcd4'}} />
    </div>
  );
  return (
    <div style={{borderTop:'1px solid #e0dcd4',marginTop:'8px',paddingTop:'8px'}}>
      <div onClick={()=>setOpen(!open)}
        style={{cursor:'pointer',fontSize:'12px',color:'#888',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span>{open?'▲':'▼'} 출력 정보 설정 (상호 · 담당자 · 로고)</span>
        <button onClick={e=>{e.stopPropagation();if(confirm('Supabase 연결을 해제하시겠습니까?'))onDisconnect();}}
          style={{fontSize:'10px',padding:'2px 8px',background:'none',border:'1px solid #ddd',color:'#888',cursor:'pointer'}}>연결 해제</button>
      </div>
      {open && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginTop:'10px'}}>
          {inp('상호', 'bizName', '타임즈부동산중개')}
          {inp('주소', 'bizAddr', '서울특별시 서초구 반포동 반포프라자')}
          {inp('담당자', 'agentName', '성재윤')}
          {inp('연락처', 'agentPhone', '010-6655-5445')}
          <div style={{gridColumn:'1/-1'}}>
            <div style={{fontSize:'10px',color:'#888',marginBottom:'2px'}}>카카오맵 API 키 (리포트 지도 표시)</div>
            <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
              <input value={info.kakaoKey||''} placeholder="카카오 JavaScript 앱 키 (예: e9bdfdddb8c0...)"
                type="text" onChange={e=>f('kakaoKey',e.target.value.trim())}
                style={{flex:1,fontSize:'12px',padding:'6px 8px',border:'1px solid #e0dcd4',fontFamily:'monospace'}} />
            </div>
            {info.kakaoKey && <div style={{fontSize:'10px',color:'#27ae60',marginTop:'2px'}}>✓ 키 입력됨 ({info.kakaoKey.length}자)</div>}
            {!info.kakaoKey && <div style={{fontSize:'10px',color:'#e07070',marginTop:'2px'}}>키를 입력하면 리포트에 지도가 표시됩니다</div>}
          </div>
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
  const [loadErr,   setLoadErr]   = useState('');
  const [dbReady,   setDbReady]   = useState(false);
  const [dragId,    setDragId]    = useState(null);
  const [areaMin,     setAreaMin]     = useState('');
  const [areaMax,     setAreaMax]     = useState('');
  const [appliedMin,  setAppliedMin]  = useState('');
  const [appliedMax,  setAppliedMax]  = useState('');
  const [confirmDlg, setConfirmDlg] = useState(null);
  const [delBusy,   setDelBusy]    = useState(false);
  const [info,      setInfo]      = useState(() => ({
    bizName:'타임즈부동산중개', bizAddr:'서울특별시 서초구 반포동 반포프라자',
    agentName:'성재윤', agentPhone:'010-6655-5445', logoSrc:'', kakaoKey:'',
    ...loadInfo()
  }));
  const [reportTitle, setRT] = useState('');
  const reportDate = new Date().toISOString().slice(0,10);

  // ── 초기 연결 시도 ──
  // /api/config 로 환경변수 키를 먼저 받아 localStorage 저장 후 연결
  useEffect(() => {
    async function boot() {
      try {
        var res = await fetch('/api/config');
        var d   = await res.json();
        if (d.url && d.key) {
          localStorage.setItem(STO_CRED, JSON.stringify({ url: d.url, key: d.key }));
        }
      } catch(e) {}
      var cred = localStorage.getItem(STO_CRED);
      if (cred) {
        try {
          var parsed = JSON.parse(cred);
          if (parsed.url && parsed.key) {
            initSB(parsed.url, parsed.key);
            loadData();
          }
        } catch(e2) {}
      }
    }
    boot();
  }, []);

  useEffect(() => { saveInfo(info); }, [info]);

  const doSort = function(arr) {
    return arr.slice().sort(function(a,b){
      var ao = a.sortOrder !== undefined ? a.sortOrder : (a.createdAt||0);
      var bo = b.sortOrder !== undefined ? b.sortOrder : (b.createdAt||0);
      return ao - bo;
    });
  };

  const loadData = async () => {
    try {
      var raw = localStorage.getItem(STO_CACHE);
      if (raw) {
        var cached = JSON.parse(raw);
        if (cached && cached.length > 0) {
          setListings(doSort(cached));
          setDbReady(true);
        }
      }
    } catch(e1) {}

    setLoading(true);
    setLoadErr('');
    try {
      var fresh = await dbLoad();
      var sorted = doSort(fresh);
      setListings(sorted);
      setDbReady(true);
      try { localStorage.setItem(STO_CACHE, JSON.stringify(sorted)); } catch(e2) {}
    } catch(err) {
      try {
        var hasCached = JSON.parse(localStorage.getItem(STO_CACHE)||'[]').length > 0;
        if (!hasCached) setLoadErr(err.message || '연결 실패');
      } catch(e3) {
        setLoadErr(err.message || '연결 실패');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => { loadData(); };

  const handleDisconnect = () => {
    localStorage.removeItem(STO_CRED);
    _sb = null;
    setDbReady(false);
    setListings([]);
  };

  // 드래그 앤 드롭
  const handleDragStart = id => setDragId(id);
  const handleDragOver  = id => {
    if (!dragId || dragId === id) return;
    setListings(prev => {
      var arr = prev.slice();
      var fi = arr.findIndex(x=>x.id===dragId);
      var ti = arr.findIndex(x=>x.id===id);
      if (fi<0||ti<0) return prev;
      var moved = arr.splice(fi,1)[0];
      arr.splice(ti,0,moved);
      return arr;
    });
  };
  const handleDrop = async () => {
    setDragId(null);
    setListings(prev => {
      var updated = prev.map((ls,i) => ({...ls, sortOrder:i}));
      updated.forEach(ls => dbUpsert(ls).catch(e=>console.warn('순서저장 오류:',e)));
      return updated;
    });
  };

  // 저장
  const onSave = ls => {
    setListings(p => {
      const idx = p.findIndex(x=>x.id===ls.id);
      return idx>=0 ? p.map(x=>x.id===ls.id?ls:x) : [...p, ls];
    });
    setShowForm(false); setEditing(null);
  };

  // 삭제 (단건)
  const onDelete = (id, name) => {
    setConfirmDlg({
      message: name+' 매물을 삭제하시겠습니까?',
      onConfirm: async () => {
        setDelBusy(true);
        try {
          await dbDelete(id);
          setListings(p=>p.filter(x=>x.id!==id));
          setConfirmDlg(null);
        } catch(e) { alert('삭제 실패: '+e.message); }
        finally { setDelBusy(false); }
      }
    });
  };

  // 일괄 삭제
  const onBulkDelete = () => {
    // ★ 필터된 매물 중 선택된 것만 삭제
    var sel = filteredListings.filter(l=>l.printSel);
    if (!sel.length) return;
    setConfirmDlg({
      message: '선택한 '+sel.length+'개 매물을 모두 삭제하시겠습니까?',
      subMessage: '⚠ 이 작업은 되돌릴 수 없습니다.',
      onConfirm: async () => {
        setDelBusy(true);
        try {
          for (var i=0; i<sel.length; i++) {
            await dbDelete(sel[i].id);
          }
          var delIds = new Set(sel.map(function(l){ return l.id; }));
          setListings(p=>p.filter(l=>!delIds.has(l.id)));
          setConfirmDlg(null);
        } catch(e) { alert('삭제 실패: '+e.message); }
        finally { setDelBusy(false); }
      }
    });
  };

  // 출력 선택 토글
  const onToggle = async (id) => {
    const updated = listings.map(x=>x.id===id?{...x,printSel:!x.printSel}:x);
    setListings(updated);
    const ls = updated.find(x=>x.id===id);
    if (ls) await dbUpsert(ls).catch(e=>console.warn(e));
  };

  const selCount = listings.filter(l=>l.printSel).length;

  // 전용면적 드롭다운 옵션
  var areaOptions = (function(){
    var pys = listings.map(function(l){ return parseFloat(l.exclusivePy); }).filter(function(v){ return !isNaN(v)&&v>0; });
    if (!pys.length) return [];
    var maxPy = Math.ceil(Math.max.apply(null,pys)/10)*10;
    var opts = [];
    for (var v=10; v<=maxPy; v+=10) opts.push(v);
    return opts;
  })();

  // ★ 면적 필터 적용 목록
  var filteredListings = listings.filter(function(l){
    var py = parseFloat(l.exclusivePy);
    if (appliedMin !== '' && !isNaN(py) && py < parseFloat(appliedMin)) return false;
    if (appliedMax !== '' && !isNaN(py) && py > parseFloat(appliedMax)) return false;
    return true;
  });

  // ★ 필터 내 선택 건수
  var filteredSelCount = filteredListings.filter(function(l){ return l.printSel; }).length;

  // Supabase 미연결
  if (!dbReady && !loading) {
    const cred = localStorage.getItem(STO_CRED);
    if (!cred) return <SBSetup onConnect={handleConnect} />;
  }

  const compareFtr = [
    info.bizName, info.bizAddr ? '  |  ' + info.bizAddr : '',
    info.agentName ? '   ' + info.agentName : '',
    info.agentPhone ? '  ' + info.agentPhone : ''
  ].join('');

  const printCSS = view==='report'
    ? '@media print { @page { size:A4 portrait !important; margin:10mm 12mm 18mm; } .report-card { page-break-after:always; break-after:page; } }'
    : '@media print { @page { size:A4 landscape !important; margin:10mm 10mm 22mm; } .cmp-footer { display:none !important; } @page { @bottom-left { content:"' + (info.bizName||'') + (info.bizAddr ? '  |  '+info.bizAddr : '') + '"; font-size:7.5pt; color:#555; font-family:sans-serif; } @bottom-right { content:"' + (info.agentName||'') + (info.agentPhone ? '  ' + info.agentPhone : '') + '"; font-size:7.5pt; color:#555; font-family:sans-serif; } } }';

  const TABS = [
    {id:'list',    label:'📋 매물 목록'},
    {id:'compare', label:'≡ 비교표'},
    {id:'report',  label:'📄 리포트'},
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: printCSS}} />
      {showForm && <ListingForm init={editing} onSave={onSave} onClose={()=>{setShowForm(false);setEditing(null);}} />}
      {confirmDlg && (
        <ConfirmModal
          message={confirmDlg.message}
          subMessage={confirmDlg.subMessage}
          onConfirm={confirmDlg.onConfirm}
          onCancel={()=>setConfirmDlg(null)}
          busy={delBusy} />
      )}

      <header className="no-print" style={{background:'#0d1b2a',padding:'12px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:'10px',letterSpacing:'.22em',color:'#c9a84c',marginBottom:'2px'}}>TIMES REAL ESTATE</div>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'22px',color:'white',fontWeight:500,lineHeight:1}}>임대 매물 관리</div>
            <span style={{fontSize:'12px',color:'#0d1b2a',background:'#c9a84c',padding:'2px 8px',fontWeight:700,letterSpacing:'.04em',borderRadius:'2px',fontFamily:'inherit'}}>{APP_VERSION}</span>
          </div>
        </div>
        <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
          {loading && <span style={{fontSize:'12px',color:'#c9a84c'}}>↺ 동기화 중…</span>}
          {!loading && loadErr && <span style={{fontSize:'12px',color:'#e07070'}}>⚠ 캐시 표시 중</span>}
          {!loading && !loadErr && (
            <span style={{fontSize:'12px',color:'#9aacbe'}}>
              ☁ Supabase 연결됨
              {/* ★ 필터 적용 중이면 필터 내 선택 건수 표시, 아니면 전체 선택 건수 */}
              {(appliedMin !== '' || appliedMax !== '')
                ? <span> &nbsp;·&nbsp; 필터 내 선택 {filteredSelCount}건 / 전체 선택 {selCount}건</span>
                : <span> &nbsp;·&nbsp; 선택 {selCount}건</span>
              }
            </span>
          )}
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
                {/* 전용면적 필터 */}
                <div style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'13px'}}>
                  <select value={areaMin} onChange={e=>setAreaMin(e.target.value)}
                    style={{padding:'6px 8px',fontSize:'13px',border:'1px solid #bbb',background:'white',cursor:'pointer',fontFamily:'inherit'}}>
                    <option value="">최저 없음</option>
                    {areaOptions.filter(function(v){ return areaMax===''||v<parseFloat(areaMax); }).map(function(v){
                      return <option key={v} value={v}>{v}평</option>;
                    })}
                  </select>
                  <span style={{color:'#aaa',fontSize:'12px',flexShrink:0}}>~ 이상</span>
                  <select value={areaMax} onChange={e=>setAreaMax(e.target.value)}
                    style={{padding:'6px 8px',fontSize:'13px',border:'1px solid #bbb',background:'white',cursor:'pointer',fontFamily:'inherit'}}>
                    <option value="">최대 없음</option>
                    {areaOptions.filter(function(v){ return areaMin===''||v>parseFloat(areaMin); }).map(function(v){
                      return <option key={v} value={v}>{v}평</option>;
                    })}
                  </select>
                  <span style={{color:'#aaa',fontSize:'12px',flexShrink:0}}>이하</span>
                  <button
                    onClick={function(){setAppliedMin(areaMin);setAppliedMax(areaMax);}}
                    style={{padding:'6px 14px',fontSize:'13px',background:'#0d1b2a',color:'#c9a84c',border:'none',cursor:'pointer',fontFamily:'inherit',fontWeight:600,flexShrink:0}}>
                    검색
                  </button>
                  {(appliedMin!==''||appliedMax!=='') && (
                    <button onClick={function(){setAreaMin('');setAreaMax('');setAppliedMin('');setAppliedMax('');}}
                      style={{padding:'5px 8px',fontSize:'11px',background:'none',border:'1px solid #ddd',color:'#888',cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>✕ 초기화</button>
                  )}
                </div>
                {/* ★ 전체선택/선택해제: filteredListings 기준으로만 동작 */}
                <button onClick={()=>{
                    var ids=new Set(filteredListings.map(function(l){return l.id;}));
                    setListings(function(p){return p.map(function(x){return ids.has(x.id)?{...x,printSel:true}:x;});});
                  }}
                  style={{padding:'6px 14px',fontSize:'13px',background:'white',border:'1px solid #bbb',cursor:'pointer',fontFamily:'inherit'}}>전체 선택</button>
                <button onClick={()=>{
                    var ids=new Set(filteredListings.map(function(l){return l.id;}));
                    setListings(function(p){return p.map(function(x){return ids.has(x.id)?{...x,printSel:false}:x;});});
                  }}
                  style={{padding:'6px 14px',fontSize:'13px',background:'white',border:'1px solid #bbb',cursor:'pointer',fontFamily:'inherit'}}>선택 해제</button>
                {/* ★ 선택 삭제: filteredListings 내 선택 건수 기준 */}
                {filteredSelCount > 0 && (
                  <button onClick={onBulkDelete}
                    style={{padding:'6px 14px',fontSize:'13px',background:'white',border:'1px solid #e07070',color:'#c0392b',cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>
                    선택 삭제 ({filteredSelCount}건)
                  </button>
                )}
                <button onClick={()=>{setEditing(blank());setShowForm(true);}}
                  style={{padding:'7px 18px',background:'#c9a84c',color:'white',border:'none',cursor:'pointer',fontSize:'14px',fontFamily:'inherit',fontWeight:600}}>+ 새 매물 등록</button>
              </>
            )}
          </div>
        </div>
      </div>

      <main className="print-main" style={{padding:'16px 24px 60px',maxWidth:'1200px',margin:'0 auto'}}>
        {loading && listings.length===0 && (
          <div style={{textAlign:'center',padding:'60px',color:'#c9a84c'}}>
            <div style={{fontSize:'24px',marginBottom:'8px'}}>☁</div>
            <div style={{fontSize:'12px'}}>데이터를 불러오는 중…</div>
          </div>
        )}
        {!loading && loadErr && (
          <div style={{textAlign:'center',padding:'60px'}}>
            <div style={{fontSize:'20px',marginBottom:'12px',color:'#c0392b'}}>⚠ 연결 오류</div>
            <div style={{fontSize:'13px',color:'#888',marginBottom:'6px',maxWidth:'400px',margin:'0 auto 16px'}}>
              {loadErr}
            </div>
            <div style={{fontSize:'12px',color:'#aaa',marginBottom:'20px'}}>
              Supabase 일시적 오류입니다. 잠시 후 재시도해 주세요.
            </div>
            <button onClick={()=>loadData()}
              style={{padding:'10px 28px',background:'#0d1b2a',color:'#c9a84c',border:'none',cursor:'pointer',fontSize:'14px',fontFamily:'inherit',fontWeight:600}}>
              ↺ 다시 시도
            </button>
          </div>
        )}

        {!loading && view==='list' && (
          <>
            {filteredListings.length===0 ? (
              <div style={{textAlign:'center',padding:'80px 0',color:'#bbb'}}>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'24px',marginBottom:'10px',color:'#c9a84c'}}>
                  {listings.length===0 ? '등록된 매물이 없습니다' : '검색 결과가 없습니다'}
                </div>
                <div style={{fontSize:'12px',marginBottom:'20px'}}>
                  {listings.length===0 ? '+ 새 매물 등록 버튼을 눌러 매물을 추가하세요' : '다른 면적 조건을 선택해보세요'}
                </div>
                <button onClick={()=>{setEditing(blank());setShowForm(true);}}
                  style={{padding:'10px 24px',background:'#c9a84c',color:'white',border:'none',cursor:'pointer',fontSize:'13px',fontFamily:'inherit'}}>+ 첫 매물 등록</button>
              </div>
            ) : (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'16px'}}>
                {filteredListings.map(ls=>(
                  <LCard key={ls.id} ls={ls}
                    onEdit={()=>{setEditing(ls);setShowForm(true);}}
                    onDelete={()=>onDelete(ls.id, ls.buildingName)}
                    onToggle={()=>onToggle(ls.id)}
                    onDragStart={()=>handleDragStart(ls.id)}
                    onDragOver={()=>handleDragOver(ls.id)}
                    onDrop={handleDrop}
                    isDragging={dragId===ls.id} />
                ))}
              </div>
            )}
            <div className="no-print" style={{background:'white',border:'1px solid #e0dcd4',padding:'16px 20px',marginTop:'20px'}}>
              <InfoPanel info={info} setInfo={setInfo} onDisconnect={handleDisconnect} />
            </div>
          </>
        )}

        {/* ★ 비교표: filteredListings만 넘김 (필터된 매물 중 printSel인 것만 표시) */}
        {!loading && view==='compare' && (
          <LCompare listings={filteredListings} reportTitle={reportTitle||'임대 매물 비교표'} reportDate={reportDate}
            bizName={info.bizName} bizAddr={info.bizAddr} agentName={info.agentName} agentPhone={info.agentPhone} logoSrc={info.logoSrc} />
        )}

        {/* ★ 리포트: filteredListings 중 printSel인 것만 */}
        {!loading && view==='report' && (
          <div>
            {filteredListings.filter(l=>l.printSel).length===0
              ? <div style={{textAlign:'center',padding:'60px',color:'#aaa'}}>리포트 출력할 매물을 목록에서 선택(체크)하세요</div>
              : filteredListings.filter(l=>l.printSel).map((l,i)=>(
                  <LReportCard key={l.id} ls={l} isFirst={i===0}
                    reportTitle={reportTitle} reportDate={reportDate}
                    bizName={info.bizName} bizAddr={info.bizAddr}
                    agentName={info.agentName} agentPhone={info.agentPhone} logoSrc={info.logoSrc} kakaoKey={info.kakaoKey} />
                ))}
          </div>
        )}
      </main>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
