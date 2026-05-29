// api/mapimage.js — 정적 지도 이미지 프록시 (OpenStreetMap Static Maps)
export default async function handler(req, res) {
  const { lat, lng } = req.query;
  if (!lat || !lng) { res.status(400).end(); return; }

  // staticmap.openstreetmap.de — API 키 불필요, 마커 포함
  const url = 'https://staticmap.openstreetmap.de/staticmap.php'
    + '?center=' + lat + ',' + lng
    + '&zoom=16'
    + '&size=260x195'
    + '&markers=' + lat + ',' + lng + ',red-pushpin';

  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'TimesRealEstate/1.0 (realestate lease report)' }
    });
    if (!r.ok) { res.status(502).json({ error: 'map fetch failed', status: r.status }); return; }
    const buf = await r.arrayBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(Buffer.from(buf));
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
