# QuizMaster Live

Mobile-first live quiz voor een quizmaster en spelers op telefoon.

## Online

Productie:

https://quizmaster-app-nine.vercel.app

## Techniek

- Next.js App Router
- Convex realtime database/backend
- Vercel hosting
- Geen speleraccounts nodig

## Lokaal starten

1. Start Convex:

```bash
npx convex dev
```

2. Start de website in een tweede terminal:

```bash
npm run dev
```

3. Open:

```text
http://localhost:3000
```

## Belangrijke pagina's

- `/` startpagina
- `/master` quizmaster maakt een game
- `/master/[gameId]` quizmaster dashboard
- `/join` spelerspagina
- `/live/[gameCode]` publieke 9:16 TikTok LIVE display
- `/host/live-screen/[gameId]` quizmaster 9:16 control scherm

## Convex

De app gebruikt deze hoofdtabellen:

- `games`
- `players`
- `gameState`
- `questions`
- `answers`
- `battles`
- `battleVotingOptions`
- `battleVotes`
- `battleQuestions`
- `battleAnswers`
- `playerBattleStats`

Raak `convex/_generated` niet handmatig aan. Convex werkt deze bestanden zelf bij.

Extra velden voor TikTok LIVE lobby/countdown:

- `games.scheduledStartAt`
- `games.countdownDurationSeconds`
- `games.countdownStatus`
- `games.countdownPausedRemainingSeconds`
- `games.autoStartEnabled`
- `games.joinOpen`
- `players.lastSeenAt`

## Environment

Gebruik:

```text
NEXT_PUBLIC_CONVEX_URL=https://your-existing-deployment.convex.cloud
NEXT_PUBLIC_APP_URL=https://quizmaster-app-nine.vercel.app
```

`NEXT_PUBLIC_APP_URL` wordt gebruikt voor de QR-code en de zichtbare website-URL. Zet hier later je eigen domein, bijvoorbeeld `https://pubquiz.live`.

## TikTok LIVE scherm testen

1. Maak via `/master` een nieuwe game aan.
2. Open het quizmasterdashboard.
3. Klik op `Open TikTok-scherm`.
4. Vul op het live-scherm je quizmaster-pincode in.
5. Kies een snelle afteller, bijvoorbeeld `2m`.
6. Klik `Stel in`.
7. Klik `Start afteller`.
8. Open de publieke display-route in een tweede venster: `/live/[gameCode]`.
9. Scan de QR-code met een telefoon.
10. Vul alleen een nickname in en klik `Start`.

Voor OBS:

- Browser source URL: `https://quizmaster-app-nine.vercel.app/live/[gameCode]`
- Breedte: `1080`
- Hoogte: `1920`
- Geen custom TikTok-overlay nodig.
- Gebruik display mode voor OBS, niet de host/control route.

## Bonus Battle testen

1. Maak als quizmaster een nieuwe game aan.
2. Open `/join` in twee of meer vensters of telefoons.
3. Laat minimaal twee spelers meedoen met dezelfde gamecode.
4. Start in het quizmasterdashboard een Bonus Battle.
5. Laat spelers stemmen op deelnemers.
6. Klik als quizmaster op `Stemmen afronden`.
7. Bevestig of wijzig de twee deelnemers.
8. Maak een battlevraag en zet die live.
9. Controleer dat alleen de twee gekozen spelers kunnen antwoorden.
10. Controleer dat andere spelers alleen kunnen meekijken.
11. Sluit de battlevraag of wacht tot beide spelers hebben geantwoord.
12. Beoordeel de antwoorden of gebruik automatisch nakijken bij A/B/C/D.
13. Rond de vraag af en voeg na de battle de punten toe aan de ranglijst.

## TikTok LIVE voorbereid

Er is nog geen directe TikTok API-integratie. De app is wel voorbereid op live gebruik:

- QR-code naar de spelerpagina.
- Korte gamecode.
- Spelers zonder account.
- Nieuwe spelers kunnen tijdens een actieve quiz aansluiten.
- Quizmaster kan spelersnamen aanpassen of verwijderen.
- Maximaal een antwoord per speler per vraag.
- Server-side reactietijd bij normale vragen en Bonus Battle.
- Bonus Battle gebruikt correcte antwoorden voor snelheid meetelt.
- Top 10 voor spelers, volledige ranglijst voor quizmaster.
