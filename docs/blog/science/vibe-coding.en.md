---
lang: en
tags:
* programming
* ai
* artificial intelligence
* vibe-coding
auto_translated: true
---

## A Thought on Vibe-Coding

The term "Vibe-Coding" is still fuzzy, but it generally means programming with immediate support from an LLM — in short: AI-assisted development. I often use these tools for small tasks, prototypes, and scripts because they produce results quickly. At the same time there are legitimate concerns: what effects will this have on open source, on quality, and on our understanding of code?

Below I summarize key observations, draw parallels to earlier technological shifts, and outline how we might prepare.

### Historical parallel: the profession “Computer"

Before electronic machines, there was the profession called the "computer": people (often women) who performed calculations by hand using pen and paper. Their work was error-prone but essential, until machines took over and the profession disappeared. Many tools (logarithm tables, calculation manuals) lost relevance because digital machines performed the same tasks faster and more reliably.

This change shows that technology does not only replace tasks — it reshapes entire ecosystems: workflows, communities, and the ways knowledge is shared.

### Today: larger blocks instead of many tiny commit steps

I believe Vibe-Coding produces a similar effect. Tasks that once took days or weeks can now be done in hours. That shifts priorities: instead of many small bugfixes, larger features and integrations become central. The way we think about versioning and history might change too: instead of many fine-grained commits, we could see fewer, semantically denser changes.

That raises questions: how granular does history need to be when results are easy to reproduce? Do we need a "meta-Git" that records semantic changes rather than micro-diffs? Such meta-commits would need guarantees for auditability and reproducibility — otherwise trust breaks down.

### LLMs as a new "high-level language"

Languages like Pascal once aimed to bring programming closer to natural language. LLMs get us closer to that goal: requirements can be written in plain language and models can generate code or configuration. This is revolutionary, but it does not make traditional skills obsolete — understanding, specification, and critical review remain essential.

LLMs offer creative proposals and quick idea combinations, but they need human guidance: precise prompts, tests and validation. Combining agents with programming languages yields new forms of logic automation — and these require new tools and practices.

### Risks for open source and practical trust

One risk is that maintainers spend less time on manual debugging and instead rely on AI workarounds. That can hide problems in dependencies, because people may no longer inspect every piece of generated code.

At the same time, closed-source binaries and proprietary tools may gain traction, since black-box components can appear reliable even when internals are opaque. That undermines reproducibility. Open data and open interfaces therefore become even more important so outside audits remain possible.

### How can we prepare?

- Personal: stay active, learn the tools, and build projects — early experience reveals limits and strengths.
- Companies: keep processes adaptive, re-evaluate regularly, and combine automation with human review.
- Open source: create incentives for maintainers, improve automated testing, and add semantic metadata (meta-commits).
- Policy & society: promote open data and create standards for traceability, auditability and accountability.

### Conclusion

Vibe-Coding is not a fad but a structural shift that changes how we work, collaborate and trust software. The challenges are real — loss of granular knowledge, coarser history, and dependence on black-box components — but they can be mitigated with practices like testing, richer metadata, and openness.

The right attitude is curious and pragmatic: experiment with tools, evaluate them critically, and design infrastructure that preserves traceability and shared responsibility.

---

If you want, I can produce a shorter slide-ready summary, a version tuned for a talk, or a refined translation for publication.
