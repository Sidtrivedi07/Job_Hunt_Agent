import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

config();

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL as string;

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  date_posted: string;
  site: string;
}

async function sendJob(job: Job): Promise<void> {
  const embed = {
    embeds: [
      {
        title: `💼 ${job.title} @ ${job.company}`,
        url: job.url,
        color: 0x4f46e5,
        fields: [
          {
            name: "📍 Location",
            value: job.location || "Not listed",
            inline: true,
          },
          {
            name: "🌐 Source",
            value: job.site || "Unknown",
            inline: true,
          },
          {
            name: "📅 Posted",
            value: job.date_posted || "Recently",
            inline: true,
          },
          {
            name: "🔗 Apply",
            value: `[Click here to apply](${job.url})`,
            inline: false,
          },
        ],
        footer: {
          text: "Job Hunt Agent 🤖 | Apply while it's fresh!",
        },
      },
    ],
  };

  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(embed),
  });

  // Discord rate limit — 1 message per second
  await new Promise((r) => setTimeout(r, 1000));
}

async function main(): Promise<void> {
  if (!WEBHOOK_URL) {
    console.error("❌ DISCORD_WEBHOOK_URL not found in .env");
    process.exit(1);
  }

  const filePath = path.join(process.cwd(), "scraper", "results.json");
  const jobs: Job[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  if (jobs.length === 0) {
    console.log("📭 No new jobs to send");
    return;
  }

  // Send summary first
  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: `🚨 **Job Hunt Agent** found **${jobs.length} fresh jobs** in Ontario!\n─────────────────────────`,
    }),
  });

  await new Promise((r) => setTimeout(r, 1000));

  // Send each job
  for (const job of jobs) {
    await sendJob(job);
    console.log(`✅ Sent: ${job.title} @ ${job.company}`);
  }

  console.log(`\n🎉 Done! ${jobs.length} jobs sent to Discord`);
}

main().catch(console.error);