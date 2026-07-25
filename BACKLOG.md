# Backlog – idéer og forbedringer

Idéer, forbedringer og mindre justeringer, der ikke er i gang lige nu. Ikke en del af den aktive
plan i [PLAN.md](./PLAN.md) – når noget herfra skal laves, flyttes det til PLAN.md's todo-liste.

Tilføj frit efterhånden som noget dukker op. Ingen fast prioritetsrækkefølge – ryd op og
prioriter, når der er tid til det.

## Idéer

- [x] **bedre udledning af kategorier** – ved indlæsning af csv fil som fx [posteringer.csv](udlejning%202025/posteringer.csv) udledes kategorier ikke korrekt. *(implementeret: `foreslaaKategori()` i `bankCsv.js` matcher på nøgleord i Kategori/Underkategori/Tekst i stedet for kun beløbets fortegn, genkender "privat"-noter som hævning, og advarer når en realkreditlinje sandsynligvis blander renter/afdrag)*
- [x] **formattering af tal** – brug . som tusindtalsseparator og , som decimaltegn (dansk talnotation), også i input felter hvis muligt. *(implementeret: ny fælles `formatTal`/`formatKr`/`formatPct` i `utils/format.js` (locale `da-DK`), erstatter alle spredte, duplikerede `toLocaleString('da-DK')`-kald med ét sted at styre formatteringen. Beløbsfelter er `type="number"`, som browseren altid kræver "." som decimaltegn for uanset sprogindstilling – en begrænsning i selve HTML-inputtypen, ikke løsbar uden at opgive indbygget talvalidering)*
- [x] **Hjælp til selvangivelse** – en side med data om hvilke tal skal indføres i selvangivelsen og hvad man ellers skal gøre i forhold til regnskab... *(implementeret: ny side `/selvangivelse` (`SelvangivelseView.vue`) med rubrik-oversigt for det valgte år – virksomhedsrubrikker (111/114/117/148/149/150/152/984) med beregnet værdi og hvad brugeren selv skal indtaste vs. hvad TastSelv selv beregner, kapitalafkastgrundlagets komponenter, samt personlige rubrikker (31/41) der falder uden for VSO og ikke spores af appen. Kun rubrik-oversigten – ingen separat statisk tjekliste, jf. brugerens valg)*
- [x] **Hjælp til stamdata** – ud for hvert felt gives oplysninger om hvor man kan finde det relevante data, bbr, ejendomsværdi etc. *(implementeret i `StamdataView.vue` – felt omdøbt fra "BBR-nr." til "BFE-nummer", da BBR ikke er et selvstændigt opslagsnummer; link til boligejer.dk/matriklen.dk/vurderingsportalen.dk/tinglysning.dk samt henvisning til TastSelv-rubrik for realkreditgæld)*
- [ ] **Hjælp til stamdata** – kan systemet selv finde data (lave opslag) pba adresse/bbr eller lign?.
- [x] **Hjælp til VSO stamdata** – ud for hvert felt gives oplysninger om hvad det er (evt med relevante links til skats hjemmeside) og hvor man kan finde det relevante data, kapitalafkastsats, rentekorrektionssats, indskudskonto etc. *(de fleste felter havde allerede hjælpetekst; kapitalafkastsats og rentekorrektionssats manglede helt – tilføjet forklaring + link til info.skat.dk for begge i `VsoView.vue`)*
- [ ] **Bankkontoafstemning** – CSV-import findes (Bogføring → "Importér fra netbank"), men selve
      afstemningen (sammenhold bogførte posteringer med kontoudtogets saldo, marker "afstemt")
      mangler stadig.
- [ ] **Bogføringslovens opbevaringskrav** – normalt 5 år, men ikke undersøgt hvad det konkret
      betyder for backup-rutinen (se SKATTEREGLER.md punkt 8, stadig åbent).
- [ ] **Flere hyppigheder for faste posteringer** – i dag kun månedlig/kvartalsvis/årlig
      (`useRecurringTransactions.js`). Kunne udvides med fx "hver 14. dag".
- [ ] **Genvundne afskrivninger / ejendomsavancebeskatning** ved et evt. fremtidigt salg af
      lejligheden – ikke relevant før et salg er aktuelt (se SKATTEREGLER.md).
- [x] **Mapping til konkrete TastSelv Erhverv-felter/rubrikker** – rubriknumre er nu vist i UI'et
      (VSO- og rapportsiden), men der er ikke en egentlig "sådan udfylder du selvangivelsen"-guide.
      *(implementeret via "Hjælp til selvangivelse"-siden ovenfor)*
- [ ] **Flerårig kapitalafkastsats/rentekorrektionssats-historik** – hvis I nogensinde skal opspare
      under flere forskellige historiske virksomhedsskattesatser (før ca. 2016), håndterer appens
      model i dag kun én flad 22%-sats ved hævning af opsparet overskud.
- [x] **Taste de bekræftede rigtige 2025/2026-tal ind i selve appen** (ejendomsværdi, realkreditgæld,
      indskudskonto, opsparet overskud, beskattet beløb til rådighed) – verificeret i tests, men
      appens egen database er stadig tom for rigtige stamdata. *(bekræftet gjort af brugeren. Tilføjet
      `e2e/regnskab-2025.spec.js`, der driver hele UI-flowet (Stamdata → VSO → Bogføring →
      Rapporter/Selvangivelse) med de bekræftede 2025-rubrikker fra den lokale, gitignored
      `facit.json` og verificerer at appen selv - gennem UI'et - ender på de rigtige tal, som
      supplement til de eksisterende composable-niveau-tests)*
- [ ] **Styling og polish** – konsistent på tværs af moduler, men kan finpudses løbende (PLAN.md punkt 10).
- [x] **projekt README** – med generel beskrivelse og instruktioner om afvikling, test mv. *(implementeret: README.md, klar til GitHub. Samtidig blev historikken squashet til ét initial-commit, LICENSE (MIT) og en GitHub Actions CI-workflow (`.github/workflows/ci.yml`, unit- + e2e-tests på push/PR) tilføjet – se punktet nedenfor)*
- [x] **klargøring til GitHub** – repoet indeholdt personfølsomme tal/navn/adresse i tracked filer (`SKATTEREGLER.md`, en README-undtagelse i `.gitignore`) og spredt over flere commits i historikken. *(implementeret: alle konkrete personlige tal/navn/adresse fjernet fra tracked filer og testfixtures, `udlejning 2025/README.md`-undtagelsen fjernet fra `.gitignore` (hele mappen er nu uden undtagelser), og historikken squashet til ét rent initial-commit - den fulde gamle historik findes fortsat kun lokalt på branchen `backup-fuld-historik-med-pii`, som aldrig må pushes)*
- [x] **depositum** er gæld i virksomheden, skal det ikke have sit eget indtastningsfelt? Under lejer? *(implementeret: "Skyldigt depositum primo året" er tilføjet som et årligt felt på VSO-siden og trækkes fra i kapitalafkastgrundlaget, jf. SKATTEREGLER.md punkt 6c. Lagt under VSO-stamdata frem for under den enkelte lejer, da kapitalafkastgrundlaget er ét samlet, årligt tal – ikke pr. lejer)*
- [x] **Realkreditgæld pr. år** – Stamdata → "Realkreditgæld" er ét fast tal pr. ejendom, men bør reelt være ét tal pr. år (ligesom banksaldo på VSO-siden), da restgælden ændrer sig hvert år og kapitalafkastgrundlaget skal bruge værdien primo hvert år (se SKATTEREGLER.md punkt 6b). *(implementeret: feltet er flyttet til VSO-siden som "Realkreditgæld primo året", med Dexie-migrering af evt. eksisterende data)*
- [x] Automatisk beregning af "**Allerede beskattet beløb til rådighed, uden yderligere skat (kr.)**"
      *(implementeret: ny `beregnForslagTilHensatNaesteAar()` i `useVsoBeregning.js` foreslår næste
      års beløb ud fra dette års primo-beløb + kapitalafkast + hævet overskud − faktiske
      bogførte hævninger. Vises tydeligt i en boks på VSO-siden med "Brug X kr. som ÅÅÅÅ's
      beløb"-knap, der gemmer det direkte i næste års VSO-indstillinger - redigerbart/overskrivbart,
      tydeligt markeret som et estimat. Kræver at "hæves eller opspares"-valget nu gemmes pr. år
      (var tidligere kun en side-lokal, ikke-persisteret UI-tilstand))*
- [x] **Valg af årstal** bør blive husket på tværs af sider/moduler og følges ad for alle moduler. *(implementeret: nyt delt composable `useValgtAar.js`, huskes desuden i localStorage på tværs af sideopdateringer)*
- [x] **Hvad er hvad mht realkreditlån**? afdrag, renter og bidrag. Hvad er relevant for VSO? Hvad er relevant for selvangivelsen? *(afklaret: renter og bidrag er begge fradragsberettigede og skattemæssigt sidestillede (ligningsloven § 5, stk. 1) – lægges sammen i rubrik 117. Afdrag er ikke en udgift, kun en balanceforskydning, der reducerer restgælden brugt i kapitalafkastgrundlaget. Da den korrekte fordeling kun kendes fra realkreditinstituttets årsopgørelse – én gang årligt, ikke løbende – er der tilføjet ét samlet årligt felt "Realkreditrenter og -bidrag i alt" på VSO-siden i stedet for bogføring pr. postering. Se SKATTEREGLER.md punkt 9)*
- [x] **Kapitalafkastberegningen**. Las os indsætte en tekstual beskrivelse sammen med  beregningen, så man kan forstå hvad der foregår, fx
    ```
    Afkastgrundlaget = virksomhedens aktiver minus:
      ▎ 1. Gæld
      ▎ 2. Beløb afsat efter §§ 4 og 10, stk. 1 ("hensat til senere hævning")
      ▎ 3. Indestående på mellemregningskonto (§ 4a)
      ▎ 4. Tidligere års beløb efter § 4b, stk. 1
      ▎ 5. Beløb overført fra VSO til privatøkonomien med virkning fra årets begyndelse
    ```
    *(implementeret: sammenklappelig `<details>`-forklaring under kapitalafkastgrundlag-tabellen på VSO-siden)*
- [x] **understøt flere udlejninger** man kan skifte imellem *(implementeret: `tenants`/`transactions`/
      `recurringTransactions`/`vsoSettings` har fået et `ejendomId`-felt (Dexie-migrering v5, tagger
      automatisk eksisterende data med den ene tidligere implicitte ejendom). Ny global ejendoms-vælger
      i navigationen (`useValgtEjendom.js`, samme mønster som årstals-vælgeren), en ny "Dine
      ejendomme"-sektion på Stamdata til at oprette/skifte, og alle sider filtrerer nu deres data efter
      den valgte ejendom. Sletning af en ejendom er bevidst ikke bygget denne omgang (se separat idé)*
- [ ] **Slet en ejendom** – kaskade-sletning af dens lejere/posteringer/VSO-tal. Bevidst udeladt fra
      "understøt flere ejendomme" ovenfor, da det er en mere risikabel handling.
- [x] kan man lave et **diagram som viser udregningerne**, med mellemregninger der fører frem til resultat-tallene? Jeg forestiller mig en slags "flowchart" eller pipeline(s) som fører frem til resultatet, med mellemregningerne som "nodes" i diagrammet. Det kunne være en slags "forklaring" til brugeren, der viser hvordan de forskellige tal hænger sammen og hvordan de er beregnet. *(implementeret: ny side `/beregning` (`BeregningView.vue`) med de samme tal som VSO-/Rapport-siden, vist som en flowchart-pipeline - input-bokse med fortegn (+/−/×) ned til et resultat, trin for trin. Mellemresultater der genbruges senere (fx Driftsresultat og Kapitalafkast, der begge indgår i Årets overskud) er farvekodet og klikbare, og smooth-scroller tilbage til kilde-trinnet i stedet for at tegne rigtige forbindelseslinjer på tværs af siden)*
- [x] **Afskrivninger** – appen hardcodede 0 kr. i afskrivninger overalt (kun bygningsafskrivning var
      afklaret som ikke-fradragsberettiget, resten var aldrig wired op). *(implementeret som ét
      simpelt årligt felt "Afskrivninger i alt" på VSO-siden, ligesom realkreditrenter/-bidrag –
      brugeren beregner selv en evt. saldoafskrivning af driftsmidler (fx møbler ved møbleret
      udlejning) udenfor appen og indtaster kun årets samlede beløb. Ikke relevant lige nu (ingen
      driftsmidler/møbleret udlejning), men wired korrekt ind i `beregnAaretsOverskud()` i
      VsoView/RapporterView/SelvangivelseView, så det er klar den dag det bliver relevant)*
- [ ] **Fuldt driftsmiddelkartotek** – hvis afskrivninger på løsøre/driftsmidler bliver relevant
      (fx møbleret udlejning), kunne feltet ovenfor udbygges til en egentlig liste over anskaffede
      aktiver (anskaffelsessum/-dato pr. aktiv), hvor appen selv beregner den nedskrevne saldo og
      årets 25%-afskrivning år for år, inkl. salg/udrangering. Bevidst fravalgt for nu, da det er en
      del mere at bygge og vedligeholde for noget der ikke bruges endnu.
- [ ] **Regne på rentabilitet** af at købe en lejllighed og leje den ud. Prognose..
- [ ] **Værktøj til at beregne tilbagebetaling/merbetaling** i forhold til betalt aconto til forbrug
- [ ] **6 "high severity" sårbarheder fra `npm audit`** – alle med samme rodårsag: `brace-expansion`
      (DoS ved ubegrænset expansion) trukket ind transitivt via
      `minimatch → editorconfig → js-beautify → @vue/test-utils`. Kun i `devDependencies`
      (test-værktøj, ikke en del af det byggede produktionsbundle), så reel risiko er lav – men bør
      ryddes op. `npm audit fix --force` vil *nedgradere* `@vue/test-utils` fra 2.4.11 til 2.4.0
      (breaking change) for at fjerne kæden, hvilket ikke bør gøres blindt. Afvent i stedet en
      opdateret `@vue/test-utils`-release der selv har opdateret sin `js-beautify`-afhængighed, eller
      undersøg om `js-beautify` kan overrides/pinnes direkte via `overrides` i `package.json`.
