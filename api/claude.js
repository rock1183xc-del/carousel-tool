export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(400).json({ error: { message: 'Missing API key' } });

  const { system, messages, max_tokens, imagePart } = req.body;
  const userText = messages?.[0]?.content || '';

  const userParts = [];
  if (imagePart?.data) {
    userParts.push({ inlineData: { mimeType: imagePart.mimeType || 'image/jpeg', data: imagePart.data } });
  }
  userParts.push({ text: userText });

  const geminiBody = {
    contents: [{ role: 'user', parts: userParts }],
    generationConfig: { maxOutputTokens: max_tokens || 4096 }
  };
  if (system) geminiBody.systemInstruction = { parts: [{ text: system }] };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody)
      }
    );
    const data = await response.json();
    if (data.error) return res.status(400).json({ error: { message: data.error.message } });
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.status(200).json({ content: [{ type: 'text', text }] });
  } catch (e) {
    res.status(500).json({ error: { message: e.message } });
  }
}
