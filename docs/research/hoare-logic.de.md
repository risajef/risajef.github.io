---
extra_css:
- assets/hoare/style.css
extra_javascript:
- assets/hoare/script.js
tags:
- hoare
- logic
- verifier
- axiomatic
- semantics
- SMT
- Z3
github: https://github.com/risajef/hoare-logic
lang: de
auto_translated: true
source_lang: en
---

# Hoare Logikprüfer

> Dies war vibe codiert und verwendet React.

1. Erstellen Sie ein Programm mit Drag und Drop mit den angegebenen Elementen.
2. Klicken Sie auf `Create Root`
3. Fügen Sie die entsprechenden Regeln hinzu, bis es heisst `Valid Proof: Yes`

## Hoare inference rules

$$\frac{}{\{p[e/x]\} \; x := e \; \{p\}}\text{[ass]}$$

$$\frac{}{\{p\} \; \text{skip} \; \{p\}}\text{[skip]}$$

$$\frac{ \{p\} \; P \; \{r\} \; \; \;  \{r\} \; Q \; \{q\}}{ \{p\} \; P; Q \; \{q\}}\text{[comp]}$$

$$\frac{\{p \land b\} \; P \; \{p\}}{\{p\} \; \text{while } b \; \text{ do } P \; \{\neg b \land p\}}\text{[while]}$$

$$\frac{\{p \land b\} \; P \; \{q\} \; \; \; \{p \land \lnot b\} \; Q \; \{q\}}{\{p\} \; \text{if } b \; \text{ then } P \; \text{else } Q \text { end }\{q\}}\text{[if]}$$

$$\frac{p' \implies p \; \; \; \{p\} \; P \; \{q\} \; \; \; q \implies q'}{\{p'\} \; P \; \{q'\}}\text{[cons]}$$

Dieses Tool ist nicht anspruchsvoll, sondern nur String-Ersatz und String-Vergleich.

## Hoare Logikprofi

<div id="root"></div>
