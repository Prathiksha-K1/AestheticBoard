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

  // === API endpoints ===
  const MOODBOARD_API_URL = "/api/moodboard";
  const IMAGES_API_URL = "/api/images";

  // === Prompt builder ===
  function buildPrompt(theme, useCase, style, intensity) {
    return `
You are a senior art director and AI prompt engineer.

Create a cohesive aesthetic moodboard based on:
- Theme keywords: ${theme}
- Primary use case: ${useCase}
- Style preset: ${style}
- Intensity: ${intensity}

Respond EXACTLY in this structure:

[PALETTE]
- #hexcode - color name (4–6 colors)

[KEYWORDS]
word1, word2, word3, word4, word5, word6

[DESCRIPTION]
1–3 aesthetic sentences.

[PROMPTS]
1. detailed image prompt
2. detailed image prompt
3. detailed image prompt
`;
  }

  // === API Calls ===
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

    if (!res.ok) throw new Error("Image API error");

    const data = await res.json();
    return data.urls || [];
  }

  // === Helpers ===
  function extractSection(text, label) {
    const regex = new RegExp(`\\[${label}\\]\\s*([\\s\\S]*?)(?=\\n\\s*\\[|$)`, "i");
    const match = text.match(regex);
    return match ? match[1].trim() : "";
  }

  function renderPalette(paletteText) {
    paletteSwatchesEl.innerHTML = "";
    paletteTextEl.textContent = paletteText;

    const lines = paletteText.split("\n").map((l) => l.trim()).filter(Boolean);
    lines.forEach((line) => {
      let hex = "";
      const idx = line.indexOf("#");
      if (idx !== -1) hex = line.slice(idx).split(" ")[0];

      if (!/^#[0-9a-fA-F]{3,8}$/.test(hex)) return;

      const swatch = document.createElement("div");
      swatch.className = "swatch";
      swatch.style.background = hex;
      swatch.textContent = hex.toUpperCase();
      paletteSwatchesEl.appendChild(swatch);
    });
  }

  function renderKeywords(text) {
    keywordsEl.innerHTML = "";
    if (!text) return;

    text
      .split(/,|\n|·|•/g)
      .map((k) => k.trim())
      .filter(Boolean)
      .forEach((word) => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = word;
        keywordsEl.appendChild(chip);
      });
  }

  function parsePromptsToArray(promptsText) {
    return promptsText
      .split("\n")
      .map((line) => line.replace(/^\d+\.\s*/, "").trim())
      .filter(Boolean);
  }

  // === Fallback image generator ===
  function generateFallbackImages() {
    imageGridEl.innerHTML = "";

    const swatches = [...paletteSwatchesEl.querySelectorAll(".swatch")];
    let colors = swatches.map((s) =>
      window.getComputedStyle(s).backgroundColor
    );

    if (colors.length === 0) colors = ["#4b5563", "#111827", "#9ca3af"];

    for (let i = 0; i < 3; i++) {
      const card = document.createElement("div");
      card.className = "image-card";

      const inner = document.createElement("div");
      inner.style.width = "100%";
      inner.style.height = "100%";

      const c1 = colors[i % colors.length];
      const c2 = colors[(i + 1) % colors.length];

      inner.style.background = `linear-gradient(135deg, ${c1}, ${c2})`;

      card.appendChild(inner);
      imageGridEl.appendChild(card);
    }
  }

  // === Generate Moodboard ===
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

    generateBtn.disabled = true;
    loaderEl.classList.remove("hidden");

    try {
      const aiText = await callMoodboardAPI(theme, useCase, style, intensity);

      const palette = extractSection(aiText, "PALETTE");
      const keywords = extractSection(aiText, "KEYWORDS");
      const description = extractSection(aiText, "DESCRIPTION");
      const prompts = extractSection(aiText, "PROMPTS");

      renderPalette(palette || "");
      renderKeywords(keywords || "");
      descriptionEl.textContent = description || "No description parsed.";
      promptsEl.textContent = prompts || "No prompts parsed.";

      if (prompts && prompts.trim().length > 0) {
        generateImagesBtn.disabled = false;
      }

      resultsEl.classList.remove("hidden");
    } catch (err) {
      console.error(err);
      errorEl.textContent = "Moodboard generation failed. Try again.";
    } finally {
      loaderEl.classList.add("hidden");
      generateBtn.disabled = false;
    }
  });

  // === Generate Images ===
  generateImagesBtn.addEventListener("click", async () => {
    const promptsText = promptsEl.textContent || "";
    const promptsArray = parsePromptsToArray(promptsText).slice(0, 3);

    if (promptsArray.length === 0) {
      errorEl.textContent = "No prompts available.";
      return;
    }

    errorEl.textContent = "";
    imageGridEl.innerHTML = "";
    imageLoaderEl.classList.remove("hidden");

    try {
      const urls = await callImagesAPI(promptsArray);

      imageGridEl.innerHTML = "";

      urls.forEach((url) => {
        const card = document.createElement("div");
        card.className = "image-card";
        const img = document.createElement("img");
        img.src = url;
        card.appendChild(img);
        imageGridEl.appendChild(card);
      });

      errorEl.textContent = "AI-generated images created successfully ✨";

    } catch (err) {
      console.error("Image API unavailable, using fallback:", err);
      errorEl.textContent = "Generated AI-inspired aesthetic tiles from your palette ✨";
      generateFallbackImages();
    } finally {
      imageLoaderEl.classList.add("hidden");
      generateImagesBtn.disabled = false;
    }
  });
});
