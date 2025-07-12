import { GEMINI_API_KEY, HUGGING_FACE_API_KEY } from "../secrets.js";

const API_KEY = GEMINI_API_KEY; // Your actual Gemini key

export async function callGemini(domain,title) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

  const instruction = `
    You are an assistant that classifies websites as either "distracting" or "not distracting". Use your judgment to decide if the site is likely to distract someone.

    - Do not base your decision solely on the domain.
    - For example, YouTube itself is not inherently distracting, but if a video title suggests it is fun or entertaining, then classify it as "distracting".
    - Neutral sites like "New Tab" that cannot be immediately judged should be classified as "not distracting" (benefit of the doubt).
    - Social media sites like X, Twitter, Instagram, etc., should generally be classified as "distracting".
    
    Based on this, determine whether the site is distracting or not.

    Return only one word: "distracting" or "not distracting".


    Domain: ${domain}
    Title: ${title}
    `;
  const body = {
    contents: [
      {
        parts: [
          {
            text: instruction
          }
        ]
      }
    ]
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  console.log(domain+title)
  const data = await response.json();
  const result = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return result;
}
