---
lang: de
tags:
- politik
- finanzen
- beringen
- gemeinde
- budget
- daten
- mermaid
auto_translated: false
---

# Finanzen der Gemeinde Beringen

Ich erstellte einige Graphen aus den Rechnungen und den Budgets der Gemeinde Beringen. Eventuell machte ich ein paar Fehler. Wenn dir einer auffällt, lass es mich wissen.

## Ausgaben pro Einwohner:in in Beringen

&nbsp;
{:#mermaid}

```mermaid
pie showData
    "Bildung":1424
    "Soziale Wohlfart": 582
    "Verwaltung": 524
    "Gesundheit":238
    "Kultur&Freizeit":146
    "Verkehr":82
    "Öff. Sicherheit": 72
    "Umwelt & Raumplanung":47
    "Volkswirtschaft":17
```

Beringen nimmt pro Einwohner:in CHF 3010 pro Jahr ein und gibt etwa genau so viel aus (CHF 3133). Diese Daten sind wenig aussagekräftig. Wir können das aber mit einer Nachbargemeinde vergleichen:

## Vergleich mit Neunkirch

&nbsp;
{:#mermaid}

```mermaid
pie showData
    "Bildung": 1356
    "Soziale Wohlfart": 659
    "Verwaltung": 473
    "Gesundheit": 97
    "Kultur&Freizeit": 138
    "Verkehr": 273
    "Öff. Sicherheit": 164
    "Umwelt & Raumplanung": 99
    "Volkswirtschaft": 36
```
Neunkirch nimmt mit CHF 3213 sogar etwas mehr ein pro Person. Es zeigt sich, dass in Neunkirch mehr als dreimal mehr Geld für Verkehr ausgegeben wird. Gesundheit sind sie jedoch viel günstiger unterwegs. Für die Öffentliche Sicherheit, Umwelt & Raumplanung und die Volkswirtschaft gibt Neunkrich doppelt so viel aus wie Beringen. Solche Vergleiche erlauben (beispielsweise als Geschäftsprüfungskomissionsmitglied) zu beurteilen, wo genauer nachgeforscht werden sollte.

# Entwicklung

Ebenso ist die Entwicklung dieser Zahlen wichtig. Sind die Zahlen ansteigend oder sinkend? So wird beispielsweise wieder und wieder behauptet, die Verschuldung von Beringen sei zu hoch, aber die Zahlen belegen das nicht. Die Schulden sind stabil zwischen 34 und 39 Millionen oder ca. CHF 7000 pro Einwohner:in.

&nbsp;
{:#mermaid}

```mermaid
xychart
title "Fremdkapital"
x-axis [2020, 2021, 2022, 2023, 2024, 2025]
y-axis "Millionen CHF" 0 --> 40
line [38.010, 38.342, 35.781, 34.232, 37.158, 37.756]
```

## Negative Entwicklungen

Einige nennenswerte Entwicklungen sind die Ausgaben pro Person, bezogen auf die Kategorien. Folgende sind sich am Erhöhen und es ist vielleicht sinnvoll, sie genauer im Auge zu halten.

&nbsp;
{:#mermaid}

```mermaid
xychart
title "Verwaltungskosten pro Person"
x-axis [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
y-axis "CHF pro Person" 0 --> 600
line [398, 377, 412, 517, 438, 361, 411, 371, 547, 498, 494, 539, 456, 530]
```

&nbsp;
{:#mermaid}

```mermaid
xychart
title "Öffentliche Sicherheitskosten pro Person"
x-axis [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
y-axis  "CHF pro Person" 0 --> 80
line [1.9, 36.3, 30.1, 6.5, 14.8, 19.4, 58.8, 45.7, 19.3, 26.9, 50.2, 39.3, 63.0, 70.8]
```

&nbsp;
{:#mermaid}

```mermaid
xychart
title "Gesundheitskosten pro Person"
x-axis [2020, 2021, 2022, 2023, 2024, 2025]
y-axis "CHF pro Person" 0 --> 250
line [152, 165, 145, 154, 207, 216]
```
Ich wählte hier den Start bei 2020, weil es dort einen Systemwechsel gab und die Kosten darum nicht vergleichbar sind.

## Positive Entwicklungen

Auf der anderen Seite gibt es Trends, die erfreulich sind.

&nbsp;
{:#mermaid}

```mermaid
xychart
title "Verkehrskosten pro Person"
x-axis [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
y-axis "CHF pro Person" 0 --> 550
line [180, 183, 201, 496, 306, 274, 366, 146, 91, 135, 64, 61, 71, 58]
```

&nbsp;
{:#mermaid}

```mermaid
xychart
title "Umwelt & Raumplanungskosten pro Person"
x-axis [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
y-axis "CHF pro Person" 0 --> 100
line [76, 90, 88, 86, 86, 87, 75, 91, 64, 51, 50, 47, 41, 39]
```

# Stimmt das Budget?

Das Budget muss jedes Jahr erstellt werden. Es soll Orientierung liefern, wie die Ausgaben und Einnahmen im kommenden Jahr sein werden. Doch dieses eigentlich analytische Instrument ist immer wieder ein Werkzeug, um politische Macht auszuüben, und wird verwendet, um eine Geschichte zu erzählen, anstatt einen realistischen Blick in die Zukunft zu werfen. So betrachten wir hier die Diskrepanz zwischen Budget und Rechnung. Es sei angemerkt, dass im Jahr 2021 eine unerwartet grosse Steuerzahlung aus der Wirtschaft eintraf. Es gibt jedes Jahr ein paar Dinge, die nicht einkalkuliert wurden. Doch im Durchschnitt gleichen sie sich wieder aus.

Ich konnte die Budgets und Rechnungen bis ins Jahr 2020 vergleichen. Für die früheren Jahre stand mir das Budget nicht zur Verfügung.
{:#budget}

| Jahr | Rechnung (CHF) | Budget (CHF) | Differenz (CHF) |
|------|----------------|--------------|-----------------|
| 2018 | 49,410         | 327,000      | -277,590        |
| 2019 | -350,584       | -218,000     | -132,584        |
| 2020 | -230,101       | -328,630     | 98,529          |
| 2021 | 1,066,430      | -205,694     | 1,272,124       |
| 2022 | 124,426        | -68,785      | 193,211         |
| 2023 | 151,917        | -197,471     | 349,388         |
| 2024 | -647,740       | -784,180     | 136,440         |
| 2025 | 708,995        | -540,095     | 1,249,090       |

Die Rechnung war 2019 das letzte mal schlechter als das Budget. Im Durchschnitt ist das Budget CHF 275'000 zu pessimistisch und im Median CHF 218'000. Diese Abweichung scheint systematisch zu sein. So wird pessimistisch budgetiert, um Sparmassnahmen zu rechtfertigen oder zumindest Argumente gegen neue Ausgaben zu haben. Auch kann sich der Gemeinderat selbst immer wieder ein Kränzchen binden, da er ja besser abgeschlossen hat als budgetiert. Ich möchte mich ja nicht über eine gute Rechnung beklagen, aber das ist aus meiner Sicht etwas Augenwischerei und ein Missbrauch dieses Instruments. Ich verurteile es nur bedingt, da Budgets öfters zu den genannten Zwecken missbraucht werden. Aber dennoch möchte ich es hier festhalten.
