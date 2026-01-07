---
lang: de
tags:
- politik
- e-id
- digitalisierung
- schweiz
- ssi
- privacy
- security
auto_translated: false
---

# E-ID

![E-ID Whatsapp Status Werbung](/assets/images/eid_vortrag.jpg){:.float-right}
Am 4. September gab ich einen öffentlichen Vortrag über die E-ID anlässlich der nationalen 
Abstimmung. Ich entwickelte die E-ID mit und erzählte über die technische Funktionsweise und stand 
für Fragen zur Verfügung. ([mehr Infos](/politik/e-id))

Zusätzlich schrieb ich folgenden Artikel im Klettgauer Bote

# E-ID: Innovation oder Überwachung?
**Abstimmung 28. September**

Im Hinblick auf die eidgenössische Abstimmung vom 28. Sepember über die E-ID organisiert
die EVP Schaffhausen einen Fachvortrag mit dem Thema «Innovation oder Überwachung».
Reto Weber aus Beringen hat sich bereits intensiv mit der E-ID auseinandergesetzt.

**Schaffhausen** Etwas mehr als ein Jahr lang durfte ich als Softwareentwickler an der neuen E-
ID mitarbeiten. Schon damals war uns bewusst, dass dieses Projekt mutig war. Kann man es
rechtfertigen, so viele Entwickler einzustellen, ohne dass eine gesetzliche Grundlage existiert?
Vielleicht war es hoch gepokert - oder weise Voraussicht. Wie dem auch sei: Inzwischen
wurde die gesetzliche Grundlage erarbeitet, vom Schweizer Parlament verabschiedet und liegt
nun via Referendum in unseren Briefkästen. Wir sollen entscheiden, ob wir sie gutheissen
oder nicht.

Die Gegner der E-ID bringen zahlreiche Argumente vor. Leider sind viele davon faktisch
falsch oder haben gar nichts mit der E-ID zu tun. So wird beispielsweise behauptet, der
Quellcode sei intransparent und nicht einsehbar - dabei ist er offen zugänglich. Oder es wird
gesagt, die E-ID könne nicht ohne private Firmen herausgegeben werden - auch das stimmt
nicht. Alle systemrelevanten Teile der Infrastruktur werden vom Bund betrieben. Ich könnte
hier noch viele weitere Fehlinformationen aufzählen, doch es soll nicht um falsche, sondern
um stichhaltige Argumente gehen.

Technologisch hat man sich für eine einfache und sichere Lösung entschieden, die sich bereits
seit Jahren bei den grossen Tech-Unternehmen bewährt. Sie ist etabliert, gut verstanden und
ihre Funktionsweise ist erprobt. Aber die entscheidende Frage lautet: Wozu brauchen wir
überhaupt eine E-ID? Für mich als Informatiker ist Digitalisierung spannend und sichert
meinen Lebensunterhalt, aber ich möchte nur Projekte umsetzen, die echten Mehrwert
bringen. Digital ist nicht automatisch besser - und auch nicht automatisch schlechter.

Der grosse Vorteil der digitalen Welt liegt in ihrer Skalierbarkeit und Dezentralität. Wenn ein
Prozess vollständig digitalisiert werden kann, lässt er sich unabhängig von Öffnungszeiten, oft
gebührenfrei und an jedem beliebigen Ort durchführen. Eine digitale ID schafft so die
Grundlage, um Altersnachweise zu erbringen, Bankkonten zu eröffnen, elektronische
Signaturen zu beziehen, sich ins Organ- und Gewebespenderegister einzutragen oder
Mobilfunkverträge abzuschliessen - alles online und unkompliziert.

Darüber hinaus baut der Bund nicht nur die E-ID, sondern eine ganze Vertrauensinfrastruktur.
Damit sollen Schweizer Vereine und Unternehmen eigene digitale Ausweise ausstellen und
ihre Prozesse digitalisieren können. Das im Detail zu erklären, würde hier den Rahmen
sprengen. Wer mehr erfahren möchte, ist herzlich eingeladen: Am 4. September, um 19 Uhr
im Hotel Promenade werde ich über die technische Seite der E-ID sprechen und stehe offen
für Fragen zur Verfügung.

Reto Weber, Beringen

# Eine Odyssee durch die Gewässer von SSI

*Diesen Artikel schrieb ich für einen internen Newsletter. Da es etwas kritisch formuliert wurde, wurde es nicht für die öffentliche Kommunikation aufbereitet. Ich darf es aber jetzt auf dieser Webseite publizieren.*

> Eidgenössische E-ID // Die elektronische ID wurde am 7. März 2021 klar abgelehnt. Und doch
> entwickelt das Bundesamt für Informatik und Telekommunikation (BIT) genau diese. Mit dabei: einige
> Mitarbeitende von ti&amp;m. Verhält sich das BIT ungesetzlich? Was genau ist die Strategie beim
> Digitalisierungsmotor der Schweizer Bundesverwaltung? Ein persönlicher Reisebericht.

Seit genau einem Jahr bin ich in diesem Projekt involviert und sah das Team von einem einzelnen
Entwickler zu zwei Scrum-Teams mit zehn Entwicklerinnen und Entwickler anwachsen. Und es
werden mit Sicherheit noch mehr. Ich durfte mich in die vielschichtigste Thematik meiner
professionellen Laufbahn einarbeiten. Interessant auch zu sehen, wie die Perspektive auf eine
eidgenössische E-ID divergieren. Immer wieder hörten wir Stimmen die meinten, dass wir sofort
damit aufhören sollten, während andere nicht verstanden, warum die E-ID nicht schon längst Realität
ist. So gibt es Ämter, die ihren eigenen digitalen Ausweis wollen und diesen bereits gestern. Und
obwohl ich als Entwickler weder ausgebildet noch sonst eine Einzelperson fähig wäre, alle Ansprüche
zu koordinieren, durfte ich einen Einblick in die Entscheidungsfindung auf allen Ebenen bekommen.
Zumindest auf fast allen Ebenen.

## Anker lichten!

Ich möchte Sie mitnehmen auf meine Odyssee. Und wie Odysseus, so sehe auch ich immer wieder
das Ziel vor Augen, zumindest vor dem inneren Auge. Und wie er, versuchen auch wir ein Riese, eine
Sirene oder eine Göttin nach der anderen zu bezwingen. Wie verwirklicht man also eine E-ID ohne
Gesetzesgrundlage? Die Antwort ist: gar nicht. Wir entwickeln PoCs, Piloten oder Sandboxen, die
Probleme lösen, für die bereits eine gesetzliche Grundlage existiert. Diese Fahrt erlaubt uns,
hochseeerprobte Segler und manchmal auch Ruderer zu werden. Erscheint dann die E-ID am
Horizont, sind wir, so hoffe ich, gerüstet, um die letzte Meile in Angriff zu nehmen.
Die Fahrt beginnt mit Inspiration und einem gelichteten Anker. Self-Sovereign Identity (SSI) soll die
Grundlage für die neue E-ID sein. Die Bürgerinnen und Bürger sollen die Hoheit über ihre Daten
haben. Ein edles Ziel. Es beginnen Workshops, Brainstormings und Recherchen über existierende
Lösungen. Unsere Projektleitung meint, man verstehe Dinge erst, wenn man etwas damit erschaffe.
So sticht unser vierköpfiges Entwicklungsteam in See. Wir entdecken Hyperledger Indy; eine fertige
Open-Source-Lösung für SSI. Es wird sich später herausstellen, dass die Technologie nicht so reif ist,
wie wir zuerst gemeint oder zumindest gehofft hatten. Trotzdem konnten wir alle benötigten
Komponenten bauen. Wir errichteten, basierend auf der Blockchain-Technologie, ein Basisregister, in
das sowohl eingetragen ist, wer digitale Ausweise, sogenannte Verifiable Credentials (VCs) ausstellen
darf, als auch welche Daten zu einer solchen VC gehören. Wir bauten eine Angular-App, auf der neue
VCs definiert und ausgestellt werden können. Wir bauten eine App für Android und iPhone auf der
Basis von React-Native, um die VCs zu halten, eine sogenannte Wallet. Wir kamen gut voran und
freuten uns über die guten Windverhältnisse, die stille See und den Fortschritt.

## Erster Proof of Concept: ePerso

Auf dem Weg zur ersten Insel organisierte unsere Projektleitung den ersten Ausweis, den es zu
digitalisieren gilt. Der Perso ist ein Dokument, das Bundesmitarbeitende ausweist und unter anderem
Gebäudezugangsrechte regelt. Zusammen mit einem externen Dienstleister erarbeiteten wir einen
Ausstellungsprozess für diesen Ausweis. Wir entwickelten die Übersetzung der Neuen Welt auf die
Alte Welt, damit man sich mit diesem neuen ePerso VC in die bestehenden Systeme einloggen kann.
Dank den vorherigen ersten Gehversuchen in der Welt von SSI war die Umsetzung nur ein kleiner
zusätzlicher Schritt, der Aufwand dadurch überschaubar. Wir rollten die Wallet als Testversion aus
und liessen Entscheidungsträger einen ePerso beantragen. Wir begegneten kaum Problemen bei
diesem Unterfangen. Vor kurzem durften wir sogar der neuen Bundesrätin Elisabeth Baume-
Schneider einen ePerso ausstellen. Damit hatten wir nicht nur den Durchbruch auf technischer
Ebene, sondern wurden auch öffentlichkeitswirksam.

## An die Öffentlichkeit: Public Sandbox

Genug herumgespielt. Um einen Schritt näher an die E-ID zu kommen, muss die Technologie
sturmerprobt sein. Wir veranstalteten regelmässige Partizipationsmeetings, um uns mit der
technisch interessierten Bevölkerung auszutauschen. Zwei Rückmeldungen wurden mehrfach an uns
herangetragen: «Super macht ihr etwas und seid proaktiv, wenn der Zeitplan auch eher optimistisch
klingt» und «Wir möchten mitarbeiten». Und genau dazu riefen wir die Public Sandbox ins Leben. Wir
wollen unsere entwickelte Infrastruktur an die Öffentlichkeit bringen. Wir veröffentlichten ein
sogenanntes Genesis-File, was den Integratoren erlaubt, sich mit uns zu verbinden. Wir entwickelten
einen Policy Enforcement Point, der regelt, was in das Basisregister geschrieben werden darf. Und
wir definierten den Prozess, wie Teilnehmende mitmachen können, um so der Privatwirtschaft zu
ermöglichen, ihre eigenen Business Cases auf der Sandbox testen. Ob Ticket oder ein
Mitgliederausweis als VC: Wir möchten diese Tests mit einer vom Bund bereitgestellten Infrastruktur
ermöglichen.

## Die Fahrt geht weiter

Der Weg ist noch weit zur E-ID. Wir nehmen gerade richtig an Fahrt auf. Wir entwickeln eine Bundes-
Wallet mit nativen Technologien. Wir evaluieren alternative Technologien für die E-ID und andere
Ausweise. Wir wollen dieses Jahr noch einen digitalen Lernfahrausweis verwirklichen.
Referenzimplementationen für alle Komponenten bereitstellen, die wir nicht explizit betreiben
werden. Das alles soll auf GitHub publiziert werden. Alle unsere Teams, ob Infrastruktur, Mobile-,
Backend- und Frontend-Entwicklerinnen und -Entwickler, Architektinnen und Architekten oder
Designerinnen und Designer, wünschen sich mehr Personal. Wenn ich also vorhin von «wir»
gesprochen habe, so meinte ich natürlich diese Teams. Ich selbst darf Teil des Infrastrukturteams
sein, das die grundlegenden technischen Themen vorantreibt. Noch ist die konkrete Umsetzung der
E-ID, sprich die gesetzlichen Grundlagen, nicht als Festland am Horizont erkennbar. Aber das
Parlament und die Bundesverwaltung kennen den Kurs, und so navigieren externe Dienstleister wie
ti&amp;m mithilfe der Kartografen der Projektleitung an Hindernissen vorbei uns segeln beständig weiter
Richtung Ithaka.

**Reto Weber**
*Machine Learning Engineer, ti&amp;m*  
Reto Weber, interessiert unter anderem an griechischer Mythologie und neuen Technologien,
forschte in seinem Studium an der ETH sowohl über die Schwachstellen von ML-Modellen als auch
über Fragestellungen der Neurologie. Bei ti&amp;m arbeitete er bereits in den Bereichen Visual
Computing, künstliche Intelligenz und Robotic Process Automation, ehe er sich im Rahmen des E-ID-
Projekts mit SSI und Blockchain-Technologien beschäftigt.
