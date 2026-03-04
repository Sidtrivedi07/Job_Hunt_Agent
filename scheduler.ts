import { execSync } from "child_process";
import * as cron from "node-cron";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";
import { initDB, processJobs, logRun, closeDB, Job } from "./db/repository";

config();



async function runPipeline(): Promise<void> {
  console.log(`\n⏰ [${new Date().toLocaleTimeString()}] Running pipeline...`);

  try {
    // Step 1: Scrape
    console.log("🔍 Scraping jobs...");
    execSync("python scraper/scrape.py", { stdio: "inherit" });

    // Step 2: Load raw results
    const filePath = path.join(process.cwd(), "scraper", "results.json");
    const rawJobs: Job[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    console.log(`📦 Scraped: ${rawJobs.length} raw jobs`);

    // Step 3: Repository handles dedup + save
    const newJobs = await processJobs(rawJobs);

    if (newJobs.length === 0) {
      console.log("📭 No new jobs this run — nothing sent to Discord");
      await logRun({ jobs_found: rawJobs.length, jobs_new: 0, jobs_sent: 0 });
      return;
    }

    // Step 4: Write only new jobs for Discord
    fs.writeFileSync(filePath, JSON.stringify(newJobs, null, 2));

    // Step 5: Notify Discord
    console.log("📨 Sending to Discord...");
    execSync("npx ts-node notifier/discord.ts", { stdio: "inherit" });

    // Step 6: Log this run
    await logRun({
      jobs_found: rawJobs.length,
      jobs_new: newJobs.length,
      jobs_sent: newJobs.length,
    });

    console.log("✅ Pipeline complete!");

  } catch (err) {
    const error = err as Error;
    console.error("❌ Pipeline failed:", error.message);
  }
}

async function main(): Promise<void> {
  console.log("🤖 Job Hunt Agent started — running every 2 hours");

  // Initialize DB tables
  await initDB();

  console.log("⏰ First run starting now...\n");

  // Run immediately
  await runPipeline();

  // Then every 2 hours
  cron.schedule("0 */2 * * *", runPipeline);
}

main().catch(console.error);