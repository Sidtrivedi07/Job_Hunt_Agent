import pool from "./connection";
import * as fs from "fs";
import * as path from "path";

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  date_posted: string;
  site: string;
}

export interface RunLog {
  jobs_found: number;
  jobs_new: number;
  jobs_sent: number;
}

// Create tables if they don't exist
export async function initDB(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT,
      url TEXT,
      date_posted TEXT,
      site TEXT,
      seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS runs (
      id SERIAL PRIMARY KEY,
      ran_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      jobs_found INTEGER,
      jobs_new INTEGER,
      jobs_sent INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_title_company 
    ON jobs(title, company);
  `);
  console.log("✅ DB initialized");
}

export async function processJobs(jobs: Job[]): Promise<Job[]> {
  // Step 1: Dedupe within this batch
  const seen = new Set<string>();
  const uniqueBatch: Job[] = [];
  for (const job of jobs) {
    if (!seen.has(job.id)) {
      seen.add(job.id);
      uniqueBatch.push(job);
    }
  }

  const withinRunDupes = jobs.length - uniqueBatch.length;
  if (withinRunDupes > 0) {
    console.log(`🔁 Removed ${withinRunDupes} duplicates within this scrape`);
  }

  // Step 2: Filter out jobs already in DB
  const newJobs: Job[] = [];
  let crossPlatformDupes = 0;

  for (const job of uniqueBatch) {
    // Check 1: Same ID already in DB?
    const { rows: byId } = await pool.query(
      "SELECT id FROM jobs WHERE id = $1",
      [job.id]
    );
    if (byId.length > 0) continue;

    // Check 2: Same title+company (cross-platform dupe)?
    const { rows: byTitleCompany } = await pool.query(
      `SELECT id, site FROM jobs 
       WHERE LOWER(title) = LOWER($1) 
       AND LOWER(company) = LOWER($2)`,
      [job.title, job.company]
    );

    if (byTitleCompany.length > 0) {
      console.log(`🔀 Cross-platform dupe: "${job.title} @ ${job.company}"`);
      crossPlatformDupes++;
      continue;
    }

    newJobs.push(job);
  }

  console.log(`✨ New jobs: ${newJobs.length}`);
  console.log(`🔀 Cross-platform dupes removed: ${crossPlatformDupes}`);
  console.log(`📋 Already seen in DB: ${uniqueBatch.length - newJobs.length - crossPlatformDupes}`);

  // Step 3: Save new jobs to DB
  if (newJobs.length > 0) {
    for (const job of newJobs) {
      await pool.query(
        `INSERT INTO jobs (id, title, company, location, url, date_posted, site)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [job.id, job.title, job.company, job.location, job.url, job.date_posted, job.site]
      );
    }
    console.log(`💾 Saved ${newJobs.length} new jobs to DB`);
  }

  return newJobs;
}

export async function logRun(log: RunLog): Promise<void> {
  await pool.query(
    `INSERT INTO runs (jobs_found, jobs_new, jobs_sent)
     VALUES ($1, $2, $3)`,
    [log.jobs_found, log.jobs_new, log.jobs_sent]
  );
}

export async function closeDB(): Promise<void> {
  await pool.end();
}