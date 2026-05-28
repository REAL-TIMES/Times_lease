// ── /api/parse.js v1.3.3 — Anthropic API 프록시 (Vercel 서버리스) ──
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const text = req.body && req.body.text;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다. Vercel 대시보드에서 추가해주세요.' });

  const prompt = '다음은 네이버 부동산 또는 상업용 부동산 플랫폼에서 복사한 매물 정보입니다.\n'
    + '아래 텍스트에서 다음 필드를 추출해서 JSON 객체로만 답하세요. 설명, 마크다운 코드블록 모두 없이 JSON만 출력하세요.\n\n'
    + '필드 설명:\n'
    + '- buildingName: 건물명 (없으면 빈 문자열)\n'
    + '- address: 주소 전체 (없으면 빈 문자열)\n'
    + '- floor: 해당 층 숫자만 (예: "3", 총층 제외)\n'
    + '- totalFloor: 건물 총층 숫자만 (예: "6", 없으면 빈 문자열)\n'
    + '- exclusivePy: 전용면적 평수 숫자만, 소수점 2자리 (㎡ 단위면 3.30579로 나누어 변환)\n'
    + '- contractPy: 계약/공급면적 평수 숫자만, 소수점 2자리 (동일 변환)\n'
    + '- deposit: 보증금 만원 단위 정수 문자열 (예: 2억=20000, 5000만원=5000)\n'
    + '- rent: 월세/임대료 만원 단위 정수 문자열\n'
    + '- mgmtFee: 관리비 만원 단위 정수 문자열\n'
    + '- parking: 주차 정보 (예: "가능 (11대)", 없으면 빈 문자열)\n'
    + '- elevator: 승강기 정보 (없으면 빈 문자열)\n'
    + '- moveIn: 입주가능일 문자열 (예: "즉시입주 협의 가능", 없으면 빈 문자열)\n'
    + '- useAprDate: 사용승인일/준공연월 (예: "1989.12", 없으면 빈 문자열)\n'
    + '- notes: 기타 참고사항 (화장실 수, 향, 연층 여부 등 나머지 정보, 없으면 빈 문자열)\n\n'
    + '숫자 필드는 단위 없이 숫자 문자열만. JSON만 출력.\n\n'
    + '매물 텍스트:\n' + text;

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      // 전체 에러 정보를 상세히 반환
      const msg = (data.error && data.error.message)
        ? '[' + (data.error.type || upstream.status) + '] ' + data.error.message
        : 'Anthropic API 오류 ' + upstream.status;
      return res.status(upstream.status).json({ error: msg });
    }

    const raw   = data.content[0].text.trim();
    const clean = raw.replace(/^```[a-z]*\n?/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);

  } catch(e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
};
