// api/images.js
// Serverless function for generating images from prompts using OpenAI Images API

module.exports = async function (req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompts } = req.body || {};

    if (!Array.isArray(prompts) || prompts.length === 0) {
      return res.status(400).json({ error: "No prompts provided" });
    }

    const limitedPrompts = prompts.slice(0, 3); // up to 3 images
    const urls = [];

    for (const prompt of limitedPrompts) {
      const openaiRes = await fetch(
        "https://api.openai.com/v1/images/generations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-image-1", // or "dall-e-3" depending on your access
            prompt,
            n: 1,
            size: "512x512",
          }),
        }
      );

      if (!openaiRes.ok) {
        const errText = await openaiRes.text();
        console.error("OpenAI image error:", openaiRes.status, errText);
        return res.status(500).json({
          error: "OpenAI image error",
          status: openaiRes.status,
          detail: errText,
        });
      }

      const data = await openaiRes.json();
      if (data.data && data.data[0] && data.data[0].url) {
        urls.push(data.data[0].url);
      }
    }

    return res.status(200).json({ urls });
  } catch (err) {
    console.error("Server error (images):", err);
    return res
      .status(500)
      .json({ error: "Server error", detail: String(err) });
  }
};
