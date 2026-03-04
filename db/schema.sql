CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    url TEXT,
    date_posted TEXT,
    site TEXT,
    seen_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ran_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    jobs_found INTEGER,
    jobs_new INTEGER,
    jobs_sent INTEGER
);

-- Fast lookup for title+company dedup
CREATE INDEX IF NOT EXISTS idx_title_company 
ON jobs(title, company);