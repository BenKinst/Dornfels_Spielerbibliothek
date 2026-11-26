# Regelung zur Übertragung von Heldenprofilen

## 1. Maßgebliche Gestaltungsgrundlage

Der verbindliche Aufbau, die Gestaltung, die Bedienung und die Qualitätsprüfung aller Charakterseiten richten sich nach dem **Standard für Charakterseiten der Spielerbibliothek** im Abenteuer-Repository unter `03_Entscheidungen/06_Standard_fuer_Charakterseiten.md`.

Die Datei `charaktere/musterseite.html` bleibt eine technische und inhaltliche Musterseite. Sie ist nicht länger eine abschließende Positivliste und darf den verbindlichen Charakterseitenstandard nicht einschränken.

## 2. Maßgebliche Inhaltsquellen

- Charakterwerte, Fertigkeiten, Zauber, Ausrüstung und Hintergrundangaben werden ausschließlich aus den jeweils freigegebenen Projektquellen übernommen.
- Die Musterseite und vorhandene Charakterseiten dienen als Orientierung für bereits etablierte Feldbezeichnungen und Darstellungsformen, soweit sie dem verbindlichen Standard entsprechen.
- Fehlende, unklare oder nicht belegte Angaben werden nicht ergänzt oder geraten.
- Nicht zutreffende Inhaltsbereiche dürfen gemäß dem Charakterseitenstandard entfallen.

## 3. Übertragung und Darstellung

- Angaben aus einer Helden-Datei werden in den jeweils passenden Bereichen des verbindlichen Standards dargestellt.
- Die Bezeichnung eines Wertes darf verständlich erläutert werden; seine regeltechnische Bedeutung und sein Inhalt dürfen dadurch nicht verändert werden.
- Wiederholbare Inhalte wie Fertigkeiten, Zauber, Waffen und Ausrüstungsgegenstände werden vollständig und in einer zum Datentyp passenden Form dargestellt.
- Zusätzliche, durch den Charakterseitenstandard vorgesehene Unterbereiche oder Tabellen dürfen verwendet werden, auch wenn sie in einer älteren Musterseite noch nicht enthalten sind.
- Hintergrundgeschichten werden inhaltlich unverändert aus freigegebenen Quellen übernommen. Eine Gliederung mit Absätzen und Zwischenüberschriften ist zulässig; biografische Inhalte dürfen nicht eigenständig ergänzt, umgedeutet oder gekürzt werden.

## 4. Datenstruktur und technische Umsetzung

- Strukturierte Charakterdaten werden pro Charakter in einer eigenständigen JSON-Datei gepflegt. Die Hintergrundgeschichte liegt separat in einer eindeutig zugeordneten Markdown-Datei.
- Die JSON-Datei folgt der im Charakterseitenstandard festgelegten versionierten Datenstruktur. Nicht vorhandene Angaben und nicht zutreffende Bereiche werden ausgelassen; es werden keine Platzhalter oder künstlichen Nullwerte angelegt.
- Jeder regelrelevante Wert enthält direkt an seinem Datensatz eine konkrete Quellenangabe mit Quelldokument und möglichst genauer Fundstelle.
- Werte werden als bestätigt (`confirmed`) oder vorläufig (`provisional`) gekennzeichnet. Vorläufige Werte müssen in der Darstellung erkennbar bleiben.
- Ein gemeinsamer Profilrenderer lädt und validiert die JSON-Daten und die Hintergrund-Markdown-Datei und erzeugt die vorhandenen Profilbereiche. Das Rendern der Daten bleibt von den allgemeinen CSS- und Interaktionskomponenten getrennt.
- Der Renderer stellt die gelieferten Werte dar, berechnet aber keine Charakterwerte und ersetzt keine Prüfung anhand der Regelwerks- und Charakterquellen.
- Charakterindividuelle Daten gehören in die Inhaltsdateien, nicht in den Renderer oder in allgemeine Interaktionsskripte.

## 5. Datenqualität und offene Punkte

- Jeder angezeigte regelrelevante Wert muss einer konkreten Projektquelle und einer prüfbaren Fundstelle zugeordnet werden können.
- Endwerte und Rechenwege müssen mit den maßgeblichen Regelwerks- und Charakterquellen übereinstimmen.
- Vorläufige Werte, offene Entscheidungen und bestätigte Festlegungen müssen unterscheidbar bleiben.
- Nicht vorhandene Angaben und nicht zutreffende Bereiche werden ausgelassen. Fehlende Daten werden nicht als „keine Angabe“ oder durch leere Felder ausgegeben.
- Nicht zuordenbare oder widersprüchliche Angaben werden vor Veröffentlichung außerhalb des Profils zur Klärung festgehalten.

## 6. Abschlussprüfung

Vor Veröffentlichung wird jedes Profil gegen den verbindlichen Charakterseitenstandard und seine Quellen geprüft:

1. Aufbau, Reihenfolge, Gestaltung und Bedienung entsprechen dem Standard.
2. Alle dargestellten Inhalte sind durch freigegebene Quellen gedeckt.
3. Jeder regelrelevante Wert besitzt eine konkrete Quellenangabe mit prüfbarer Fundstelle.
4. Vorläufige Werte sind sichtbar gekennzeichnet; fehlende Angaben und nicht zutreffende Bereiche werden ausgelassen.
5. JSON-Datei und Hintergrund-Markdown sind korrekt zugeordnet, geladen und verarbeitet.
6. Tabellen, Wertfelder, Tooltips und Akkordeons sind auf Desktop und Mobilgeräten bedienbar.
7. Die Hintergrundgeschichte entspricht der freigegebenen Quelldatei.
8. Die Seite enthält keine unbeabsichtigten Testhinweise oder Verweise auf isolierte Testdateien.
