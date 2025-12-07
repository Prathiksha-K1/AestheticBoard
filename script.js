document.addEventListener("DOMContentLoaded", () => {
  // === DOM elements ===
  const themeEl = document.getElementById("theme");
  const useCaseEl = document.getElementById("useCase");
  const styleEl = document.getElementById("style");
  const intensityEl = document.getElementById("intensity");

  const generateBtn = document.getElementById("generateBtn");
  const errorEl = document.getElementById("error");
  const loaderEl = document.getElementById("loader");
  const resultsEl = document.getElementById("results");

  const paletteSwatchesEl = document.getElementById("paletteSwatches");
  const paletteTextEl = document.getElementById("paletteText");
  const keywordsEl = document.getElementById("keywords");
  const descriptionEl = document.getElementById("description");
  const promptsEl = document.getElementById("prompts");

  const generateImagesBtn = document.getElementById("generateImagesBtn");
  const imageLoaderEl = document.getElementById("imageLoader");
  const imageGridEl = document.getElementById("imageGrid");

  // === API endpoints (handled by Vercel serverless) ===
  const MOODBOARD_API_URL = "/api/moodboard";
  const IMAGES_API_URL = "/api/images";

  // === Prompt builder for moodboard ===
  function buildPrompt(theme, useCase, style, intensity) {
    return `
You are a senior art director and AI prompt engineer.

Create a cohesive aesthetic moodboard based on:
- Theme keywords: ${theme}
- Primary use case: ${useCase}
- Style preset: ${style}
- Intensity: ${intensity}

Respond EXACTLY in this structure and keep it short but rich:

[PALETTE]
- #hexcode - short color name (4–6 colors)

[KEYWORDS]
word1, word2, word3, word4, word5, word6, word7, word8

[DESCRIPTION]
1–3 sentences describing the moodboard like a Pinterest board.

[PROMPTS]
1. A detailed image prompt for a generative image model (Midjourney / DALL·E).
2. Another detailed image prompt.
3. Another detailed image prompt.
`;
  }

  // === API calls ===
  async function callMoodboardAPI(theme, useCase, style, intensity) {
    const res = await fetch(MOODBOARD_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme, useCase, style, intensity }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("Backend error:", err);
      throw new Error(err.error || "Backend error");
    }

    const data = await res.json();
    return data.text;
  }

  async function callImagesAPI(promptsArray) {
    const res = await fetch(IMAGES_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompts: promptsArray }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("Image backend error:", err);
      throw new Error(err.error || "Image backend error");
    }

    const data = await res.json();
    return data.urls || [];
  }

  // === Parsing helpers ===
  function extractSection(text, label) {
    // label: "PALETTE", "KEYWORDS", "DESCRIPTION", "PROMPTS"
    const regex = new RegExp(`\\[${label}\\]\\s*([\\s\\S]*?)(?=\\n\\s*\\[|$)`, "i");
    const match = text.match(regex);
    return match ? match[1].trim() : "";
  }

  function renderPalette(paletteText) {
    paletteSwatchesEl.innerHTML = "";
    paletteTextEl.textContent = paletteText;

    const lines = paletteText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    lines.forEach((line) => {
      let hex = "";
      const hashIndex = line.indexOf("#");
      if (hashIndex !== -1) {
        const afterHash = line.slice(hashIndex).split(" ")[0];
        hex = afterHash;
      }

      if (!/^#[0-9a-fA-F]{3,8}$/.test(hex)) return;

      const swatch = document.createElement("div");
      swatch.className = "swatch";
      swatch.style.background = hex;
      swatch.textContent = hex.toUpperCase();
      paletteSwatchesEl.appendChild(swatch);
    });
  }

  function renderKeywords(keywordsText) {
    keywordsEl.innerHTML = "";
    if (!keywordsText) return;

    const parts = keywordsText
      .split(/,|\n|·|•/g)
      .map((k) => k.trim())
      .filter(Boolean);

    parts.forEach((word) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = word;
      keywordsEl.appendChild(chip);
    });
  }

  function parsePromptsToArray(promptsText) {
    return promptsText
      .split("\n")
      .map((line) => line.replace(/^\d+\.\s*/, "").trim()) // remove "1. "
      .filter(Boolean);
  }

  // === Moodboard generation button ===
  generateBtn.addEventListener("click", async () => {
    const theme = themeEl.value.trim();
    const useCase = useCaseEl.value;
    const style = styleEl.value;
    const intensity = intensityEl.value;

    errorEl.textContent = "";
    resultsEl.classList.add("hidden");

    paletteSwatchesEl.innerHTML = "";
    paletteTextEl.textContent = "";
    keywordsEl.innerHTML = "";
    descriptionEl.textContent = "";
    promptsEl.textContent = "";
    imageGridEl.innerHTML = "";
    generateImagesBtn.disabled = true;

    if (!theme) {
      errorEl.textContent = "Please type some theme keywords first.";
      return;
    }

    const prompt = buildPrompt(theme, useCase, style, intensity);
    console.log("Prompt sent to backend:", prompt);

    generateBtn.disabled = true;
    loaderEl.classList.remove("hidden");

    try {
      const aiText = await callMoodboardAPI(theme, useCase, style, intensity);
      console.log("AI response:", aiText);

      const palette = extractSection(aiText, "PALETTE");
      const keywords = extractSection(aiText, "KEYWORDS");
      const description = extractSection(aiText, "DESCRIPTION");
      const prompts = extractSection(aiText, "PROMPTS");

      renderPalette(palette || "");
      renderKeywords(keywords || "");
      descriptionEl.textContent = description || "No description parsed.";
      promptsEl.textContent = prompts || "No prompts parsed.";

      // Enable or disable image generation button
      if (prompts && prompts.trim().length > 0) {
        generateImagesBtn.disabled = false;
      } else {
        generateImagesBtn.disabled = true;
      }

      resultsEl.classList.remove("hidden");
    } catch (err) {
      console.error(err);
      errorEl.textContent =
        "Moodboard generation failed. Please try again or check server logs.";
    } finally {
      loaderEl.classList.add("hidden");
      generateBtn.disabled = false;
    }
  });

  // === Image generation button ===
  generateImagesBtn.addEventListener("click", async () => {
    const promptsText = promptsEl.textContent || "";
    const promptsArray = parsePromptsToArray(promptsText).slice(0, 3); // up to 3 images

    if (promptsArray.length === 0) {
      errorEl.textContent = "No prompts available to generate images.";
      return;
    }

    errorEl.textContent = "";
    imageGridEl.innerHTML = "";
    imageLoaderEl.classList.remove("hidden");
    generateImagesBtn.disabled = true;

    try {
      const urls = await callImagesAPI(promptsArray);

      if (!urls.length) {
        errorEl.textContent = "Image generation failed. No URLs returned.";
        return;
      }

      urls.forEach((url) => {
        const card = document.createElement("div");
        card.className = "image-card";

        const img = document.createElement("img");
        img.src = url;
        img.alt = "AI generated moodboard image";

        card.appendChild(img);
        imageGridEl.appendChild(card);
      });
    } catch (err) {
      console.error(err);
      errorEl.textContent =
        "Image generation failed. Please try again or check server logs.";
    } finally {
      imageLoaderEl.classList.add("hidden");
      generateImagesBtn.disabled = false;
    }
  });
});
