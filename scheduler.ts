import { execSync } from "child_process";
import * as cron from "node-cron";
import { config } from "dotenv";

config();

function runPipeline(): void {
  console.log(`\n⏰ [${new Date().toLocaleTimeString()}] Running pipeline...`);

  try {
    // Step 1: Scrape
    console.log("🔍 Scraping jobs...");
    execSync("python scraper/scrape.py", { stdio: "inherit" });

    // Step 2: Notify Discord
    console.log("📨 Sending to Discord...");
    execSync("npx ts-node notifier/discord.ts", { stdio: "inherit" });

    console.log("✅ Pipeline complete!");
  } catch (err) {
    const error = err as Error;
    console.error("❌ Pipeline failed:", error.message);
  }
}

console.log("🤖 Job Hunt Agent started — running every 2 hours");
console.log("⏰ First run starting now...\n");

// Run immediately on start
runPipeline();

// Then every 2 hours
cron.schedule("0 */2 * * *", runPipeline);