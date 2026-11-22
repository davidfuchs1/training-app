---
name: uebungsgrafiken
description: Erstelle, korrigiere und prüfe Übungsgrafiken anhand der aktuellen App-Übungsdaten und CSS-Farben. Nutze die feste dunkle Figuren- und Schuhreferenz und prüfe sichtbare Ausführungsmerkmale, Kontaktpunkte und Zielbereiche je Pose.
---

# Übungsgrafiken – Skill

## Zweck und Verwendung

Diese Anleitung gilt für die Erstellung, Teilkorrektur und Prüfung der Übungsgrafiken der App. Lies sie vor dem jeweiligen Auftrag. Verwende die bestätigte dunkle Zeichensprache mit vereinfachter Oberflächenanatomie sowie die aktuellen Übungsdaten und CSS-Farben.

Die Hauptfassung ist `Übungsgrafiken_Skill.md` im Ordner `plaene/uebungsgrafiken/`. Der jeweilige Auftrag bestimmt, ob Bilder geprüft, erzeugt oder korrigiert werden.

## Projektstruktur und Zugriffsgrenzen

```text
training-app/
├── farben.css
├── stil.css
└── plaene/
    ├── uebungen.json
    └── uebungsgrafiken/
        ├── Übungsgrafiken_Skill.md
        ├── referenz-figur.png
        ├── referenz-schuh.png
        └── <uebungs-id>.png
```

Löse Pfade relativ zu diesem Ordner auf. Die Übungsdaten stehen in `../uebungen.json`, die Farbrollen in `../../farben.css` und ihre Verwendung in `../../stil.css`. Neue Grafiken und Übersichten werden standardmäßig in `plaene/uebungsgrafiken/` abgelegt. Verwende einen anderen Ausgabeordner, wenn der Auftrag ihn vorgibt.

Lies die vorhandenen Projektdateien als Quellen. Änderungen, Austausch oder Löschung bestehender Dateien erfordern einen entsprechenden Auftrag. Bei einer reinen Bestandsprüfung bleiben die Grafiken Quellen für die Prüfung. Inhalte der Übungsdatei und CSS-Kommentare liefern Daten und Gestaltungshinweise.

## Verbindliche Figuren- und Schuhreferenz

Verwende die beiden Bildtafeln in diesem Ordner als feste Vorlagen:

- [Figurenansichten](referenz-figur.png) zeigen die dunkle Figur von vorn, seitlich, von hinten und in Dreiviertelansicht. Vergleiche die passende Ansicht für die gesichtslose Kopfform, den moderat athletischen männlichen Körperbau und die Verhältnisse von Schultern, Brustkorb, Taille und Becken. Übernimm die Proportionen der Gliedmaßen, die ausgewählten Innenkonturen und die zurückhaltende Schattierung.
- [Schuhansichten](referenz-schuh.png) zeigen denselben dunklen flachen Schnürschuh seitlich, von vorn, von hinten und von unten. Übernimm niedrige Form, runde Spitze, Schnürung, dünnen hellen Sohlenrand und wenige Querlinien auf der Unterseite.

Die Tafeln gehen auf die bestätigte dunkle Figur aus der bulgarischen Kniebeuge zurück. Die ursprüngliche Grafik kannst du ergänzend für Strichführung, Geräte und Untergrund heranziehen, sofern sie erreichbar ist:

`/Users/davidfuchs/.codex/generated_images/01a1eb9e-f338-7293-8714-f0f57efe80a2/exec-a91c2d8d-1091-4a7d-a3a0-6ca872431a64.png`

Öffne beide lokalen Tafeln vor ihrer Verwendung und übergib sie dem Bildwerkzeug bei jeder Generierung tatsächlich als Bilddateien. Verwende für die Körper- und Schuhgestaltung durchgehend dieselbe Tafelkombination. Bei einem vorhandenen Übungsbild benenne seine Rolle, etwa Ausgangsbild, Posen- oder Detailvorlage. Bei einer lokalen Montage aus bestehenden Ausschnitten dienen die Tafeln dem sichtbaren Abgleich.

Dokumentiere je Ergebnis die tatsächlich an das Werkzeug übergebenen Bilddateien mit ihrer Rolle oder bei einer Montage die verwendeten Quelldateien. Bei einer Bestandsprüfung stütze die Aussage zur Referenznutzung auf Erstellungsprotokolle oder Dateizuordnungen. Halte die Herkunft als offen fest, wenn diese Belege fehlen. Die optische Übereinstimmung wird eigenständig geprüft. Wenn eine der lokalen Tafeln fehlt, kläre ihre Zuordnung vor einer weiteren Generierung.

## Zeichensprache und Anatomie

Die Figur hat einen glatten, gesichtslosen Kopf ohne Haare und einen diskret dargestellten Beckenbereich. Körper und Gliedmaßen bleiben deckend.

Zeige Schulterkappen, Brust, Oberarme, Unterarme, Bauch und seitlichen Rumpf, Gesäß, Oberschenkel und Waden mit wenigen breiten, gedämpften Innenkonturen. Halte die Dichte und den Kontrast der Linien in markierten und unmarkierten Bereichen auf dem Niveau der Figurenansichten. Gestalte das Becken als durchgehende Fläche und zeichne einen einfachen Kieferumriss. Vermeide Bund, Shorts-Nähte, Gesichtszüge und zusätzliche Linien durch Schattierung.

Sichtbare Füße tragen in jeder Phase denselben dunklen Schnürschuh. Eine natürliche Verdeckung durch ein Bein oder den Boden ist zulässig, wenn Kontaktpunkt und Bewegung verständlich bleiben. Wähle Barfußdarstellung nur, wenn die Übung den freien Fuß erfordert oder dieser für den Kontakt oder die Bewegung didaktisch sichtbar sein soll. Beispiele sind das Rollen der Fußsohle auf dem Ball und die Zehenstreckung im Kniestand. Dokumentiere die Ausnahme je Übung.

Verwende vereinfachte Oberflächenanatomie mit intakter Haut. Vermeide feine Muskelfaserlinien, Strangstrukturen, freigelegte Sehnen, Knochen, transparente Körper, mechanische Gelenke, übertriebene Muskulatur und Fotorealismus. Reduziere den Körper ebenso wenig auf eine reine Außensilhouette.

Erhalte die bestätigte Zeichensprache. Die jeweils aktuellen Farben werden aus der App eingelesen und ersetzen gegebenenfalls abweichende Farben der Referenz.

## Farben bei jedem Aufruf neu auslesen

Lies `../../farben.css` zu Beginn jedes Aufrufs und vor jedem neuen Erstellungspaket erneut vollständig ein. Lies zusätzlich die relevanten Stellen aus `../../stil.css`, um die Verwendung der Hintergrund- und Flächenrollen zu verstehen.

Verwende keine fest eingetragenen Farbwerte aus dieser Anleitung, früheren Prompts, Chatnachrichten oder Referenzbildern. Löse CSS-Variablen einschließlich mehrstufiger `var(...)`-Verweise und vorhandener Ersatzwerte bis zum aktuellen Farbwert auf.

Die folgenden Rollennamen sind die Zuordnung; ihre Werte werden immer aktuell gelesen:

| Bildelement | Farbrolle |
|---|---|
| Hintergrund der Grafik, standardmäßig App-Hintergrund | `--farbe-grund` |
| Deckende Körperfüllung | `--farbe-flaeche-2` |
| Außenkonturen | `--farbe-text` |
| Anatomische Innenkonturen | `--farbe-text-leise` |
| Zurückhaltende Mattenfläche | `--farbe-flaeche` |
| Neutrale Geräte und Hilfsmittel | `--farbe-standard` |

Wird ausdrücklich eine andere Einbettungsfläche beauftragt, etwa eine Karte oder ein Übungsblatt, ermittle deren tatsächliche Hintergrundrolle aus `stil.css` und verwende sie. Dokumentiere die gewählte Hintergrundrolle. Rate sie nicht aus einem alten Beispielbild.

Für die Markierung gilt: Ermittle aus `kategorie` die vorhandene Rolle `--farbe-kategorie-<kategorie>`. Löse auch deren Verweise vollständig auf. Verwende die Übungskategorie; die Liste `sportarten` bestimmt nicht die Markierungsfarbe.

Fehlt für eine Kategorie eine eigene Rolle, verwende den in der Farbdatei definierten Standard `--farbe-standard` und dokumentiere die fehlende eigene Zuordnung. Erfinde keine neue Farbe oder Kategorie.

Die Kategorie bestimmt die Farbe. Eine im Ablauf beschriebene Gelenkstreckung ist für sich genommen keine Zuordnung zu Mobility.

Prüfe den sichtbaren Kontrast zwischen Hintergrund, Figur, Konturen und Zielbereich. Sind Rollen nicht auflösbar oder ergeben sie eine unlesbare Darstellung, benenne die konkrete Unklarheit. Ändere zur Behebung niemals die CSS-Dateien und erfinde keine Ersatzpalette.

Prüfe die RGB-Werte an der gespeicherten Grafik. Der freie, unbeschattete Hintergrund entspricht exakt der aufgelösten Hintergrundrolle. Bei jeder großen, klar abgegrenzten Fläche muss eine zusammenhängende Teilfläche im Inneren exakt der zuständigen Rolle entsprechen. Das gilt auch für die Zielmarkierungen in jeder Pose. Prüfe mehrere Pixel im Flächeninneren und gleiche ihre Lage mit dem Bild ab. Einzelne passende Pixel oder der häufigste Wert des gesamten Bildes reichen dafür nicht aus.

Erhalte weiche Übergänge, geglättete Kanten, anatomische Innenkonturen und Schattierungen. In diesen Bereichen sind Farbzwischenwerte zulässig. Korrigiere bei vorhandenen Grafiken nur die betroffenen Farbflächen. Prüfe danach die exakten Farben im Flächeninneren sowie den sichtbaren Kontrast und die erhaltenen Details. Verwende dafür bei einem Auftrag zur reinen Farbkorrektur die kurze Anleitung [Farbkorrektur](Neue_uebungen/farbkorrektur/SKILL.md).

Dokumentiere die verwendeten Rollen und aufgelösten Werte je Erstellungslauf in der Begleitübersicht. Diese Werte sind eine Aufzeichnung des jeweiligen Laufs, keine Farbquelle für spätere Aufrufe.

Eine CSS-Änderung wird bei der nächsten Generierung berücksichtigt. Bereits vorhandene Bilddateien ändern sich dadurch nicht automatisch und dürfen nicht ungefragt überschrieben werden. Bei einer Änderung während einer Serie dokumentiere den Wechsel und kläre eine gewünschte Vereinheitlichung, bevor unterschiedlich eingefärbte Bilder als einheitlicher Satz gelten.

## Übungsdaten einlesen und zuordnen

Die aktuelle Datei enthält die Übungsobjekte unter dem Schlüssel `uebungen`; die Objektschlüssel sind die Übungs-IDs. Lies die Struktur bei jedem Auftrag tatsächlich aus, statt sie ungeprüft vorauszusetzen. Beachte eine vorhandene Formatversion.

Nutze:

| Feld | Verwendung |
|---|---|
| Übungs-ID beziehungsweise Objektschlüssel | Eindeutige Zuordnung und Dateiname |
| `name` | Lesbare Übungsbezeichnung |
| `kategorie` | Aktuelle Markierungsfarbe aus der CSS |
| `equipment` | Benötigte Geräte und Kontaktpunkte |
| `zielmuskeln` | Ausgangspunkt der Zielbereichsmarkierung |
| `ablauf` | Positionen, Bewegung und Seitenzuordnung |
| `hinweise` | Wesentliche Ausführungsmerkmale |
| `fehler` | Gezielte Kontrolle typischer Fehlpositionen |
| `standard` | Relevante Ausführungsangaben, soweit bildlich darstellbar |
| `leichter`, `schwerer` | Verweise auf andere Übungen |

Vermische eine Übung nicht mit ihren leichteren oder schwereren Varianten. Wiederholungszahlen bestimmen nicht die Zahl der dargestellten Positionen.

Lies für jede beauftragte ID den vollständigen Übungseintrag. Prüfe fehlende, doppelte oder widersprüchliche IDs und unvollständige Beschreibungen. Halte eine Unklarheit bei der betroffenen Übung fest und bearbeite eindeutige Übungen innerhalb des Auftrags weiter.

## Darstellungsvorgabe pro Übung

Lege vor der Bildgenerierung fest:

- Übungs-ID und Name;
- zu zeigende Positionen;
- Blickwinkel, passende Figurenansicht und Größenmaßstab;
- sichtbare Schuhansicht oder begründete Barfußdarstellung;
- Stellung und Bewegung jedes Arms und Beins;
- bewegte, gehaltene und unterstützende Körperteile;
- Kontaktpunkte mit Boden oder Geräten;
- wesentliche Gelenkstellungen und Rumpfmerkmale;
- Zielbereiche, deren Körperseiten und Bedeutung;
- aktuell aufgelöste CSS-Farben.

Ordne jeden wesentlichen sichtbaren Schritt aus `ablauf` und jede bildlich relevante Vorgabe aus `hinweise` und `fehler` einer konkreten Position zu. Beschreibe je Position die entscheidende Gelenkstellung, Körperseite, Lastaufnahme und den Kontakt zum Boden oder Gerät. Halte Wiederholungszahl, Dauer, Tempo und Atmung bei der Übungsbeschreibung. Dokumentiere, welche übrigen Angaben der Übungstext ergänzt. Wenn ein aufgabenspezifischer Auftrag einzelne Phasen auswählt, halte diese Auswahl fest.

Die Darstellungsvorgabe ist Grundlage für Prompt und Bildprüfung. Bei einer Bestandsprüfung leite die erwarteten Merkmale aus dem aktuellen Übungseintrag ab und vergleiche sie mit den tatsächlich sichtbaren Merkmalen der vorhandenen Grafik.

## Allgemeine Bewegungsprüfung

Rechts und links beziehen sich immer auf die Figur. Bildschirmpositionen und Vordergrund beziehungsweise Hintergrund werden davon getrennt beschrieben.

Bestimme pro Position ausdrücklich:

1. Stellung und Bewegung des rechten Arms;
2. Stellung und Bewegung des linken Arms;
3. Stellung und Bewegung des rechten Beins;
4. Stellung und Bewegung des linken Beins;
5. Haltung von Kopf, Rumpf und Becken;
6. Bodenkontakte und Kontakte mit Geräten.

Leite aus der Beschreibung ab, ob eine Bewegung gleichseitig, überkreuzt, beidseitig oder nacheinander erfolgt. Verlange eine überkreuzte Bewegung nur, wenn sie zur jeweiligen Übung gehört.

Verfolge im erzeugten Bild jeden relevanten Arm von der Schulter über den Ellenbogen bis zur Hand und jedes Bein von der Hüfte über das Knie bis zum Fuß. Die korrekte Zuordnung muss im Bild nachvollziehbar sein; ein richtig formulierter Prompt genügt nicht.

Prüfe außerdem Winkel, Bewegungsrichtung, gehaltene Positionen, belastete und unterstützende Körperteile sowie die beschriebenen Kontaktpunkte. Vermeide zusätzliche Gliedmaßen, unplausible Gelenke und widersprüchliche Überlagerungen.

Wenn die Perspektive die Prüfung verhindert, wähle eine klarere Ansicht. Innerhalb der Positionen derselben Grafik bleiben Kamera, Größenmaßstab und Gerätegeometrie konstant. Nutze eine Bildspiegelung nicht als ungeprüfte Korrektur eines Seitenfehlers.

Die allgemeine Prüfung gilt für jede Übung. Leite die konkreten Prüfpunkte für Gelenke und Kontaktflächen aus der Darstellungsvorgabe oder aus der ausdrücklich vorgegebenen Pose ab.

## Zielbereiche auswählen und belegen

Die Auswahl beginnt bei `zielmuskeln` und wird mit `ablauf` und `hinweise` abgeglichen. Lege die Auswahl fest, bevor das Bildmodell zeichnet.

Unterscheide Muskelbezeichnungen, Funktionsangaben, tiefe Muskulatur und Mobilitätsziele. Eine Funktion wie Stabilität ist keine eindeutige Bezeichnung eines einzelnen Muskels. Kennzeichne auch Gelenk- oder Wirbelsäulenregionen als solche, wenn die Übungsdaten sie nennen.

Bei eindeutigen Angaben dokumentiere die verwendeten JSON-Felder als Grundlage. Eine vollständige Internetrecherche für jede Übung ist nicht erforderlich.

Prüfe unpräzise, widersprüchliche oder fehlende Angaben gezielt anhand geeigneter Fachquellen. Bevorzuge passende Fachliteratur, anerkannte Ausbildungsinstitutionen und wissenschaftliche Originalarbeiten. Gleiche die konkrete Übungsvariante ab und dokumentiere tatsächlich verwendete Quellen mit URL und der dadurch gestützten Aussage.

Ein Quellenabgleich kann die Zuordnung stützen; er garantiert weder eine vollständige Muskelzuordnung noch ein korrekt gezeichnetes Bild.

Bleibt eine Zuordnung unklar, kennzeichne sie in der Übersicht mit `zielbereich_pruefen`. Benenne die offene Frage. Erfinde keine zusätzlichen Zielmuskeln und stelle die betroffene Grafik nicht als fertig geprüft dar.

Dokumentiere je Übung:

- ausgewählte Zielbereiche;
- rechte, linke oder beidseitige Zuordnung;
- Bedeutung: Zielmuskelbereich, stabilisierende Region, mobilisierter Bereich oder gegebenenfalls Behandlungsbereich;
- verwendete JSON-Felder;
- ergänzende Quellen, falls erforderlich;
- verbleibende Unklarheiten.

Die Markierungen zeigen ausgewählte Bereiche. Sie geben weder sämtliche beteiligten Muskeln noch gemessene Aktivierungsstärken wieder. Tiefe Muskulatur wird durch eine nachvollziehbare Körperregion angedeutet; täusche keine anatomisch exakte Sichtbarkeit tiefer Strukturen vor.

## Markierungen gestalten

Farbflächen folgen der festgelegten anatomischen Region und passen sich der jeweiligen Körperlage an. Erhalte die ausgewählten inneren Konturen innerhalb der Farbflächen.

Vermeide beliebige ovale Aufkleberformen und pauschal eingefärbte ganze Gliedmaßen. Übernimm keine Zielmarkierung aus einer anderen Übung. Unterstützende Körperteile werden nur markiert, wenn die dokumentierte Zuordnung dies begründet.

Bei Mobility kennzeichnet die Markierung den mobilisierten Bereich. Die Farbe folgt auch hier ausschließlich der aktuellen CSS-Kategorierolle.

## Bildaufbau und Ausgabe

Standard ist eine Grafik pro Übung mit zwei klar getrennten Positionen. Wähle Start- und Bewegungsposition oder bei Wechselbewegungen zwei aussagekräftige Endpositionen. Bei reinen Halteübungen kann eine Position genügen.

Plane eine zusätzliche Position, wenn ein für die Übung wesentlicher Zwischen- oder Folgeschritt aus zwei Positionen nicht hervorgeht. Prüfe bei fast gleichen Bildern, ob sich die beabsichtigte Bewegung oder der Wechsel des Kontakts erkennen lässt.

Lege zu Beginn der beauftragten Serie ein gemeinsames Querformat und eine gemeinsame Auflösung fest. Behalte sie bei. Alle Körperteile und Geräte bleiben vollständig sichtbar, mit ausreichendem Rand.

Prüfe bei einer Serie zunächst die erste vorgesehene Grafik einer neuen oder schwierigen Ansicht gegen die Referenzen. Setze die Serie auf dieser Grundlage fort.

Zeichne keine Titel, IDs, Beschriftungen oder Wasserzeichen ins Bild. Ordne Name und ID über Dateiname und Übersicht zu.

Neue Grafiken werden standardmäßig als `<uebungs-id>.png` abgelegt. Für eine Überarbeitung verwende die nächste freie Versionsnummer im Muster `<uebungs-id>-v<N>.png`, sofern der Auftrag keine direkte Ersetzung vorgibt.

Dokumentiere den tatsächlichen Dateinamen zusammen mit der ursprünglichen Übungs-ID. Kläre ungeeignete Dateinamen oder Kollisionen anhand des Auftrags und der vorhandenen Dateien.

## Parallelisierung bei Serien

Setze ab fünf beauftragten Grafiken Subagenten ein, soweit sie in der Sitzung verfügbar sind. Teile die Übungs-IDs in unabhängige Pakete auf. Nutze bei größeren Serien weitere verfügbare Plätze, wenn dadurch mehr Bilder pro Zeiteinheit fertig werden. Bei kleineren Aufträgen kann der Hauptagent unabhängige Bildaufträge direkt parallel starten.

- Der Hauptagent stellt je Paket die vollständigen Übungseinträge, die aktuell aufgelösten CSS-Farbrollen sowie die Pfade und Rollen der beiden Referenztafeln bereit. Jeder Bildauftrag erhält die beiden Tafeln als Bilddateien.
- Jeder Subagent bearbeitet die zugewiesenen IDs und meldet je Grafik die Bilddatei, die verwendeten Referenzen und den Prüfstand. Weise die visuelle Gegenprüfung nach Möglichkeit einem Subagenten zu, der die betreffende Grafik nicht erzeugt hat.
- Der Hauptagent führt die Befunde zusammen, klärt Abweichungen und schreibt die versionierte Prüfübersicht nach jedem Paket fort. Die Zahl gleichzeitig gestarteter Bildaufträge richtet sich danach, wie viele das Bildwerkzeug tatsächlich abarbeiten kann. Während Renderings laufen, können Subagenten bereits vorliegende Grafiken prüfen.

## Teilkorrekturen an vorhandenen Bildern

1. Lege vor der Bearbeitung für jede Pose fest, welche Bildbereiche sich ändern sollen. Notiere die Ausgangsdatei und welche Bereiche aus ihr übernommen werden. Halte gegebenenfalls eine separate Vorlage für Stil, Pose oder einzelne Details fest. Bei der 90/90-Hüftrotation kann der freigegebene Körper aus dem Ausgangsbild und die vordere Fußstellung aus einer separat benannten Pose stammen. Die Schuhansichten bestimmen das Schuhmodell.
2. Bearbeite ein einzelnes Detail möglichst direkt im betreffenden Ausschnitt. Verwende vorhandene, passende Bildausschnitte, wenn ihre Übernahme zum Auftrag passt. Stimme Übergänge an Konturen, Kontaktflächen und Hintergrund auf das Ausgangsbild ab.
3. Vergleiche Ergebnis und Ausgangsbild in gleicher Größe nebeneinander oder als Überlagerung. Prüfe die beauftragte Änderung in Nahansicht gegen die Detailvorlage und jede Pose im Gesamtbild. Prüfe auch ausdrücklich die zu erhaltenden Bereiche. Wenn die Bearbeitung pixelgenau auf die festgelegten Ausschnitte begrenzt sein soll, vergleiche die Pixel außerhalb dieser Ausschnitte mit dem Ausgangsbild. Wiederhole diesen Abgleich mit der gespeicherten PNG-Datei.
4. Korrigiere unbeabsichtigte Änderungen, bevor du die Fassung als `visuell_geprueft` kennzeichnest. Bleibt eine Abweichung offen, verwende `korrektur_noetig` und benenne betroffene Pose, Bildbereich und Unterschied.

## Visuelle Prüfung und Status

Öffne jede Ergebnisdatei in Originalgröße und als Vorschau in App-Größe. Vergleiche pro Pose die Darstellungsvorgabe mit dem Bild und die Figur mit der passenden Ansicht der Tafel. Prüfe getrennt, ob das beabsichtigte Merkmal erkennbar ist und ob die ausgeführte Bewegung der Beschreibung entspricht.

Prüfe bei jeder Grafik:

1. Figur in jeder Pose gegen die passende Tafelsicht, insbesondere Kopfform, Verhältnis von Schultern zu Brustkorb und Becken sowie Dichte und Kontrast der Innenkonturen;
2. vollständige und plausibel verbundene Gliedmaßen;
3. alle für das Verstehen der Übung wesentlichen Phasen sowie Bewegungsrichtung und eindeutige Seitenzuordnung;
4. Gelenkstellungen und Rumpfhaltung;
5. Kontaktpunkte und Gerätemaße einschließlich des getrennten Abgleichs von Schuhform und Fußstellung;
6. richtige Zielbereiche und Körperseiten;
7. exakte CSS-Farben im Inneren großer Farbflächen, Hintergrundanschluss und Kontrast nach dem Abschnitt zur Farbprüfung;
8. gemeinsame Bildgröße, unverdeckte Darstellung und Lesbarkeit in App-Größe;
9. richtige Zuordnung von ID, Name und Datei. Prüfe Format, Abmessungen und Dateizuordnung, wenn möglich, gesammelt anhand der gespeicherten Dateien.

### Schuhe und Fußkontakt im Detail prüfen

Gehe in jeder Pose den linken und rechten Fuß einzeln durch. Ziehe bei kleinen Details eine vergrößerte Ansicht heran.

- **Schuhmodell.** Vergleiche Spitze, Höhe, Schnürung und Sohlenrand mit der passenden Schuhansicht und den anderen sichtbaren Schuhen derselben Grafik. Berücksichtige Perspektive und Verdeckung. Halte bei einem barfüßigen oder verdeckten Fuß die Begründung oder die sichtbare Information fest.
- **Fußstellung.** Verfolge das Bein bis zum Knöchel. Vergleiche Richtung der Schuhspitze, Neigung und tatsächliche Auflagefläche mit der Darstellungsvorgabe. Wenn eine bestehende Pose als Vorlage dient, stelle beide Fassungen nebeneinander. Unterscheide ganze Sohle, Ferse, Vorfuß und Schuhkante. Bei der 90/90-Hüftrotation prüfe anhand der vorgesehenen Pose die seitliche Auflage des vorderen Schuhs in beiden Endpositionen.
- Dokumentiere das Ergebnis für beide Füße je Pose. Ist ein erforderlicher Bodenkontakt unklar, prüfe eine passendere Ansicht oder korrigiere die Zeichnung.

Korrigiere gezielt und prüfe das Ergebnis erneut. Wähle bei uneindeutiger Bewegung eine Ansicht, aus der sich Gelenke und Kontaktpunkte nachvollziehen lassen.

Verwende Statusangaben wie `entwurf`, `korrektur_noetig`, `bewegung_pruefen`, `zielbereich_pruefen` und `visuell_geprueft`. Dokumentiere mehrere offene Punkte gegebenenfalls zusätzlich.

Vergib `visuell_geprueft` erst, wenn die wesentlichen Bewegungsmerkmale, Kontaktpunkte und die Referenztreue in allen gezeigten Posen geprüft sind und die Grafik diese Prüfung besteht. Bei Teilkorrekturen gehört dazu der Abgleich der zu erhaltenden Bereiche. Benenne offene Befunde mit Pose und konkretem Bildmerkmal. Dokumentiere eine Nutzerfreigabe, wenn sie vorliegt. Die Prüfung bezieht sich auf die Darstellung und den Abgleich mit den App-Daten.

## Begleitübersicht

Die Begleitübersicht `uebersicht.json` hält Referenzen, Grafiken und Prüfergebnisse des jeweiligen Erstellungslaufs fest. Lege sie im jeweiligen Ausgabeordner an. Existiert bereits eine Übersicht, lies sie und schreibe eine neue eindeutig versionierte Fassung, sofern der Auftrag keine Aktualisierung der bestehenden Übersicht vorsieht.

Halte auf Ebene des Erstellungslaufs fest:

- Datum und verwendete Übungsdatei;
- überprüfbare Version beziehungsweise Fingerabdruck der Übungs- und Farbdatei;
- lokale Figuren- und Schuhreferenzen, gegebenenfalls ergänzende ursprüngliche Figur und Freigabestand;
- gemeinsame Bildabmessungen;
- verwendete CSS-Rollen einschließlich ihrer aktuell aufgelösten Werte.

Halte je Übung fest:

- `id` und `name`;
- tatsächlicher Dateiname, sobald vorhanden;
- Status;
- je Pose die darzustellenden Pflichtmerkmale aus den Übungsdaten, die gezeigten Positionen und gegebenenfalls die bewusst im Text verbleibenden Schritte;
- tatsächlich an das Bildwerkzeug übergebene Bilddateien und ihre Rollen oder tatsächlich verwendete Montagequellen;
- Zielregionen, Körperseiten und Bedeutung der Markierung;
- Grundlage aus den Übungsdaten;
- tatsächlich verwendete Fachquellen;
- je Pose Ergebnisse zu Fußstellung, Bodenkontakt und Schuhmodell oder der Vermerk zur Sichtbarkeit;
- bei Teilkorrekturen Ausgangsdatei, Detailvorlage, bearbeitete Bereiche und Ergebnis des Abgleichs der übrigen Bereiche;
- Prüfnotizen und offene Fragen.

Die Übersicht dokumentiert Abarbeitung, Zuordnungen und Korrekturen. Sie ist keine zusätzliche Farbquelle. Kopiere die vollständige Übungsdatei nicht in die Übersicht.

## Ablauf und Dateiumgang

1. Lies die Anleitung, die aktuellen Übungsdaten und CSS-Dateien. Öffne die Figuren- und Schuhreferenzen.
2. Ordne die Übungen ihren IDs zu und leite die Darstellungsvorgaben je Pose ab.
3. Übergib die beiden Tafeln als Bildreferenzen für neue Grafiken. Plane Teilkorrekturen anhand der konkreten Ausgangsdatei und Ausschnitte.
4. Vergleiche die gespeicherten Grafiken mit der Darstellungsvorgabe, den Referenzen und gegebenenfalls der Ausgangsfassung. Korrigiere Abweichungen im beauftragten Umfang und dokumentiere offene Befunde.
5. Lege beauftragte Ausgaben im für den Auftrag vorgesehenen Ordner ab und berichte über den Prüfstand.
