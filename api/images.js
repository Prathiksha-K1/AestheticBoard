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
            model: "gpt-image-1",      // image model
            prompt: prompt,
            n: 1,
            size: "1024x1024"          // 👈 IMPORTANT: supported size
            // you could also use: size: "auto"
          }),
        }
      );

      if (!openaiRes.ok) {
        const errText = await openaiRes.text();
        console.error("IMAGE GENERATION ERROR:", openaiRes.status, errText);
        return res.status(500).json({
          error: "OpenAI image generation failed",
          detail: errText,
        });
      }

      const data = await openaiRes.json();
      const imageUrl = data?.data?.[0]?.url;

      if (imageUrl) {
        urls.push(imageUrl);
      }
    }

    return res.status(200).json({ urls });
  } catch (err) {
    console.error("Server error (images):", err);
    return res.status(500).json({
      error: "Server error",
      detail: String(err),
    });
  }
};