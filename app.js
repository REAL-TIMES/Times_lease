<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TIMES 임대 매물 관리</title>

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet" />

  <!-- React 18 -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

  <!-- Babel Standalone (JSX 변환) -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

  <!-- Supabase JS v2 -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>

  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif;
      background: #f7f4ef;
      color: #1a1a2e;
      -webkit-font-smoothing: antialiased;
    }
    input, textarea, select, button { font-family: inherit; box-sizing: border-box; }

    .print-only  { display: none !important; }
    .screen-only { display: block; }
    .no-print    {}

    @media print {
      .no-print    { display: none !important; }
      .print-only  { display: block !important; }
      .screen-only { display: none !important; }
      body { background: white; }
    }

    #boot-screen {
      position: fixed; inset: 0;
      background: #0d1b2a;
      display: flex; align-items: center; justify-content: center;
      flex-direction: column; gap: 16px;
      z-index: 9999;
      transition: opacity .4s;
    }
    #boot-screen.fade-out { opacity: 0; pointer-events: none; }
    #boot-logo {
      font-family: 'Cormorant Garamond', serif;
      font-size: 13px; letter-spacing: .35em;
      color: #c9a84c; margin-bottom: 4px;
    }
    #boot-title {
      font-family: 'Cormorant Garamond', serif;
      font-size: 28px; font-weight: 600;
      color: white; letter-spacing: .04em;
    }
    #boot-status {
      font-size: 12px; color: #9aacbe;
      letter-spacing: .06em; margin-top: 8px;
    }
    #boot-error {
      font-size: 12px; color: #e07070;
      background: rgba(255,255,255,.07);
      padding: 10px 20px; max-width: 360px;
      text-align: center; line-height: 1.7;
      display: none; white-space: pre-line;
    }
  </style>
</head>
<body>

  <div id="boot-screen">
    <div id="boot-logo">TIMES REAL ESTATE</div>
    <div id="boot-title">임대 매물 관리</div>
    <div id="boot-status">Supabase 연결 중…</div>
    <div id="boot-error"></div>
  </div>

  <div id="root"></div>

  <script>
    // ── autoConnect 완료 후 app.js 동적 로드 ──
    // app.js의 useEffect가 localStorage를 읽기 전에 반드시 저장 완료
    var STO_CRED = 'times-lease-sb';

    async function autoConnect() {
      var bootStatus = document.getElementById('boot-status');
      var bootError  = document.getElementById('boot-error');
      var bootScreen = document.getElementById('boot-screen');

      try {
        var res  = await fetch('/api/config');
        var data = await res.json();

        if (!res.ok || !data.url || !data.key) {
          throw new Error(data.error || '설정을 불러오지 못했습니다.');
        }

        // ★ localStorage 저장 먼저
        localStorage.setItem(STO_CRED, JSON.stringify({ url: data.url, key: data.key }));
        bootStatus.textContent = '연결 완료 — 앱을 불러오는 중…';

      } catch (err) {
        bootError.style.display = 'block';
        bootError.textContent   = '⚠ 자동 연결 실패: ' + err.message + '\n수동으로 Supabase 정보를 입력하세요.';
        bootStatus.textContent  = '';
      }

      // ★ localStorage 저장 완료 후 app.js 동적 로드
      var script = document.createElement('script');
      script.setAttribute('type', 'text/babel');
      script.setAttribute('src', './app.js');
      script.onload = function() {
        // 앱 렌더 후 부팅 화면 제거
        setTimeout(function() {
          bootScreen.classList.add('fade-out');
          setTimeout(function() { bootScreen.style.display = 'none'; }, 420);
        }, 800);
      };
      document.body.appendChild(script);

      // Babel이 동적 추가된 script 태그를 처리하도록 트리거
      Babel.transformScriptTags();
    }

    autoConnect();
  </script>

</body>
</html>
