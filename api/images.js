// api/images.js
// Stability AI – v2beta image generation (multipart/form-data)

const FormData = require("form-data");

module.exports = async function (req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompts } = req.body || {};

    if (!Array.isArray(prompts) || prompts.length === 0) {
      return res.status(400).json({ error: "No prompts provided" });
    }

    const key = process.env.STABILITY_API_KEY;
    if (!key) {
      return res.status(500).json({ error: "Missing STABILITY_API_KEY" });
    }

    const urls = [];
    const limitedPrompts = prompts.slice(0, 3);

    for (const prompt of limitedPrompts) {
      const form = new FormData();

      form.append("prompt", prompt);
      form.append("output_format", "png");

      const response = await fetch(
        "https://api.stability.ai/v2beta/stable-image/generate/core",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            ...form.getHeaders(),
          },
          body: form,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Stability API error:", response.status, errorText);
        continue;
      }

      const result = await response.json();
      const b64 = result?.image_base64;

      if (b64) {
        urls.push(`data:image/png;base64,${b64}`);
      }
    }

    if (urls.length === 0) {
      return res.status(500).json({
        error: "Stability API returned no images.",
      });
    }

    return res.status(200).json({ urls });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({
      error: "Server error",
      detail: String(err),
    });
  }
};
