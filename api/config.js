// api/config.js — Vercel 서버리스 함수
// SUPABASE_URL, SUPABASE_ANON_KEY 환경변수를 클라이언트에 전달
export default function handler(req, res) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return res.status(500).json({ error: '환경변수가 설정되지 않았습니다.' });
  }

  // 캐시 방지
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ url, key });
}
