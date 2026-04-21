#!/usr/bin/env python3
"""Build out/library/career_timeline.json from memoir corpus. Only events with explicit story references and excerpts."""

import json
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
OUT_DIR = BASE / "out"
LIBRARY_DIR = OUT_DIR / "library"
TIMELINE_JSON = LIBRARY_DIR / "career_timeline.json"
SOURCES_MD = LIBRARY_DIR / "career_timeline_sources.md"

# Curated timeline: only events explicitly stated in corpus. Excerpts <=25 words.
TIMELINE = [
    {
        "year": 1959,
        "event": "Entered college",
        "role": "Student",
        "organization": "Mississippi Southern College (USM)",
        "location": "Hattiesburg, Mississippi",
        "story_reference": "P1_S36",
        "source_excerpt": "Mississippi Southern College in the autumn of 1959, neither of them realizing the presence of the other.",
        "confidence": "high",
    },
    {
        "year": 1959,
        "event": "Elected president of Student Government Association",
        "role": "SGA President",
        "organization": "University of Southern Mississippi",
        "location": "Hattiesburg, Mississippi",
        "story_reference": "P1_S36",
        "source_excerpt": "When I was elected president of the SGA, I immediately appointed Charlie as my administrative assistant.",
        "confidence": "high",
    },
    {
        "year": 1962,
        "event": "Job search and office visits to accounting firms",
        "role": "Senior",
        "organization": "USM",
        "location": "New Orleans, Houston, Jackson",
        "story_reference": "P1_S16",
        "source_excerpt": "In the final three months of 1962. In the midst of all the important distractions of my senior year at USM.",
        "confidence": "high",
    },
    {
        "year": 1962,
        "event": "Chose Peat Marwick, Jackson office",
        "role": "Incoming staff",
        "organization": "Peat Marwick Mitchell & Co.",
        "location": "Jackson, Mississippi",
        "story_reference": "P1_S16",
        "source_excerpt": "we decided to accept the Peat Marwick offer in Jackson, notwithstanding the fact that the salary was the lowest.",
        "confidence": "high",
    },
    {
        "year": 1963,
        "event": "Graduated from University of Southern Mississippi",
        "role": "Graduate",
        "organization": "University of Southern Mississippi",
        "location": "Hattiesburg, Mississippi",
        "story_reference": "P1_S17",
        "source_excerpt": "My story begins as I disrobed from a cap and gown following graduation ceremonies at the University of Southern Mississippi in 1963.",
        "confidence": "high",
    },
    {
        "year": 1963,
        "event": "Married Dot at First Baptist Church",
        "role": None,
        "organization": "First Baptist Church",
        "location": "Mississippi",
        "story_reference": "P1_S39",
        "source_excerpt": "As I stood at the altar in the First Baptist Church in 1963, my mind raced a million miles an hour.",
        "confidence": "high",
    },
    {
        "year": 1963,
        "event": "Joined Peat Marwick; first paycheck; United Way payroll deduction began",
        "role": "Staff accountant",
        "organization": "Peat Marwick",
        "location": "Jackson, Mississippi",
        "story_reference": "P1_S38",
        "source_excerpt": "Our financial contributions started with a modest payroll deduction from my first paycheck at Peat Marwick in 1963.",
        "confidence": "high",
    },
    {
        "year": 1968,
        "event": "First son Paul born",
        "role": "Father",
        "organization": "St. Dominic Hospital",
        "location": "Jackson, Mississippi",
        "story_reference": "P1_S34",
        "source_excerpt": "Paul arrived in our lives on May 1, 1968, at St. Dominic Hospital in Jackson.",
        "confidence": "high",
    },
    {
        "year": 1970,
        "event": "Became partner at Peat Marwick",
        "role": "Partner",
        "organization": "Peat Marwick",
        "location": "Jackson, Mississippi",
        "story_reference": "P1_S19",
        "source_excerpt": "My early days as a Peat Marwick partner, beginning in July 1970.",
        "confidence": "high",
    },
    {
        "year": 1971,
        "event": "Moved to Orlando to establish new Peat Marwick office",
        "role": "Managing partner",
        "organization": "Peat Marwick",
        "location": "Orlando, Florida",
        "story_reference": "P1_S20",
        "source_excerpt": "So, we loaded up our virtual covered wagon and off we went to Orlando in August 1971.",
        "confidence": "high",
    },
    {
        "year": 1971,
        "event": "Second son John born",
        "role": "Father",
        "organization": "Orange Memorial Hospital",
        "location": "Orlando, Florida",
        "story_reference": "P1_S34",
        "source_excerpt": "John was born on October 29, 1971, at Orange Memorial Hospital in Orlando.",
        "confidence": "high",
    },
    {
        "year": 1975,
        "event": "Relocated to Fort Lauderdale as managing partner",
        "role": "Managing partner",
        "organization": "Peat Marwick",
        "location": "Fort Lauderdale, Florida",
        "story_reference": "P1_S21",
        "source_excerpt": "We arrived in Fort Lauderdale in the summer of 1975.",
        "confidence": "high",
    },
    {
        "year": 1977,
        "event": "Third son Mark born",
        "role": "Father",
        "organization": "Holy Cross Hospital",
        "location": "Fort Lauderdale, Florida",
        "story_reference": "P1_S34",
        "source_excerpt": "Mark was our third gift, delivered on April 11, 1977, at Holy Cross Hospital in Fort Lauderdale.",
        "confidence": "high",
    },
    {
        "year": 1989,
        "event": "Asked to move to Baltimore; became managing partner",
        "role": "Managing partner",
        "organization": "KPMG",
        "location": "Baltimore, Maryland",
        "story_reference": "P1_S22",
        "source_excerpt": "KPMG asked us to move there in 1989. The Baltimore office had been an important cog in the KPMG wheel.",
        "confidence": "high",
    },
    {
        "year": 1990,
        "event": "Invited to dinner at Governor's mansion, Maryland",
        "role": "KPMG executive",
        "organization": None,
        "location": "Annapolis, Maryland",
        "story_reference": "P1_S39",
        "source_excerpt": "In 1990 I was invited to a dinner at the Governor's mansion in Maryland.",
        "confidence": "high",
    },
    {
        "year": 1991,
        "event": "Arrived in Philadelphia as managing partner",
        "role": "Managing partner",
        "organization": "KPMG",
        "location": "Philadelphia, Pennsylvania",
        "story_reference": "P1_S23",
        "source_excerpt": "We arrived in Philadelphia in August 1991.",
        "confidence": "high",
    },
    {
        "year": 1993,
        "event": "Traveled to Baltimore for Father Sellinger's funeral",
        "role": None,
        "organization": "Loyola University / church",
        "location": "Baltimore, Maryland",
        "story_reference": "P1_S37",
        "source_excerpt": "I travelled back to Baltimore in 1993 to attend his funeral, along with a thousand other admirers.",
        "confidence": "high",
    },
    {
        "year": 1994,
        "event": "Miss Frances Mallory (teacher) died; home donated to church",
        "role": "Alumnus",
        "organization": "First Baptist Church",
        "location": "Calhoun City, Mississippi",
        "story_reference": "P1_S03",
        "source_excerpt": "Upon her death in 1994, her home was donated to the First Baptist Church.",
        "confidence": "high",
    },
    {
        "year": 1995,
        "event": "Became CEO of Alamo Rent A Car",
        "role": "Chief Executive Officer",
        "organization": "Alamo Rent A Car",
        "location": "Fort Lauderdale, Florida",
        "story_reference": "P1_S25",
        "source_excerpt": "we finally agreed on a start date of April 1, 1995.",
        "confidence": "high",
    },
    {
        "year": 1996,
        "event": "Ordered ten GM experimental electric cars for Alamo rental testing",
        "role": "CEO",
        "organization": "Alamo Rent A Car",
        "location": None,
        "story_reference": "P1_S33",
        "source_excerpt": "I placed an order in 1996 for ten General Motors experimental electric cars, to test them in the rental market.",
        "confidence": "high",
    },
    {
        "year": 1997,
        "event": "Alamo role ended; transition to boards and consulting",
        "role": None,
        "organization": None,
        "location": None,
        "story_reference": "P1_S26",
        "source_excerpt": "When my Alamo gig came to an end in early 1997, I was fifty-six years old.",
        "confidence": "high",
    },
    {
        "year": 1997,
        "event": "Joined board of Federal Reserve Bank of Miami",
        "role": "Board member",
        "organization": "Federal Reserve Bank of Miami",
        "location": "Miami, Florida",
        "story_reference": "P1_S26",
        "source_excerpt": "My first call came from the Federal Reserve Bank. I was invited to join the board of the Miami branch of the Fed.",
        "confidence": "high",
    },
    {
        "year": 1998,
        "event": "Purchased Mallory House (teacher's former home)",
        "role": "Owner",
        "organization": None,
        "location": "Calhoun City, Mississippi",
        "story_reference": "P1_S03",
        "source_excerpt": "On an impulse of nostalgia, I purchased the property from Fred and vowed to keep it as a historical memory.",
        "confidence": "high",
    },
    {
        "year": 1999,
        "event": "Joined board of CRA Qualified Investment Fund",
        "role": "Independent director",
        "organization": "CRA Qualified Investment Fund",
        "location": "South Florida",
        "story_reference": "P1_S26",
        "source_excerpt": "Approach in 1999 by young entrepreneurs to join a new mutual fund (CRA Qualified Investment Fund).",
        "confidence": "high",
    },
    {
        "year": 2000,
        "event": "Laundromax failed; capital markets dried up",
        "role": "Board chairman / investor",
        "organization": "Laundromax",
        "location": None,
        "story_reference": "P1_S26",
        "source_excerpt": "The capital markets for entrepreneurial businesses completely dried up, quite suddenly, in the year 2000.",
        "confidence": "high",
    },
    {
        "year": 2002,
        "event": "Invited to join BankAtlantic Bancorp board",
        "role": "Board member",
        "organization": "BankAtlantic Bancorp",
        "location": "Florida",
        "story_reference": "P1_S26",
        "source_excerpt": "One day in 2002, I received a breakfast invitation from Alan Levan, chairman of BankAtlantic Bancorp.",
        "confidence": "high",
    },
    {
        "year": 2003,
        "event": "Began teaching as adjunct at Nova Southeastern University",
        "role": "Adjunct professor",
        "organization": "Nova Southeastern University",
        "location": "Florida",
        "story_reference": "P1_S26",
        "source_excerpt": "Invitation to teach as an adjunct professor at Nova Southeastern University (circa 2003).",
        "confidence": "medium",
    },
    {
        "year": 2012,
        "event": "BankAtlantic sold to BB&T",
        "role": "Board member",
        "organization": "BankAtlantic Bancorp",
        "location": "Florida",
        "story_reference": "P1_S26",
        "source_excerpt": "The economic and regulatory pressures forced the sale of BankAtlantic in 2012 to BB&T.",
        "confidence": "high",
    },
    {
        "year": 2012,
        "event": "Grandson Ethan Keith Cobb born",
        "role": "Grandfather",
        "organization": None,
        "location": None,
        "story_reference": "P1_S35",
        "source_excerpt": "And then along comes Ethan Keith Cobb on March 15, 2012.",
        "confidence": "high",
    },
    {
        "year": 2013,
        "event": "Resigned from BFC Financial / BankAtlantic boards; Oklahoma City tornado cleanup",
        "role": "Volunteer / former director",
        "organization": None,
        "location": "Oklahoma City / Florida",
        "story_reference": "P1_S26",
        "source_excerpt": "I had a serious disagreement in early 2013 over what I thought was an outrageous $30 million executive compensation package.",
        "confidence": "high",
    },
    {
        "year": 2013,
        "event": "Volunteer cleanup trip to Moore, Oklahoma after tornado",
        "role": "Volunteer",
        "organization": "Church group",
        "location": "Moore, Oklahoma",
        "story_reference": "P1_S38",
        "source_excerpt": "In 2013, I travelled to Oklahoma City following the horrible tornado there and spent a week helping with the cleanup.",
        "confidence": "high",
    },
    {
        "year": 2014,
        "event": "Antarctica expedition; rounded out seven continents",
        "role": None,
        "organization": None,
        "location": "Antarctica",
        "story_reference": "P1_S29",
        "source_excerpt": "We rounded out our continental bucket list in 2014 with a memorable expedition to Antarctica.",
        "confidence": "high",
    },
]


def main():
    # Sort by year only; preserve list order for same-year events
    sorted_timeline = sorted(TIMELINE, key=lambda x: x["year"])
    # Remove None values for optional fields so JSON is clean
    for e in sorted_timeline:
        if e.get("role") is None:
            del e["role"]
        if e.get("organization") is None:
            del e["organization"]
        e.pop("year_range", None)

    LIBRARY_DIR.mkdir(parents=True, exist_ok=True)
    TIMELINE_JSON.write_text(json.dumps(sorted_timeline, indent=2, ensure_ascii=False), encoding="utf-8")

    # Sources MD
    story_ids = sorted({e["story_reference"] for e in sorted_timeline})
    lines = [
        "# Career Timeline — Sources",
        "",
        "Story IDs used: " + ", ".join(story_ids),
        "",
        "## Excerpts by event (year, event, story_id)",
        "",
    ]
    for e in sorted_timeline:
        lines.append(f"- **{e['year']}** — {e['event']} — `{e['story_reference']}`")
        lines.append(f"  - \"{e['source_excerpt']}\"")
        lines.append("")
    SOURCES_MD.write_text("\n".join(lines), encoding="utf-8")

    print(f"[bold green]Wrote {TIMELINE_JSON} ({len(sorted_timeline)} entries), {SOURCES_MD}[/bold green]")


if __name__ == "__main__":
    from rich import print
    main()
