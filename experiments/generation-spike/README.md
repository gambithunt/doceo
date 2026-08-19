# Generation Quality Spike Harness

This directory is an experiment, not application architecture. It generates the
twelve lessons defined by the active
[generation spike](../../docs/workstreams/active/generation-spike.md) and records
the evidence needed to judge quality, latency, retries, token use, and estimated
API cost.

The pipeline deliberately generates an outline, each scene in playback order,
and the optional check as separate calls. This measures when the opening can
become useful and how long each later scene takes to become ready.

## Setup

Copy `.env.example` to `.env.local` and add an OpenAI API key as
`MODEL_API_KEY`. Never commit that file.

The defaults use `gpt-5.4-mini` through OpenAI's Chat Completions API, with the
standard token prices recorded on 2026-08-18. The key must never be sent to
browser code. Override the provider, endpoint, model, and prices together if the
experiment changes models or pricing.

Each response is returned through a forced function tool and then validated
locally against the same Zod schema. MiniMax's Responses endpoint accepted a
strict text-format request in the first pilot but ignored it and returned
Markdown, so strict text output must not be assumed for M3. M3 reasoning is
disabled and each stage is capped at 3,000 completion tokens so a cheap test
cannot silently become a long reasoning run.

The 2026-08-18 M3 pilot failed the reliability gate after repeated schema
violations. The unchanged GPT-5.4 mini pilot passed every schema stage without a
retry, so GPT-5.4 mini is the model for the generation set.

This is the round-one cost/quality floor. A passing lesson counts. A failing
lesson must be rerun unchanged on a stronger model before it can count as
evidence that generation cannot meet the Doceo standard; otherwise the spike
would confuse a cheap-model limitation with a product limitation.

## Commands

```sh
npm run spike:list
npm run spike:generate -- --contract space-orbits
npm run spike:generate -- --all
npm run spike:blind
```

Runs are written to `experiments/generation-spike/runs/`, which is gitignored.
A failed run is still recorded. The harness retries the identical request once
by default and records every attempt; it never changes a prompt to rescue a weak
lesson.

Do not grade lessons as they are generated. Complete the set, add the authored
black-hole control, remove identifying metadata, randomize the packets, and then
grade blind against the lesson grammar's eleven gates.

`spike:blind` prepares thirteen randomized Markdown packets, a blank grading
sheet, and a separate answer key. The entire `blind/` directory is ignored so
the answer key cannot be committed accidentally. Give the packets and grading
sheet—not the source files or answer key—to an independent grader.
