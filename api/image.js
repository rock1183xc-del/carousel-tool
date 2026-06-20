export const config = { runtime: 'edge' };

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
  };
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: cors });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: cors });

  const apiKey = req.headers.get('x-api-key');
  if (!apiKey) return new Response(JSON.stringify({ error: 'Missing API key' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });

  const { prompt } = await req.json();
  if (!prompt) return new Response(JSON.stringify({ error: 'Missing prompt' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
        })
      }
    );
    const data = await response.json();
    if (data.error) return new Response(JSON.stringify({ error: data.error.message }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });

    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(p => p.inlineData);
    if (!imagePart) return new Response(JSON.stringify({ error: 'No image in response' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });

    const { data: b64, mimeType } = imagePart.inlineData;
    return new Response(JSON.stringify({ dataUrl: `data:${mimeType};base64,${b64}` }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
}
