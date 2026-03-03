import json
import sys
from jobspy import scrape_jobs

# Load profile
with open("config/profile.json", "r") as f:
    profile = json.load(f)

# Titles to exclude
EXCLUDE_TITLES = [
    "senior", "sr.", "sr ", "lead", "principal", "staff",
    "manager", "director", "head of", "ii", "iii", "iv",
    "mulesoft", "tlm", "workplace", "consultant"
]

# Titles that are clearly relevant
INCLUDE_KEYWORDS = [
    "software engineer", "software developer", "backend developer",
    "full stack", "fullstack", "swe", "early career", "junior",
    "node", "typescript", "python developer"
]

search_term = " OR ".join(profile["target_roles"][:2])

print(f"🔍 Searching: {search_term} | 📍 {profile['location']}")

try:
    jobs = scrape_jobs(
        site_name=["indeed", "linkedin"],
        search_term=search_term,
        location=profile["location"],
        results_wanted=30,
        hours_old=48,
        country_indeed="Canada"
    )

    print(f"📦 Raw results: {len(jobs)} jobs")

    output = []
    skipped = 0

    for _, job in jobs.iterrows():
        title = str(job.get("title", "")).lower()

        # Must contain at least one relevant keyword
        if not any(kw in title for kw in INCLUDE_KEYWORDS):
            skipped += 1
            continue

        # Must NOT contain exclusion words
        if any(word in title for word in EXCLUDE_TITLES):
            skipped += 1
            continue

        output.append({
            "id": str(job.get("id", "")),
            "title": str(job.get("title", "")),
            "company": str(job.get("company", "")),
            "location": str(job.get("location", "")),
            "url": str(job.get("job_url", "")),
            "date_posted": str(job.get("date_posted", "")),
            "site": str(job.get("site", ""))
        })

    # Overwrite file each run (not append)
    with open("scraper/results.json", "w") as f:
        json.dump(output, f, indent=2)

    print(f"✅ Kept: {len(output)} relevant jobs")
    print(f"🚫 Skipped: {skipped} irrelevant/senior roles")

except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)