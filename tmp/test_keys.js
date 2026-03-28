const keys = [
  'AIzaSyCqtBswjVnjRq7IK5_quXboUjE7IASlgKw',
  'AIzaSyBkLDRZS0plrYrxgqOijMUQ9HUuLBHWcco'
];

async function testKeys() {
  for (const key of keys) {
    console.log(`--- Testing Key: ${key.slice(0, 10)}... ---`);
    // Try v1 instead of v1beta
    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }] })
      });
      const data = await resp.json();
      if (resp.ok) {
        console.log(`✅ v1 gemini-1.5-flash: WORKING!`);
        continue;
      }
    } catch (e) {}

    // Try v1beta gemini-1.5-flash-latest
    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }] })
      });
      const data = await resp.json();
      if (resp.ok) {
        console.log(`✅ v1beta gemini-1.5-flash-latest: WORKING!`);
        continue;
      }
    } catch (e) {}

    // List models to see what's actually available
    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      const data = await resp.json();
      if (resp.ok) {
        console.log(`📌 Available Models: ${data.models.map(m => m.name).join(', ')}`);
      } else {
        console.log(`❌ Failed to list models. Error: ${data.error?.message || 'Unknown'}`);
      }
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
    }
  }
}

testKeys();
