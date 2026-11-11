# The Android app

The game packed as an Android app with [Capacitor](https://capacitorjs.com), with real purchases through
Google Play Billing (the `cordova-plugin-purchase` plugin). The website and the app run the same `game.js`:

- **Website:** purchases are test purchases and pay at once; "Watch an ad" buttons give their reward. No
  analytics, reminders or rating card.
- **App:** purchases go through Google Play and pay only once Google approves them; "Watch an ad" buttons play
  AdMob's rewarded ads. The phone's back button closes dialogs and steps back. Only the app has analytics,
  reminders and the rating card (section 5).

`build-web.mjs` copies the game into `www/` with only the pictures and sounds it uses (not `assets/raw/`), turning
the pictures into WebP under their own file names (the app's browser reads an image by its contents): 56 MB of
pictures and sounds become about 16 MB, and the app about 22 MB.

**The app id `com.sinadehesh.mergefarmstead` is permanent once uploaded to Play Console.** If the game gets
another name, change `appId` in `capacitor.config.json`, `namespace`/`applicationId` in `android/app/build.gradle`
and the `MainActivity.java` package folder *before* the first upload.

## 1. One-time setup (Linux)

```bash
# Java 21 and Node 20+ (Debian/Ubuntu)
sudo apt install openjdk-21-jdk nodejs npm unzip

# Android command-line tools, API 36 and build tools
mkdir -p ~/android-sdk/cmdline-tools && cd ~/android-sdk
curl -o clt.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip -q clt.zip -d cmdline-tools && mv cmdline-tools/cmdline-tools cmdline-tools/latest && rm clt.zip
export ANDROID_HOME=~/android-sdk          # add this line to ~/.bashrc too
yes | cmdline-tools/latest/bin/sdkmanager --licenses
cmdline-tools/latest/bin/sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"

# The project
git clone https://github.com/Sinadehesh/animal-farm-merge.git && cd animal-farm-merge/app
npm ci
echo "sdk.dir=$HOME/android-sdk" > android/local.properties
```

## 2. Make your upload key (once — keep it forever)

Play Console uses **Play App Signing**: Google keeps the real app-signing key, and you sign each upload with an
**upload key**. If you lose the upload key you can ask Google to reset it, but keep it safe anyway.

```bash
mkdir -p ~/keys && cd ~/keys
keytool -genkeypair -v \
  -keystore upload-key.jks -storetype JKS \
  -alias upload -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Your Name, O=Your Studio, C=US"
# It asks for a password: pick a strong one and save it in your password manager.

# Back up ~/keys/upload-key.jks somewhere safe (not in git, not in the repo).

# Its fingerprint (Play Console may ask for it):
keytool -list -v -keystore ~/keys/upload-key.jks -alias upload | grep SHA256
```

Then tell the build where the key is (this file is in `.gitignore`; never commit it):

```bash
cat > ~/animal-farm-merge/app/android/keystore.properties <<'EOF'
storeFile=/home/YOUR_USER/keys/upload-key.jks
storePassword=YOUR_PASSWORD
keyAlias=upload
keyPassword=YOUR_PASSWORD
EOF
chmod 600 ~/animal-farm-merge/app/android/keystore.properties
```

## 3. Build

**On GitHub (no key on your computer needed):** Actions → *Build Android app bundle* → *Run workflow*. It signs with
the upload key kept in the repository's secrets and gives `app-release.aab` under the run's *Artifacts*. It sets
`versionCode` to the run number, so each upload is accepted (the secret names it reads are at the top of
`.github/workflows/build-aab.yml`). With the secret `GOOGLE_SERVICES_JSON` (section 5) the build has Google
Analytics; without it the app is the same, minus analytics.

**On your computer:**

```bash
cd ~/animal-farm-merge && git pull && cd app
npm run apk    # test build: android/app/build/outputs/apk/debug/app-debug.apk, with Google's test ads
               # (if it comes out much bigger than ~32 MB, run `cd android && ./gradlew clean` and build again)
npm run aab    # store build, signed with your upload key: android/app/build/outputs/bundle/release/app-release.aab
```

Before every new upload, raise `versionCode` (1, 2, 3…) and `versionName` ("1.0.1"…) in
`android/app/build.gradle`. Google refuses an upload whose versionCode it has already seen.

Install a test build on a phone with USB debugging on: `~/android-sdk/platform-tools/adb install -r android/app/build/outputs/apk/debug/app-debug.apk`

## 4. Play Console

**Ads (AdMob):** app ID `ca-app-pub-1454905177805714~1236207307` (in `android/app/src/main/res/values/strings.xml`),
rewarded ad unit `ca-app-pub-1454905177805714/6296962299` (in `monetize.js`, `MONETIZE.ads.rewarded`), used by every
"Watch an ad" button and the ad bubble. Test builds (`npm run apk`) show Google's test ads, so never tap real ads on
your own phone; the store build shows real ones. In AdMob, publish a GDPR consent message (Privacy & messaging) so
players in Europe get the consent form, and link the app to Google Play once it is public. **The message has to
exist:** the game asks Google's consent step before anything else, and with no message that step reports an
error, so the game shows no ads and sends no analytics, to anyone.

**Done (as of 2026-10-20):** the developer account is paid ($25), the ID check is passed and the payments profile is
set up. Don't ask for these again; start from step 1 below.

1. **Create app**: name, default language, *Game*, *Free* (it has in-app purchases), accept the declarations.
2. **Testing → Internal testing → Create new release**: upload `app-release.aab`. Accept Play App Signing when
   asked. Add yourself (and testers) under *Testers* by email, then roll out.
3. **Monetize → Products → In-app products**: purchases can only be created after an AAB with the billing
   permission has been uploaded (step 2). Create each product below as a one-time product with **exactly this
   product ID**, a name, a description and a price, then **Activate** it.
4. **License testing, so testers buy for free** (Play Console's main page, not the app's: **Settings → License
   testing**): choose **the same email list as the test track's testers** (or add their Gmail addresses), set the
   license response to *RESPOND_NORMALLY* and save. Everyone on it then pays with Google's *Test card, always
   approves*: nothing is charged, and the purchase dialog says it's a test. Anyone in the test who is **not** on this
   list pays real money, so add each new tester to the list (or use one Google Group for both). The game finishes
   (acknowledges) every purchase as soon as Google approves it, so test purchases aren't refunded after 3 minutes
   and can be bought again. The products in step 3 must be **Active**, or the shop says they aren't available.
5. Install the app from the internal-testing link on your phone (the Play Store version, not a sideloaded APK —
   billing only works for apps installed from Play) and try a purchase.
6. **App content** (all required before release): privacy policy URL
   (https://www.sinadehesh.com/mergefarmstead/privacy/), ads (*Yes, my app contains ads*), advertising ID
   (*Yes: Advertising or marketing, Analytics, Fraud prevention*), app access (*no restrictions*), content rating
   questionnaire, target audience (*13+*), government apps / financial features (*no*), and data safety:
   collected and shared by the AdMob SDK, encrypted in transit, for advertising, analytics and fraud prevention:
   *Approximate location* (from the IP address), *App interactions*, *Diagnostics*, *Device or other IDs*.
   Once a build has Google Analytics (section 5), add *Purchase history* (under Financial info: collected, not
   shared, for Analytics); Analytics also collects the first, second and fourth of those, which are already
   listed. Purchases are processed by Google Play.
7. **Main store listing**: short and full description, 512×512 icon (`app/store/play-icon-512.png`),
   1024×500 feature graphic (`app/store/feature-graphic-1024x500.png`), phone screenshots
   (`app/store/screenshots/`, in order).
8. **Closed test, required before production for this (personal) account**: **Test and release → Testing →
   Closed testing**: create a track, upload the AAB, add the testers (put the same list under License testing,
   step 4) and roll out. At least **12 testers** must stay opted in for **14 days in a row**; internal testing
   doesn't count. Then **Dashboard → Apply for production**: a form in three parts. The closed test (how easy
   recruiting was, how testers used the game, their feedback and how you collected it); the game (who it's for,
   what makes it unique, installs expected in the first year); readiness (what you changed because of the test,
   how you decided it's ready). Keep all 12 opted in until you hear back. Google answers by email, usually
   within 7 days. If it asks for more testing, keep the closed test running (testers really playing), then
   apply again.
9. Once approved: **Test and release → Production**: pick the countries/regions, then **Create new release**,
   **Add from library** (the newest AAB), release notes, **Save → review → Start rollout**. Google reviews it
   (usually a few days). When it's live, link the app to Google Play in AdMob (**Apps**).

### Product IDs

| Product ID | What it is | Price in the game |
|---|---|---|
| `gems_handful` | Handful of Gems, 💎100 | $2.49 |
| `gems_pouch` | Pouch of Gems, 💎260 | $4.99 |
| `gems_pile` | Pile of Gems, 💎570 | $11.99 |
| `gems_cask` | Cask of Gems, 💎1,250 | $23.99 |
| `gems_barrel` | Barrel of Gems, 💎3,400 | $59.99 |
| `gems_vault` | Vault of Gems, 💎7,500 | $119.99 |
| `special_offer` | Special Offer: 💎100 + 💵100 + ⚡100 (once) | $3.49 |
| `daily_basket` | 30 Day Daily Basket: 💎10 a day | $1.99 |
| `gem_jar` | Break the Gem Jar (its saved-up 💎) | $2.99 |
| `starter` | Starter Pack (48 h offer) | $2.99 |
| `energy_bundle` | Energy Bundle (24 h offer) | $1.99 |
| `fair_pack` | Fair Pack (24 h offer) | $3.99 |
| `builder` | Builder Pack (24 h offer) | $4.99 |
| `golden_pass` | Golden Pass for the season | $4.99 |
| `golden_pass_deluxe` | Golden Pass Deluxe (+300 points) | $9.99 |

All are consumables: the game "finishes" each purchase after paying out, so packs and passes can be bought
again. The game itself limits one-time offers. Once the products are active, the game shows Google's price in
the player's own currency instead of the dollar prices above.

## 5. Analytics, reminders and the rating card (app only)

### Analytics (Google Analytics for Firebase)

The game tells Google Analytics what happens in play, through the `@capacitor-firebase/analytics` plugin (`Track`,
at the top of `game.js`). Nothing is sent from the website, from a build without the Firebase file, or before the
consent step allows it.

**Set it up once:**

1. https://console.firebase.google.com → **Create a project** (any name) → leave **Google Analytics** on and pick
   or create an Analytics account.
2. In the project: **Add app → Android**. Package name: `com.sinadehesh.mergefarmstead`. **Register app**, then
   **Download google-services.json**. Skip the steps after that (the build does them).
3. GitHub → this repository → **Settings → Secrets and variables → Actions → New repository secret**. Name:
   `GOOGLE_SERVICES_JSON`. Value: the whole text of that file. (For a build on your computer, put the file at
   `app/android/app/google-services.json` instead; git ignores it.)
4. Build as usual (section 3). The run's *Firebase file* step says whether the build has analytics.
5. AdMob → **Privacy & messaging** → the European regulations message → its settings (the gear) → turn on
   **consent mode for advertising purposes** and **consent mode for analytics purposes** → save. Without the
   second, players in Europe are never counted: the game keeps analytics off for them.
6. Play Console → **App content → Data safety**: add *Purchase history* (step 6 of section 4).
7. Useful, not needed: in Firebase, **Project settings → Integrations**, link **AdMob** (ad income in the
   reports) and **Google Play** (purchase income).

Counts show in Firebase under **Analytics → Events** within a day; **Realtime** shows the last half hour. To
watch your own phone live: `adb shell setprop debug.firebase.analytics.app com.sinadehesh.mergefarmstead`, then
**Analytics → DebugView**.

**Consent** (Google's "basic consent mode"): collection is off in the manifest
(`firebase_analytics_collection_enabled` is false) and the game turns it on once the ad plugin's consent step has
an answer. Google's consent form saves the player's choices on the phone as four digits (`UMP_consentModeValues`:
ad storage, ad user data, ad personalisation, analytics storage; 1 yes, 2 no, 3 no need to ask, 4 not set up),
which the app's own `ConsentMode` plugin (`ConsentModePlugin.java`) hands to the game. Analytics run when the last
digit is 1 or 3, or when nothing is set up and the form says this player needn't be asked (outside Europe). The
answer is remembered for the next start (so a game played offline still counts) and checked again at every start
and after *Ad privacy choices* in ⚙️ Settings.

**What is sent.** Google adds its own (first open, sessions, time in the game, purchases) and these:

| Event | When | Details |
|---|---|---|
| `intro_watched`, `intro_skipped` | the opening film ends | |
| `tutorial_begin`, `tut_01_job` … `tut_11_onward`, `tutorial_complete`, `tutorial_skip` | the tutorial starts; each step done; its end | `step` (where it was skipped) |
| `level_up` | a new level | `level` |
| `job_done`; `jobs_1`, `jobs_3`, `jobs_5`, `jobs_10` … `jobs_400`, then all of them | a job done; that many jobs done | `job`, `land`, `jobs`, `level` |
| `area_done`, `land_done` | an area or a whole land restored | `area` or `land`, `level` |
| `chapter_2` … `chapter_5`, `story_end` | a chapter opens; the story ends | |
| `land_buy_hay`, `_farm`, `_fert`, `_aqua`, `_flower` | a land bought | `level` |
| `daily_gift` | the daily gift claimed | `day`, `streak`, `twice` |
| `energy_out` | out of ⚡ | `times`, `level`, `minutes` (played so far) |
| `producer_out` | a producer out of charges | `board`, `tool`, `level` |
| `shop_open` | the Shop opened | `level` |
| `gems_energy`, `_recharge`, `_tool_recharge`, `_tool`, `_coins`, `_pass`, `_flash_sale`, `_daily_deal`, `_bubble`, `_chest`, `_cobweb` | 💎 spent, by what on | `value` (the 💎), `level` |
| `buy_<product id>` | Google approved a purchase | `value` (US$), `currency` |
| `ad_watched_energy`, `_recharge`, `_gems`, `_gift`, `_bubble`, `_well` | an ad watched to the end, by where | `level` |
| `sale_show`, `sale_tap`, `sale_yes`, `sale_no` | the sales director showed ways to pay, and the answer | `place`, `featured`, `ways`, `arm`, `took` |
| `ad_bubble_show` | an Ad Bubble floated up | `arm`, `ecpm` |
| `reminder_ask`, `_yes`, `_no`, `_allowed`, `_denied`, `_off` | the reminder question and its answers | `why`, `level` |
| `reminder_open_energy`, `_chest`, `_gift`, `_fair`, `_story`, `_miss` | a reminder was tapped | |
| `rate_ask` | the rating card was asked for | `jobs`, `level` |

Each kind of thing has its own event name, so the Events list answers "how many players got this far" with no
setting up. A detail (such as `level`) shows in reports only once it is added under **Admin → Custom
definitions** in Google Analytics.

### Reminders

With the player's yes, the phone shows a few notices (`Reminders` in `game.js`, the
`@capacitor/local-notifications` plugin). They are set on the phone as the game goes to the background and taken
away as it comes back; no server sends anything.

- **Asking:** the game asks in its own words first, when a reminder would help: out of ⚡ and waiting, a chest of
  20 minutes or more, or a quiet moment on the map after 8 minutes of play. Never during the tutorial or the first
  3 minutes; twice at most, a week apart. The phone's own question comes only after a yes. ⚙️ Settings has the
  switch.
- **What:** ⚡ full (if half the bar or more was empty), a chest open, tomorrow's gift, the Fair opening (Friday
  10:00), the story's cliffhanger after 3 days, "the hens miss you" after 7.
- **Rules:** nothing in the first 15 minutes away, nothing between 21:00 and 9:00, never two within 3 hours, two a
  day at most. After the 7-day one, nothing more until the player comes back.
- They are never set to the minute, so the app doesn't need the phone's "Alarms & reminders" permission (the
  manifest takes it out). The small icon is `ic_stat_farm` (the hen's outline, from `tools/make_status_icon.py`).

### The rating card

After an area or a land is restored, once its popups are gone, the game asks Google Play for its rating card
(`maybeAskRating` in `game.js`, the `@capacitor-community/in-app-review` plugin): not in a player's first 10
minutes, and once in 60 days at most. The game asks no question of its own first (Google's rule). Google decides
whether the card really shows (it limits how often a player sees it, and never shows it in an app installed
outside Play, so try it from a Play test track) and doesn't say what the player did.
