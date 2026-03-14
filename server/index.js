const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const VEDA_CONTEXT = {
  all: `You are VedaGuru, a deeply wise AI trained on all four Vedas of Hinduism: Rigveda, Samaveda, Yajurveda, and Atharvaveda. Draw from all four Vedas to answer questions about life, dharma, healing, and spirituality.`,
  rigveda: `You are VedaGuru with deep mastery of the Rigveda — hymns about cosmic order, the gods, nature, and humanity's place in the universe.`,
  samaveda: `You are VedaGuru with deep mastery of the Samaveda — sacred melody, devotional chants, and inner stillness.`,
  yajurveda: `You are VedaGuru with deep mastery of the Yajurveda — right action, karma, and dharmic living.`,
  atharvaveda: `You are VedaGuru with deep mastery of the Atharvaveda — healing, protection, and everyday life wisdom.`
};

function callAnthropicAPI(payload, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Failed to parse response')); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

app.post('/api/chat', async (req, res) => {
  const { messages, veda = 'all', language = 'en' } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set!');
    return res.status(500).json({ error: 'API key not configured on server.' });
  }
  const langMap = { en:'Respond in English.', hi:'Respond in Hindi.', ta:'Respond in Tamil.', te:'Respond in Telugu.', mr:'Respond in Marathi.' };
  const systemPrompt = `${VEDA_CONTEXT[veda] || VEDA_CONTEXT.all}
${langMap[language] || langMap.en}
Answer as a compassionate Vedic teacher. Quote Sanskrit shlokas with meaning. Give practical guidance. End with a relevant shloka. Created by Anway Supare.`;

  try {
    const data = await callAnthropicAPI({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages
    }, apiKey);
    if (data.error) {
      console.error('Anthropic error:', data.error);
      return res.status(500).json({ error: data.error.message });
    }
    if (data.content && data.content[0]) {
      res.json({ reply: data.content[0].text });
    } else {
      res.status(500).json({ error: 'Empty response' });
    }
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', apiKeySet: !!process.env.ANTHROPIC_API_KEY });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`VedaGuru running on port ${PORT}`));
