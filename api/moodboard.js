// api/moodboard.js

// Vercel Node.js Serverless Function (ESM style with default export)
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { theme, useCase, style, intensity } = req.body || {};

    if (!theme) {
      return res.status(400).json({ error: "Missing theme in request body" });
    }

    const prompt = `
You are a senior art director and AI prompt engineer.

Create a cohesive aesthetic moodboard based on:

Theme keywords: ${theme}
Primary use case: ${useCase}
Style preset: ${style}
Intensity: ${intensity}

Respond in EXACTLY this structure and keep it short but rich:

[PALETTE]
- 4 to 6 colors as hex codes with 1-2 word labels. Example:
#0f172a - deep navy
#eab308 - gold

[KEYWORDS]
- 8 to 12 short vibe words, comma-separated.

[DESCRIPTION]
- 1 short paragraph describing the moodboard like a Pinterest board.

[PROMPTS]
- 3 to 4 image prompts (numbered list), each 1–2 lines, ready for generative image tools like Midjourney or DALL·E.
`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // change to another model if needed
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI error:", openaiRes.status, errText);
      return res
        .status(500)
        .json({ error: "OpenAI error", status: openaiRes.status, detail: errText });
    }

    const data = await openaiRes.json();
    const text = data.choices[0].message.content.trim();

    return res.status(200).json({ text });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server error", detail: String(err) });
  }
}
