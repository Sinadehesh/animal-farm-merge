// The sales director: when to offer something to buy or an ad to watch, and
// which one, tuned to each player. game.js asks it at the moments that matter
// (short of 💎, out of ⚡, after a merge, after a job well done) and tells it
// what the player did. It never changes the game itself.
//
// Player first (Hungry Studio, Metacore/Merge Mansion, AppLovin): only rewarded
// ads, only when the player chooses one; nothing unasked during the tutorial or
// the first minutes; a few unasked suggestions a session at most, further apart
// after each "no thanks", and none after three in a row; fewer ads a day for
// players who pay.
//
// Self-tuning: each moment has a few ways to sell (its "arms"). For each player
// a bandit (discounted Thompson sampling) learns which way they say yes to and
// features it more: chance of a yes × what a yes is worth. Every way still gets
// tried now and then, and old answers fade, so it keeps up as the player changes.
// Its starting guesses (`free`, `payer`) are industry rates, to be replaced by
// the game's own once real players have played (or sent from Remote Config).
//
// Segments, worked out on the phone with no permission and nothing sent
// anywhere: the rough country from the time zone (or the language), how strong
// the phone is, and whether the player has paid. They only choose which offer
// comes first and how many ads a day; never the price of anything (prices per
// country are set in Google Play Console).

const MONETIZE = {
    // A game for children (Google Play Families): no segments, no unasked
    // purchase suggestions, and ads asked for as child-directed and non-personalized.
    childDirected: false,
    rules: {
        quietMinutes: 5,          // nothing unasked in a new player's first minutes of play
        backoff: 2,               // each "no thanks" in a row multiplies the wait for the next
        annoyedAfter: 3,          // this many "no thanks" in a row: nothing more unasked this session
        sessionBreakMinutes: 30,  // away this long and coming back is a new session
        pendingMinutes: 10,       // a purchase or ad not finished by then counts as a no
    },
    ads: {
        perDay: { free: 12, payer: 6 }, // rewarded ads a day (Merge Mansion caps them by segment)
        ecpm: { 1: 18, 2: 8, 3: 3 },    // US$ per 1,000 rewarded views by country tier, until the ad network reports its own
        worth: 4,                        // an ad view counts as this many times its pay: players who get what they need keep playing
        gemsMax: 10,                     // an ad can cover a 💎 shortfall up to this many
        // AdMob, in the app. Its app ID (ca-app-pub-1454905177805714~1236207307) is in the Android app's strings.xml.
        rewarded: 'ca-app-pub-1454905177805714/6296962299', // the rewarded ad unit, for every "Watch an ad"
        maxRating: 'Teen',                                   // no ads rated for grown-ups only
    },
    gemWorth: 0.01,               // US$ a 💎 spent is worth to the game (packs sell them at 1-2.5¢)
    // Countries by what ads and purchases earn there. Others are tier 3; unknown is tier 2.
    countries: {
        1: 'US GB CA AU NZ JP KR DE CH AT NO SE DK FI NL BE LU IE IS SG HK TW IL AE QA KW',
        2: 'FR IT ES PT PL CZ SK SI EE LV LT HU GR HR RO BG CY MT SA BH OM CN MY CL UY PR',
    },
    tierBuy: { 1: 1, 2: 0.7, 3: 0.4 },          // a purchase's worth by tier (Play's local prices are lower)
    valueBuy: { high: 1.5, mid: 1, low: 0.5 },   // how likely a yes to a purchase is, by player value
    // The moments, and the ways to sell at each. free/payer: starting guess of a yes.
    // buy: costs real money. Values come from the game (prices, eCPM).
    placements: {
        // Short of 💎 for something (asked: the player tried to spend).
        gemShortfall: { arms: {
            jar: { free: 0.04, payer: 0.20, buy: true },     // the Gem Jar they filled (Candy Crush's piggy bank)
            pack: { free: 0.02, payer: 0.12, buy: true },    // the smallest gem pack that covers it
            pack_up: { free: 0.01, payer: 0.08, buy: true }, // one size up: the higher price point
            ad: { free: 0.50, payer: 0.30 },                 // an ad for the few gems missing
        } },
        // Out of ⚡ (asked: the player tapped a producer).
        energyOut: { arms: {
            ad: { free: 0.50, payer: 0.30 },
            gems: { free: 0.25, payer: 0.40 },
            offer: { free: 0.03, payer: 0.15, buy: true },   // the Energy Bundle or the Special Offer
        } },
        // A merge makes a bubble you pop by watching an ad, when a well-paying ad is ready.
        adBubble: { minEcpm: 12, minutes: 2, cooldownSeconds: 120, perSession: 6, ignoredInARow: 3, arms: {
            rare: { odds: 0.03, free: 0.35, payer: 0.20 },   // the rate is an arm too: fewer bubbles, popped more often?
            often: { odds: 0.08, free: 0.25, payer: 0.12 },
        } },
        // A natural pause (a job done, a level up): one thing they'd likely want.
        nudge: { arms: {
            jar: { free: 0.05, payer: 0.20, buy: true },
            pass: { free: 0.02, payer: 0.15, buy: true },    // golden rewards already reached, waiting to unlock
            basket: { free: 0.02, payer: 0.12, buy: true },
            offer: { free: 0.03, payer: 0.15, buy: true },
        } },
        // How pushy to be with unasked suggestions, learnt per session: a session
        // counts as good if they took something and weren't annoyed.
        pacing: { arms: {
            gentle: { gapSeconds: 360, perSession: 2, free: 0.5, payer: 0.5 },
            normal: { gapSeconds: 180, perSession: 3, free: 0.5, payer: 0.5 },
            eager: { gapSeconds: 90, perSession: 5, free: 0.5, payer: 0.5 },
        } },
    },
    bandit: {
        discount: 0.99,   // old answers fade by this much each time (discounted Thompson sampling)
        passedOver: 0.3,  // a way on show but not featured, passed over, counts as this much of a no
        explore: 0.03,    // now and then feature a way at random, so none is written off for good
        strength: 10,     // the starting guess counts as this many answers
    },
    // Each event, for analytics once there is some, e.g.
    // (name, data) => FirebaseAnalytics.logEvent({ name, params: data })
    onEvent: null,
};

// Time zones of the bigger markets, for the country (no location permission needed).
const COUNTRY_ZONES = {
    US: 'America/New_York America/Chicago America/Denver America/Los_Angeles America/Phoenix America/Anchorage America/Detroit America/Boise America/Indiana/Indianapolis America/Kentucky/Louisville Pacific/Honolulu',
    CA: 'America/Toronto America/Vancouver America/Edmonton America/Winnipeg America/Halifax America/Regina America/St_Johns',
    GB: 'Europe/London', IE: 'Europe/Dublin', DE: 'Europe/Berlin', FR: 'Europe/Paris', ES: 'Europe/Madrid Atlantic/Canary',
    IT: 'Europe/Rome', NL: 'Europe/Amsterdam', BE: 'Europe/Brussels', CH: 'Europe/Zurich', AT: 'Europe/Vienna',
    SE: 'Europe/Stockholm', NO: 'Europe/Oslo', DK: 'Europe/Copenhagen', FI: 'Europe/Helsinki', PL: 'Europe/Warsaw',
    CZ: 'Europe/Prague', PT: 'Europe/Lisbon', GR: 'Europe/Athens', HU: 'Europe/Budapest', RO: 'Europe/Bucharest',
    TR: 'Europe/Istanbul', RU: 'Europe/Moscow', UA: 'Europe/Kiev Europe/Kyiv', JP: 'Asia/Tokyo', KR: 'Asia/Seoul',
    CN: 'Asia/Shanghai', HK: 'Asia/Hong_Kong', TW: 'Asia/Taipei', SG: 'Asia/Singapore', IN: 'Asia/Kolkata Asia/Calcutta',
    ID: 'Asia/Jakarta', PH: 'Asia/Manila', TH: 'Asia/Bangkok', VN: 'Asia/Ho_Chi_Minh Asia/Saigon', MY: 'Asia/Kuala_Lumpur',
    PK: 'Asia/Karachi', BD: 'Asia/Dhaka', AE: 'Asia/Dubai', SA: 'Asia/Riyadh', IR: 'Asia/Tehran', IL: 'Asia/Jerusalem Asia/Tel_Aviv',
    AU: 'Australia/Sydney Australia/Melbourne Australia/Brisbane Australia/Perth Australia/Adelaide Australia/Hobart',
    NZ: 'Pacific/Auckland', BR: 'America/Sao_Paulo', MX: 'America/Mexico_City', AR: 'America/Argentina/Buenos_Aires America/Buenos_Aires',
    CO: 'America/Bogota', PE: 'America/Lima', CL: 'America/Santiago', NG: 'Africa/Lagos', EG: 'Africa/Cairo',
    ZA: 'Africa/Johannesburg', KE: 'Africa/Nairobi',
};

const Sales = (() => {
    const KEY = 'merge-farmstead-sales-v1';
    const params = new URLSearchParams(location.search);
    if (params.has('reset')) { try { localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ } }
    const cfg = MONETIZE;
    const fresh = () => ({ arms: {}, trials: {}, nextId: 1, spent: 0, buys: 0, playedSec: 0, session: null, log: [], model: '' });
    let st = fresh();
    try { st = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { /* a fresh start */ }
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* not saved */ } };
    const api = { random: Math.random, debug: params.has('sales'), state: st };
    const rand = () => api.random();

    // --- Segments ---

    function country() {
        try {
            const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const hit = Object.keys(COUNTRY_ZONES).find(c => COUNTRY_ZONES[c].split(' ').includes(zone));
            if (hit) return hit;
        } catch (e) { /* no time zone */ }
        const lang = (navigator.languages || [navigator.language || '']).find(l => /-[A-Z]{2}$/i.test(l));
        return lang ? lang.slice(-2).toUpperCase() : null;
    }

    // high: a flagship or plenty of memory; low: a budget phone; mid: the rest.
    function deviceClass() {
        const n = navigator, mem = n.deviceMemory, cores = n.hardwareConcurrency || 4;
        const ua = `${n.userAgent || ''} ${st.model || ''}`;
        if (/iPhone|iPad|SM-[SFN]9\d\d|Pixel (?:[6-9]|1\d)|OnePlus ?(?:9|1\d)/i.test(ua)) return 'high';
        if (/SM-A0\d|SM-A1[0-5]|SM-M[0-3]\d|Redmi [0-9A]|itel|TECNO|Infinix|Nokia C/i.test(ua) || mem <= 2 || cores <= 4) return 'low';
        if (mem >= 8 || (mem >= 6 && cores >= 8)) return 'high';
        return 'mid';
    }

    function segment() {
        const payer = st.spent > 0;
        if (cfg.childDirected) return { country: null, tier: 2, device: 'mid', payer, value: 'mid', personal: false };
        const c = country();
        const tier = !c ? 2 : cfg.countries[1].split(' ').includes(c) ? 1 : cfg.countries[2].split(' ').includes(c) ? 2 : 3;
        const device = deviceClass();
        const value = payer || (tier === 1 && device !== 'low') || (tier === 2 && device === 'high') ? 'high'
            : tier === 3 && device === 'low' ? 'low' : 'mid';
        return { country: c, tier, device, payer, value, personal: true };
    }
    api.segment = segment();
    // Chrome hides the phone's model from the user agent; it gives it when asked.
    if (!cfg.childDirected && !st.model && navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
        navigator.userAgentData.getHighEntropyValues(['model']).then(v => {
            st.model = v.model || '';
            api.segment = segment();
            save();
        }).catch(() => {});
    }

    // --- The bandit ---

    function normal() { // Box-Muller
        return Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
    }
    function gamma(k) { // Marsaglia-Tsang
        if (k < 1) return gamma(k + 1) * Math.pow(rand(), 1 / k);
        const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
        for (;;) {
            let x, v;
            do { x = normal(); v = 1 + c * x; } while (v <= 0);
            v = v * v * v;
            const u = rand();
            if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
        }
    }
    const beta = (a, b) => { const x = gamma(a); return x / (x + gamma(b)); };

    const armCfg = (p, arm) => cfg.placements[p].arms[arm];
    function prior(p, arm) {
        const c = armCfg(p, arm), seg = api.segment;
        let rate = seg.payer ? c.payer : c.free;
        if (c.buy) rate *= cfg.valueBuy[seg.value];
        rate = Math.min(0.95, Math.max(0.002, rate));
        return [rate * cfg.bandit.strength, (1 - rate) * cfg.bandit.strength];
    }
    const counts = (p, arm) => ((st.arms[p] || (st.arms[p] = {}))[arm] || (st.arms[p][arm] = [0, 0]));
    function sample(p, arm) {
        const [a, b] = prior(p, arm), [yes, no] = counts(p, arm);
        return beta(a + yes, b + no);
    }
    // A purchase's worth to the game depends on the country (local prices).
    const worth = (p, o) => o.value * (armCfg(p, o.arm).buy ? cfg.tierBuy[api.segment.tier] : 1);

    // Ranks the ways on offer (each { arm, value }) by a draw of chance × worth; the first is featured.
    function choose(p, options) {
        const scored = options.map(o => ({ arm: o.arm, score: sample(p, o.arm) * worth(p, o) })).sort((a, b) => b.score - a.score);
        if (scored.length > 1 && rand() < cfg.bandit.explore) scored.unshift(scored.splice(Math.floor(rand() * scored.length), 1)[0]);
        return scored.map(o => o.arm);
    }

    // Old answers fade a little each time a moment is answered.
    function fade(p) {
        Object.values(st.arms[p] || {}).forEach(c => { c[0] *= cfg.bandit.discount; c[1] *= cfg.bandit.discount; });
    }
    // This arm gets a yes (1) or a no (0), counting `weight` answers.
    function learn(p, arm, yes, weight = 1) {
        const c = counts(p, arm);
        c[0] += yes * weight;
        c[1] += (1 - yes) * weight;
    }

    // --- Events ---

    function track(name, data = {}) {
        st.log.push({ at: Date.now(), event: name, ...data });
        if (st.log.length > 100) st.log.splice(0, st.log.length - 100);
        if (cfg.onEvent) { try { cfg.onEvent(name, data); } catch (e) { /* analytics must never break the game */ } }
    }
    api.track = (name, data) => { track(name, data); save(); };

    // --- Sessions ---

    function newSession() {
        const old = st.session, now = Date.now();
        if (old && old.pacing && old.shown > 0) {
            fade('pacing');
            learn('pacing', old.pacing, old.wins > 0 && old.noStreak < cfg.rules.annoyedAfter ? 1 : 0);
        }
        // Anything left open from before counts as a no (an Ad Bubble still
        // floating answers when it's popped or floats away).
        Object.values(st.trials).forEach(t => { if (t.p !== 'adBubble' || now - t.at > 10 * 60000) settle(t, null); });
        const pacing = choose('pacing', Object.keys(cfg.placements.pacing.arms).map(arm => ({ arm, value: 1 })))[0];
        st.session = { n: ((old && old.n) || 0) + 1, start: now, lastSeen: now, pacing, shown: 0, wins: 0, noStreak: 0, lastAt: 0, bubbles: 0, bubbleAt: 0, ignored: 0 };
        track('session', { n: st.session.n, pacing, ...api.segment });
        save();
    }

    // --- Trials: one showing of a way to sell, until the player answers ---

    function settle(t, arm) {
        delete st.trials[t.id];
        const yes = arm === t.arm;
        fade(t.p);
        learn(t.p, t.arm, yes ? 1 : 0);
        if (arm && !yes) learn(t.p, arm, 1); // they took another way: that one gets the yes
        // The others were on show too, lower down: passing them over is a small no.
        t.order.filter(o => o !== t.arm && o !== arm).forEach(o => learn(t.p, o, 0, cfg.bandit.passedOver));
        const s = st.session;
        if (s && arm) { s.wins++; s.noStreak = 0; }
        if (s && !arm && t.unasked) s.noStreak++;
        if (s && t.p === 'adBubble') s.ignored = arm ? 0 : s.ignored + 1;
        track(arm ? 'sale_yes' : 'sale_no', { place: t.p, featured: t.arm, took: arm || '' });
    }

    function open(p, order, unasked) {
        const t = { id: st.nextId++, p, arm: order[0], order, at: Date.now(), unasked, wait: null, inDialog: false };
        st.trials[t.id] = t;
        track('sale_show', { place: p, featured: t.arm, ways: order.join(' ') });
        save();
        return { id: t.id, featured: t.arm, order };
    }

    // Ranks the ways at a moment the player asked for (short of 💎, out of ⚡).
    api.rank = (p, options) => (options.length ? open(p, choose(p, options), false) : null);

    // May an unasked suggestion show now? Quiet at first, a few a session, spaced
    // out (more after each no), none once they're annoyed.
    api.canSuggest = () => {
        const s = st.session, pace = cfg.placements.pacing.arms[s.pacing];
        if (cfg.childDirected || st.playedSec < cfg.rules.quietMinutes * 60) return false;
        if (s.shown >= pace.perSession || s.noStreak >= cfg.rules.annoyedAfter) return false;
        return Date.now() - s.lastAt >= pace.gapSeconds * 1000 * cfg.rules.backoff ** s.noStreak;
    };

    // An unasked suggestion at a natural pause, or null when it's not the time.
    api.suggest = (p, options) => {
        if (!options.length || !api.canSuggest()) return null;
        st.session.shown++;
        st.session.lastAt = Date.now();
        return open(p, choose(p, options), true);
    };

    // After a merge: an Ad Bubble? Only with ads left, a well-paying ad ready, and
    // not too often; returns its trial (or null).
    api.adBubble = () => {
        const b = cfg.placements.adBubble, s = st.session, now = Date.now();
        if (st.playedSec < cfg.rules.quietMinutes * 60 || !SalesAds.ready()) return null;
        if (s.bubbles >= b.perSession || s.ignored >= b.ignoredInARow || now - s.bubbleAt < b.cooldownSeconds * 1000) return null;
        const ecpm = SalesAds.ecpm();
        if (ecpm < b.minEcpm) return null;
        const arm = choose('adBubble', Object.keys(b.arms).map(a => ({ arm: a, value: b.arms[a].odds * api.adValue(ecpm) })))[0];
        if (rand() >= b.arms[arm].odds) return null;
        s.bubbles++;
        s.bubbleAt = now;
        const t = open('adBubble', [arm], true);
        track('ad_bubble', { arm, ecpm: Math.round(ecpm * 10) / 10 });
        return t;
    };

    // What one ad view is worth to the game, in US$.
    api.adValue = (ecpm = SalesAds.ecpm()) => (ecpm / 1000) * cfg.ads.worth;

    // A popup showing this trial's ways opened.
    api.inDialog = sale => { const t = sale && st.trials[sale.id]; if (t) t.inDialog = true; };

    // They took a way (the featured one when arm is empty): now (waitFor empty),
    // or once its ad is watched ('ad') or its product is paid for (its id).
    api.took = (id, arm, waitFor) => {
        const t = st.trials[id];
        if (!t) return;
        arm = arm || t.arm;
        track('sale_tap', { place: t.p, arm });
        if (!waitFor) settle(t, arm);
        else Object.assign(t, { wait: waitFor, waitArm: arm, at: Date.now(), inDialog: false });
        save();
    };

    // A popup closed: its trials not taken count as a no; so do waits gone stale.
    api.closed = () => {
        const now = Date.now();
        Object.values(st.trials).forEach(t => {
            if (t.inDialog && !t.wait) settle(t, null);
            else if (t.wait && now - t.at > cfg.rules.pendingMinutes * 60000) settle(t, null);
        });
        save();
    };

    api.forget = id => { delete st.trials[id]; save(); };
    // An Ad Bubble floated away unpopped.
    api.gone = id => { const t = st.trials[id]; if (t) { settle(t, null); save(); } };

    // A rewarded ad was watched to the end.
    api.adDone = () => {
        Object.values(st.trials).filter(t => t.wait === 'ad').forEach(t => settle(t, t.waitArm));
        track('ad_watched', { ecpm: Math.round(SalesAds.ecpm() * 10) / 10 });
        save();
    };

    // Google Play approved a payment (or a test purchase on the website).
    api.paid = (productId, usd, test = false) => {
        Object.values(st.trials).filter(t => t.wait === productId).forEach(t => settle(t, t.waitArm));
        st.spent += usd || 0;
        st.buys++;
        if (st.session) st.session.wins++;
        api.segment = segment();
        track('purchase', { product: productId, usd, test });
        save();
    };

    api.adCap = () => cfg.ads.perDay[api.segment.payer ? 'payer' : 'free'];

    // What the director knows and has learnt, for ?sales and the console (Sales.report()).
    api.report = () => {
        const places = {};
        Object.keys(cfg.placements).forEach(p => {
            places[p] = {};
            Object.keys(cfg.placements[p].arms).forEach(arm => {
                const [a, b] = prior(p, arm), [yes, no] = counts(p, arm);
                places[p][arm] = { rate: (a + yes) / (a + b + yes + no), yes: +yes.toFixed(2), answers: +(yes + no).toFixed(2) };
            });
        });
        return { segment: api.segment, adCap: api.adCap(), playedMinutes: Math.round(st.playedSec / 60), spent: st.spent,
            session: st.session, places, log: st.log.slice(-15) };
    };

    // Play time (only while the game is on screen) and sessions.
    newSession();
    setInterval(() => {
        if (document.hidden) return;
        const now = Date.now();
        if (now - st.session.lastSeen > cfg.rules.sessionBreakMinutes * 60000) newSession();
        st.session.lastSeen = now;
        st.playedSec++;
        if (st.playedSec % 15 === 0) save();
    }, 1000);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && Date.now() - st.session.lastSeen > cfg.rules.sessionBreakMinutes * 60000) newSession();
        else save();
    });
    return api;
})();

// The ad network, behind one small surface so AdMob or AppLovin MAX plugs in:
//   ready()  a rewarded ad is loaded and ads are allowed
//   ecpm()   what the loaded ad should pay, US$ per 1,000 views (AdMob tells
//            what an ad paid only after it played: the average of the last few)
//   show(onReward, onDone)  plays it; onReward only once it was watched to the
//            end, onDone when it has closed, either way
//   playing  an ad is on screen (the music waits)
// In the app it is AdMob, after Google's consent form where the law asks for
// one; debug builds (npm run apk) get Google's test ads. On the website a test
// stand-in "plays" at once and pays about the going rate of the player's country.
const SalesAds = (() => {
    const cfg = MONETIZE.ads;
    const going = () => cfg.ecpm[Sales.segment.tier];
    const native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    const AdMob = native && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob;
    const ads = { test: !native, playing: false, privacyOptions: false };

    if (!native) {
        let loaded = null;
        ads.ready = () => true;
        ads.ecpm = () => {
            // A new ad loads about once a minute, some paying more than others.
            if (!loaded || Date.now() - loaded.at > 60000) {
                const spread = Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
                loaded = { at: Date.now(), ecpm: going() * Math.exp(0.5 * spread) };
            }
            return loaded.ecpm;
        };
        ads.show = (onReward, onDone) => {
            loaded = null;
            onReward();
            if (onDone) onDone();
        };
        ads.showPrivacyOptions = () => {};
        return ads;
    }

    let allowed = false, loaded = false, loading = false, wait = 30000;
    let current = null; // { onReward, onDone, rewarded } while one plays
    const paid = [];    // US$ per 1,000 views of the last few ads, from AdMob
    function load() {
        if (!AdMob || !allowed || loaded || loading) return;
        loading = true;
        AdMob.prepareRewardVideoAd({ adId: cfg.rewarded, isTesting: !!window.ADMOB_TEST, npa: MONETIZE.childDirected })
            .then(() => { loaded = true; wait = 30000; })
            .catch(() => { setTimeout(load, wait); wait = Math.min(wait * 2, 15 * 60000); })
            .finally(() => { loading = false; });
    }
    function finish() {
        const ad = current;
        current = null;
        ads.playing = false;
        if (ad && ad.rewarded) ad.onReward();
        if (ad && ad.onDone) ad.onDone();
        load();
    }
    async function start() {
        if (!AdMob) return;
        try {
            let info = await AdMob.requestConsentInfo();
            if (info.isConsentFormAvailable && info.status === 'REQUIRED') info = await AdMob.showConsentForm();
            ads.privacyOptions = info.privacyOptionsRequirementStatus === 'REQUIRED';
            if (!info.canRequestAds) return;
            await AdMob.initialize({ tagForChildDirectedTreatment: MONETIZE.childDirected, maxAdContentRating: cfg.maxRating });
            AdMob.addListener('onRewardedVideoAdReward', () => { if (current) current.rewarded = true; });
            AdMob.addListener('onRewardedVideoAdDismissed', finish);
            AdMob.addListener('onRewardedVideoAdFailedToShow', finish);
            AdMob.addListener('onRewardedVideoAdImpression', v => {
                if (v && v.currencyCode === 'USD' && v.valueMicros > 0) {
                    paid.push(v.valueMicros / 1000); // micros per view -> US$ per 1,000 views
                    if (paid.length > 10) paid.shift();
                }
            });
            allowed = true;
            load();
        } catch (e) { /* no ads this time */ }
    }
    setTimeout(start, 1500);

    ads.ready = () => allowed && loaded;
    ads.ecpm = () => (paid.length ? paid.reduce((a, b) => a + b, 0) / paid.length : going());
    ads.show = (onReward, onDone) => {
        if (!ads.ready() || current) { if (onDone) onDone(); return; }
        loaded = false;
        current = { onReward, onDone, rewarded: false };
        ads.playing = true;
        AdMob.showRewardVideoAd().catch(finish);
    };
    // Where the law asks for it (Europe), players can change their ad choices from ⚙️ Settings.
    ads.showPrivacyOptions = () => { if (AdMob) AdMob.showPrivacyOptionsForm().catch(() => {}); };
    return ads;
})();
