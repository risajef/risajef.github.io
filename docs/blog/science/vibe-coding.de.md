---
lang: de
tags:
* programming
* ai
* artificial intelligence
* vibe-coding
auto_translated: false
---

# Ein Gedanke zu Vibe-Coding

Ich lese viele Artikel über dieses Vibe-Coding. Wobei der Begriff nicht mal genau definiert ist, aber ungefähr besagt: Programmieren mit integrierter Unterstützung durch ein LLM. Oder in anderen Worten: das durch künstliche Intelligenz unterstützte Programmieren. Ich selbst verwende es extensiv für viele unwichtige Angelegenheiten.

Ich möchte eine kleine Webanwendung machen für meine Präsentation: Easy. Mit Vibe-Coding geht das in 10 Minuten. Ich möchte meine Daten mit einem Skript auswerten. Die KI schreibt mir dieses Skript schnell. Und so weiter.

Gleichzeitig wird überall gewarnt vor den Gefahren der KI. Gerade die Open-Source-Community hat Probleme damit. Das Engagement an Open-Source-Projekten nimmt nämlich ab. Menschen möchten die Probleme von diesen Projekten gar nicht mehr fixen, sondern finden einen Workaround mittels KI. Die KI konnte die Library lokal ändern oder fand sonst einen Fix. Da der Programmierer selbst nur wenig Code am Ende noch liest, ist er sich gar nicht bewusst, dass ein Problem in einer Library existierte, und fährt fort, als wäre nichts gewesen. Diese Entwicklung (und viele andere) werden kritisiert. Ich möchte in diesem Artikel Parallelen zu vergangenen Entwicklungen aufzeigen und eine Prognose wagen, wohin sich die Programmierwelt entwickeln wird und wie wir uns darauf vorbereiten können.

## Computer

Vor 200 Jahren gab es den Beruf des «Computers». Es waren Menschen (meist Frauen), die im Kopf und mit Stift und Papier rechneten. Gab es ein mathematisches Modell für die Berechnung, konnte man diese Frauen anstellen und sie berechneten es. Menschen sind fehlerhaft und somit waren auch immer wieder Resultate falsch. Gleichwohl war es über eine lange Zeit eine wertvolle Aufgabe. Bis der moderne Computer kam. Eine Maschine, die genau das kann. Der Beruf wurde wegrationalisiert.

Stellen wir uns diese Zeit vor. Ein gebrauchter Beruf wurde überflüssig. Aber nicht nur das, auch die Open-Source-Community wurde getroffen. Es gab Bücher mit Logarithmus-Tabellen. Viele nützliche Dinge wurden überflüssig. All dieser Nutzen fiel weg.

## Heute

Aus meiner Sicht verhält es sich heute genauso. Viele wichtige Berufe werden überflüssig. (Meiner wahrscheinlich auch.) Doch was passiert, wenn auf einmal Aufgaben, die früher Wochen oder gar Monate dauerten, jetzt in Stunden gemacht werden können? Die ganze alte Infrastruktur für den Informationsaustausch wird überflüssig. Die Open-Source-Projekte werden sich ändern. Es geht nicht mehr um so kleine Sachen wie einen Bugfix, sondern um Features. Neue Fähigkeiten werden bereitgestellt.

Früher war eine Berechnung nur gültig mit korrektem Rechnungsweg. Mit dem Computer interessieren die Zwischenresultate niemanden mehr. Wenn der Algorithmus definiert ist, dann «glaubt» man einfach dem Computer, dass er das schon korrekt macht. Natürlich sind alle Hilfsmittel (Compiler usw.) ebenfalls wichtig. Doch sind viele davon auch nicht öffentlich, folglich muss einfach vertraut werden, dass sie funktionieren. Mit nicht quelloffenen Programmen wird die Kette gebrochen und wir können nicht nachvollziehen, ob ein Ergebnis korrekt ist. Das hat aber kaum jemanden interessiert in der Vergangenheit.

Mit KI verhält es sich gleich. Wir sind nicht mehr an einzelnen Commits interessiert, sondern an Blöcken. Commits werden nur vollständigkeitshalber gespeichert. Doch es wird eine KI-Zusammenfassung der Änderung geben und diese wird das wahre «Diff» sein. Wenn der Code nicht diesem «Diff» entspricht, dann ist das halt ein BUG. Ich glaube, die Menschheit benötigt kein Log für jede Millisekunde. Ich glaube, dass die Abstände zwischen den Logs (genauer gesagt die Grösse der Commits) abhängig von der echten Zeit sind. Ein Log/Commit pro 30min, aber vielleicht auch nur ein Log/Commit pro Halbtag. Was in dieser Zeit erledigt werden kann, wurde mit KI gesteigert, und dadurch werden die «Diffs» riesig. Ähnlich wie bei den Computern: Wir speichern nicht alle Rechenschritte. Wenn es neu berechnet werden kann innerhalb von 30 min, warum soll ich es speichern?

Wir benötigen so ein «Meta-Git». Am Anfang wird das eine LLM-Zusammenfassung von vielen Git-Commits sein. Doch dieses Meta-Git wird sich entwickeln und ein Standard wird kreiert werden. Dieses Mega-Git sollte langfristig weiterentwickelt werden. Wenn ein solcher einzelner «Meta-Commit» ganze Features beinhaltet (was früher ein Pull-Request war, ist heute ein Commit), dann wollen wir so Eigenschaften wie Assoziativität und Kommutativität. Die History dieser Änderungen wird irrelevant, sondern nur noch die semantische, konkrete Änderung. Schon beinahe isoliert von seiner Umgebung.

Was wir in Zukunft also teilen werden, wird sich verändern. Es werden nicht mehr normaler Code sein, sondern Features oder Komponenten. Wie solche gespeichert und angewandt werden auf andere Projekte usw., weiss ich nicht.

## LLMs sind die erste Hochsprache

Die Vision vieler Hochsprachen wie Pascal war es: Lasst uns einfach Englisch schreiben, was wir wollen, und der Computer macht es dann. Doch alle Ansätze funktionierten nicht. Es war immer einfach eine etwas lesbarere Version von einer puren Sprache. Viele wollten nicht die menschliche Sprache imitieren, sondern das menschliche Denken, und somit entstanden die objektorientierten Sprachen. Objekte sind da und tun etwas.

Aus meiner Sicht sind LLMs die Erfüllung dieser Vision. Jetzt können wir wirklich auf Englisch (oder sogar in einer anderen Sprache) ausdrücken, was wir wollen, und der Computer macht es. Es ist eine Revolution. Momentan sind noch immer die am effizientesten mit der KI, die es auch ohne KI machen könnten, doch ich bin mir nicht sicher, dass das so bleibt. Bzw. ich bin mir ziemlich sicher, dass es nicht so bleibt.

Ich erinnere mich noch gut an ein Gespräch mit einem alten Freund. Er war und ist sehr gebildet und intelligent (was nicht dasselbe ist). Er war jedoch eher sprachlich talentiert als mathematisch. Er erzählte mir von einem Aufsatz, den er als Auftrag schrieb, in dem er ad absurdum führte, dass ein Computer Menschen ersetzen könnte. Der hätte doch keine Kreativität, kein logisches Denken und keinen Antrieb. Dieser Aufsatz alterte schlecht. Ich sagte ihm schon damals, dass ich keinen fundamentalen Unterschied zw. Computer und Menschen finde und es kein Argument ist, es einfach absurd zu nennen. Es blieb bei diesem kurzen Austausch. Doch heute haben wir KIs mit Kreativität, Antrieb, und wenn wir die «Agents» zusammen mit einer Programmiersprache betrachten, dann besitzen sie jetzt auch Logik.

## Wie bereiten wir uns vor?

Diese Entwicklung wird sich nicht aufhalten lassen. Als Direktbetroffener werde ich von Anfang an die Tools nutzen, am Ball bleiben und versuchen, Probleme zu lösen, die ich zuvor nicht konnte. Meinen Berufsstolz muss ich liegen lassen und ein Ja zu einer neuen Denkweise finden. Ich glaube, für uns persönlich ist es hilfreich, möglichst am Ball zu bleiben. Und das aktiv. Lasst uns Projekte umsetzen und nicht nur Blogartikel lesen. Als Firma dasselbe. Haltet nicht krampfhaft an euren alten Prozessen fest. Evaluiert andauernd. Als Politik: Open Data wird so wichtig wie noch nie. Mit KI kann man die schnell anzapfen und sich Berichte erstellen lassen. Die Entscheidungsfindung in Zukunft wird viel datengestützter sein.
