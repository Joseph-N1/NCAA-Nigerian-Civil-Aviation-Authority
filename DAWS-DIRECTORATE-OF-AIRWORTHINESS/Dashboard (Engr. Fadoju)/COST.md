# NCAA Aircraft Registry Upgrade | Production Cost Estimate

_Last updated: April 24, 2026_

## Executive Summary

This project should **not** be priced like a simple Excel replacement.

At production level, Version 3 is closer to a **secure internal regulatory platform** with:

- structured aircraft registry data
- document ingestion and review workflows
- audit logging and access control
- secure cloud hosting with redundancy
- an AI assistant that understands vague questions but answers **strictly from the database**

### Fair commercial value for this submission

- **Graduate engineer implementation estimate:** **$10,000 to $20,000** one-time
- **Lean monthly operating cost:** **about $715 to $1,265/month** before maintenance
- **Monthly operating cost with light maintenance retainer:** **about $2,215 to $5,015/month**

These figures assume a **small internal rollout for one department only**, with few inspectors using the system and only essential production services included.

---

## Scope Assumptions Used For This Estimate

This estimate assumes:

- internal NCAA use, not a mass public consumer app
- one department only
- a small number of inspectors and staff users
- production deployment on AWS
- high availability within **two Availability Zones**
- encrypted storage, backups, monitoring, audit logs, and secrets management
- PostgreSQL as the production database
- document storage for C of R files and supporting records in S3
- OpenAI API added to the inspector assistant
- the assistant is **not allowed to invent answers**; it must translate a user question into approved query logic, pull the answer from the database, and only then format the response
- baseline production traffic for a small internal government operations system

### Important note on region

AWS pricing varies by region. This document uses **USD estimates modeled mainly around AWS public pricing examples in US East (N. Virginia)** as a reference baseline. Real totals may shift if NCAA chooses another region.

---

## Recommended Production Architecture

A sensible lean AWS production setup for this system would be:

- **Application layer:** 2 app instances or containers across 2 AZs
- **Load balancing:** Application Load Balancer
- **Database:** Amazon RDS for PostgreSQL with **Multi-AZ**
- **Document storage:** Amazon S3 with versioning and backup retention
- **Security:** AWS WAF, KMS, Secrets Manager, private subnets, least-privilege IAM
- **Monitoring:** CloudWatch dashboards, alarms, logs
- **Backups:** AWS Backup and automated RDS backups
- **Support plan:** AWS Business Support+
- **AI layer:** OpenAI API for question understanding + structured outputs/function calls, with the database remaining the only source of truth for answers

This gives you security, redundancy, and a professional path to production without over-engineering the first rollout.

---

## One-Time Build Cost

### Recommended one-time build budget

| Workstream                                                 |  Estimated Cost (USD) |
| ---------------------------------------------------------- | --------------------: |
| Planning, requirements cleanup, and security basics        |         $500 - $1,500 |
| Backend, database, and API setup                           |       $2,500 - $5,500 |
| Frontend/admin workflows                                   |       $1,500 - $3,000 |
| C of R + TCDS upload/review workflow                       |       $1,500 - $3,500 |
| Inspector assistant with database guardrails               |       $1,000 - $2,500 |
| AWS deployment, backups, monitoring, and environment setup |       $1,500 - $2,500 |
| Testing, documentation, and handover                       |         $500 - $1,500 |
| **Total fair build range**                                 | **$10,000 - $20,000** |

### Recommended message to management

A fair way to position this is:

> This is not just a database refresh. It is a secure internal aircraft registry platform with document workflows, audit controls, cloud infrastructure, and an AI-assisted query layer.

That framing is still important, but this version of the estimate is intentionally reduced to reflect a **small internal deployment built by a graduate engineer at a negotiable rate**.

---

## Monthly AWS Cost Estimate

### Core production hosting

| AWS component                          | Estimated Monthly Cost (USD) |
| -------------------------------------- | ---------------------------: |
| App compute across 2 AZs               |                   $60 - $140 |
| Application Load Balancer              |                    $25 - $50 |
| RDS PostgreSQL Multi-AZ + backups      |                  $180 - $450 |
| S3 document storage + retention        |                     $5 - $20 |
| CloudWatch monitoring/logging          |                    $10 - $35 |
| WAF + Secrets Manager + KMS + Route 53 |                    $20 - $60 |
| AWS Business Support+                  |                    $29 - $50 |
| **Core AWS monthly total**             |              **$329 - $805** |

### Practical planning number

For management purposes, a realistic planning number for this lean internal deployment is:

- **Lean production:** **$350 to $600 / month**
- **Comfortable production:** **$600 to $850 / month**

### What is included and excluded

Included in this estimate:

- AWS Business Support+
- WAF
- backups
- monitoring
- encryption and secrets management

Not included in this estimate:

- AWS Shield Advanced
- heavy external/public traffic assumptions
- extra security scanning services beyond the essentials

### Professional recommendation

For this NCAA project, I would keep **AWS Business Support+** and leave out **AWS Shield Advanced**.

Why:

- the system is for one department with a small user base
- Shield Advanced is expensive for this stage
- WAF, encryption, backups, IAM, logging, and Business Support+ are the more sensible essentials for the current rollout

---

## OpenAI API Cost For The Inspector Assistant

### Recommended design

The assistant should use OpenAI only for:

- understanding vague or messy natural-language questions
- mapping the question into an approved schema or function call
- formatting the final answer clearly

The assistant should **not** be allowed to answer from memory.

### Correct architecture

1. User asks a question
2. Model converts it into a structured request or approved SQL intent
3. Backend validates the request
4. Database executes the real query
5. Model formats the database result into a clean answer

That approach keeps hallucinations low and keeps API costs relatively modest.

### Monthly OpenAI cost estimate

For this document, assume **normal usage of 10,000 questions per month**.

| Usage level                                    | Estimated Monthly Cost (USD) |
| ---------------------------------------------- | ---------------------------: |
| Normal usage: 10,000 assistant questions/month |                    $40 - $90 |

### Management takeaway

For this use case, **OpenAI is not the expensive part**.

If the assistant is engineered correctly, the cloud/database/security stack and maintenance effort will usually cost more than the model API itself.

---

## OCR / Document Extraction Cost

For this estimate, use the following OCR assumption with AWS Textract:

### Practical OCR estimate

| OCR volume        | Estimated Monthly Cost (USD) |
| ----------------- | ---------------------------: |
| 5,000 pages/month |                   about $325 |

This is most relevant when using structured extraction patterns like Forms + Tables.

---

## Software Engineer Setup And Maintenance Cost

### Setup pricing assumption

This estimate assumes the implementation is being delivered by a **graduate engineer**, not a senior external specialist or agency team.

A fair, cheaper setup rate for this submission is:

- **Approximate graduate engineer build range:** **$10,000 to $20,000**
- **Approximate working rate assumption:** **$20 to $40/hour**
- **Price status:** **Negotiable depending on timeline, internal support, and final scope**

### Monthly maintenance estimate

| Support level                                | Estimated Monthly Cost (USD) |
| -------------------------------------------- | ---------------------------: |
| Light maintenance retainer (15-25 hrs/month) |              $1,500 - $3,750 |

This maintenance covers work such as:

- bug fixes
- schema adjustments
- prompt tuning and assistant guardrails
- AWS monitoring and backup review
- security patching
- small feature requests
- user support and data-import refinement

---

## Total Ongoing Monthly Budget

### Typical steady-state operating cost

| Category                                   | Estimated Monthly Cost (USD) |
| ------------------------------------------ | ---------------------------: |
| AWS hosting/security/redundancy            |                  $350 - $850 |
| OpenAI assistant usage                     |                    $40 - $90 |
| OCR workload                               |                         $325 |
| Engineering maintenance                    |              $1,500 - $3,750 |
| **Typical total monthly operating budget** |          **$2,215 - $5,015** |

### Simple management summary

A realistic monthly planning number is:

- **about $715 to $1,265/month** for platform costs only
- **about $2,215 to $5,015/month** when light maintenance is included

---

## What This App Is Worth

If this project is delivered properly, it is worth more than a typical CRUD internal app because it combines:

- regulatory record management
- historical registry logic
- document processing workflows
- decision-support analytics
- AI-assisted querying
- secure cloud operations
- auditability and operational trust

### My professional valuation for this smaller rollout

I would present the system value like this:

- **Internal pilot / controlled rollout:** **$8,000 to $12,000**
- **Production-grade Version 3 for one department:** **$10,000 to $20,000**
- **If later expanded across departments with more automation:** **$25,000 to $50,000+**

### Important pricing advice

Do **not** undersell this as:

- “just an Excel upgrade”
- “just a chatbot”
- “just a registry website”

A more accurate description is:

> A secure aircraft registry management platform for NCAA with document ingestion, operational search, reuse tracking, analytics, and AI-assisted database querying.

That wording better reflects the actual business value.

---

## Suggested Budget Options To Present

### Option A — Essential internal rollout

- One department only
- Few inspectors and staff users
- Secure AWS hosting with redundancy
- PostgreSQL database, backups, logging, WAF, and AWS Business Support+
- Inspector assistant with OpenAI at **10,000 questions/month**
- OCR workflow at **5,000 pages/month**
- Light maintenance retainer
- **Build:** **$10,000 - $13,000**
- **Monthly:** **$2,215 - $3,000**

### Option B — Recommended operational rollout

- Everything in Option A
- Better testing and deployment hardening
- Cleaner admin workflows
- TCDS-assisted enrichment and stronger review flow
- Light maintenance retainer
- **Build:** **$13,000 - $17,000**
- **Monthly:** **$2,600 - $3,900**

### Option C — Negotiable full Version 3 rollout

- Everything in Option B
- More refinement, documentation, and handover support
- Better reporting and cleaner production polish
- Light maintenance retainer
- **Build:** **$17,000 - $20,000**
- **Monthly:** **$3,000 - $5,015**

**Note:** The build price can be presented as **negotiable**, since this estimate assumes graduate engineer pricing rather than senior consultant or agency pricing.

---

## Final Recommendation

For a boss-facing submission, the strongest position is:

- quote this as a **platform**, not a spreadsheet replacement
- separate **one-time build cost** from **monthly run cost**
- show that OpenAI cost is manageable when the assistant is tied strictly to database queries
- make it clear that security and redundancy are driving part of the value, not just UI features

If I were packaging this professionally for approval, I would anchor the conversation around:

- **Target build budget:** **$10,000 to $20,000**
- **Target monthly operating budget:** **$2,215 to $5,015**

That range is much better aligned to a small internal operational system for one department, while still treating the work as a real production platform rather than a casual side project.

---

## Quick Cost Breakdown (Summary Table)

For readers who prefer a quick overview:

### One-Time Build Cost

| Category                              |      Cost Range (USD) |
| ------------------------------------- | --------------------: |
| Planning & Requirements               |         $500 – $1,500 |
| Backend & Database                    |       $2,500 – $5,500 |
| Frontend & Admin UI                   |       $1,500 – $3,000 |
| Document Workflow (C of R + TCDS)     |       $1,500 – $3,500 |
| AI Assistant Integration              |       $1,000 – $2,500 |
| AWS Deployment & Infrastructure Setup |       $1,500 – $2,500 |
| Testing & Documentation               |         $500 – $1,500 |
| **Total Build Cost**                  | **$10,000 – $20,000** |

---

### Monthly Operating Cost

| Category                     |  Monthly Cost (USD) |
| ---------------------------- | ------------------: |
| AWS Hosting & Infrastructure |         $350 – $850 |
| OpenAI API Usage             |           $40 – $90 |
| OCR (Document Processing)    |               ~$325 |
| Engineering Maintenance      |     $1,500 – $3,750 |
| **Total Monthly Cost**       | **$2,215 – $5,015** |

---

### Simplified Planning Figures

| Scenario         |          Estimated Cost |
| ---------------- | ----------------------: |
| Platform Only    |   $715 – $1,265 / month |
| With Maintenance | $2,215 – $5,015 / month |

---

---

## Sources

Official references checked on April 23, 2026:

- OpenAI API pricing: https://openai.com/api/pricing/
- OpenAI pricing docs: https://platform.openai.com/docs/pricing/
- OpenAI Structured Outputs: https://platform.openai.com/docs/guides/structured-outputs
- OpenAI Responses API: https://platform.openai.com/docs/api-reference/responses
- OpenAI Function Calling: https://platform.openai.com/docs/guides/function-calling
- AWS WAF pricing: https://aws.amazon.com/waf/pricing/
- Elastic Load Balancing pricing: https://aws.amazon.com/elasticloadbalancing/pricing/
- Amazon RDS for PostgreSQL pricing: https://aws.amazon.com/rds/postgresql/pricing/
- Amazon S3 pricing: https://aws.amazon.com/s3/pricing/
- Amazon EBS pricing: https://aws.amazon.com/ebs/pricing/
- AWS Secrets Manager pricing: https://aws.amazon.com/secrets-manager/pricing/
- AWS KMS pricing: https://aws.amazon.com/kms/pricing
- Amazon Route 53 pricing: https://aws.amazon.com/route53/pricing/
- Amazon CloudWatch pricing: https://aws.amazon.com/cloudwatch/pricing/
- AWS Backup pricing: https://aws.amazon.com/backup/pricing/
- Amazon Textract pricing: https://aws.amazon.com/textract/pricing/
- AWS Support pricing: https://aws.amazon.com/premiumsupport/pricing/
- U.S. Bureau of Labor Statistics, Software Developers: https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm
