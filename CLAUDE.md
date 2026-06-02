# Anyone Can — Podcast Outreach System

Automated pipeline that converts Apollo CSV exports into personalised "forwarded thread" podcast outreach emails and sends them via Resend.

## How It Works

1. Apollo CSV → `data/leads.csv`
2. Each lead enriched via Proxycurl (LinkedIn) and Tavily (web/news)
3. Claude Sonnet generates a fake forwarded internal thread (Jenny → Amine → Prospect)
4. Resend sends from `jenny@aminelamarti.com`, CC `amine@aminelamarti.com`
5. Google Sheets logs status for dedup

## File Structure

```
main.py                      # CLI orchestrator (--dry-run, --limit, --lead-file)
run_test.py                  # Quick test on a single hardcoded lead
src/
  apollo_parser.py           # Apollo CSV → Lead dataclass
  copywriter.py              # Claude Sonnet email generation
  email_sender.py            # Resend integration
  sheets_tracker.py          # Google Sheets dedup + logging
  enrichment/
    proxycurl.py             # LinkedIn profile lookup
    tavily.py                # Web/news search
prompts/
  jenny_forward.txt          # System prompt for the forwarded-thread email format
data/
  leads.csv                  # Apollo export (gitignored)
.github/workflows/
  outreach.yml               # Monday 7:30am UTC cron + manual dispatch
```

## Running Locally

```bash
pip install -r requirements.txt
cp .env.example .env          # fill in your keys

# Test on a single lead (dry-run, no email sent)
python run_test.py

# Dry-run the full CSV (prints emails, sends nothing)
python main.py --dry-run --limit 1

# Live send
python main.py --limit 20
```

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Claude Sonnet for email generation |
| `PROXYCURL_API_KEY` | Optional | LinkedIn profile enrichment |
| `TAVILY_API_KEY` | Optional | Web/news enrichment |
| `RESEND_API_KEY` | For live sends | Email delivery |
| `CALENDLY_LINK` | For live sends | Booking link in the email |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Optional | Sheets dedup + logging |
| `GOOGLE_SHEETS_ID` | Optional | Spreadsheet to log into |

## Key Constraints

- Hard cap of 20 emails per run (Resend free tier)
- Never email the same lead twice — Sheets dedup on email address
- Pipeline continues on individual lead failure; errors logged not raised
- Enrichment APIs are optional — Claude generates without them, with less personalisation
- The email must never mention AI, automation, or corporate buzzwords
