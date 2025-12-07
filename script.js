document.addEventListener("DOMContentLoaded", () => {
  // DOM elements
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

  // Our backend route on Vercel
  const API_URL = "/api/moodboard";

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
1–3 sentences describing the moodboard like a Pinterest board, in plain text.

[PROMPTS]
1. A detailed image prompt for a generative image model (Midjourney / DALL·E).
2. Another detailed image prompt.
3. Another detailed image prompt.
`;
  }

  async function callMoodboardAPI(theme, useCase, style, intensity) {
    const res = await fetch(API_URL, {
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

  // More robust section extraction
  function extractSection(text, marker) {
    // marker will be like "[PALETTE]", "[KEYWORDS]" etc.
    const regex = new RegExp(
      `${marker}\\s*([\\s\\S]*?)(?=\\n\\s*\\[|$)`,
      "i"
    );
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

      const palette = extractSection(aiText, "\\[PALETTE\\]");
      const keywords = extractSection(aiText, "\\[KEYWORDS\\]");
      const description = extractSection(aiText, "\\[DESCRIPTION\\]");
      const prompts = extractSection(aiText, "\\[PROMPTS\\]");

      renderPalette(palette || "");
      renderKeywords(keywords || "");
      descriptionEl.textContent = description || "No description parsed.";
      promptsEl.textContent = prompts || "No prompts parsed.";

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
});
