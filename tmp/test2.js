const apiKey = "AIzaSyFakeKeyButValidFormat";
const bodyText = JSON.stringify({
  contents: [{ parts: [{ text: undefined }] }],
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 2048,
  },
});
console.log(bodyText);
