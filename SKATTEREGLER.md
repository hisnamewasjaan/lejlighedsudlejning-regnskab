# Skatteregler & afklaringspunkter – Virksomhedsordningen

Dette dokument samler de danske skatteregler appen bygger på, samt punkter der bør afklares (med SKAT/revisor eller ved opslag i loven), **før
** de tilhørende beregninger implementeres. Se [PLAN.md](./PLAN.md) for den overordnede projektplan.

---

## Aktuelle satser

| Sats                 | 2025 | 2026                                                                                               |
|----------------------|------|----------------------------------------------------------------------------------------------------|
| Kapitalafkastsats    | 2%   | Endnu ikke offentliggjort (opgøres ud fra gnsn. af Nationalbankens udlånsrente for 1. halvår 2026) |
| Rentekorrektionssats | 5%   | Endnu ikke offentliggjort                                                                          |

> Satserne fastsættes af Skattestyrelsen én gang årligt og skal **ikke hardcodes
** i appen – de indtastes/opdateres manuelt i VSO-stamdata hvert år. Tjek altid [skat.dk](https://skat.dk) eller [info.skat.dk C.C.5.3.1.2.4](https://info.skat.dk/data.aspx?oid=1948937) for gældende tal, når 2026-satserne skal bruges.

Kilder:

- [Kapitalafkastsatsen – info.skat.dk](https://info.skat.dk/data.aspx?oid=1948937)
- [Rentekorrektion – info.skat.dk](https://info.skat.dk/data.aspx?oid=1948910)
- [Kapitalafkastsatsen og rentekorrektionssatsen for 2025 – info.skat.dk](https://info.skat.dk/data.aspx?oid=2459074)

---

## Åbne afklaringspunkter – bør undersøges før implementering

### 1. Bygningsafskrivning på beboelsesudlejning (afskrivningsloven §14) ✅ Afklaret

**Svar: Bygningsafskrivning er ikke tilladt.** Afskrivningsloven § 14, stk. 2, nr. 4 undtager udtrykkeligt bygninger der anvendes til beboelse (eller dertil knyttede formål) fra afskrivning – med undtagelse af hotel-, camping- og visse døgninstitutioner. Det er den faktiske anvendelse (beboelse), der er afgørende – ikke om udlejningen i øvrigt er erhvervsmæssig/sker i VSO.

**Konsekvens for appen**: 4%-linjen for bygningsafskrivning i afskrivningsskemaet fjernes/deaktiveres for denne lejlighed – der er intet årligt afskrivningsfradrag på selve bygningen. Straksfradrag for løbende vedligeholdelse (100%) og evt. driftsmiddelafskrivning (25% saldo) for løsøre/inventar (fx hårde hvidevarer ved møbleret udlejning) er ikke berørt af denne undtagelse, men følger egne regler.

Kilder:
- [Afskrivningsloven § 14 – danskelove.dk](https://danskelove.dk/afskrivningsloven/14)
- [C.C.2.4.4.1 Afskrivningsberettigede bygninger – info.skat.dk](https://info.skat.dk/data.aspx?oid=2083984)
- [Bygninger, der ikke kan afskrives – tax.dk](https://www.tax.dk/lv/lve/E_C_4_1_1.htm)

### 2. Indskudskontoens og opsparet overskuds opgørelse ved VSO-opstart ✅ Afklaret

**2a. Indskudskonto.** Fundet i TastSelv's årsopgørelser (rubrik 984 "Indskudskonto ultimo") – uændret år for år siden VSO-opstart, dvs. der er ikke sket nye indskud eller hævninger fra selve indskudskontoen. Indtastes direkte i feltet "Indskudskonto" på VSO-siden. (Det konkrete, bekræftede beløb er personfølsomt og fremgår kun af den lokale, gitignorede `facit.json` – ikke af dette dokument.)

**2b. Opsparet overskud (bruttobeløb).** TastSelv's linje "Fremført til indkomståret → Opsparet overskud i virksomhed, 22% skat" viser kun saldoen ved **starten** af det viste indkomstår – ikke den aktuelle saldo. Den korrekte, opdaterede saldo efter et afsluttet regnskabsår er:

`beløb fremført fra sidste år + beløb opstået i det afsluttede år = ny saldo`

Dette er **bruttobeløbet** (før den 22% virksomhedsskat der allerede er betalt) – TastSelv's skattemappe viser bruttotallet, ikke nettosaldoen. Appens hævningsberegner arbejder med bruttobeløb (ligesom kapitalafkast og årets overskud), så bruttobeløbet indtastes i feltet "Opsparet overskud fra tidligere år" på VSO-siden. Nettobeløbet (hvis alt blev hævet med det samme, uden yderligere hævninger) er til sammenligning ca. 78% af bruttobeløbet (1 − 22%).

Da alle årenes opsparingslinjer i TastSelv konsekvent er mærket "22% skat", er der ingen ældre poster opsparet til en anden sats – forbeholdet om flere historiske satser er dermed afkræftet for denne sag.

**2c. Allerede beskattet beløb til rådighed (skattefrit).** Oplyses typisk direkte af revisoren efter et afsluttet regnskabsår – et beskattet beløb der henstår i virksomhedsskatteordningen og kan hæves uden yderligere skattemæssige konsekvenser, evt. fordelt som et cirka-månedligt beløb resten af året.

Dette er et **fjerde, selvstændigt beløb** – forskelligt fra både indskudskontoen (skattefri tilbagebetaling af eget indskud) og opsparet overskud (hvor der stadig mangler restskat ved hævning). Det dækker beløb der allerede er beskattet fuldt ud (typisk "hensat til senere hævning", jf. rubrik 152 i TastSelv), men endnu ikke fysisk overført fra virksomhedens til den private konto. Da det ikke udløser yderligere skat ved hævning, er det tilføjet som **højeste prioritet** i appens hævningsberegner (`fordelHaevning` i `useVsoBeregning.js`), foran de fire lovbestemte trin i VSL § 5. Indtastes i feltet "Allerede beskattet beløb til rådighed" på VSO-siden – tallet skal opdateres årligt ud fra revisorens opgørelse.

Kilder:
- [Rubrik 111 udfyldes: Trin for trin (2026) – Digi-Tal](https://www.digi-tal.dk/blog/rubrik-111-saadan-udfyldes/)
- [C.C.5.2.10 Overskud og virksomhedsskat – info.skat.dk](https://info.skat.dk/data.aspx?oid=1948909)
- Egen historik fra TastSelv (2020-2026) og revisorens opgørelse efter 2025-regnskabet

### 3. Hvem er den skattemæssigt erhvervsdrivende ✅ Afklaret

**Svar**: Alene hustruen er den erhvervsdrivende i VSO. Det er hendes indkomst der beskattes, og appen skal derfor ikke understøtte deling af overskud/kapitalafkast mellem ægtefæller.

### 4. Om en enkelt lejlighed kan rummes i VSO ✅ Afklaret

**Svar: Ja.** Lejligheden behandles allerede i VSO i den nuværende ordning (hos revisoren), hvilket bekræfter i praksis at situationen ikke rammes af undtagelserne for bl.a. værelsesudlejning/sommerhuse.

### 5. Hvilket realkreditlån hører til VSO ✅ Afklaret

I har tre realkreditlån, ikke ét. Kun **ét** af dem er overført til virksomhedsindkomsten (rubrik 117) og hører dermed til VSO – de to andre hører til den private bolig og skal holdes udenfor, jf. principperne i VSL § 1-2 om at kun erhvervsmæssig gæld direkte knyttet til et VSO-aktiv skal indgå.

Bekræftet via TastSelv "Skatteoplysninger", sektionen "Renteudgifter og restgæld", som viser hvilke lån der er "Overført til virksomhedsindkomst" – i denne sag kun lånet på selve udlejningsejendommen, ikke lånene på den private bolig.

**Konsekvens for appen**: Stamdata → "Realkreditgæld" skal indeholde **kun** restgælden på det lån der reelt er overført til virksomhedsindkomsten, ikke den samlede realkreditgæld på tværs af alle ejendomme, som fremgår af de generelle formueoplysninger. Bruges det forkerte (samlede) tal, bliver kapitalafkastgrundlaget markant undervurderet. (De konkrete lånenumre/restgælds-/rentebeløb er personfølsomme og fremgår kun af den lokale, gitignorede `facit.json`.)

### 6. Kapitalafkastgrundlagets værdiansættelse af fast ejendom ✅ Afklaret

Fire delfejl fundet og rettet ved at afstemme appens beregnede kapitalafkast mod det bekræftede facit-tal for 2025 (rubrik 148). Med alle fire rettelser indtastet lander appen under 0,1% afvigelse fra facit-tallet – samme størrelsesorden som den accepterede restafvigelse i resultatopgørelsen. Betragtes som fuldt afklaret. (De konkrete beløb indgår i den lokale, gitignorede `facit.json` og `tests/unit/regnskab-2025.spec.js`.)

**6a. Anskaffelsessum, ikke ejendomsværdi.** VSL § 8 fastslår at fast ejendom skal medregnes til **den kontante anskaffelsessum** (eventuelt reguleret for forbedringer), ikke den løbende offentlige ejendomsvurdering. Bekræftet anskaffelsessum fra skødet, indtastet i appens Stamdata. `beregnKapitalafkastgrundlag()` i `useVsoBeregning.js` bruger nu `property.anskaffelsespris`. "Ejendomsværdi"-feltet er stadig relevant til reference/ejendomsværdiskat, men indgår ikke i VSO-beregningen.

**6b. Værdierne skal opgøres primo, ikke ultimo.** VSL § 8: "Virksomhedens afkastgrundlag opgøres **ved indkomstårets begyndelse**" – altså pr. 1. januar, ikke 31. december. Realkreditgæld og banksaldo skal derfor bruge primo-tal (restgæld pr. 1. januar, ikke ultimo-tallet ved årets udgang, som er lavere fordi lånet afdrages løbende). Realkreditgæld er flyttet fra Stamdata (ét fast tal pr. ejendom) til et årligt felt på VSO-siden ("Realkreditgæld primo året"), ligesom banksaldo og skyldigt depositum.

**6c. Skyldigt depositum trækkes fra som gæld.** Depositum er ikke en del af lejeindtægten, men en gæld til lejeren ("skyldigt depositum" i bogføringen), og i virksomhedsordningen opgøres kapitalafkastgrundlaget netto (aktiver minus al erhvervsmæssig gæld). Feltet "Skyldigt depositum primo året" på VSO-siden, trukket fra i `beregnKapitalafkastgrundlag()`.

**6d. Hensat til senere hævning som femte fradragspost.** VSL § 8, stk. 1 (hentet direkte fra lovteksten) lister **fem** fradrag fra aktiverne, hvoraf vi oprindeligt kun havde modelleret to (gæld, depositum): gæld, **beløb afsat efter §§ 4 og 10, stk. 1** ("hensat til senere hævning"), indestående på mellemregningskonto (§ 4a), tidligere års § 4b-beløb, og beløb overført til privatøkonomien med virkning fra årets begyndelse. Kun den anden er relevant for jer – det er præcis det samme beløb som feltet "Allerede beskattet beløb til rådighed" (revisorens "hensat til senere hævning"), nu genbrugt som et femte fradrag i `beregnKapitalafkastgrundlag()`. Skal indtastes som beløbet primo året, ikke den løbende saldo.

Kilder:
- [Virksomhedsskatteloven § 8 – danskelove.dk](https://danskelove.dk/virksomhedsskatteloven/8)
- [C.C.5.2.9.3 Kapitalafkastgrundlaget – info.skat.dk](https://info.skat.dk/data.aspx?oid=1948905)
- [Depositum og forudbetalt leje – Lejeloven.dk](https://www.lejeloven.dk/udlejer/indskud)

### 7. Renteindtægt/-udgift i virksomheden holdes uden for driftsresultatet (rubrik 111) ✅ Afklaret

TastSelv opgør **rubrik 111** ("Overskud virksomhed/udlejningsejendom") som resultatet **før** renter – renteindtægter og -udgifter i virksomheden indberettes særskilt i **rubrik 114** og **rubrik 117**. Alle tre lægges sammen med kapitalafkastet (rubrik 148) for at nå frem til **rubrik 149** ("Indkomst til virksomhedsbeskatning"):

`149 = 111 + 114 − 117 − 148`

Bekræftet ved at afstemme formlen mod samtlige år i `vso-tal.md` (kun lokal, gitignored fil) – eksakt match for alle bekræftede år, herunder direkte mod det oplyste rubrik 149.

**Konsekvens for appen**: Der er tilføjet en ny indtægtskategori "Renteindtægt" (`renteindtaegt`), adskilt fra den hidtidige generiske "Anden indtægt". Både den (rubrik 114) og den eksisterende udgiftskategori "Realkreditrenter" (`realkreditrenter`, rubrik 117) holdes nu uden for driftsresultatet i Resultatopgørelsen og VSO-panelet, men lægges til/trækkes fra særskilt, når årets overskud (rubrik 149) beregnes – se `RapporterView.vue` og `VsoView.vue`. Tidligere blev renteposter enten slået sammen med det almindelige driftsresultat (hvis kategoriseret) eller manglede helt fra beregningen (hvis ikke bogført under en synlig kategori).

### 8. Bogføringslovens opbevaringskrav

Normalt 5 år – påvirker hvor længe og hvordan data skal kunne fremvises, og dermed kravene til backup/eksport-modulet.

### 9. Realkreditbidrag sidestilles med renter – og bogføres samlet, ikke pr. postering ✅ Afklaret

En realkreditydelse består af tre dele: **renter**, **bidrag** (det løbende administrationsgebyr banken opkræver, typisk kvartalsvist) og **afdrag** (afvikling af hovedstolen). Kun de to første er fradragsberettigede – afdraget er blot tilbagebetaling af gæld og påvirker aldrig resultatopgørelsen.

**Bidraget er skattemæssigt sidestillet med renter, ikke en almindelig driftsudgift.** Ligningsloven § 5, stk. 1 fradragsberettiger "udgifter til løbende provisioner eller præmier for lån" efter samme periodiseringsregel som renteudgifter – det er den kategori bidraget hører under. Skattestyrelsen skelner reelt ikke mellem de to: begge giver præcis det samme fradrag som negativ kapitalindkomst. Bidraget skal derfor lægges sammen med renterne i **rubrik 117** ("Renteudgifter i virksomheden"), ikke behandles som en almindelig driftsomkostning i rubrik 111.

**Opdaget problem**: den hidtidige bogføring af det ene VSO-lån (se punkt 5) i kategorien "Realkreditrenter" viste sig reelt at være **hele terminsydelsen** (renter + bidrag + afdrag samlet), ikke kun renteandelen – hentet direkte fra bankens CSV-eksport uden at være splittet op. Det overvurderer det fradragsberettigede beløb markant, fordi afdraget (som ikke må fradrages) var talt med.

**Konsekvens for appen**: da den korrekte fordeling kun kendes fra realkreditinstituttets årsopgørelse – som modtages **én gang årligt**, ikke løbende – giver det ikke mening at bogføre beløbet som enkelte posteringer pr. bankhævning (kvartalsvise termins-udtræk fra kontoen). I stedet er der tilføjet ét samlet årligt felt på VSO-siden, **"Realkreditrenter og -bidrag i alt"**, der indtastes direkte fra opgørelsen og indgår i rubrik 117-beregningen i `RapporterView.vue`/`VsoView.vue`/`SelvangivelseView.vue`. De hidtidige bogføringskategorier `realkreditrenter`/`realkreditbidrag` er fjernet fra "Registrér postering" (`useTransactions.js`), så de ikke længere kan vælges til nye posteringer. Beregningerne holder fortsat evt. **ældre** posteringer i disse to kategorier ude af driftsudgifterne (for at undgå dobbelttælling med det nye felt, hvis der findes gamle data fra før omlægningen) – de bør ryddes op/slettes manuelt, når det korrekte årlige tal er indtastet i det nye felt, men vises stadig i posteringslisten (uden kategori-label) indtil da. CSV-importens advarsel ved en realkreditlinje er opdateret til at forklare dette i stedet for at bede brugeren "rette beløbet til kun renteudgiften" (som fejlagtigt udelod det fradragsberettigede bidrag).

Kilder:
- [Ligningsloven § 5 – danskelove.dk](https://danskelove.dk/ligningsloven/5)
- Diverse rådgivningskilder (Findbank.dk, Howden Realkredit) der bekræfter at bidrag er fradragsberettiget på linje med renter i kapitalindkomsten

---

## Punkter der kan vente til senere moduler

- Genvundne afskrivninger og ejendomsavancebeskatning ved et evt. fremtidigt salg af lejligheden.
- Mapping af appens output til konkrete felter/rubrikker i TastSelv Erhverv – relevant når årsrapport-modulet er klar, men ikke for MVP.
