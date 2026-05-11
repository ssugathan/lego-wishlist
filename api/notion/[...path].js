// Vercel serverless function — proxies /api/notion/* to api.notion.com,
// injecting the Notion auth header server-side. The browser never sees the
// API key.
//
// The dev counterpart lives in vite.config.js (the dev proxy does the same
// header injection so local and prod behave identically).

export default async function handler(req, res) {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'NOTION_API_KEY not configured' });
  }

  const parts = req.query.path;
  const path = Array.isArray(parts) ? parts.join('/') : parts || '';
  const url = `https://api.notion.com/${path}`;

  const init = {
    method: req.method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
  };

  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body != null) {
    init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  const upstream = await fetch(url, init);
  const text = await upstream.text();
  res.status(upstream.status);
  res.setHeader('Content-Type', 'application/json');
  res.send(text);
}
