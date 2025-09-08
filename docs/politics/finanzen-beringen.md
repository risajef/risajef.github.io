# Finanzen der Gemeinde Beringen

Ich erstellte einige Graphen aus den Rechnungen und den Budgets der Gemeinde Beringen. Eventuell machte ich ein paar Fehler. Wenn dir einer auffällt, lass es mich wissen.

## Ausgaben pro Einwohner:in in Beringen

&nbsp;
{:#mermaid}

```mermaid
pie showData
    "Verwaltung": 524
    "Öff. Sicherheit": 72
    "Bildung":1424
    "Kultur&Freizeit":146
    "Gesundheit":238
    "Soziale Wohlfart": 582
    "Verkehr":82
    "Umwelt & Raumplanung":47
    "Volkswirtschaft":17
    "Finanzen":3010
```

Beringen nimmt pro Einwohner:in CHF 3010 pro Jahr ein und gibt etwa genau so viel aus (CHF 3133). Diese Daten sind wenig aussagekräftig. Wir können das aber mit einer Nachbargemeinde vergleichen:

## Vergleich mit Neunkirch

&nbsp;
{:#mermaid}

```mermaid
pie showData
    "Verwaltung": 473
    "Öff. Sicherheit": 164
    "Bildung": 1356
    "Kultur&Freizeit": 138
    "Gesundheit": 97
    "Soziale Wohlfart": 659
    "Verkehr": 273
    "Umwelt & Raumplanung": 99
    "Volkswirtschaft": 36
    "Finanzen": 3213
```

Solche Vergleiche erlauben (beispielsweise als Geschäftsprüfungskomissionsmitglied) zu beurteilen, wo genauer nachgeforscht werden sollte.

# Entwicklung

Ebenso ist die Entwicklung dieser Zahlen wichtig. Sind die Zahlen ansteigend oder sinkend? So wird beispielsweise wieder und wieder behauptet, die Verschuldung von Beringen sei zu hoch, aber die Zahlen belegen das nicht. Die Schulden sind stabil zwischen 34 und 39 Millionen oder ca. CHF 7000 pro Einwohner:in.

&nbsp;
{:#mermaid}

```mermaid
xychart
title "Fremdkapital"
x-axis [2020, 2021, 2022, 2023, 2024]
y-axis "tausend CHF" 34000 --> 40000
line [38010, 38342, 35781, 34232, 37158]
```

## Negative Entwicklungen

Einige nennenswerte Entwicklungen sind die Ausgaben pro Person, bezogen auf die Kategorien. Folgende sind sich am Erhöhen und es ist vielleicht sinnvoll, sie genauer im Auge zu halten.

&nbsp;
{:#mermaid}

```mermaid
xychart
title "Verwaltungskosten pro Person"
x-axis [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024]
y-axis "CHF pro Person" 300 --> 600
line [398, 377, 412, 517, 438, 361, 411, 371, 547, 498, 494, 539, 522]
```

&nbsp;
{:#mermaid}

```mermaid
xychart
title "Öffentliche Sicherheitskosten pro Person"
x-axis [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024]
y-axis  "CHF pro Person" 0 --> 80
line [2, 36, 33, 7, 16, 21, 63, 49, 21, 29, 55, 44, 72]
```

&nbsp;
{:#mermaid}

```mermaid
xychart
title "Gesundheitskosten pro Person"
x-axis [2020, 2021, 2022, 2023, 2024]
y-axis "CHF pro Person" 150 --> 250
line [165, 178, 158, 174, 237]
```
Ich wählte hier den Start bei 2020, weil es dort einen Systemwechsel gab und die Kosten darum nicht vergleichbar sind.

## Positive Entwicklungen

Auf der anderen Seite gibt es Trends, die erfreulich sind.

&nbsp;
{:#mermaid}

```mermaid
xychart
title "Verkehrskosten pro Person"
x-axis [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024]
y-axis "CHF pro Person" 60 --> 550
line [180, 183, 218, 534, 325, 292, 393, 158, 98, 145, 70, 68, 82]
```

&nbsp;
{:#mermaid}

```mermaid
xychart
title "Umwelt & Raumplanungskosten pro Person"
x-axis [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024]
y-axis "CHF pro Person" 30 --> 100
line [76, 90, 95, 92, 92, 93, 80, 98, 70, 55, 54, 53, 47]
```

# Stimmt das Budget?

Das Budget muss jedes Jahr erstellt werden. Es soll Orientierung liefern, wie die Ausgaben und Einnahmen im kommenden Jahr sein werden. Doch dieses eigentlich analytische Instrument ist immer wieder ein Werkzeug, um politische Macht auszuüben, und wird verwendet, um eine Geschichte zu erzählen, anstatt einen realistischen Blick in die Zukunft zu werfen. So betrachten wir hier die Diskrepanz zwischen Budget und Rechnung. Es sei angemerkt, dass im Jahr 2021 eine unerwartet grosse Steuerzahlung aus der Wirtschaft eintraf. Es gibt jedes Jahr ein paar Dinge, die nicht einkalkuliert wurden. Doch im Durchschnitt gleichen sie sich wieder aus.

Ich konnte die Budgets und Rechnungen bis ins Jahr 2020 vergleichen. Für die früheren Jahre stand mir das Budget nicht zur Verfügung.
{:#budget}

| Jahr | Rechnung (CHF) | Budget (CHF) | Differenz (CHF) |
|------|----------------|--------------|-----------------|
| 2020 | -230,101       | -328,630     | -98,529         |
| 2021 | 1,066,430      | -205,694     | -1,272,124      |
| 2022 | 124,426        | -68,785      | -193,211        |
| 2023 | 151,917        | -197,471     | -349,388        |
| 2024 | -647,740       | -784,180     | -136,440        |

Das Budget war noch nie schlechter als die Rechnung. Im Durchschnitt ist es CHF 409'000 zu pessimistisch und im Median CHF 193'000. Diese Abweichung scheint systematisch zu sein. So wird pessimistisch budgetiert, um Sparmassnahmen zu rechtfertigen oder zumindest Argumente gegen neue Ausgaben zu haben. Auch kann sich der Gemeinderat selbst immer wieder ein Kränzchen binden, da er ja besser abgeschlossen hat als budgetiert. Gerade letztes Jahr (2024) wäre noch viel positiver ausgefallen, wäre diese unerwartete Steuerrückzahlung nicht geschehen. Ich möchte mich ja nicht über eine gute Rechnung beklagen, aber das ist aus meiner Sicht etwas Augenwischerei und ein Missbrauch dieses Instruments. Ich verurteile es nur bedingt, da Budgets überall zu den genannten Zwecken missbraucht werden. Aber dennoch möchte ich es hier festhalten.
