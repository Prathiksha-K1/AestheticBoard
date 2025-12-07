// api/images.js
// Use Stability AI (Stable Diffusion) for free-ish image generation (needs STABILITY_API_KEY)

module.exports = async function (req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompts } = req.body || {};

    if (!Array.isArray(prompts) || prompts.length === 0) {
      return res.status(400).json({ error: "No prompts provided" });
    }

    if (!process.env.STABILITY_API_KEY) {
      return res
        .status(500)
        .json({ error: "Missing STABILITY_API_KEY in environment" });
    }

    const limitedPrompts = prompts.slice(0, 3); // up to 3 images
    const urls = [];

    for (const prompt of limitedPrompts) {
      const stabilityRes = await fetch(
        "https://api.stability.ai/v1/generation/stable-diffusion-v1-5/text-to-image",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
          },
          body: JSON.stringify({
            text_prompts: [{ text: prompt }],
            cfg_scale: 7,
            height: 512,
            width: 512,
            samples: 1,
            steps: 30,
          }),
        }
      );

      if (!stabilityRes.ok) {
        const errText = await stabilityRes.text();
        console.error(
          "Stability image error:",
          stabilityRes.status,
          errText
        );
        // Continue to next prompt instead of breaking everything
        continue;
      }

      const data = await stabilityRes.json();
      const b64 = data?.artifacts?.[0]?.base64;

      if (b64) {
        // Data URL is directly usable by <img src="...">
        const dataUrl = `data:image/png;base64,${b64}`;
        urls.push(dataUrl);
      }
    }

    if (!urls.length) {
      return res.status(500).json({
        error:
          "Stability API returned no images. Check credits / key / logs.",
      });
    }

    return res.status(200).json({ urls });
  } catch (err) {
    console.error("Server error (images via Stability):", err);
    return res.status(500).json({
      error: "Server error",
      detail: String(err),
    });
  }
};