---
title: "ReEntry: return to the right next step, even when instructions change"
tags: devchallenge, hf26challenge
published: false
---

# ReEntry: return to the right next step, even when instructions change

Technical submission draft prepared with AI assistance at the author's request. Review against the official DEV template before publication. No personal learning claims or user-study findings are supplied here.

## What ReEntry does

A saved task can remember what someone intended to do. ReEntry also checks whether that intention still fits the instructions when they return.

The demo uses fictional application instructions. A user saves a goal, the confirmed progress “Transcript attached,” a work link and “Find first referee” as the next action. After an interruption, the selected instruction section changes from one referee to two. A fresh capture lets the model interpret that change with exact old/current quotes. The first referee remains the next action: a larger requirement does not establish that the original action was completed.

ReEntry is one product with a Chrome extension and a local web app. It does not build or control the external scholarship form. Continue opens the user's saved work link.

## The slow-and-steady payoff

The product puts goal, confirmed progress, evidence and one reviewed action in a single recovery journey. Its hypothesis is less repeated context reconstruction. No measured time-saving percentage or clinical benefit has been established.

A concrete improvement is now testable: a checkpoint can be corrected without destroying the earlier record. Restoring revision one creates a later revision with its contents, while a conflicting browser tab cannot silently overwrite newer progress. Closing and reopening a browser preserves confirmed tasks, successfully written drafts and pending captures. These behaviors are checked through real-extension browser tests.

## Why open innovation matters

The AI mechanism is a small fixed harness: prepare context, call the configured model, validate the result and show it for review. It does substantive instruction interpretation. It has no browser tools and does not run an autonomous action loop.

WXT provides extension infrastructure, Dexie provides browser storage, jsdiff exposes text differences and shadcn supplies UI. Playwright, MSW and axe supply reusable testing tools rather than a custom sandbox platform. Starter code and upstream licenses are credited in the repository.

The model boundary has actual Ollama and NVIDIA implementations. Local Ollama offers an open-weight path on the user's machine. The NVIDIA demo uses the hosted Nemotron Ultra model with explicit processing agreement. Hosted inference sends task context to NVIDIA; it is not an offline/private-local claim. Provider compatibility does not guarantee identical model behavior.

## What the harness checks

The proposal must preserve confirmed progress verbatim and cite exact quotes from the provided source IDs. It cannot invent a destination URL or mark work complete. A digest binds results to the current task and source check; edits invalidate old results. The user can still correct a structurally valid interpretation, because matching quotes do not prove semantic correctness.

Live evaluation includes increase, decrease/removal, unchanged material, cosmetic edits, contradiction and missing evidence. A fresh evaluation encountered a network deadline on removal; an explicit isolated repeat passed. The timeout preserved saved context. This small fixture set is evidence about those cases, not an aggregate accuracy claim.

## Demo and source

- Source: https://github.com/kirmada1509/reentry
- Working recording and captions: see the repository release package and README.
- Reproduction and limitations: `docs/RELEASE.md`.
- Actual checks: `docs/TEST_RESULTS.md` and `docs/evidence/`.

The recording identifies the controlled instruction changes. Automated accessibility checks and keyboard/focus assertions are included. Native VoiceOver and manual browser zoom acceptance remain unverified where the locked Mac prevents native testing.

## Disclosures

ReEntry builds on the credited agent-starter repository with significant original capture, persistence, source comparison, interpretation and resilience work. AI coding assistance and hosted inference are disclosed. Required Learn documents were completed as retrospective drafts; unperformed learner reviews are not backdated or claimed. No partner-prize category is asserted without meaningful corresponding integration.
