// api/geocode.js — 카카오 주소→좌표 변환 프록시 (CORS 해결)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { address } = req.query;
  if (!address) { res.status(400).json({ error: 'address required' }); return; }

  const key = process.env.KAKAO_REST_KEY;
  if (!key) { res.status(500).json({ error: 'KAKAO_REST_KEY not set' }); return; }

  try {
    const url = 'https://dapi.kakao.com/v2/local/search/address.json?query=' +
                encodeURIComponent(address);
    const r = await fetch(url, {
      headers: { 'Authorization': 'KakaoAK ' + key }
    });
    const data = await r.json();

    if (data.documents && data.documents.length > 0) {
      const doc = data.documents[0];
      res.status(200).json({ lat: doc.y, lng: doc.x, name: doc.address_name });
    } else {
      res.status(404).json({ error: 'not found' });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
