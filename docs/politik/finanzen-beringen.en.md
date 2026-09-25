---
lang: en
tags:
- politik
- finanzen
- beringen
- gemeinde
- budget
- daten
- mermaid
auto_translated: true
source_lang: de
---

# Finances of the municipality of Beringen

I created a few charts based on the financial statements and budgets of the municipality of Beringen. I may have made mistakes — if you spot one, please let me know.

## Per-capita spending in Beringen

&nbsp;
{:#mermaid}

```mermaid
pie showData
    "Education": 1424
    "Social Welfare": 582
    "Administration": 524
    "Health": 238
    "Culture & Leisure": 146
    "Transport": 82
    "Public Safety": 72
    "Environment & Spatial Planning": 47
    "Economy": 17
```

Beringen takes in CHF 3,010 per resident per year and spends roughly the same amount (CHF 3,133). On their own, these numbers don’t say much — but we can compare them with a neighboring municipality:

## Comparison with Neunkirch

&nbsp;
{:#mermaid}

```mermaid
pie showData
    "Education": 1356
    "Social Welfare": 659
    "Administration": 473
    "Health": 97
    "Culture & Leisure": 138
    "Transport": 273
    "Public Safety": 164
    "Environment & Spatial Planning": 99
    "Economy": 36
```
With CHF 3,213, Neunkirch takes in slightly more per person. It’s striking that Neunkirch spends more than three times as much on transport. On the other hand, it spends far less on health. For public safety, environment & spatial planning, and the local economy, Neunkirch spends about twice as much as Beringen. Comparisons like this can help (for example, as a member of an audit committee) identify where it might be worth taking a closer look.

## Per-capita spending in 2025

This current breakdown is separate from the comparison with Neunkirch above. The spending categories total about CHF 3,261 per person. “Finance” is revenue in the source (CHF 3,393 per person), so it is excluded from the pie chart; the reported surplus is CHF 131 per person.

&nbsp;
{:#mermaid}

```mermaid
pie showData
title "Per-capita spending in 2025 (CHF, 2025 prices)"
    "Administration": 530
    "Public Safety": 81.3
    "Education": 1521
    "Culture & Leisure": 140
    "Health": 248
    "Social Security": 622
    "Transport": 67
    "Environment & Spatial Planning": 45
    "Economy": 7
```

# Development

The updated source gives these per-capita series in CHF at 2025 prices (inflation index 2025 = 100) and now labels the years directly. 2026 and 2027 are budget figures.

## Foreign capital

Foreign-capital figures are available for 2020–2025.

&nbsp;
{:#mermaid}

```mermaid
xychart
title "Foreign capital per resident (2025 prices)"
x-axis [2020, 2021, 2022, 2023, 2024, 2025]
y-axis "CHF per person" 0 --> 9000
line [7974, 7986, 7255, 6659, 6909, 6993]
```

## Negative developments

Per-capita spending varies by category. In the actual-account years, 2025 administration and public safety are above their 2012 values; health spending is higher than in 2020.

&nbsp;
{:#mermaid}

```mermaid
xychart
title "Administrative costs per person (2025 prices; 2026/27 budget)"
x-axis [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027]
y-axis "CHF per person" 0 --> 650
line [422, 401, 437, 552, 474, 389, 440, 395, 580, 532, 519, 548, 522, 530, 531, 568]
```

&nbsp;
{:#mermaid}

```mermaid
xychart
title "Public safety costs per person (2025 prices; 2026/27 budget)"
x-axis [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027]
y-axis "CHF per person" 0 --> 100
line [2.0, 38.6, 34.6, 7.5, 17.1, 22.3, 67.6, 52.5, 22.1, 30.9, 57.6, 45.2, 72.1, 81.3, 84.8, 86.4]
```

&nbsp;
{:#mermaid}

```mermaid
xychart
title "Healthcare costs per person (2025 prices; 2026/27 budget)"
x-axis [2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027]
y-axis "CHF per person" 0 --> 350
line [175, 190, 166, 176, 237, 248, 265, 319]
```
This chart starts in 2020 because there was a system change, so earlier figures are not comparable.

## Positive developments

The 2027 budget values for transport and environment are below their earlier peaks. They are plans, not completed financial statements.

&nbsp;
{:#mermaid}

```mermaid
xychart
title "Transport costs per person (2025 prices; 2026/27 budget)"
x-axis [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027]
y-axis "CHF per person" 0 --> 650
line [191, 195, 231, 570, 351, 314, 420, 168, 104, 155, 73, 70, 82, 67, 84, 75]
```

&nbsp;
{:#mermaid}

```mermaid
xychart
title "Environment & spatial planning costs per person (2025 prices; 2026/27 budget)"
x-axis [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027]
y-axis "CHF per person" 0 --> 120
line [81, 96, 101, 99, 99, 100, 86, 104, 74, 58, 57, 54, 47, 45, 60, 67]
```

# Balance sheet per resident

Balance-sheet figures are available for 2020–2025. All values in the following charts are CHF per person at 2025 prices.

## Net debt

&nbsp;
{:#mermaid}

```mermaid
xychart
title "Net debt per resident (2025 prices)"
x-axis [2020, 2021, 2022, 2023, 2024, 2025]
y-axis "CHF per person" 0 --> 3000
line [2217, 2148, 1655, 1289, 1596, 2268]
```

## Assets per resident

The lines are, in order: assets, financial assets, and administrative assets.

&nbsp;
{:#mermaid}

```mermaid
xychart
title "Assets per resident (2025 prices)"
x-axis [2020, 2021, 2022, 2023, 2024, 2025]
y-axis "CHF per person" 0 --> 13000
line [11139, 11372, 11107, 10396, 10432, 10558]
line [5622, 5694, 5517, 5350, 5314, 5695]
line [5518, 5678, 5590, 5046, 5118, 4864]
```

## Liabilities per resident

The lines are, in order: liabilities, foreign capital, and equity.

&nbsp;
{:#mermaid}

```mermaid
xychart
title "Liabilities per resident (2025 prices)"
x-axis [2020, 2021, 2022, 2023, 2024, 2025]
y-axis "CHF per person" 0 --> 13000
line [11139, 11372, 11107, 10396, 10432, 10558]
line [7974, 7986, 7255, 6659, 6909, 6993]
line [3165, 3386, 3852, 3737, 3523, 3565]
```

The source reports equal total assets and liabilities for every year shown. Rounding can make these totals differ by a few francs from the sums of their components.

# School statistics

The following charts show costs per student and per class in CHF at 2025 prices.

## Cost per student

&nbsp;
{:#mermaid}

```mermaid
xychart
title "Cost per student (2025 prices)"
x-axis ["2018/19", "2019/20", "2020/21", "2021/22", "2022/23", "2023/24", "2024/25", "2025/26"]
y-axis "CHF per student" 10000 --> 13500
line [11600, 10809, 11329, 11026, 11749, 11296, 11780, 12871]
```

## Cost per class

&nbsp;
{:#mermaid}

```mermaid
xychart
title "Cost per class (2025 prices)"
x-axis ["2018/19", "2019/20", "2020/21", "2021/22", "2022/23", "2023/24", "2024/25", "2025/26"]
y-axis "CHF per class" 190000 --> 240000
line [210395, 203884, 212697, 206149, 213553, 210302, 214403, 228105]
```

# Is the budget realistic?

The budget must be prepared every year. It is meant to provide guidance on expected revenue and expenditure for the coming year. However, this analytical instrument is repeatedly used to exercise political power and to frame a narrative rather than providing a realistic view into the future. Here we examine the discrepancy between the budget and the actual financial statements. Note that in 2021 an unexpectedly large tax payment arrived from the corporate sector. Every year there are a few items that were not budgeted, but on average they balance out.

I was able to compare budgets and actuals back to 2018. Budget data for earlier years was not available to me.
{:#budget}

The following table gives nominal CHF for each year. Unlike the per-capita charts, it has not been converted to 2025 prices.

| Year | Financial Statement (CHF) | Budget (CHF) | Difference (CHF) |
|------|---------------------------|--------------|------------------|
| 2018 | 49,410                    | 327,000      | -277,590         |
| 2019 | -350,584                  | -218,000     | -132,584         |
| 2020 | -230,101                  | -328,630     | 98,529           |
| 2021 | 1,066,430                 | -205,694     | 1,272,124        |
| 2022 | 124,426                    | -68,785      | 193,211          |
| 2023 | 151,917                    | -197,471     | 349,388          |
| 2024 | -647,740                  | -784,180     | 136,440          |
| 2025 | 708,995                    | -540,095     | 1,249,090        |

2019 was the last time the financial statement came in worse than the budget. On average, the budget is CHF 275,000 too pessimistic, and the median gap is CHF 218,000. This deviation seems systematic. Budgeting is done pessimistically to justify spending cuts or at least to provide arguments against new expenditures. It also allows the municipal council to repeatedly congratulate itself for completing the year better than budgeted. I'm not complaining about a good financial statement, but in my view this is a bit of spin and a misuse of this instrument. I only condemn it to a degree, as budgets are frequently misused for these purposes elsewhere. Nonetheless, I want to record it here.
