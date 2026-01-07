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

![E-ID Whatsapp Status Advertising](/assets/images/eid vortrag.jpg){:.float-right}
On 4 September I gave a public lecture on the E-ID on the occasion of the national
Vote. I developed the E-ID and told about the technical function and stood
available for questions. ([more info](/politik/e-id))

In addition, I wrote the following articles in the Klettgauer Bote

# E-ID: Innovation or monitoring?
**Determination 28. September * *

Organized for the Federal E-ID vote of 28 September
the PPE Schaffhausen a presentation on "Innovation or Monitoring".
Reto Weber from Beringen has already dealt intensively with the E-ID.

**Schaffhausen** For a little more than a year, I was allowed to use the new e-
Edit ID. Even then we were aware that this project was courageous. Can you
justify setting so many developers without any legal basis?
Maybe it was a big pok - or wise foresight. In the meantime,
the legal basis was developed, passed by the Swiss Parliament and lies
now via referendum in our mailboxes. We're supposed to decide whether we're good at them.
or not.

The opponents of the E-ID present numerous arguments. Unfortunately, many of them are in fact
wrong or have nothing to do with the E-ID. For example, the
Source code is transparent and not visible - it is openly accessible. Or it will be
said the E-ID could not be published without private companies - that is true too
not. All system-relevant parts of the infrastructure are operated by the federal government. I could
there are many other misinformation, but it should not be wrong, but rather
to proceed with sound arguments.

Technologically, a simple and safe solution has been decided to
has been proven for years with the large tech companies. It is established, well understood and
their functioning is tested. But the crucial question is: what do we need
an E-ID? For me as a computer scientist, digitalization is exciting and secure
my livelihood, but I just want to implement projects that are real added value
to bring. Digital is not automatically better - and not automatically worse.

The great advantage of the digital world is its scalability and decentralization. When
process can be fully digitized, it can be independently of opening hours, often
free of charge and in any place. A digital ID creates
the basis for providing evidence of age, opening bank accounts, electronic
to obtain signatures, to enter the organ and tissue donation register, or
Complete mobile contracts - all online and uncomplicated.

In addition, the federal government not only builds the E-ID, but an entire trust infrastructure.
Swiss clubs and companies are to issue their own digital identity cards and
can digitize their processes. To explain this in detail, the framework would be
blow. Who wants to know more is cordially invited: September 4th, at 7 pm
in the Hotel Promenade I will talk about the technical side of the E-ID and stand open
available for questions.

Reto Weber, Beringen

♪ An odyssey through the waters of SSI

*I wrote this article for an internal newsletter. Since it was formulated somewhat critically,
it was not prepared for public communication. But now I have to
publish website. *

> Federal E-ID // The electronic ID was on 7. March 2021 clearly rejected. And yet
> the Federal Office for Informatics and Telecommunications (BIT) develops precisely these. With it: some
> Employees of ti&amp;m Is the BIT illegal? What exactly is the strategy
> Digitization motor of the Swiss Federal Administration? A personal travel report.

For exactly one year I have been involved in this project and saw the team from a single
Developers grow into two Scrum teams with ten developers. And
will surely become even more. I was admitted to the most complex subject of my
professional career. Also interesting to see how the perspective on a
E-ID diverge. Again and again we heard voices that thought that we immediately
to stop it while others don't understand why the E-ID hasn't been reality long ago
is. So there are offices that want their own digital identity and that already yesterday. And
although I would not be trained as a developer or otherwise an individual would be able to claim all
to coordinate, I was allowed to get an insight into decision making at all levels.
At least on almost all levels.

## Anchor lights!

I'd like to take you to my Odyssey. And like Odysseus, I see again and again
the target in front of the eye, at least in front of the inner eye. And like him, we also try a giant, a
to force Sirene or a goddess to the other. How to achieve an E-ID without
Legal basis? The answer is: not at all. We develop PoCs, pilots or sandboxes that
solve problems for which a legal basis already exists. This ride allows us to
high sea tested sailors and sometimes also rowers. Then the E-ID appears
Horizon, we are, so I hope, ready to tackle the last mile.
The journey begins with inspiration and an illuminated anchor. Self-Sovereign Identity (SSI)
Be the basis for the new E-ID. The citizens are supposed to have the sovereignty over their data
have. A noble goal. Workshops, brainstormings and research on existing
Solutions. Our project management means that you understand things only when you create something with it.
This is how our four-headed development team stands in the lake. We discover Hyperledger Indy; a finished
Open source solution for SSI. It will later prove that the technology is not so mature,
as we first thought or at least hoped. Nevertheless we all needed
Building components. We built a base register based on blockchain technology, in
which is both registered, who exhibits digital IDs, so-called Verifiable Credentials (VCs)
as well as which data belong to such a VC. We built an Angular app on which new
VCs can be defined and displayed. We built an app for Android and iPhone on
Based on react natives to keep the VCs, a so-called wallet. We were well ahead and
we were pleased about the good wind conditions, the quiet lake and the progress.

## First Proof of Concept: ePerso

On the way to the first island, our project management organized the first ID it had to
digitization is valid. The Perso is a document that shows federal employees and among others
Building access rights. Together with an external service provider, we developed a
Exhibition process for this ID. We developed the translation of the New World to the
Old world so that you can log into the existing systems with this new ePerso VC.
Thanks to the previous first attempts in the world of SSI, the implementation was only a small
additional step, the effort can thereby be overlooked. We rolled out the Wallet as a trial version
and read decision-makers to apply for an ePerso. We hardly encountered problems with
this undertaking. Recently we were even allowed to the new Federal Councilwoman Elisabeth Baume-
Exhibit a ePerso. We had not only the breakthrough on technical
Level, but also became public.

## To the public: Public Sandbox

Enough play around. To get a step closer to the E-ID, the technology must
tormented. We organized regular participation meetings to help us with the
exchange of technically interested people. Two feedback has been sent to us several times
added: «Super you do something and are proactive if the schedule is more optimistic
sounds» and «We want to work». And that's exactly what we called the Public Sandbox into life. We
want to bring our developed infrastructure to the public. We published a
Genesis file, which allows the integrators to connect to us. We developed
a policy enforcement point that regulates what can be written in the base register. And
we defined the process of how participants can participate in the private sector
allow to test their own business cases on the sandbox. Whether a ticket or a
VC membership card: We want these tests with a federal infrastructure
to allow.

## The journey continues

The path is still far to the E-ID. We're taking a ride right now. We develop a federal
Wallet with native technologies. We evaluate alternative technologies for E-ID and others
ID. We want to achieve a digital learning pass this year.
Provide reference implementations for all components that we do not explicitly operate
to be. All this is to be published on GitHub. All our teams, whether infrastructure, mobile,
Backend and Frontend developers, architects and architects
Designers, want more staff. So, when I was about "we"
I mean, of course, these teams. I myself may be part of the infrastructure team
to promote fundamental technical issues. The concrete implementation of the
E-ID, i.e. the legal basis, not recognizable as mainland on the horizon. But
Parliament and the federal administration know the course and navigate external service providers such as
ti&amp;m with the help of the mapping of the project management past obstacles
Direction Ithaka.

**Reto Weber * *
*Machine Learning Engineer, ti&amp;m*
Reto Weber, interested in Greek mythology and new technologies,
researched the weaknesses of ML models in his studies at ETH
on questions of neurology. At ti&amp;m he already worked in the areas of Visual
computing, artificial intelligence and robotic process automation, before being within the E-ID-
Projects dealing with SSI and blockchain technologies.