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

  const API_URL = "/api/moodboard"; // our backend route

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

  function extractSection(text, marker) {
    const parts = text.split(marker);
    if (parts.length < 2) return "";
    const rest = parts[1];
    const nextMarkerIndex = rest.indexOf("[");
    if (nextMarkerIndex === -1) return rest.trim();
    return rest.slice(0, nextMarkerIndex).trim();
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

    generateBtn.disabled = true;
    loaderEl.classList.remove("hidden");

    try {
      const aiText = await callMoodboardAPI(theme, useCase, style, intensity);
      console.log("AI response:", aiText);

      const palette = extractSection(aiText, "[PALETTE]");
      const keywords = extractSection(aiText, "[KEYWORDS]");
      const description = extractSection(aiText, "[DESCRIPTION]");
      const prompts = extractSection(aiText, "[PROMPTS]");

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
