---
lang: en
tags:
- politik
- e-id
- digitalisierung
- schweiz
- ssi
- privacy
- security
auto_translated: true
source_lang: de
---

# E-ID

![E-ID WhatsApp status ad](/assets/images/eid_vortrag.jpg){:.float-right}
On 4 September I gave a public talk about the E-ID ahead of the national vote. I worked on the E-ID project and explained the technical design, and I was available for questions. ([more info](/politik/e-id))

I also wrote the following article for the Klettgauer Bote.

# E-ID: Innovation or surveillance?
**Vote: 28 September**

Ahead of the federal vote on 28 September on the E-ID, EVP Schaffhausen is organizing a technical talk titled “Innovation or Surveillance?”. Reto Weber from Beringen has already looked into the E-ID in depth.

**Schaffhausen** For a little over a year I worked as a software developer on the new E-ID. Even back then we knew the project was bold. Can you justify hiring so many developers before a legal basis exists? Maybe it was a gamble — or wise foresight. In the meantime, the legal basis has been drafted, passed by the Swiss Parliament, and is now in our mailboxes via referendum. We are being asked to decide whether to approve it.

Opponents of the E-ID raise many arguments. Unfortunately, many of them are factually wrong or not actually about the E-ID. For example, people claim the source code is opaque and cannot be inspected — but it is publicly accessible. Or they claim the E-ID cannot be issued without private companies — that is also not true. All system-relevant parts of the infrastructure are operated by the federal government. I could list many more misunderstandings, but the point here is not to debate false claims; it’s to discuss the substantive arguments.

Technologically, the project chose a simple and secure approach that has been used for years by large tech companies. It is established, well understood, and battle-tested. But the key question remains: what do we need an E-ID for? As an IT professional, I find digitalization exciting and it pays my bills — but I only want to work on projects that deliver real value. Digital isn’t automatically better, and it isn’t automatically worse.

The big advantage of the digital world is scalability and decentralization. If a process can be fully digitized, it can often be done regardless of opening hours, often without fees, and from anywhere. A digital ID can provide the foundation for proving your age, opening bank accounts, obtaining electronic signatures, registering in the organ and tissue donation register, or signing mobile contracts — all online and straightforward.

In addition to the E-ID itself, the federal government is building a broader trust infrastructure. This should allow Swiss associations and companies to issue their own digital credentials and digitize their processes. Explaining that in detail would go beyond the scope of this article. If you’d like to learn more: on 4 September at 19:00 at Hotel Promenade, I will talk about the technical side of the E-ID and will be available for questions.

Reto Weber, Beringen

# An odyssey through the waters of SSI

*I wrote this article for an internal newsletter. Since it was phrased somewhat critically, it wasn’t prepared for external communication. I can now publish it on this website.*

> Federal E-ID // The electronic ID was clearly rejected on 7 March 2021. And yet the Federal Office for Informatics and Telecommunications (BIT) is developing exactly that — with support from some ti&amp;m employees. Is the BIT acting unlawfully? What is the strategy behind this “digitalization engine” of the Swiss federal administration? A personal travel report.

I have been involved in this project for exactly one year and watched the team grow from a single developer into two Scrum teams with ten developers — and there will certainly be more. I got to work on the most multifaceted topic of my professional career. It was also interesting to see how perspectives on a federal E-ID diverge. Time and again we heard voices saying we should stop immediately, while others couldn’t understand why the E-ID isn’t already reality. Some offices want their own digital credential — yesterday, if possible. And although, as a developer, I’m neither trained nor otherwise capable of coordinating all these demands, I did get an insight into decision-making at many levels.

## Anchor light!

I’d like to take you on my odyssey. And like Odysseus, I keep the goal in sight — if only with my inner eye. And like him, we try to overcome one giant, siren, or goddess after another. So how do you build an E-ID without a legal basis? The answer is: you don’t — not directly. Instead, we build PoCs, pilots, or sandboxes that solve problems where a legal basis already exists. This journey makes us “blue-water sailors” (and sometimes rowers). When the E-ID finally appears on the horizon, we will — I hope — be ready to tackle the last mile.

The journey begins with inspiration and weighing anchor. Self-Sovereign Identity (SSI) is meant to be the foundation for the new E-ID: citizens should have sovereignty over their data. A noble goal. Then come workshops, brainstorming sessions, and research into existing solutions. Our project management believes you only truly understand something once you build with it.

So our four-person development team set sail. We discovered Hyperledger Indy, an open-source SSI solution. Later it would become clear that the technology was not as mature as we first thought — or at least hoped. Still, we managed to build the required components. Based on blockchain technology, we built a base register that stores both who is allowed to issue digital credentials (so-called Verifiable Credentials, VCs) and which data belongs to a given VC. We built an Angular app to define and issue new VCs. We built a React Native app for Android and iPhone to hold the VCs — a so-called wallet. We made good progress and enjoyed fair winds, calm waters, and visible momentum.

## First Proof of Concept: ePerso

On the way to the first island, our project management picked the first credential to digitize: the Perso — a document that identifies federal employees and, among other things, governs building access rights. Together with an external service provider, we designed an issuance process for this credential. We built the “translation layer” from the new world to the old world, so that you can log into existing systems using this new ePerso VC.

Thanks to our earlier steps in the SSI world, this was only a relatively small additional effort. We rolled out the wallet as a test version and let decision-makers apply for an ePerso. We ran into hardly any problems. Recently, we were even able to issue an ePerso to the new Federal Councillor Elisabeth Baume-Schneider. That was not only a breakthrough technically — it also had a positive public impact.

## To the public: Public Sandbox

Enough playing around: to move closer to the E-ID, the technology has to be tested in rougher conditions. We organized regular participation meetings to exchange with the technically interested public. Two pieces of feedback came up repeatedly: “Great that you’re doing something and being proactive, even if the timeline sounds optimistic” and “We want to contribute.”

That’s what led to the Public Sandbox. We wanted to bring our infrastructure to the public. We published a so-called genesis file that allows integrators to connect to us. We built a Policy Enforcement Point that governs what may be written into the base register. And we defined the onboarding process so that the private sector can test their own use cases on the sandbox — whether it’s a ticket or a membership card as a VC. We want to enable those experiments using infrastructure provided by the federal government.

## The journey continues

The journey is still a long one. We are only now gaining real momentum. We are building a federal wallet using native technologies. We are evaluating alternative technologies for the E-ID and other credentials. We want to implement a digital learner’s permit this year. We plan to provide reference implementations for all components that we will not operate ourselves. All of that is intended to be published on GitHub.

All our teams — infrastructure, mobile, backend and frontend developers, architects, designers — want more staff. So when I say “we”, I’m referring to those teams. I’m part of the infrastructure team, pushing forward the core technical topics.

The concrete implementation of the E-ID — i.e., the legal basis — is not yet clearly visible as land on the horizon. But Parliament and the federal administration know the course, and external providers like ti&amp;m are navigating past obstacles with the help of the project management’s cartographers, steadily sailing on toward Ithaca.

**Reto Weber**
*Machine Learning Engineer, ti&amp;m*  
Reto Weber, interested in Greek mythology and new technologies,
researched the weaknesses of ML models in his studies at ETH
on questions of neurology. At ti&amp;m he already worked in the areas of Visual
computing, artificial intelligence and robotic process automation, before being within the E-ID-
Projects dealing with SSI and blockchain technologies.
