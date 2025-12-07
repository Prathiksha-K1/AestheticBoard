module.exports = async function (req, res) {
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
...
`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI error:", openaiRes.status, errText);
      return res.status(500).json({ error: "OpenAI error", detail: errText });
    }

    const data = await openaiRes.json();
    const text = data.choices[0].message.content.trim();
    return res.status(200).json({ text });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server error", detail: String(err) });
  }
};
