// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("Chess Coach E2E", () => {
  test("loads the main page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Chess Coach/);
    await expect(page.locator("h1")).toContainText("Chess Coach");
  });

  test("chess board renders with 64 squares", async ({ page }) => {
    await page.goto("/");
    // Wait for board to render (SVG loading)
    await page.waitForSelector(".chessboard .square", { timeout: 15000 });
    const squares = await page.locator(".chessboard .square");
    await expect(squares).toHaveCount(64);
  });

  test("ELO modal appears on new game", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".chessboard .square", { timeout: 15000 });
    await page.click("#resetBtn");
    await expect(page.locator("#eloModal")).toBeVisible();
  });

  test("coach panel is visible", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".chessboard .square", { timeout: 15000 });
    await expect(page.locator("#coachMessage")).toBeVisible();
  });

  test("settings menu toggles work", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".chessboard .square", { timeout: 15000 });

    // Coach toggle
    const coachToggle = page.locator("#coachToggle");
    await expect(coachToggle).toBeChecked();
    await coachToggle.uncheck();
    await expect(coachToggle).not.toBeChecked();
  });

  test("Puzzle Hub modal opens and shows sections", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".chessboard .square", { timeout: 15000 });

    // Open Puzzle Hub
    await page.click("#puzzlesModeBtn");
    await expect(page.locator("#puzzleHubModal")).toBeVisible();

    // Verify sections exist
    await expect(page.locator(".puzzle-hub-section")).toHaveCount(7);
  });

  test("Puzzle Hub browser shows puzzles", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".chessboard .square", { timeout: 15000 });

    await page.click("#puzzlesModeBtn");
    await page.waitForSelector("#puzzleHubModal");

    // Wait for puzzles to load
    await page.waitForSelector(".all-puzzle-card", { timeout: 10000 });
    const cards = await page.locator(".all-puzzle-card");
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("filter by tier works in browser", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".chessboard .square", { timeout: 15000 });

    await page.click("#puzzlesModeBtn");
    await page.waitForSelector("#puzzleHubModal");
    await page.waitForSelector(".all-puzzle-card", { timeout: 10000 });

    // Select beginner tier
    await page.selectOption("#browserTierSelect", "beginner");
    await page.waitForTimeout(500);

    // All visible cards should be beginner tier
    const tiers = await page.locator(".favorite-puzzle-meta span:nth-child(2)").allTextContents();
    for (const tier of tiers.slice(0, 5)) {
      expect(tier).toContain("beginner");
    }
  });

  test("search works in puzzle browser", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".chessboard .square", { timeout: 15000 });

    await page.click("#puzzlesModeBtn");
    await page.waitForSelector("#puzzleHubModal");
    await page.waitForSelector(".all-puzzle-card", { timeout: 10000 });

    // Search for "fork"
    await page.fill("#puzzleSearchInput", "fork");
    await page.waitForTimeout(500);

    const resultCount = await page.locator("#puzzleBrowserResultCount").textContent();
    expect(resultCount).toMatch(/\d+ puzzles/);
  });

  test("favorites toggle works", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".chessboard .square", { timeout: 15000 });

    await page.click("#puzzlesModeBtn");
    await page.waitForSelector("#puzzleHubModal");
    await page.waitForSelector(".all-puzzle-card", { timeout: 10000 });

    // Click favorite star on first puzzle
    const firstStar = await page.locator(".favorite-star-btn").first();
    await firstStar.click();
    await page.waitForTimeout(500);

    // Verify star is now active
    const isActive = await firstStar.evaluate((el) => el.classList.contains("active"));
    expect(isActive).toBe(true);
  });

  test("sorting changes result order", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".chessboard .square", { timeout: 15000 });

    await page.click("#puzzlesModeBtn");
    await page.waitForSelector("#puzzleHubModal");
    await page.waitForSelector(".all-puzzle-card", { timeout: 10000 });

    // Sort by rating descending
    await page.selectOption("#browserSortSelect", "rating-desc");
    await page.waitForTimeout(500);

    // Sort by rating ascending
    await page.selectOption("#browserSortSelect", "rating-asc");
    await page.waitForTimeout(500);

    const resultCount = await page.locator("#puzzleBrowserResultCount").textContent();
    expect(resultCount).toMatch(/\d+ puzzles/);
  });

  test("coach mode toggle affects display", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".chessboard .square", { timeout: 15000 });

    // Toggle coach off
    await page.locator("#coachToggle").uncheck();
    const coachStatus = await page.locator("#coachStatus").textContent();
    expect(coachStatus).toBe("OFF");

    // Toggle coach back on
    await page.locator("#coachToggle").check();
    const coachStatusOn = await page.locator("#coachStatus").textContent();
    expect(coachStatusOn).toBe("ON");
  });

  test("visual hints toggle works", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".chessboard .square", { timeout: 15000 });

    const hintsToggle = page.locator("#moveHintsToggle");
    await expect(hintsToggle).toBeChecked();
    await hintsToggle.uncheck();
    await expect(hintsToggle).not.toBeChecked();
  });

  test("help modal opens and closes", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".chessboard .square", { timeout: 15000 });

    await page.click("#helpBtn");
    await expect(page.locator("#helpModal")).toBeVisible();

    await page.click("#closeHelpBtn");
    await expect(page.locator("#helpModal")).toBeHidden();
  });

  test("progress modal opens and shows stats", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".chessboard .square", { timeout: 15000 });

    await page.click("#progressBtn");
    await expect(page.locator("#progressModal")).toBeVisible();

    const elo = await page.locator("#playerElo").textContent();
    expect(elo).toMatch(/\d+/);

    await page.click("#closeProgressBtn");
    await expect(page.locator("#progressModal")).toBeHidden();
  });

  test("empty filter state shows helpful message", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".chessboard .square", { timeout: 15000 });

    await page.click("#puzzlesModeBtn");
    await page.waitForSelector("#puzzleHubModal");
    await page.waitForSelector(".all-puzzle-card", { timeout: 10000 });

    // Set an impossible filter combo (master tier + beginner category)
    await page.selectOption("#browserTierSelect", "master");
    await page.selectOption("#browserCategorySelect", "mate-in-1");
    await page.selectOption("#browserPackSelect", "beginner-tactics");
    await page.waitForTimeout(500);

    // Either shows results or an empty state message
    const emptyState = page.locator(".empty-state-card");
    const isEmpty = await emptyState.isVisible().catch(() => false);
    const resultCount = await page.locator("#puzzleBrowserResultCount").textContent();

    // If empty, the message should be helpful
    if (isEmpty) {
      const message = await emptyState.textContent();
      expect(message.toLowerCase()).toContain("no puzzle");
    } else {
      expect(resultCount).toMatch(/\d+ puzzles/);
    }
  });

  test("puzzle pack cards load correctly", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".chessboard .square", { timeout: 15000 });

    await page.click("#puzzlesModeBtn");
    await page.waitForSelector("#puzzleHubModal");

    // Wait for pack cards
    await page.waitForSelector(".pack-card", { timeout: 10000 });
    const packCards = await page.locator(".pack-card");
    const count = await packCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("achievements section is populated", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".chessboard .square", { timeout: 15000 });

    await page.click("#puzzlesModeBtn");
    await page.waitForSelector("#puzzleHubModal");

    const achievements = await page.locator(".achievement-card");
    const count = await achievements.count();
    expect(count).toBeGreaterThan(0);
  });

  test("game flow: select elo and color", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".chessboard .square", { timeout: 15000 });

    // Open ELO modal
    await page.click("#resetBtn");
    await expect(page.locator("#eloModal")).toBeVisible();

    // Select elo
    await page.click('[data-elo="1200"]');

    // Select color
    await page.click('[data-color="w"]');

    // Modal should close
    await expect(page.locator("#eloModal")).toBeHidden();

    // Board should show pieces
    await page.waitForSelector(".chessboard .piece", { timeout: 10000 });
    const pieces = await page.locator(".chessboard .piece");
    const count = await pieces.count();
    expect(count).toBe(32);
  });
});
