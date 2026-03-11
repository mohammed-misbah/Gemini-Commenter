import { API_KEY } from "./config.js";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.type !== "generate") return;

  fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: request.prompt }
          ]
        }
      ]
    })
  })
  .then(response => response.json())
  .then(data => {

    if (!data.candidates) {
      sendResponse({
        success: false,
        error: JSON.stringify(data)
      });
      return;
    }

    const text = data.candidates[0].content.parts[0].text;

    sendResponse({
      success: true,
      text: text.trim()
    });

  })
  .catch(error => {
    sendResponse({
      success: false,
      error: error.toString()
    });
  });

  return true;
});