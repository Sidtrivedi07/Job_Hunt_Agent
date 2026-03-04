import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";

const DB_PATH = path.join(process.cwd(), "db", "jobs.db");
const SCHEMA_PATH = path.join(process.cwd(), "db", "schema.sql");

function getDB(): Database.Database {
  const db = new Database(DB_PATH);
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  db.exec(schema);
  return db;
}

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

// Single function that does everything:
// 1. Dedupe within the batch (same job appearing twice in one scrape)
// 2. Filter out jobs already in DB (seen in previous runs)
// 3. Save new unique jobs to DB
// 4. Return only the new unique jobs
export function processJobs(jobs: Job[]): Job[] {
  const db = getDB();

  // Step 1: Dedupe within this batch by ID
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
  // Check BOTH job ID and title+company combo
  const newJobs: Job[] = [];
  let crossPlatformDupes = 0;

  for (const job of uniqueBatch) {
    // Check 1: Same ID already in DB?
    const existingById = db
      .prepare("SELECT id FROM jobs WHERE id = ?")
      .get(job.id);

    if (existingById) continue;

    // Check 2: Same title+company already in DB (cross-platform dupe)?
    const existingByTitleCompany = db
      .prepare(`
        SELECT id, site FROM jobs 
        WHERE LOWER(title) = LOWER(?) 
        AND LOWER(company) = LOWER(?)
      `)
      .get(job.title, job.company);

    if (existingByTitleCompany) {
      const dupe = existingByTitleCompany as { id: string; site: string };
      console.log(`🔀 Cross-platform dupe: "${job.title} @ ${job.company}" (${job.site} = ${dupe.site})`);
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
    const insert = db.prepare(`
      INSERT OR IGNORE INTO jobs (id, title, company, location, url, date_posted, site)
      VALUES (@id, @title, @company, @location, @url, @date_posted, @site)
    `);

    const insertMany = db.transaction((jobs: Job[]) => {
      for (const job of jobs) insert.run(job);
    });

    insertMany(newJobs);
    console.log(`💾 Saved ${newJobs.length} new jobs to DB`);
  }

  db.close();

  // Step 4: Return only new unique jobs
  return newJobs;
}

export function logRun(log: RunLog): void {
  const db = getDB();
  db.prepare(`
    INSERT INTO runs (jobs_found, jobs_new, jobs_sent)
    VALUES (@jobs_found, @jobs_new, @jobs_sent)
  `).run(log);
  db.close();
}

export function getRunHistory(): RunLog[] {
  const db = getDB();
  const rows = db
    .prepare("SELECT * FROM runs ORDER BY ran_at DESC LIMIT 10")
    .all();
  db.close();
  return rows as RunLog[];
}