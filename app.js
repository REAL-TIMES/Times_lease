// ── TIMES 임대 매물 관리 v1.1.0 (Supabase) ──
const { useState, useEffect, useCallback } = React;

// ── 상수 ──
const PY  = 3.30579;
const STO_CRED = 'times-lease-sb';   // 자격증명 localStorage key
const STO_INFO = 'times-lease-info'; // 출력 정보 localStorage key
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
  buildingName:'', alias:'', address:'', floor:'',
  exclusivePy:'', contractPy:'',
  deposit:'', rent:'', mgmtFee:'',
  parking:'', elevator:'', moveIn:'', useAprDate:'',
  rentFree:'', fitOut:'', notes:'',
  photo:null, printSel:true,
});
const loadInfo = () => { try { return JSON.parse(localStorage.getItem(STO_INFO)||'{}'); } catch { return {}; } };
const saveInfo = obj => localStorage.setItem(STO_INFO, JSON.stringify(obj));

// ── 비교표 컬럼 ──
const CMP_COLS = [
  { l:'층',              f:ls => ls.floor ? ls.floor+'층' : '—' },
  { l:'전용면적',        f:ls => ls.exclusivePy ? ls.exclusivePy+'평'+(py2m(ls.exclusivePy)?' ('+py2m(ls.exclusivePy)+'㎡)':'') : '—' },
  { l:'계약면적',        f:ls => ls.contractPy  ? ls.contractPy+'평'+(py2m(ls.contractPy)?' ('+py2m(ls.contractPy)+'㎡)':'')   : '—' },
  { l:'보증금',          f:ls => fmt(ls.deposit) },
  { l:'임대료/월',       f:ls => fmt(ls.rent) },
  { l:'관리비/월',       f:ls => fmt(ls.mgmtFee) },
  { l:'월 합계',         f:ls => (n(ls.rent)||n(ls.mgmtFee)) ? fmt(n(ls.rent)+n(ls.mgmtFee)) : '—' },
  { l:'NOC (전용평)',    f:ls => ls.exclusivePy&&(n(ls.rent)||n(ls.mgmtFee))
                                  ? Math.round((n(ls.rent)+n(ls.mgmtFee))/n(ls.exclusivePy)).toLocaleString()+'만원' : '—' },
  { l:'임대료/평(계약)', f:ls => fmtPy(ls.rent,    ls.contractPy) },
  { l:'관리비/평(계약)', f:ls => fmtPy(ls.mgmtFee, ls.contractPy) },
  { l:'보증금/평(계약)', f:ls => fmtPy(ls.deposit,  ls.contractPy) },
  { l:'주차',            f:ls => ls.parking    || '—' },
  { l:'승강기',          f:ls => ls.elevator   || '—' },
  { l:'입주일정',        f:ls => ls.moveIn     || '—' },
  { l:'사용승인',        f:ls => ls.useAprDate || '—' },
  { l:'렌트프리',        f:ls => ls.rentFree   || '—' },
  { l:'핏아웃',          f:ls => ls.fitOut     || '—' },
];

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
  const [ls, setLs]   = useState(init || blank());
  const [busy,setBusy]= useState(false);
  const set = (k,v) => setLs(p=>({...p,[k]:v}));

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
    const r = new FileReader();
    r.onload = ev => set('photo', ev.target.result);
    r.readAsDataURL(f);
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

        <div style={{fontSize:'11px',fontWeight:600,color:'#c9a84c',letterSpacing:'.1em',marginBottom:'8px'}}>기본 정보</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'16px'}}>
          {fld('건물명 *',               'buildingName', '예) 반포 파인빌딩')}
          {fld('별칭 (카드·비교표용)',    'alias',        '예) 반포파인 301호')}
          {fld('주소',                   'address',      '서울특별시 서초구...', 'text', true)}
          {fld('층',                     'floor',        '예) 3')}
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
function LCard({ ls, onEdit, onDelete, onToggle }) {
  const noc = ls.exclusivePy && (n(ls.rent)||n(ls.mgmtFee))
    ? Math.round((n(ls.rent)+n(ls.mgmtFee))/n(ls.exclusivePy)) : null;

  return (
    <div className="pci" style={{background:'white',border:'1px solid #e0dcd4',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',left:0,top:0,bottom:0,width:'3px',background:ls.printSel?'#c9a84c':'#e0dcd4'}} />
      <div style={{padding:'12px 12px 8px 15px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'16px',fontWeight:600,color:'#0d1b2a',lineHeight:1.2,marginBottom:'2px'}}>
              {ls.buildingName||'(건물명 없음)'}
            </div>
            {ls.floor && <div style={{fontSize:'11px',color:'#c9a84c',fontWeight:600}}>{ls.floor}층</div>}
            {ls.address && <div style={{fontSize:'10px',color:'#888',marginTop:'2px',lineHeight:1.3}}>{ls.address}</div>}
          </div>
          <input type="checkbox" checked={ls.printSel} onChange={onToggle}
            title="출력 선택" style={{cursor:'pointer',marginLeft:'8px',flexShrink:0}} />
        </div>

        {ls.photo && <img src={ls.photo} style={{width:'100%',height:'100px',objectFit:'cover',display:'block',marginBottom:'8px'}} />}

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
// ── 비교표 ──
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function LCompare({ listings, reportTitle, reportDate, bizName, bizAddr, agentName, agentPhone, logoSrc }) {
  const sel = listings.filter(l=>l.printSel);
  if (!sel.length) return (
    <div style={{textAlign:'center',padding:'60px',color:'#aaa'}}>비교할 매물을 목록에서 선택(체크)하세요</div>
  );

  const CHUNK = 4;
  const chunks = [];
  for (let i=0; i<sel.length; i+=CHUNK) chunks.push(sel.slice(i,i+CHUNK));

  const thS = {background:'#0d1b2a',color:'#f7f4ef',padding:'6pt 8pt',border:'1px solid #0d1b2a',fontSize:'8pt',fontWeight:600,verticalAlign:'middle',textAlign:'left'};
  const plS = {background:'#ede9e1',padding:'4pt 6pt',color:'#444',fontWeight:700,border:'1px solid #ccc8c0',fontSize:'8pt',textAlign:'center',whiteSpace:'nowrap',verticalAlign:'middle'};
  const tdS = s => ({padding:'4pt 6pt',border:'1px solid #ccc8c0',fontSize:'8pt',textAlign:'center',background:s?'#faf8f4':'white',verticalAlign:'middle'});
  let stripe = false;

  return (
    <>
      {chunks.map((chunk, ci) => (
        <div key={ci} className="print-only"
          style={{pageBreakBefore:ci>0?'always':'auto',breakBefore:ci>0?'page':'auto'}}>
          <div style={{borderBottom:'1.5pt solid #0d1b2a',paddingBottom:'6pt',marginBottom:'8pt',display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
            <div>
              <div style={{fontSize:'7pt',letterSpacing:'.12em',color:'#c9a84c'}}>TIMES REAL ESTATE · 타임즈부동산중개</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'22pt',fontWeight:600,lineHeight:1.1}}>{reportTitle||'임대 매물 비교표'}</div>
            </div>
            <div style={{textAlign:'right',fontSize:'8pt',color:'#888'}}>
              {reportDate}&nbsp;·&nbsp;총 {sel.length}건
              {chunks.length>1 && <span>&nbsp;·&nbsp;{ci+1}/{chunks.length} 페이지</span>}
            </div>
          </div>

          <table style={{borderCollapse:'collapse',tableLayout:'fixed',width:'100%'}}>
            <colgroup>
              <col style={{width:'75pt'}} />
              {chunk.map(l=><col key={l.id} style={{width:'auto'}} />)}
            </colgroup>
            <thead>
              <tr>
                <th style={{...plS,background:'#0d1b2a',color:'#c9a84c'}}>항목</th>
                {chunk.map(l=>(
                  <th key={l.id} className="ptk" style={{...thS,textAlign:'center'}}>
                    <div style={{fontWeight:700,fontSize:'9pt',marginBottom:'2pt'}}>{l.buildingName||'(이름없음)'}</div>
                    {l.floor && <div style={{fontSize:'7pt',color:'#c9a84c'}}>{l.floor}층</div>}
                    {l.address && <div style={{fontSize:'7pt',color:'#aaa',fontWeight:400,lineHeight:1.3}}>
                      {(() => { const m=l.address.match(/^(.*?[동읍면리가로길])\s+(.+)$/); return m ? <>{m[1]}<br/>{m[2]}</> : l.address; })()}
                    </div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CMP_COLS.map(col => {
                stripe = !stripe;
                const hasVal = chunk.some(l => { const v=col.f(l); return v&&v!=='—'; });
                if (!hasVal) return null;
                return (
                  <tr key={col.l}>
                    <td style={plS}>{col.l}</td>
                    {chunk.map(l=><td key={l.id} style={tdS(stripe)}>{col.f(l)}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>

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

      <div className="screen-only" style={{overflowX:'auto'}}>
        <table style={{borderCollapse:'collapse',minWidth:'600px',fontSize:'12px'}}>
          <thead>
            <tr>
              <th style={{background:'#0d1b2a',color:'#c9a84c',padding:'8px 10px',textAlign:'left',whiteSpace:'nowrap',minWidth:'80px'}}>항목</th>
              {sel.map(l=>(
                <th key={l.id} style={{background:'#0d1b2a',color:'white',padding:'8px 10px',textAlign:'center',minWidth:'130px'}}>
                  <div style={{fontWeight:700}}>{l.buildingName}</div>
                  {l.floor && <div style={{fontSize:'10px',color:'#c9a84c'}}>{l.floor}층</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CMP_COLS.map((col,i) => {
              const hasVal = sel.some(l=>{const v=col.f(l);return v&&v!=='—';});
              if (!hasVal) return null;
              return (
                <tr key={col.l}>
                  <td style={{padding:'6px 10px',background:'#f0ede6',fontWeight:600,fontSize:'11px',whiteSpace:'nowrap'}}>{col.l}</td>
                  {sel.map(l=><td key={l.id} style={{padding:'6px 10px',textAlign:'center',borderBottom:'1px solid #f0ede6',background:i%2===0?'white':'#fafaf8'}}>{col.f(l)}</td>)}
                </tr>
              );
            })}
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
  const row = (label, value, hi=false) => value ? (
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
              {ls.buildingName}{ls.floor ? ' '+ls.floor+'층' : ''}
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
                {row('층',       ls.floor ? ls.floor+'층' : null)}
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
  const inp = (label, key, ph) => (
    <div>
      <div style={{fontSize:'10px',color:'#888',marginBottom:'2px'}}>{label}</div>
      <input value={info[key]||''} placeholder={ph} onChange={e=>f(key,e.target.value)}
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
          {inp('상호', 'bizName', '타임즈부동산중개')}
          {inp('주소', 'bizAddr', '서울특별시 서초구 반포동 반포프라자')}
          {inp('담당자', 'agentName', '성재윤')}
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
  const [dbReady,   setDbReady]   = useState(false);  // Supabase 연결됨
  const [info,      setInfo]      = useState(() => ({
    bizName:'타임즈부동산중개', bizAddr:'서울특별시 서초구 반포동 반포프라자',
    agentName:'성재윤', agentPhone:'010-6655-5445', logoSrc:'',
    ...loadInfo()
  }));
  const [reportTitle, setRT] = useState('');
  const reportDate = new Date().toISOString().slice(0,10);

  // ── 초기 연결 시도 ──
  useEffect(() => {
    const cred = localStorage.getItem(STO_CRED);
    if (cred) {
      try {
        const { url, key } = JSON.parse(cred);
        initSB(url, key);
        loadData();
      } catch {}
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

  const handleConnect = () => { loadData(); };

  const handleDisconnect = () => {
    localStorage.removeItem(STO_CRED);
    _sb = null;
    setDbReady(false);
    setListings([]);
  };

  // 저장
  const onSave = ls => {
    setListings(p => {
      const idx = p.findIndex(x=>x.id===ls.id);
      return idx>=0 ? p.map(x=>x.id===ls.id?ls:x) : [...p, ls];
    });
    setShowForm(false); setEditing(null);
  };

  // 삭제
  const onDelete = async (id, name) => {
    if (!confirm(name+' 매물을 삭제하시겠습니까?')) return;
    try {
      await dbDelete(id);
      setListings(p=>p.filter(x=>x.id!==id));
    } catch(e) { alert('삭제 실패: '+e.message); }
  };

  // 출력 선택 토글
  const onToggle = async (id) => {
    const updated = listings.map(x=>x.id===id?{...x,printSel:!x.printSel}:x);
    setListings(updated);
    const ls = updated.find(x=>x.id===id);
    if (ls) await dbUpsert(ls).catch(e=>console.warn(e));
  };

  const selCount = listings.filter(l=>l.printSel).length;

  // Supabase 미연결
  if (!dbReady && !loading) {
    const cred = localStorage.getItem(STO_CRED);
    if (!cred) return <SBSetup onConnect={handleConnect} />;
  }

  const printCSS = view==='report'
    ? '@media print { @page { size:A4 portrait !important; margin:10mm 12mm 18mm; } .report-card { page-break-after:always; break-after:page; } }'
    : '@media print { @page { size:A4 landscape !important; margin:10mm 10mm 16mm; @bottom-left { content:"'+(info.bizName||'')+(info.bizAddr?'  |  '+info.bizAddr:'')+'"; font-size:7.5pt; color:#555; font-family:sans-serif; } @bottom-right { content:"'+(info.agentName||'')+(info.agentPhone?'   '+info.agentPhone:'')+'"; font-size:7.5pt; color:#555; font-family:sans-serif; } } .print-only { display:block !important; } }';

  const TABS = [
    {id:'list',    label:'📋 매물 목록'},
    {id:'compare', label:'≡ 비교표'},
    {id:'report',  label:'📄 리포트'},
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: printCSS}} />
      {showForm && <ListingForm init={editing} onSave={onSave} onClose={()=>{setShowForm(false);setEditing(null);}} />}

      <header className="no-print" style={{background:'#0d1b2a',padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:'8px',letterSpacing:'.2em',color:'#c9a84c'}}>TIMES REAL ESTATE</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'20px',color:'white',fontWeight:400}}>임대 매물 관리</div>
        </div>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          {loading && <span style={{fontSize:'11px',color:'#c9a84c'}}>⏳ 동기화 중…</span>}
          {!loading && <span style={{fontSize:'11px',color:'#888'}}>☁ Supabase 연결됨 · 선택 {selCount}건</span>}
          {view!=='list' && <button onClick={()=>window.print()}
            style={{padding:'6px 14px',background:'#c9a84c',color:'white',border:'none',cursor:'pointer',fontSize:'12px',fontFamily:'inherit'}}>🖨 인쇄</button>}
        </div>
      </header>

      <div className="no-print" style={{background:'#ede9e1',borderBottom:'1px solid #d8d4cc',padding:'0 24px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',maxWidth:'1200px',margin:'0 auto'}}>
          <div style={{display:'flex'}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setView(t.id)}
                style={{padding:'10px 18px',fontSize:'12px',border:'none',cursor:'pointer',background:'none',
                        borderBottom:view===t.id?'2px solid #c9a84c':'2px solid transparent',
                        color:view===t.id?'#0d1b2a':'#888',fontWeight:view===t.id?700:400,fontFamily:'inherit'}}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{display:'flex',gap:'8px',alignItems:'center',padding:'8px 0'}}>
            {view!=='list' && (
              <input value={reportTitle} onChange={e=>setRT(e.target.value)}
                placeholder="보고서 제목 (고객명)"
                style={{fontSize:'12px',padding:'5px 10px',border:'1px solid #ccc8c0',width:'200px'}} />
            )}
            {view==='list' && (
              <>
                <button onClick={()=>setListings(p=>p.map(x=>({...x,printSel:true})))}
                  style={{padding:'5px 12px',fontSize:'11px',background:'white',border:'1px solid #bbb',cursor:'pointer',fontFamily:'inherit'}}>전체 선택</button>
                <button onClick={()=>setListings(p=>p.map(x=>({...x,printSel:false})))}
                  style={{padding:'5px 12px',fontSize:'11px',background:'white',border:'1px solid #bbb',cursor:'pointer',fontFamily:'inherit'}}>선택 해제</button>
                <button onClick={()=>{setEditing(blank());setShowForm(true);}}
                  style={{padding:'6px 16px',background:'#c9a84c',color:'white',border:'none',cursor:'pointer',fontSize:'12px',fontFamily:'inherit'}}>+ 새 매물 등록</button>
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
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'16px'}}>
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
