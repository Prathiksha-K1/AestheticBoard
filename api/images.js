// api/images.js
// Serverless function for generating images from prompts using OpenAI Images API
// Tries multiple models: gpt-image-1, then dall-e-3. If all fail, frontend will show placeholders.

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
    const MODELS = ["gpt-image-1", "dall-e-3"]; // try in this order

    for (const prompt of limitedPrompts) {
      let imageUrl = null;

      for (const model of MODELS) {
        try {
          const openaiRes = await fetch(
            "https://api.openai.com/v1/images/generations",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              },
              body: JSON.stringify({
                model,
                prompt,
                n: 1,
                size: "1024x1024", // supported sizes: 1024x1024, 1024x1536, 1536x1024, auto
              }),
            }
          );

          if (!openaiRes.ok) {
            const errText = await openaiRes.text();
            console.error(
              `IMAGE GENERATION ERROR with model ${model}:`,
              openaiRes.status,
              errText
            );
            // Try next model instead of failing immediately
            continue;
          }

          const data = await openaiRes.json();
          imageUrl = data?.data?.[0]?.url || null;
          if (imageUrl) break; // success for this prompt+model
        } catch (innerErr) {
          console.error(`Image generation exception for model ${model}:`, innerErr);
          // Try next model
          continue;
        }
      }

      if (imageUrl) {
        urls.push(imageUrl);
      }
    }

    // If at least one image URL was generated, return them
    if (urls.length > 0) {
      return res.status(200).json({ urls });
    }

    // If no URLs at all, let frontend fallback handle visuals
    return res.status(500).json({
      error:
        "All image models failed or are not accessible. No image URLs generated.",
    });
  } catch (err) {
    console.error("Server error (images):", err);
    return res.status(500).json({
      error: "Server error",
      detail: String(err),
    });
  }
};