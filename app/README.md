# The Android app

The game packed as an Android app with [Capacitor](https://capacitorjs.com), with real purchases through
Google Play Billing (the `cordova-plugin-purchase` plugin). The website and the app run the same `game.js`:

- **Website:** purchases are test purchases and pay at once; "Watch an ad" buttons give their reward.
- **App:** purchases go through Google Play and pay only once Google approves them; "Watch an ad" buttons are
  hidden until an ad network is added. The phone's back button closes dialogs and steps back.

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
`.github/workflows/build-aab.yml`).

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
players in Europe get the consent form, and link the app to Google Play once it is public.

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
   Purchases are processed by Google Play; the game itself sends nothing to us.
7. **Main store listing**: short and full description, 512×512 icon (`app/store/play-icon-512.png`),
   1024×500 feature graphic (`app/store/feature-graphic-1024x500.png`), phone screenshots
   (`app/store/screenshots/`, in order).
8. When internal testing looks good: **Production → Create new release** (new accounts may first need a
   closed test with testers for 14 days — Play Console says if so).

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
