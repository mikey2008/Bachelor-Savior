const apiKey = "AIzaSyFakeKeyButValidFormat";
const bodyText = JSON.stringify({
  contents: [{ parts: [{ text: "Hello" }] }],
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 2048,
  },
});
fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: bodyText
}).then(res => res.json().then(j => console.log('JSON:', j)).catch(e => console.log('Status:', res.status, res.statusText)))
.catch(e => console.error('Fetch error:', e.message));
