---
lang: de
tags:
- science
- computer-science
- godel
- complexity
- halting-problem
- chaos
- game-theory
- optimization
auto_translated: true
source_lang: en
---

# [Was haben wir gelernt? Und einige fundierte Vermutungen](/blog/science/what-have-we-learned-and-some-educated-guesses/)

## Gödels Unvollkommenheitstheorie
Gödel ist einer der grossen Mathematiker des letzten Jahrhunderts. Unter anderem arbeitete er an den Grundlagen der
Mathematik. Ihn interessierte die Frage, ob Mathematik «vollständig» ist. Um zu verstehen, was damit gemeint ist,
brauche ich zuerst kurz den Begriff des Axioms.

Ein Axiom ist eine Annahme in einem mathematischen System, die nicht bewiesen wird. Mathematik kommt ohne solche
Annahmen nicht aus. Ein bekanntes (wenn auch etwas vereinfachtes) Beispiel ist: $1+1=2$. Es wirkt so offensichtlich,
dass man versucht ist zu sagen: «Dafür braucht es keinen Beweis.» Genau das ist die Intuition hinter Axiomen.

Als Axiom wählt man Aussagen, denen (im gewünschten Kontext) alle zustimmen können. Das bedeutet aber nicht: «Was mir
offensichtlich erscheint, erkläre ich einfach zur Wahrheit.» Denn was für die eine Person offensichtlich ist, ist es
für die andere vielleicht nicht. Darum schreiben Mathematiker ihre Axiome explizit auf und sagen sinngemäss:
«Unter diesen Annahmen mache ich Mathematik.» Dann kann jede andere Person prüfen, ob die Schlussfolgerungen unter
diesen Annahmen korrekt sind.

Ein Beispiel für solche Annahmen:

- A: 0 ist eine Zahl
- B: 1 ist eine Zahl
- C: Wenn $x$ eine Zahl ist, dann gilt: $x + 0 = x$
- D: Wenn $x$ eine Zahl ist, dann ist $x + 1$ auch eine Zahl
- E: $x+1 > x$

Mathematiker würden (zu Recht) sagen, dass das nicht formal genug ist. Für unsere Zwecke reicht es. Und man sieht:
Solche Aussagen sind fast banaler Natur. Trotzdem lässt sich daraus bereits eine Aussage beweisen, die für Kinder
eine echte Offenbarung ist: «Es gibt keine grösste Zahl.»

Beweis durch Widerspruch:

Angenommen, es gäbe eine grösste Zahl. Nennen wir sie $y$. Dann folgt aus D, dass $y+1$ ebenfalls eine Zahl ist.
Nennen wir sie $z$. Aus E folgt $z>y$. Das widerspricht der Annahme, dass $y$ die grösste Zahl ist. Also gibt es
keine grösste Zahl.

Das alles klingt nach spitzfindiger Haarspalterei, die Mathematiker betreiben, um Probleme zu lösen, die niemand hat.
Und genau so dachte ein grosser Teil der Mathematik zu Beginn des 20. Jahrhunderts. Hier kommt Gödel ins Spiel.
Die Beweisidee ist nicht «schwer», aber sie sprengt den Rahmen dieses Textes. (Wenn dich das interessiert: Sag’s,
dann schreibe ich gern eine separate Erklärung.)

Die Kernaussage ist: Egal, wie viele Axiome du aufschreibst — es wird immer wahre Aussagen geben, die sich aus deinen
Axiomen nicht beweisen lassen. Mathematik ist also unvollständig. Selbst mit «fünf Milliarden» Axiomen wirst du nie
alle wahren mathematischen Aussagen beweisen können.

### Was bedeutet das?
Die Hoffnung war einmal: Wenn wir nur genug forschen und schlau genug werden, können wir alles beweisen.
Gödel zeigt: Nein — es gibt prinzipielle Grenzen.

Für mich folgt daraus: Egal, wie unser formales Denksystem aussieht, es bleiben immer Dinge, die für uns in diesem
System unzugänglich sind. Praktisch heisst das: Man braucht eine Art, mit «nicht beweisbaren» Aussagen umzugehen.
Aber man darf auch nicht ins andere Extrem kippen und behaupten, alles sei unbeweisbar. Schon die Behauptung,
etwas sei unbeweisbar, kann (in einem anderen System) wieder beweisbar sein.

Wichtig: Das bedeutet nicht, dass man «nichts» beweisen kann. Mathematische Beweise liefern eine Art Gewissheit, die
im Alltag selten vorkommt. Ich bin mir sicherer, dass es keine grösste Primzahl gibt, als dass ich einen Vater und
eine Mutter habe. Letzteres ist zwar praktisch sicher, aber nicht logisch zwingend. Mathematische Gewissheit ist —
wenn sie einmal sauber bewiesen ist — unerbittlich.

## Komplexitätstheorie
Als Informatiker bin ich ständig mit Analysen über die Komplexität von Algorithmen konfrontiert. «Algorithmus» klingt
gross, meint aber oft etwas Banales: einen Prozess, ein Verfahren. Zum Beispiel: der kürzeste Weg von A nach B.
Man kann dann fragen, wie viel Zeit dieser Prozess im Durchschnitt, im besten oder im schlimmsten Fall braucht.

Komplexitätstheorie handelt genau von solchen Fragen: Was ist schneller? Was lässt sich optimieren?
Bevor ich Informatik studierte, dachte ich naiv: «Wenn man nur sauber programmiert, wird es schnell.» Das stimmt
manchmal — aber nicht immer. Manche Probleme bleiben langsam, selbst wenn man sie optimal implementiert.

Es gibt Aufgaben, die in der Praxis gut lösbar sind (z. B. sortieren, kürzeste Wege in grossen Netzen). Andere werden
aber sehr schnell absurd schwierig. Ein Beispiel ist Routenplanung mit vielen Zwischenstopps, bei denen die Reihenfolge
egal ist (klassisch: Varianten des Traveling-Salesman-Problems): Das skaliert exponentiell.

Und selbst bei Problemen, für die wir den «optimalen» Algorithmus kennen, kann das Ergebnis praktisch unbrauchbar sein.
Schach ist ein schönes Beispiel: Perfektes Schach lässt sich «in Prinzip» berechnen, aber der dafür nötige Aufwand ist
so gewaltig, dass das Universum eher aufhört zu existieren, als dass der Algorithmus fertig wird.

### Was bedeutet das?
Nach Gödel kommt hier eine andere Art von Grenze: Es gibt Probleme, die *lösbar* sind. Es gibt eine eindeutige
Antwort, und wir wissen sogar, wie man sie findet. Und trotzdem sind sie so langsam, dass sie praktisch als
unlösbar gelten müssen.

Das ist weniger abstrakt als Gödel. Es gibt eine ganze Klasse solcher Probleme (Stichworte: NP‑vollständig,
EXP‑Time). Wären diese effizient lösbar, sähe unsere Welt anders aus: neue Medikamente, optimierter Verkehr,
und gleichzeitig wären viele Verschlüsselungsverfahren kaputt.

Und wichtig: Das ist nicht «nur» eine Grenze des Menschen. Wenn es keinen schnellen Algorithmus gibt, dann ist das
auch eine Grenze für Maschinen — auch für KI.

## Halteproblem
Spätestens hier ist endgültig klar: Informatik.

Das Halteproblem ist ein Thema, von dem viele nie hören — ausser sie studieren Informatik oder interessieren sich
privat dafür. Und doch wäre die Welt völlig anders, wenn es lösbar wäre. Aber es ist es nicht.

Worum geht es?

Wir betrachten einen Algorithmus (ein Programm) und fragen: Hält er an — oder läuft er für immer?
Die erste Intuition ist: «Schau den Code an. Wenn da eine Schleife ist, dann weiss man es.» Leider gibt es sehr viele
Programme, bei denen man gerade *nicht* entscheiden kann, ob sie anhalten.

### Was bedeutet das?
Vorher hatten wir Probleme, die «nur» praktisch unlösbar sind. Jetzt kommt etwas Seltsameres:

Ein Programm ist eindeutig. Entweder hält es an oder es hält nicht an. Dazwischen gibt es nichts.
Und trotzdem gibt es keinen allgemeinen Prozess, der diese Frage für beliebige Programme zuverlässig beantworten kann.

## Chaostheorie

Eine weitere Einschränkung unserer Möglichkeiten: Chaos.

«Chaos» meint hier nicht Alltagchaos, sondern einen mathematischen Begriff. Ein chaotisches System entwickelt sich je
nach kleinsten Unterschieden im Ausgangszustand in völlig unterschiedliche Richtungen. Der Klassiker ist das
Doppelpendel: Die Bewegung ist durch Naturgesetze klar bestimmt — und trotzdem ist es praktisch unmöglich,
hinreichend weit in die Zukunft präzise vorherzusagen, wo es nach 100 Sekunden sein wird.

Viele relevante Systeme verhalten sich in diesem Sinn chaotisch: Wetter, langfristige Bahnprognosen, komplexe
Stoßsysteme (z. B. viele Billardkugeln), und auch biologische bzw. medizinische Prozesse. Könnten wir diese Systeme
zuverlässig «lösen», hätten wir Therapien für eine Vielzahl von Krankheiten.

### Was bedeutet das?
Wieder eine Grenze — aber diesmal sehr praktisch.

Manche behaupten (oft nicht Wissenschaftler), die Welt bestehe «im Grunde» nur aus ein paar Naturgesetzen, und alles
andere sei nur Ableitung. Daran ist einiges schief. Schon unsere aktuelle Physik ist kein vollständiges,
widerspruchsfreies Gesamtbild. Und selbst wenn sie es wäre: Chaos bleibt.

Um von kleinen Systemen verlässlich auf grosse zu schliessen, müssten wir chaotische Effekte vollständig kontrollieren.
Das gelingt in idealisierten Modellen vielleicht — in der realen Welt aber selten.

Das zwingt uns zu Abstraktionen, die nicht einfach «aus der Physik heraus» deduzierbar sind. Physik ersetzt nicht
Chemie, Chemie ersetzt nicht Biologie, und bei Psychologie und Soziologie wird es erst recht schwierig.

Folge: Wir müssen oft mit statistischen, vereinfachenden und (im strengen Sinn) «falschen» Theorien arbeiten, weil
die präzisere Wahrheit für uns unerreichbar bleibt. Das macht solche Modelle nicht wertlos — nur begrenzt.

## Gradientenoptimierung
Das waren einige harte Grenzen. Sind wir damit grundsätzlich gelähmt?

Nicht ganz. Statt einer universellen Theorie können wir oft eine universelle Methode nutzen: Optimierung.

Im maschinellen Lernen wird das sehr konkret: Man baut ein System, das wenig «versteht». Es nimmt die Welt wahr, aber
kennt die zugrunde liegenden Gesetze nicht. Dann gibt man ihm ein Feedback‑Signal: Wie gut war diese Aktion?
Und das System versucht nicht zuerst, alles zu erklären, sondern iterativ besser zu werden.

Das Bild dazu: Ein Roboter steht am Berg und sieht nur einen Meter weit. Statt zu jammern, dass er den Gipfel nicht
sieht und deshalb keinen perfekten Plan machen kann, macht er einfach den nächsten Schritt bergauf — und dann den
nächsten. Irgendwann ist er oben. Vielleicht nicht auf dem Mount Everest, aber auf einem Berg, den er tatsächlich
erreichen konnte.

### Was bedeutet das?
Dieser Ansatz «belebt» die gelähmte Person: Man kann weitergehen, auch ohne allwissenden Plan.

Und das gilt nicht nur für Wissenschaft. Auch im Alltag ist der nächste sinnvolle Schritt oft besser als ein
grandioser Masterplan. Statt «das Problem komplett lösen» kann man eine kleine Verbesserung machen. Statt «die Ehe
retten» kann man heute ein ehrliches Kompliment machen. Statt «die Firma umkrempeln» kann man einem Kunden freundlich
begegnen.

Es nimmt Druck raus: Man muss nicht alles verstehen, um anfangen zu handeln.

Der einzige «Plan» ist: Tu etwas Kleines und Gutes, von dem du begründet glaubst, dass es hilft.

## Spieltheorie
Ah ja, Spieltheorie: das oft belächelte Stiefkind der Soziologie.
Man wirft ihr vor, sie sei «unwissenschaftlich», weil sie mit Modellen arbeitet, die offensichtlich nicht die ganze
Realität abbilden. Das stimmt — aber das gilt für fast alle Modelle. Und die Einsichten können trotzdem wertvoll sein.

Spieltheorie versucht, menschliche Interaktionen als Spiel zu formalisieren und dann zu analysieren, was unter
bestimmten Annahmen rationales Verhalten wäre.

Ein klassisches Beispiel ist die «Tragödie der Allmende» (Tragedy of the Commons). Eine gemeinsame Wiese gehört dem
Dorf. Alle Bauern dürfen ihre Kühe darauf weiden lassen. Das Problem: Jeder einzelne Bauer profitiert davon, noch eine
Kuh zusätzlich zu schicken. Die Kosten — Überweidung, schlechtere Wiese — werden aber von allen gemeinsam getragen.

Selbst wenn niemand «böse» ist, entsteht so ein Mechanismus, der die gemeinsame Ressource zerstört. Und genau das ist
die Pointe: Nicht moralische Kategorien sind zuerst entscheidend, sondern Anreize und Strukturen.

Spieltheorie liefert hier eine Denkweise: Welche Regeln würden Kooperation stabil machen? Wie verändern sich
Ergebnisse, wenn man Gegenseitigkeit, Reputation oder Sanktionen einbaut? Und wenn ein System sogar unter der
Annahme egoistischer Akteure stabil wäre, dann ist das ein starkes Indiz, dass es auch in der Realität robust ist.

### Was bedeutet das?
Neben konkreten Ergebnissen aus Modellen bringt Spieltheorie etwas sehr Nützliches: Sie zwingt dazu, Egoismus als
relevante Kraft ernst zu nehmen.

Egoismus wird oft moralisch abgewertet. Spieltheorie ist darin fast provokativ neutral: «Gut» ist erst einmal, was
mir nützt. Das ist unbequem — aber hilfreich, wenn man die Welt verstehen will.

Das relativiert auch Moral und Ethik in einem bestimmten Sinn: Welche Wirkung hat «gutes Handeln», wenn es gegenüber
anderen Strategien nicht bestehen kann? Handlungen müssen stark genug sein, um sich in der Welt zu behaupten.

Und ähnlich wie bei der Gradientenoptimierung schrumpft der Horizont: Nicht «die Welt retten» ist die Aufgabe,
sondern in einer lokalen und zeitlich begrenzten Situation die bestmögliche Entscheidung zu treffen.
