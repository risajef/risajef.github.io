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

# [Was haben wir gelernt? Und einige gebildete Guesse](/blog/science/what-have-we-learned-and-some-educated-guesses/)

## Gödels Unvollkommenheitstheorie
Gödel ist einer der grossen Mathematiker des letzten Jahrhunderts. Unter anderem arbeitete er an den Grundlagen der Mathematik. Er interessierte sich für die Frage, ob Mathematik vollständig ist. Um diese Aussage zu verstehen, muss ich kurz das Konzept des Axioms erklären.

Ein Axiom ist eine Annahme in einem mathematischen System, das nicht nachgewiesen wird. Mathematik kann ohne diese Annahmen nicht existieren. Ein mögliches Axiom, das bekannt ist, ist 1 + 1 = 2. Es scheint unmöglich, das zu beweisen. Sie können jedoch versucht werden, zu behaupten, “Das erfordert keinen Beweis”, und wenn sie sagen, dass, sie haben die Idee hinter Axiomen verstanden. Als Axiom möchten Sie immer eine Erklärung auswählen, mit der jeder einverstanden sein kann. Das ist so offensichtlich, dass es kaum bestritten werden kann. Aber in der Wissenschaft der Mathematik sind Sie sehr bewusst, welche Annahmen Sie machen. Sie sagen nicht nur: „Das ist offensichtlich, wir werden annehmen, wahr zu sein.“ Weil das, was für Sie offensichtlich ist, möglicherweise nicht jemand anderes sein. Deshalb schreiben Mathematiker ihre Axiome und sagen: "Ich mache Mathematik unter den folgenden Annahmen." Dann kann ein Kollege gehen und überprüfen, ob seine Arbeit unter den Annahmen richtig ist.

Ein Beispiel für solche Annahmen:

- A: 0 eine Zahl
- B: 1 eine Zahl
- C: Wenn x eine Zahl ist, dann: x + 0 = x
- D: Wenn x eine Zahl ist, dann ist x + 1 auch eine Zahl
- E: x+1 > x

Mathematiker würden sagen, dass dies nicht formal korrekt ist, aber für meine Zwecke ist es ausreichend. Hier können Sie sehen, wie banal solche Aussagen sind. Mit diesen Aussagen können wir die Aussage bereits beweisen: „Es gibt keine grösste Zahl.“ Ein Beweis, der für Kinder eine auffällige Erkenntnis ist. Und wir sollten diese Faszination nicht einfach herunterspielen.

Wir beweisen es hier mit einem Beweis des Widerspruchs:

Angenommen, es gibt eine grösste Zahl. Rufen wir es an. Wenn es sich um eine Zahl handelt, folgt aus „D“, dass y+1 auch eine Zahl ist. Rufen wir es z. Und aus „E“ folgt, dass z grösser ist als y. Das widerlegt unsere Annahme, dass y die grösste Zahl ist. Es folgt, dass es keine grösste Zahl gibt.

Das klingt alles wie nutzlos beunruhigend, dass Mathematiker tun, um ein Problem zu lösen, das nicht existiert. Und genau so dachte die Mehrheit der Mathematiker zu Beginn des 20. Jahrhunderts. Und da kommt Gödels Unvollkommenheit Theorem herein. Die Beweisidee ist nicht schwierig, aber sie ist noch über den Umfang dieses Artikels hinaus. Wenn es dennoch gewünscht wird, hinterlassen Sie einfach einen Kommentar. Die Erklärung lautet: Egal, wie viele Annahmen Sie machen, es werden immer echte Aussagen, die Sie mit Ihren Annahmen nicht beweisen können. Es folgt, dass Mathematik unvollständig ist. Es kann sich nie vollständig beschreiben. Egal, wie viele Annahmen Sie machen, sei es fünf Milliarden, Sie werden nie in der Lage, alle richtigen mathematischen Aussagen zu beweisen.

### Was bedeutet das?
Die Hoffnung war, dass wir nur genug erforschen und intelligenter werden müssen, um alles zu erforschen. Aber die Unvollkommenheitstheorie zeigt, dass wir begrenzt sind. Wir können nicht alles beweisen. Mir folgt, dass es unabhängig davon, was unser formales Denksystem ist, immer Dinge gibt, die für uns unzugänglich bleiben. In sehr praktischer Hinsicht brauchen wir vielleicht eine Möglichkeit, sich mit unvorhersehbaren Aussagen zu befassen. Aber wir dürfen auch nicht davon getragen werden, dass alles unvorhersehbar ist. Die Aussage, dass etwas nicht nachweisbar ist, ist wieder vielleicht eine nachweisbare mathematische Aussage.

Was ich nicht gesagt habe: Das bedeutet nicht, dass nichts nachgewiesen werden kann. Mathematisch bewährte Dinge sind von einer Gewissheit und Stabilität, von der wir im praktischen Alltag kaum etwas wissen. Ich bin mir sicherer, dass es keine grösste Hauptzahl gibt, als dass ich einen Vater und eine Mutter habe. Die Wahrscheinlichkeit, dass ich künstlich in einem geheimen Labor produziert werde, ist winzig, aber immer noch nur Nullpunkt Null was auch immer. Aber die Gewissheit einer mathematischen Aussage ist 100%. Davon gibt es nichts zu schütteln. (Ich werde hier psychologische Aspekte ignorieren).

## Komplexitätstheorie
Als studierter Informatiker begegnete ich kontinuierlich Analysen über die Komplexität von Algorithmen. Algorithm ist ein schallendes Wort für etwas Einfaches. Ein Algorithmus ist einfach ein Prozess. Es gibt beispielsweise ein Verfahren zum Auffinden des kürzesten Wegs von A nach B. Man kann dann bewerten, wie viel Zeit dieser Prozess im Durchschnitt oder im schlimmsten Fall oder im besten Fall dauert. Komplexitätstheorie geht es um solche Analysen. Welcher Prozess ist schneller? Kann es optimiert werden? Bevor ich mit dem Studium der Informatik begann, vermutete ich, dass man einfach den Code korrekt schreiben sollte, dann wäre alles schneller. Leider war dies zu naiv und es gibt Prozesse, die nicht schnell sind, auch wenn sie optimal umgesetzt werden. Es gibt Prozesse wie den schnellsten Pfad zu finden oder eine Liste zu sortieren, die schnell sind. Andere sind jedoch sehr schwierig. Zum Beispiel ist die Routenplanung viel komplexer. Wenn Sie eine Route über das Land planen möchten, wo Sie an verschiedenen Orten vorbeigehen, aber die Bestellung spielt keine Rolle, das ist exponentiell langsam. Dafür haben wir keinen Prozess. Und es gibt Leute, die genau das als Beruf tun. So genannte Versender. Aber selbst sie tun es nur annähernd. Es ist ihnen egal, ob die Route 10% oder 20% langsamer ist. Bei anderen Problemen ist es jedoch schwieriger. Zum Beispiel Schach. Wir haben ein Verfahren, um perfekte Schach zu spielen, leider ist es so ineffizient, dass es nie beendet. Und niemals meine ich, so lange das Universum verschwinden wird, bevor es endet. Dieser optimale Algorithmus würde Quadrillionen von Jahren nehmen, auch auf den grössten Supercomputern der Welt (die immer noch eine riesige Untertreibung ist).

### Was bedeutet das?
Nach dem Unvollkommenheitstheorem kommt das jetzt. Dies sind Probleme, die lösbar sind. Sie haben eine Lösung. Wir wissen, wie wir es finden. Wir wissen sogar, dass dies der optimale ist und dass es keinen besseren gibt. Und doch sind sie so langsam, dass sie aus rein praktischer Sicht als unlösbar angesehen werden müssen.

Wenn die Folge des Unvollkommenheitstheorems noch recht abstrakt war, ist es hier weniger. Es gibt eine ganze Liste solcher praktisch unlösbarer Probleme. (Keyword: NP-Complete, EXP-Time). Wenn diese Probleme auflösbar wären, würde unsere moderne Welt anders aussehen, und wir hätten neue Medikamente gefunden, vereinfachten Verkehr, aber auch jede Verschlüsselung gehackt. Und es ist nicht so, dass diese Probleme für einen Menschen lösbar sind. Wenn ein Mensch einen Prozess hatte, wäre es nur ein solcher Algorithmus. Diese Probleme sind für den Menschen und auch für künstliche Intelligenz unlösbar.

## Halteproblem
Spätestens ist klar, dass ich ein Informatiker bin. Das ist ein Problem, dass niemand je davon gehört hat, wer es nicht studiert hat oder es als Hobby betrachtet hat. Aber die Welt würde völlig anders aussehen, wenn das Problem lösbar wäre. Aber es ist nicht. Künstliche Intelligenz wäre viel einfacher zu bauen. Wir brauchen Ingenieure kaum, um Dinge zu berechnen. Unsere Schule müsste sich anpassen. Und mit einer wirklich intelligenten Maschine wäre das wahrscheinlich das kleinste Problem.

Also, was ist das Stoppproblem? Einfach abgeschrieben: Es geht wieder um Prozesse oder Algorithmen. Nun, wenn wir einen Algorithmus sehen, fragen wir uns: Hört es auf? Oder geht es ewig weiter? Die erste Intuition vieler Menschen, einschliesslich mir, ist: „Du musst nur untersuchen, was genau während des Prozesses passiert. Ob es eine Schleife hat, und dann werden Sie sehen.“ Aber leider gibt es viele Algorithmen, für die es nicht klar ist, ob sie halten.

### Was bedeutet das?

Vorher hatten wir praktisch unlösbare Probleme, und jetzt haben wir ein verrücktes Phänomen. Weil ein Algorithmus eindeutig ist. Entweder hört es auf oder es nicht. Dazwischen gibt es keinen. So mathematisch hat die Frage eine eindeutige Antwort, aber es gibt keinen Prozess, es zu finden.

## Chaostheorie

Eine weitere und letzte Einschränkung unserer Möglichkeiten. Neben Problemen, die zu viel Zeit brauchen, um unlösbare Probleme zu lösen, gibt es einen anderen uneingeladenen Gast in der Sitzung der Unannehmlichkeiten. Chaos. Und während der Begriff seine Bedeutung in verschiedenen Kontexten hat, meine ich hier nur einen, den mathematischen. Chaos in diesem Zusammenhang ist das Eigentum eines Systems, das sich je nach Ausgangszustand in verschiedene Richtungen entwickelt.


Chaos visualisiert durch Doppelpendel
Es ist unmöglich vorherzusagen, wo das Pendel nach 100 Sekunden sein wird, obwohl es durch die Naturgesetze klar definiert ist. Viele äusserst relevante Systeme in unserer Welt verhalten sich in diesem Sinne chaotisch. Wir können nicht sagen, wie das Wetter in zwei Wochen sein wird, wo Asteroiden in ein paar Jahren sein werden, wo Billardkugeln stoppen, wenn zu viele gleichzeitig getroffen werden, und vieles mehr. In der Medizin gibt es auch viele chaotische Systeme. Wenn wir sie lösen könnten, hätten wir Behandlungen für eine Vielzahl von Krankheiten.

### Was bedeutet das?

Ein weiteres unlösbares Problem. Aber dieser ist praktisch relevant, dass er nicht nur unsere abstrakten Grundlagen unseres Verständnisses des Universums verändert, sondern auch ziemlich praktisch problematisch ist. Einige Menschen (meistens nicht Wissenschaftler) behaupten, dass die Welt nur aus vier Naturgesetzen besteht. Alles andere ergibt sich daraus. Und es gibt einige Dinge falsch mit dieser oft wiederholten Lüge. Zuerst kann unsere aktuelle Physik die Welt nicht beschreiben. Es gibt Dinge, die unseren Modellen widersprechen oder die Modelle sind so vage, dass sie nicht erlaubt werden, Theorien genannt werden. Sie versuchen es oft weg zu erklären, aber die Probleme bleiben. Die Gesetze der Natur der grossen Dinge sind mit denen der kleinen Dinge unvereinbar. (Die Erklärung, ich gehe hier raus). Aber es gibt etwas anderes: Selbst wenn wir eine Theorie haben, die mit der Beobachtung übereinstimmt, bleibt das Chaosproblem. Um von kleinen Systemen zu grossen zu unterziehen, müssen wir das Chaos kontrollieren. Und das könnte funktionieren, wenn wir alle Parameter in unserer Hand haben, aber in der wirklich relevanten Welt ist dies nicht möglich. Als makroskopische Wesen sind wir also in einer Welt, in der wir Theorien entwickeln müssen, die gut genug sind, aber eigentlich nicht korrekt sind.

Chaos erfordert, dass wir Abstraktionen entwickeln, die keine direkte Verbindung zu den Gesetzen der Physik haben. Physik wird nie die Chemie ersetzen. Und wenn es das tut, dann sicherlich nicht Mikrobiologie. Dort sind die Prozesse bereits so komplex, dass Chaos übernimmt. Und die Themen Biologie, Psychologie, Soziologie, Geschichte, Religion und so weiter sind für uns aus der Perspektive der Grundgesetze ohnehin nicht erreichbar.

Daher müssen wir uns der Entwicklung von statistischen und auch fehlerhaften Theorien, die uns praktisch helfen, Dinge zu verstehen, zurückweisen. Selbst wenn sie zu viel abstrahieren. Und das Enttäuschen ist: Es gäbe eine richtige präzise und korrekte Lösung für die Fragen, die wir uns stellen, aber sie sind aus Gründen der Chaostheorie und auch der Komplexitätstheorie nicht zu erreichen. Die Wissenschaft hat Grenzen für sich gesetzt. Dies bedeutet jedoch nicht, dass statistische Theorien ungültig sind, sondern nur, dass es bessere gibt, die für uns unzugänglich sind und bleiben.

## Gradientenoptimierung
Das waren jetzt alle grossen Einschränkungen. Was kann noch getan werden? Sind wir nicht grundsätzlich begrenzt und unsere Versuche, die Welt von Anfang an zu verstehen, verfehlt? Nicht ganz. Anstatt eine universelle Theorie zu haben, können wir eine universelle Methode entwickeln. Anstatt die Welt zu beschreiben, können wir sie in unser System drücken und nach Bedarf anpassen.

Diese Anpassungen wurden im Detail auf dem Gebiet des maschinellen Lernens untersucht. Man entwickelt einen Roboter, der kaum etwas versteht. Es nimmt nur die Umwelt wahr, weiss aber nicht über die Gesetze der Natur um sie herum. Und sicherlich nicht über die grösseren Gesetze, wie Materialwissenschaft und so weiter. Aber wir geben dem Roboter eine Eingabe, die sagt, wie gut es jetzt tut. Und der Roboter versucht nicht zu verstehen: Wie kann ich es am besten machen, aber wie kann ich es besser machen? Anstatt alles verstehen zu wollen, nimmt es alles, was er früher als eine gegebene Wahrheit gelernt hat, und versucht, kleine Anpassungen vorzunehmen, um sein Verständnis mit der Realität in Einklang zu bringen.

In einem Bild klettert der Roboter einen Berg, aber er kann nur einen Meter entfernt sehen. Und anstatt nach unten zu sitzen und zu sagen: "Ich kann nicht die Spitze sehen, so kann ich keine Route planen." Es dauert einfach einen Schritt nach oben. Und dann wieder. Später ist er an einem Punkt, an dem alle Schritte nach unten sind, und dann sagt er: "Ich bin da." Und vielleicht ging er nicht auf den Mount Everest, er ging einfach auf den Berg um die Ecke, aber er ging trotzdem auf.

### Was bedeutet das?
Dieser Ansatz revidiert die gelähmte Person und wir können unsere Reise fortsetzen. Und diese Methode gilt nicht nur für die Zukunft der Wissenschaft, sondern auch für den Alltag. Statt zu versuchen, das Problem zu beheben, das Sie Gesicht, können Sie einen Schritt. Statt zu versuchen, die Ehe zu retten, Kompliment sie. Statt das Unternehmen umzugestalten, geben Sie einen freundlichen Gruss an einen Kunden. Anstatt Krebs zu schlagen, schlucken Sie diese eine Pille. Es befreit uns von der Verantwortung, einen Plan für alles zu haben. Weil es ohnehin keinen Plan gibt. Der einzige Plan ist, “Do etwas klein und gut, dass Sie wissen, wird helfen. „

## Spieltheorie
Ah ja, Spieltheorie. Das verlassene Stiefkind der Soziologie. Es wird kritisiert, dass es unwissenschaftlich ist. Sie stellen Modelle zusammen, die nichts mit der Realität zu tun haben. Als wären sie die einzigen. Aber das mag wahr sein, aber trotzdem sind die Erkenntnisse interessant. Spieltheorie versucht menschliche Interaktionen als Spiel zu repräsentieren. Und analysiert dann, was das optimale rationale Verhalten ist.

Wie immer ist ein Beispiel illustrativer als jede Einführung. Lassen Sie uns das Problem der Commons diskutieren. Eine gemeinsame Wiese ist eine Wiese, auf der die Bauern des Dorfes ihre Kühe grasen lassen können. Es gehört zum Dorf und zu keinem Bauern allein. Das Problem ist, dass die Bauern mehr und mehr Kühe haben, aber die gemeinsame wird nicht immer grösser. Jetzt fragt sich die Gemeinschaft, wie viele Kühe sie zulassen sollten. Sie diskutieren hin und her und vereinbaren nichts. Sie sagen, jeder tut, was er will. Die Bauern werden sicherlich nicht so viele Kühe senden, dass die Weide zerstört wird, dann würden sie selbst nichts haben. Aber diese Annahme war zu optimistisch. Weil aus einer bestimmten Anzahl von Kühen ein interessantes Phänomen aufgetreten ist: die Gesamtzahl der Nahrung für die Kühe verringerte sich, weil die Zuteilung gegessen wurde. Aber ein neuer Farmer kommt, er hat nur eine Kuh. Und obwohl das Land zerstört wird, hat seine Kuh noch mehr davon, auf dem fast zerstörten Land zu gehen, als nicht. Wenn also die Bauern für sich selbst denken, dann ist es immer wirtschaftlich vernünftig, eine andere Kuh zu schicken, weil sie mehr profitieren als wenn sie es nicht tun, aber das ist der Grund, warum die Commons zerstört werden.

Dieses Gedankenexperiment ist eine beeindruckende Illustration der Spieltheorie. Es stellt eine Situation dar und gibt die Regeln. Dann werden verschiedene Dinge analysiert: Welches Verhalten ist für einen rationalen Wirtschaftsakteur geeignet? Welche Regeln könnten als rationale Wirtschaftsgemeinschaft gelten? Und so weiter. Spieltheorie ist oft lächerlich, weil seine Analyse nicht mit der Realität übereinstimmt und die Menschen nicht rational handeln. Aber diese Kritik ist oberflächlich. Wir können unser Modell mit anderen Ideen bereichern. Ideen mögen Gegenseitigkeit oder so. Und auch, wenn wir ein System haben, in dem selbstsüchtige Akteure ein System vorwärts bewegen, ohne die Gefahr von Gewalt, dann ist das eine Aussage. Wenn ein politisches System theoretisch stabil wäre, wäre es wahrscheinlich wirklich stabil.

### Was bedeutet das?
Neben dem offensichtlichen, d.h. dem direkten Ergebnis verschiedener Analysen, bringt Spieltheorie eine gesunde Denkweise auf den Tisch. Der Egoismus. Es wird in der Regel als unethisch betrachtet, aber Spieltheorie ist begeistert neutral darüber. Gut ist, was mir zugute kommt. Das sagt es. Und es war sehr gesund für mich zu erkennen, dass die Welt der Egoisten ernst genommen werden muss, um die Realität zu verstehen. Darüber hinaus relativiert Spieltheorie den Wert der Moral und Ethik etwas. Schliesslich, was ist der Wert, gut zu handeln, wenn wir nur je der schwächere Schauspieler sind? Unsere Handlungen müssen mächtig und stark genug sein, um vorherrschen zu können. Und ähnlich der Gradientenoptimierung schrumpft auch die Spieltheorie den Horizont. Anstatt die Welt zu retten, geht es darum, die richtige Entscheidung in einer lokal und zeitlich begrenzten Umgebung zu treffen.
