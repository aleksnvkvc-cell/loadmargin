# Outreach AI worker

Deploy from this directory with `npx wrangler deploy`. Configure secrets using `npx wrangler secret put OPENAI_API_KEY` and `npx wrangler secret put OUTREACH_TOKEN` (generate a long random token). Never commit either secret. Configure provider budget and rate limits before use. OpenAI API usage may incur charges.

POST /draft with Authorization: Bearer <OUTREACH_TOKEN> and JSON {company,state,trucks,days,notes}. Only send relevant business data and verified notes; do not include personal contact information. Response contains offer, rationale, subject and body. This is a draft generator, not a web research or email sending service. Human review and a valid postal address are required.

The static UI accepts the worker HTTPS URL and token for the current page session only. CORS defaults to https://loadmargin.com. The public page itself is not access-controlled. No backend has been deployed by this commit.
