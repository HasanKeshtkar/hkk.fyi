/* AM Modulation — the English and Persian strings, and the small runtime that
   puts them on the page.

   Every translatable node in index.html carries data-i18n="<key>"; the strings
   the figures paint on canvas live under js.* and post.js reads them through
   the global t(). The Persian is written Persian, not a translation of the
   English line by line — same argument and same numbers, sentences rebuilt.

   No build step: this file is the dictionary. */
(function (global) {
  'use strict';

  var LANG_KEY   = 'hkk-lang';
  var SCROLL_KEY = 'hkk-am-scroll';

  var DICT = {
  en: {
    "fig1.n": "FIG 1",
    "fig1.t": "HOW TALL IS THE ANTENNA?",

    "fig2.n": "FIG 2",
    "fig2.t": "THE CARRIER TAKES THE SHAPE OF THE MESSAGE",

    "fig3.n": "FIG 3",
    "fig3.t": "TURN IT UP UNTIL IT BREAKS",

    "fig4.n": "FIG 4",
    "fig4.t": "THE MESSAGE MOVES UP, AND DOUBLES",

    "fig5.n": "FIG 5",
    "fig5.t": "TWO THIRDS OF IT, AT BEST, IS WASTED",

    "fig6.n": "FIG 6",
    "fig6.t": "THREE PARTS, AND ONE NUMBER TO GET RIGHT",

    "fig7.n": "FIG 7",
    "fig7.t": "TURN THE DIAL",

    "foot.copy": "© 2026 Hassan Keshtkar · <span class=\"mono-label\">hkk.fyi</span>",
    "foot.love": "built with love <span class=\"heart\" aria-hidden=\"true\">♥</span> &amp; AI :)))",

    "meta.description": "Amplitude modulation, explained in plain English with seven figures you can drag: why sound cannot be sent as sound, how the carrier takes the shape of the message, sidebands, modulation index, power, and the diode that gets the message back.",
    "meta.og:description": "Why sound cannot be sent as sound — and how amplitude modulation fixes it. Seven live figures, no background needed.",
    "meta.og:image:alt": "AM Modulation — a carrier wave shaped by a message, beside the article title.",
    "meta.og:title": "AM Modulation",
    "meta.title": "AM Modulation — how a message rides on a radio wave · hkk.fyi",

    "nav.contact": "Contact",
    "nav.cv": "CV",
    "nav.lab": "Lab",
    "nav.skip": "Skip to content",
    "nav.writing": "Writing",

    "s1.figcaption1": "The scale is logarithmic, so each mark is ten times the one before it. Drag the slider from the voice tone at the far left up to Wi-Fi at the far right and watch the required antenna shrink from <b>a mountain range to a paperclip</b>. Nothing about the physics changed — only the frequency. This single plot is the first half of the reason modulation exists.",
    "s1.h21": "<span class=\"secnum\">01</span> Why sound cannot be sent as sound",
    "s1.h31": "Problem one: the antenna would not fit anywhere",
    "s1.h32": "Problem two: everybody would be shouting in the same room",
    "s1.lbl1": "wavelength",
    "s1.monolabel1": "FREQUENCY",
    "s1.p1": "Start with what we actually have. A microphone turns sound into a voltage. Speech lives between about <b>300 Hz and 3.4 kHz</b>; music reaches up to about <b>15 kHz</b>. That voltage is the <em>message</em>, and a signal that sits at its natural frequencies like this is called a <strong>baseband</strong> signal.",
    "s1.p2": "The obvious plan is to connect that voltage straight to an antenna and let it radiate. The plan fails twice, for two completely different reasons.",
    "s1.p3": "An antenna only radiates well when its length is a decent fraction of the wavelength of the signal it is fed. The usual target is a quarter of a wavelength. And wavelength comes straight from frequency:",
    "s1.p4": "Low frequency means long wavelength. A 3 kHz voice tone has a wavelength of <b>100 kilometres</b>, so a quarter-wave antenna for it is <b>25 kilometres</b> tall. That is not an engineering challenge, it is a joke. Move the same signal up to 1 MHz and the antenna becomes 75 m — a normal radio mast. Move it to 2.4 GHz and it is 3 cm — a track on a circuit board.",
    "s1.p5": "You can, and phones do it every day, but it is not free. An antenna much shorter than a quarter wavelength has a very small <em>radiation resistance</em> — the part of it that turns power into radio waves. The rest of the power turns into heat in the copper and in the matching network.",
    "s1.p6": "A short antenna also becomes very sensitive to frequency: it works over a narrow band and needs a careful matching circuit to work at all. You can shrink an antenna by a factor of ten with clever design. You cannot shrink it by a factor of ten thousand, which is what sending audio directly would ask of you.",
    "s1.p7": "Suppose the antenna problem vanished. There is still a second wall. Every microphone in the world produces the same range of frequencies — roughly 20 Hz to 20 kHz. If two stations both transmit their audio directly, the two signals arrive on top of each other and add up.",
    "s1.p8": "A filter can only separate signals that are in <em>different</em> places in frequency. Here they are in the same place, so there is nothing to filter on. One transmitter per city, for everyone, forever.",
    "s1.p9": "Both problems have the same answer. <strong>Move the message up to a high frequency, and give every transmitter a different one.</strong> That is what modulation is for.",
    "s1.small1": "c ≈ 3 × 10<sup>8</sup> m/s — the speed of light",
    "s1.summary1": "Can I just build a smaller antenna and accept the loss?",

    "s2.h21": "<span class=\"secnum\">02</span> The carrier, which carries nothing",
    "s2.lbl1": "the carrier",
    "s2.p1": "The high-frequency wave we move the message onto is called the <strong>carrier</strong>. It is a plain sine wave:",
    "s2.p2": "On its own it contains no information at all. Its height never changes, its frequency never changes, its timing never changes. If you look at it on a spectrum analyser you see a single spike and nothing else. Listening to an unmodulated carrier tells you exactly one thing: the transmitter is switched on.",
    "s2.p3": "That is the point. A sine wave has exactly three properties you can change, and a receiver can detect a change in any of them:",
    "s2.p4": "<strong>Modulation</strong> is the act of making one of those properties follow the message. <strong>Demodulation</strong> is the act of reading it back at the far end. This article follows the first row.",
    "s2.pull1": "A carrier carries no information. That is precisely why we can write information onto it.",
    "s2.td1": "Amplitude",
    "s2.td2": "AM",
    "s2.td3": "how tall the wave is",
    "s2.td4": "Frequency",
    "s2.td5": "FM",
    "s2.td6": "how fast it wiggles",
    "s2.td7": "Phase",
    "s2.td8": "PM",
    "s2.td9": "whether it arrives early or late",
    "s2.th1": "Change this",
    "s2.th2": "You get",
    "s2.th3": "What the receiver watches",

    "s3.chk1": "draw the envelope",
    "s3.figcaption1": "Three views of the same instant. <b>Top</b> is the message on its own. <b>Middle</b> is the bare carrier — always the same height. <b>Bottom</b> is the transmitted signal, and the dashed line through its peaks is the top of the message, redrawn. Raise the carrier frequency and the wiggles get denser while the shape stays exactly where it was: the envelope does not care how fast the carrier runs. Switch the message to <b>two tones</b> or <b>pulse</b> and the envelope copies that too.",
    "s3.h21": "<span class=\"secnum\">03</span> What amplitude modulation does",
    "s3.lbl1": "standard AM",
    "s3.monolabel1": "MESSAGE FREQUENCY",
    "s3.monolabel2": "CARRIER FREQUENCY",
    "s3.note1": "<b>A note on the drawings.</b> In a real broadcast the carrier is thousands of times faster than the message — an AM station at 1 MHz carrying a 1 kHz tone runs a ratio of 1000 : 1. Drawn honestly, that is a solid block of ink. Every figure here uses a ratio of a few tens instead, which keeps the shape visible — and keeps the detector's ripple, in the one figure you can listen to, at a frequency a speaker can actually reproduce. The mathematics is identical. <br><br> <b>Three of the figures further down make sound</b> — the modulation index, the detector, and the tuning dial. Nothing plays until you ask for it, and only one plays at a time.",
    "s3.p1": "Call the message x(t), and scale it so it never leaves the range −1 to +1. Amplitude modulation replaces the constant height A<sub>c</sub> with a height that moves:",
    "s3.p2": "Read it in two parts. The right-hand factor is the carrier, untouched: it still swings at f<sub>c</sub>, and it always will. The left-hand bracket is the new amplitude, and it goes up and down with the message.",
    "s3.p3": "Draw a smooth line through the peaks of the result and you get the <strong>envelope</strong>. The envelope is A<sub>c</sub>[1 + m·x(t)] — the message itself, scaled and lifted up so that it never goes negative. <b>The message is not inside the wiggles. It is in the shape they trace.</b>",
    "s3.play": "❙❙ Pause",
    "s3.small1": "m is the modulation index — how deeply the message pushes the height",

    "s4.audiohint1": "what the receiver would play",
    "s4.figcaption1": "The upper plot is the transmitted signal with V<sub>max</sub> and V<sub>min</sub> marked; the lower plot is what a simple receiver recovers by following the envelope. Below m = 1 the two shapes match. Push past m = 1 and watch the lower plot grow <b>sharp notches</b> that were never in the message — that is over-modulation, and it is the most common way an AM transmitter is set up wrong. Note also what happens at m = 0: a perfect, useless carrier. <b>Press Listen</b> and drag the slider: the lower plot is played as sound, so m = 0 is silence, the middle is a clean tone, and everything past m = 1 turns to buzz.",
    "s4.h21": "<span class=\"secnum\">04</span> The modulation index, and how to break it",
    "s4.lbl1": "modulation index, measured",
    "s4.li1": "<b>m &lt; 1</b> — the envelope stays above zero. Everything works. m = 0.5 means the height swings between half and one-and-a-half times the carrier.",
    "s4.li2": "<b>m = 1</b> — full modulation. The envelope just touches zero at its lowest point. This is as loud as standard AM is allowed to go, and it is where the message gets the largest share of the power.",
    "s4.li3": "<b>m &gt; 1</b> — <b>over-modulation.</b> The bracket [1 + m·x(t)] goes negative. The envelope cannot follow it there, so it folds back up and stops being a copy of the message. The receiver hears harsh distortion, and the transmitted signal spreads far outside its channel and interferes with the neighbours.",
    "s4.monolabel1": "MODULATION INDEX m",
    "s4.p1": "The index m sets how deep the swing is. With a single tone the envelope runs between A<sub>c</sub>(1 − m) at its lowest and A<sub>c</sub>(1 + m) at its highest, so you can measure m off a screen without knowing anything else about the transmitter:",
    "s4.p2": "Three cases matter, and only three:",
    "s4.p3": "When [1 + m·x(t)] goes negative, the wave is still there — it is the carrier multiplied by a negative number, which is the same as the carrier turned upside down, or shifted in time by half a cycle. Mathematically nothing is lost: a receiver that also knows the carrier's phase can undo the sign and rebuild the message perfectly.",
    "s4.p4": "But an envelope detector does not know the phase. It only measures how tall the wave is, and height has no sign. So it reports |1 + m·x(t)| and the negative part is folded back up. Over-modulation is not a problem with the signal. It is a problem with the cheap receiver — which is the receiver everybody uses.",
    "s4.summary1": "Why does a negative envelope come back as a phase flip?",

    "s5.figcaption1": "Below is the message where it starts, near zero. Above is the transmitted signal, sitting around a 1 MHz carrier. Drag the message frequency and the two sidebands walk away from the carrier together, always the same distance out on each side, and the bandwidth readout follows at exactly twice. Drag m down to zero and the sidebands vanish while the carrier stands there unchanged — <b>all of the information is in the sidebands, and none of it is in the carrier</b>. Switch to <b>speech band</b> to see what a real message looks like: two mirrored triangles.",
    "s5.h21": "<span class=\"secnum\">05</span> The same signal, seen in frequency",
    "s5.lbl1": "standard AM, term by term",
    "s5.lbl2": "transmission bandwidth",
    "s5.monolabel1": "MESSAGE FREQUENCY",
    "s5.monolabel2": "MODULATION INDEX m",
    "s5.p1": "So far everything has been a picture of voltage against time. The other view — voltage against frequency — is where AM shows what it really did. Take the single-tone case, x(t) = cos(2π f<sub>m</sub> t), and multiply the brackets out:",
    "s5.p2": "Three pure tones, and not one of them is at f<sub>m</sub>. The message frequency itself has disappeared from the transmitted signal. What is left is the carrier, plus one copy of the message sitting just <em>below</em> it and one sitting just <em>above</em> it. Those two copies are the <strong>sidebands</strong>: the lower sideband (LSB) and the upper sideband (USB).",
    "s5.p3": "A real message is not one tone but a whole band, from near zero up to some highest frequency B. Each tone in it produces its own pair, so the result is two mirrored copies of the message spectrum, one on each side of the carrier. The signal now occupies",
    "s5.p4": "This is why an AM broadcast channel is 10 kHz wide while the audio inside it stops at about 5 kHz. You pay for the second copy whether you want it or not.",
    "s5.p5": "The lower sideband sits at f<sub>c</sub> − f<sub>m</sub>. A <em>higher</em> message tone gives a <em>lower</em> frequency there, so as the message spectrum climbs, the lower sideband walks downward. It is the same information read backwards along the frequency axis.",
    "s5.p6": "Both sidebands carry the complete message. That is exactly the redundancy that single-sideband transmission (SSB) throws away: filter one of them off, and you send the same information in half the bandwidth — at the cost of a much more demanding receiver.",
    "s5.pull1": "Modulation does not change the message. It changes where in the spectrum the message lives.",
    "s5.small1": "using cos A · cos B = ½ cos(A − B) + ½ cos(A + B)",
    "s5.small2": "twice the highest frequency in the message",
    "s5.summary1": "Why is the lower sideband mirrored?",

    "s6.figcaption1": "The bar is the total transmitted power, split into the part that carries the message and the part that does not. The curve underneath is efficiency against m, with your setting marked. Push m all the way to 1 and the curve tops out at <b>33.3 %</b> — that is not a limitation of the equipment, it is the arithmetic of standard AM. Everything to the left of that point is worse.",
    "s6.h21": "<span class=\"secnum\">06</span> Where the power goes",
    "s6.lbl1": "total transmitted power",
    "s6.lbl2": "efficiency",
    "s6.monolabel1": "MODULATION INDEX m",
    "s6.monolabel2": "CARRIER POWER",
    "s6.p1": "Now for the price. With a single-tone message, the average power of the AM signal splits into a carrier term and two sideband terms:",
    "s6.p2": "The carrier term does not depend on m at all. It is there when the station is playing music and it is there when nobody is speaking. And we established one section ago that the carrier holds none of the information. So the useful fraction is",
    "s6.p3": "Even at full modulation, a standard AM transmitter puts <b>two thirds of its power into a wave that says nothing</b>. A station running a 50 kW carrier radiates all 50 kW of it whether anyone is speaking or not, and adds at most 25 kW of sidebands on top. In practice speech and music average well below m = 1, so the real figure is worse — often only a few per cent.",
    "s6.p4": "Because the carrier is what makes the envelope a faithful copy of the message. Remove it and you get <b>DSB-SC</b> — double sideband, suppressed carrier — which spends 100 % of its power on information, and whose envelope no longer looks like the message at all. Recovering it needs a receiver that regenerates a carrier locked to the transmitter's phase.",
    "s6.p5": "That is the trade at the heart of AM: the transmitter wastes power so that every receiver can be trivial. One expensive station, millions of cheap radios. For broadcasting, that is the right way round.",
    "s6.small1": "each sideband carries P<sub>c</sub>m²/4 · the carrier carries P<sub>c</sub> no matter what",
    "s6.small2": "at best, with m = 1: η = 1/3",
    "s6.summary1": "Then why send the carrier at all?",

    "s7.audiohint1": "then drag RC while it plays",
    "s7.chk1": "compare with the original message",
    "s7.figcaption1": "The faint wave is what arrives at the antenna; the solid line is the voltage on the capacitor, simulated peak by peak. Drag RC to the far left for <b>ripple</b> — the detector is tracking the carrier instead of the envelope. Drag it to the far right for <b>diagonal clipping</b> — straight sloping cuts where the output could not fall fast enough. The window in between is wide, which is exactly why this circuit has never needed to be clever. <b>Listen</b> plays the same detector with everything scaled into hearing range, keeping RC × f<sub>c</sub> and RC × f<sub>m</sub> exactly as they are on screen — so the ripple you can see becomes a ripple you can hear. <b>Drag RC while it plays:</b> the fast end buzzes, because the output is chasing the carrier; the middle is a clean tone, and the loudest of the three; the slow end goes quiet and harsh.",
    "s7.h21": "<span class=\"secnum\">07</span> Getting the message back",
    "s7.lbl1": "the envelope detector condition",
    "s7.monolabel1": "TIME CONSTANT RC",
    "s7.p1": "Here is the reward for all that wasted power. The message is sitting in the envelope, and measuring an envelope takes three components: a <strong>diode</strong>, a <strong>resistor</strong> and a <strong>capacitor</strong>.",
    "s7.p2": "The diode passes only the positive half of the incoming wave. Each positive peak charges the capacitor up to that peak's height. Between peaks, the capacitor leaks slowly through the resistor. The voltage on the capacitor therefore hops up to each new peak and sags gently in between — which is a copy of the envelope, with some ripple on it.",
    "s7.p3": "Everything depends on the time constant τ = RC, and it is squeezed from both sides:",
    "s7.p4": "If RC is too small, the capacitor discharges between every carrier peak and the output is a rough, rippled version of the wave. If RC is too large, the capacitor cannot fall as fast as the envelope does, and the output cuts the corner in a straight line — a failure with the excellent name <strong>diagonal clipping</strong>. Between the two, it works.",
    "s7.p5": "Notice what is <em>not</em> in that circuit: no power supply, no oscillator, nothing that has to know the transmitter's phase. A diode and two passive parts pull speech out of the air. That is the whole return on the two thirds of the power we threw away in section 6.",
    "s7.small1": "slow enough to ignore the carrier, fast enough to follow the message",

    "s8.audiohint1": "then turn the dial while it plays",
    "s8.figcaption1": "Four stations share the band; each one is a carrier spike with its own two sidebands. The shaded window is your receiver's filter, and the plot underneath is the audio that comes out of the detector. Land on a station and the message is clean. Stop between two and you get almost nothing. Now widen the filter past <b>20 kHz</b> and drive it up the band: the window starts swallowing two stations at once and the recovered audio becomes both of them, mixed — the interference that channel spacing exists to prevent. Watch the <b>hiss</b> while you do it. Cut to one channel the filter is quiet, and everything past that costs you: the receiver's own noise arrives from every frequency at once, so it grows with the width of the window, and past 2B the window stops being empty — it starts collecting the neighbours' skirts and every distant station too weak to resolve, which is mush rather than a signal. The readout counts the two together in decibels against a filter cut to one channel. That is the quieter half of why a receiver's filter is no wider than it has to be: the station is buried in hiss long before a whole neighbour arrives. Each station sends a different note with a different waveform, so <b>press Listen and turn the dial</b>: on a station with the filter at 10 kHz it is clean, and it gets steadily grubbier as you open the window.",
    "s8.h21": "<span class=\"secnum\">08</span> Many stations, one sky",
    "s8.monolabel1": "TUNED TO",
    "s8.monolabel2": "FILTER WIDTH",
    "s8.p1": "Back to the second problem from section 1. Every station is given its own carrier frequency, so every station's pair of sidebands sits in its own slot along the frequency axis. The slots are stacked side by side and nobody overlaps. This arrangement has a name: <strong>frequency-division multiplexing</strong>.",
    "s8.p2": "Your antenna picks up all of them at once and adds them together, which sounds like the same mess as before — except now they <em>are</em> in different places in frequency, so a filter can separate them. Tune a bandpass filter to one slot, throw away everything else, and hand what survives to the envelope detector. That is what the tuning knob on a radio does.",
    "s8.p3": "The slot has to be at least 2B wide, because that is what one station takes. If stations are packed closer than that, their sidebands overlap and you hear both at once — adjacent-channel interference. This is why AM broadcast channels are spaced 10 kHz apart in the Americas (9 kHz in most of the rest of the world) and the audio is filtered to about 5 kHz before it ever reaches the modulator.",

    "s9.btn1": "Read the Smith chart essay",
    "s9.btn2": "Back to the Lab",
    "s9.h21": "<span class=\"secnum\">09</span> What to remember",
    "s9.h31": "More of this sort of thing",
    "s9.h32": "Sources &amp; further reading",
    "s9.li1": "A message at audio frequencies cannot be radiated: the antenna would be kilometres long, and every station would occupy the same band.",
    "s9.li10": "C. A. Balanis, <em>Antenna Theory: Analysis and Design</em>, 4th ed., Wiley — chapter 2, on why an electrically small antenna radiates so poorly.",
    "s9.li2": "Modulation solves both by moving the message up to a high carrier frequency, chosen differently for each transmitter.",
    "s9.li3": "In AM, the message controls the <em>height</em> of the carrier, and the message shape appears as the envelope: s(t) = A<sub>c</sub>[1 + m·x(t)]cos(2πf<sub>c</sub>t).",
    "s9.li4": "The index m must stay at or below 1. Above it, the envelope folds and a simple receiver hears distortion.",
    "s9.li5": "In frequency the result is a carrier and two sidebands, so AM occupies twice the message bandwidth, and at most one third of the power does useful work.",
    "s9.li6": "The payment for that waste is a receiver made of three passive components.",
    "s9.li7": "S. Haykin and M. Moher, <em>Communication Systems</em>, 5th ed., Wiley — chapter 3, amplitude modulation and its variants.",
    "s9.li8": "B. P. Lathi and Z. Ding, <em>Modern Digital and Analog Communication Systems</em>, 4th ed., Oxford — chapter 4, for the envelope-detector conditions.",
    "s9.li9": "L. W. Couch, <em>Digital and Analog Communication Systems</em>, 8th ed., Pearson — power and efficiency of standard AM.",
    "s9.p1": "Six sentences, and they are the whole article:",
    "s9.p2": "Once those are solid, the rest of analogue modulation follows quickly. Suppress the carrier and you have DSB-SC, which is efficient but needs a synchronous receiver. Remove one sideband as well and you have SSB, which halves the bandwidth. Leave the amplitude alone and move the frequency instead and you have <a href='../fm-modulation/'>FM</a>, which is far more resistant to noise — because noise adds itself to amplitude, and FM does not listen to amplitude.",
    "s9.p3": "All of them are the same sentence in different clothing: <em>take a steady wave, and let the message change one thing about it</em>.",
    "s9.p4": "If you want another piece of RF explained from zero with figures you can break, the Smith chart essay next door does the same job for impedance, reflection and matching — and the chart itself runs live in the Lab.",

    "start.copylink": "Copy link",
    "start.figcaption1": "A MESSAGE, RIDING",
    "start.h1": "AM Modulation",
    "start.li10": "<a href=\"#s4\">The modulation index, and how to break it</a>",
    "start.li11": "<a href=\"#s5\">The same signal, seen in frequency</a>",
    "start.li12": "<a href=\"#s6\">Where the power goes</a>",
    "start.li13": "<a href=\"#s7\">Getting the message back</a>",
    "start.li14": "<a href=\"#s8\">Many stations, one sky</a>",
    "start.li15": "<a href=\"#s9\">What to remember</a>",
    "start.li7": "<a href=\"#s1\">Why sound cannot be sent as sound</a>",
    "start.li8": "<a href=\"#s2\">The carrier, which carries nothing</a>",
    "start.li9": "<a href=\"#s3\">What amplitude modulation does</a>",
    "start.monolabel1": "ESSAY · SIGNALS &amp; COMMUNICATION · ~14 MIN · 7 LIVE FIGURES",
    "start.monolabel2": "SHARE",
    "start.monolabel4": "CONTENTS",
    "start.p1": "Modulation puts a low-frequency message onto a high-frequency wave. A microphone's signal swings a few thousand times a second; a radio wave that can cross a city swings a few million. <br><br> This article covers the simplest method: <b>amplitude modulation</b>, where the message sets the height of the carrier. You only need to know what a sine wave is. <b>Every figure below is live</b> — drag it, break it, watch what happens.",
    "start.p2": "<span>HASSAN KESHTKAR</span><span class=\"dot\">·</span><span>TEHRAN</span> <span class=\"dot\">·</span><span>2026</span> <span class=\"dot\">·</span><a class=\"backlink\" href=\"../../\">← back to hkk.fyi</a>",
    "start.sharenative": "Share…",

    "js.f1.am": "AM 1 MHz",
    "js.f1.at": "AT ",
    "js.f1.axis": "LENGTH OF A QUARTER-WAVE ANTENNA →",
    "js.f1.card": "bank card",
    "js.f1.eiffel": "Eiffel Tower",
    "js.f1.everest": "Mount Everest",
    "js.f1.fm": "FM 100 MHz",
    "js.f1.house": "two-storey house",
    "js.f1.music": "MUSIC 15 kHz",
    "js.f1.off": "off the scale →",
    "js.f1.person": "a person",
    "js.f1.ro1": "frequency",
    "js.f1.ro2": "wavelength λ",
    "js.f1.ro3": "antenna λ/4",
    "js.f1.ro4": "vs a 1.7 m person",
    "js.f1.smaller": " × smaller",
    "js.f1.v0": " of antenna, for one tone. This is the problem, in one number.",
    "js.f1.v1": " — taller than any structure ever built. Not a hard problem, an impossible one.",
    "js.f1.v2": "A real broadcast mast. Expensive, but these exist: this is the AM band.",
    "js.f1.v3": "A large but ordinary antenna — a mast on a roof.",
    "js.f1.v4": "A normal rod antenna, the kind on a car or a router.",
    "js.f1.v5": "Small enough to be a copper track on a circuit board.",
    "js.f1.voice": "VOICE 3 kHz",
    "js.f1.wifi": "WI-FI 2.4 GHz",
    "js.f2.car": "THE CARRIER  cos(2π fc·t)",
    "js.f2.carlong": "THE CARRIER  cos(2π fc·t)  — always the same height",
    "js.f2.env": "envelope",
    "js.f2.msg": "THE MESSAGE  x(t)",
    "js.f2.one": "ONE TONE",
    "js.f2.pulse": "PULSE",
    "js.f2.ro1": "message f<sub>m</sub>",
    "js.f2.ro2": "carrier f<sub>c</sub>",
    "js.f2.ro3": "ratio f<sub>c</sub> / f<sub>m</sub>",
    "js.f2.ro4": "index m",
    "js.f2.ro5": "envelope high",
    "js.f2.ro6": "envelope low",
    "js.f2.two": "TWO TONES",
    "js.f2.tx": "TRANSMITTED  s(t)",
    "js.f2.txlong": "TRANSMITTED  s(t) = Ac[1 + m·x(t)]·cos(2π fc·t)",
    "js.f3.bot": "WHAT THE RECEIVER RECOVERS  |1 + m·x(t)|",
    "js.f3.folded": "folded",
    "js.f3.foldlong": "the dashed line went negative — the solid one folded it back up",
    "js.f3.m0": "m = 0",
    "js.f3.m05": "m = 0.5",
    "js.f3.m1": "m = 1  FULL",
    "js.f3.m14": "m = 1.4  BROKEN",
    "js.f3.ro4": "m from the screen",
    "js.f3.ro5": "power in sidebands",
    "js.f3.top": "WHAT IS TRANSMITTED",
    "js.f3.v0": "No modulation at all. A pure carrier: the transmitter is on, and it is saying nothing.",
    "js.f3.v1": "Under-modulated. It works, but most of the power is in the carrier and the message is quiet.",
    "js.f3.v2": "Healthy. The envelope stays above zero, so the recovered shape matches the message exactly.",
    "js.f3.v3": "Over-modulated. The envelope has folded through zero, the recovered shape has kinks that were never sent, and the extra harmonics spill into the neighbouring channels.",
    "js.f4.band": "SPEECH BAND",
    "js.f4.bot": "THE MESSAGE, AT ITS OWN FREQUENCY",
    "js.f4.botlong": "THE MESSAGE — WHERE IT STARTS, NEXT TO ZERO",
    "js.f4.carrier": "carrier",
    "js.f4.copied": "↑ the same shape, copied to both sides of the carrier",
    "js.f4.none": "no sidebands — nothing is being said",
    "js.f4.ro2": "message band B",
    "js.f4.ro3": "lower sideband",
    "js.f4.ro4": "upper sideband",
    "js.f4.ro5": "bandwidth",
    "js.f4.ro6": "each sideband",
    "js.f4.slider1": "MESSAGE FREQUENCY",
    "js.f4.slider2": "HIGHEST FREQUENCY B",
    "js.f4.top": "TRANSMITTED — AROUND 1000 kHz",
    "js.f4.toplong": "TRANSMITTED — AROUND THE CARRIER AT 1000 kHz",
    "js.f5.bar": "TOTAL TRANSMITTED POWER",
    "js.f5.car": "CARRIER",
    "js.f5.carlong": "CARRIER — NO INFORMATION",
    "js.f5.ceil": "33.3 % — the ceiling",
    "js.f5.ceillong": "33.3 % — the ceiling, at m = 1",
    "js.f5.eff": "EFFICIENCY η",
    "js.f5.efflong": "EFFICIENCY η — THE SHARE OF POWER THAT CARRIES THE MESSAGE",
    "js.f5.full": "full scale: the most AM can total, at m = 1",
    "js.f5.ro1": "carrier P<sub>c</sub>",
    "js.f5.ro3": "total P<sub>t</sub>",
    "js.f5.ro4": "useful part",
    "js.f5.ro5": "wasted on carrier",
    "js.f5.ro6": "efficiency η",
    "js.f5.sb": "sidebands ",
    "js.f5.sbmsg": " kW — the message",
    "js.f5.v0": "Nothing but carrier. Full power out of the antenna, zero information in it.",
    "js.f5.v1a": "Quiet modulation: over <b>",
    "js.f5.v1b": " %</b> of the power is doing nothing at all.",
    "js.f5.v2a": "Typical broadcast territory — still <b>",
    "js.f5.v2b": " %</b> of the power in the carrier.",
    "js.f5.v3": "Full modulation — the best standard AM can do. One third useful, two thirds carrier.",
    "js.f6.diode": "diode",
    "js.f6.fast": "TOO FAST",
    "js.f6.in": "AM in",
    "js.f6.legend": "faint line: the AM signal arriving   ·   dashed: the original message",
    "js.f6.ok": "JUST RIGHT",
    "js.f6.out": "the message, out",
    "js.f6.panel": "ON THE CAPACITOR",
    "js.f6.panellong": "VOLTAGE ON THE CAPACITOR",
    "js.f6.ro6": "upper limit",
    "js.f6.ro7": "ripple",
    "js.f6.ro8": "cannot follow",
    "js.f6.slow": "TOO SLOW",
    "js.f6.v0": "Too fast. The capacitor empties between carrier peaks, so the output is chasing the carrier instead of the envelope — that is the ripple.",
    "js.f6.v1": "In the window: slow enough to ignore the carrier, fast enough to follow the message.",
    "js.f6.v2": "Too slow. The capacitor cannot fall as quickly as the envelope does, so the output cuts straight across the corners: diagonal clipping.",
    "js.f6.want_gt": "(want ≫ 1)",
    "js.f6.want_lt": "(want ≪ 1)",
    "js.f7.filter": "THE FILTER",
    "js.f7.hear": "WHAT YOU HEAR",
    "js.f7.ro1": "tuned to",
    "js.f7.ro2": "filter width",
    "js.f7.ro3": "station needs",
    "js.f7.ro4": "noise vs 10 kHz",
    "js.f7.ro5": "you hear",
    "js.f7.ro6": "stations inside",
    "js.f7.v0": "Between stations. The filter is sitting on empty spectrum, so nothing reaches the detector but noise — and the wider you open it, the more of that noise there is.",
    "js.f7.v1a": "Tuned to ",
    "js.f7.v1b": ". One station inside the window, everything else thrown away — this is what a tuning knob is for.",
    "js.f7.v2a": "More than one station inside the window: ",
    "js.f7.v2b": ". Their sidebands all reach the detector and you hear them mixed together. ",
    "js.f7.v2c": "This is why channels are spaced at least 2B apart, and why the filter must not be wider than one channel.",
    "js.f7.wide_a": " The window is <b>",
    "js.f7.wide_b": "×</b> wider than the station needs, so it is also taking in <b>",
    "js.f7.wide_c": " dB</b> more noise than a filter cut to one channel.",
    "js.listen": "LISTEN",
    "js.pause": "❙❙ Pause",
    "js.play": "▶ Play",
    "js.share.copied": "Copied",
    "js.share.copylink": "Copy link",
    "js.share.press": "Press ⌘/Ctrl + C",
    "js.stop": "■ STOP",
  },

  fa: {
    "fig1.n": "شکل ۱",
    "fig1.t": "آنتنش چقدر بلند می‌شود؟",

    "fig2.n": "شکل ۲",
    "fig2.t": "حامل شکلِ پیام را به خودش می‌گیرد",

    "fig3.n": "شکل ۳",
    "fig3.t": "آن‌قدر بالا ببرید تا بشکند",

    "fig4.n": "شکل ۴",
    "fig4.t": "پیام بالا می‌رود، و دو تا می‌شود",

    "fig5.n": "شکل ۵",
    "fig5.t": "دوسومش، در بهترین حالت، هدر می‌رود",

    "fig6.n": "شکل ۶",
    "fig6.t": "سه قطعه، و یک عدد که باید درست باشد",

    "fig7.n": "شکل ۷",
    "fig7.t": "دیال را بچرخانید",

    "foot.copy": "© ۲۰۲۶ حسن کشتکار · <span class=\"mono-label\">hkk.fyi</span>",
    "foot.love": "ساخته‌شده با عشق <span class=\"heart\" aria-hidden=\"true\">♥</span> و هوش مصنوعی :)))",

    "meta.description": "مدولاسیون دامنه به زبان ساده، با هفت شکل که می‌شود دستکاری‌شان کرد: چرا صدا را نمی‌شود به شکل صدا فرستاد، حامل چطور شکل پیام را به خودش می‌گیرد، باندهای کناری از کجا می‌آیند، توان کجا هدر می‌رود، و دیودی که پیام را پس می‌گیرد.",
    "meta.og:description": "چرا صدا را نمی‌شود به شکل صدا فرستاد — و مدولاسیون دامنه چطور حلش می‌کند. هفت شکل زنده، بدون نیاز به پیش‌زمینه.",
    "meta.og:image:alt": "مدولاسیون AM — موج حاملی که پیام شکلش داده، کنار عنوان مقاله.",
    "meta.og:title": "مدولاسیون AM",
    "meta.title": "مدولاسیون AM — پیام چطور سوار موج رادیویی می‌شود · hkk.fyi",

    "nav.contact": "تماس",
    "nav.cv": "رزومه",
    "nav.lab": "آزمایشگاه",
    "nav.skip": "رفتن به متن",
    "nav.writing": "نوشته‌ها",

    "s1.figcaption1": "مقیاس لگاریتمی است، یعنی هر نشانه ده برابر نشانه‌ی قبلی. اسلایدر را از تُن صدا در انتهای چپ تا وای‌فای در انتهای راست بکشید و ببینید آنتنِ لازم از <b>یک رشته‌کوه به یک گیره‌ی کاغذ</b> آب می‌رود. هیچ‌چیزِ فیزیک عوض نشده؛ فقط فرکانس. همین یک نمودار، نیمه‌ی اولِ دلیلِ وجودِ مدولاسیون است.",
    "s1.h21": "<span class=\"secnum\">۰۱</span> چرا صدا را نمی‌شود به شکل صدا فرستاد",
    "s1.h31": "مشکل اول: آنتنش هیچ‌جا جا نمی‌شود",
    "s1.h32": "مشکل دوم: همه در یک اتاق داد می‌زنند",
    "s1.lbl1": "طول موج",
    "s1.monolabel1": "فرکانس",
    "s1.p1": "از چیزی شروع کنیم که واقعاً در دست داریم. میکروفون صدا را به ولتاژ تبدیل می‌کند. گفتار تقریباً بین <b>۳۰۰ هرتز تا ۳٫۴ کیلوهرتز</b> جا می‌گیرد و موسیقی تا حدود <b>۱۵ کیلوهرتز</b> بالا می‌رود. این ولتاژ همان <em>پیام</em> است، و به سیگنالی که مثل این روی فرکانس‌های طبیعی خودش نشسته باشد <strong>باند پایه</strong> می‌گویند.",
    "s1.p2": "کار بدیهی این است که همین ولتاژ را یک‌راست به آنتن بدهیم و بگذاریم تابش کند. این نقشه دو بار شکست می‌خورد، آن هم به دو دلیل که هیچ ربطی به هم ندارند.",
    "s1.p3": "آنتن وقتی خوب تابش می‌کند که طولش کسر قابل‌توجهی از طول موجِ سیگنالی باشد که به آن می‌دهید، و معمولاً یک‌چهارم طول موج را هدف می‌گیرند. طول موج هم مستقیم از فرکانس درمی‌آید:",
    "s1.p4": "فرکانس پایین یعنی طول موج بلند. یک تُن صدای <b>۳ کیلوهرتزی</b> طول موجی برابر <b>۱۰۰ کیلومتر</b> دارد، پس آنتن ربع‌موجش <b>۲۵ کیلومتر</b> ارتفاع می‌خواهد. این دیگر چالش مهندسی نیست، شوخی است. همین سیگنال را ببرید روی <b>۱ مگاهرتز</b>، آنتن می‌شود ۷۵ متر — یک دکل رادیویی معمولی. ببریدش روی <b>۲٫۴ گیگاهرتز</b>، می‌شود ۳ سانتی‌متر — یک خط مسی روی برد مدار.",
    "s1.p5": "می‌شود، و گوشی‌ها هر روز همین کار را می‌کنند، ولی مجانی نیست. آنتنی که خیلی کوتاه‌تر از یک‌چهارم طول موج باشد <em>مقاومت تشعشعیِ</em> بسیار کوچکی دارد — همان بخشی که توان را به موج رادیویی تبدیل می‌کند. بقیه‌ی توان در مس و در مدار تطبیق به گرما تبدیل می‌شود.",
    "s1.p6": "آنتن کوتاه به فرکانس هم خیلی حساس می‌شود: فقط در باند باریکی کار می‌کند و بدون یک مدار تطبیقِ دقیق اصلاً کار نمی‌کند. با طراحی هوشمندانه می‌شود آنتن را ده برابر کوچک کرد؛ نمی‌شود ده‌هزار برابر کوچکش کرد، و فرستادن مستقیم صدا دقیقاً همین را می‌خواهد.",
    "s1.p7": "حالا فرض کنید مشکل آنتن حل شده. هنوز دیوار دومی سر جایش است. هر میکروفونی در دنیا همان محدوده‌ی فرکانسی را تولید می‌کند، تقریباً ۲۰ هرتز تا ۲۰ کیلوهرتز. اگر دو ایستگاه صدایشان را مستقیم بفرستند، دو سیگنال روی هم می‌رسند و با هم جمع می‌شوند.",
    "s1.p8": "فیلتر فقط می‌تواند سیگنال‌هایی را از هم جدا کند که در <em>جاهای متفاوتی</em> از فرکانس باشند. اینجا هر دو در یک جا هستند، پس چیزی برای فیلتر کردن نمی‌ماند. نتیجه: یک فرستنده برای هر شهر، برای همه، تا ابد.",
    "s1.p9": "هر دو مشکل یک جواب دارند. <strong>پیام را ببرید بالا روی یک فرکانس بلند، و به هر فرستنده یکی متفاوت بدهید.</strong> مدولاسیون برای همین است.",
    "s1.small1": "c ≈ 3 × 10<sup>8</sup> m/s — سرعت نور",
    "s1.summary1": "نمی‌شود آنتن کوچک‌تر ساخت و افتش را قبول کرد؟",

    "s2.h21": "<span class=\"secnum\">۰۲</span> حامل، که هیچ‌چیز حمل نمی‌کند",
    "s2.lbl1": "موج حامل",
    "s2.p1": "به موج پرفرکانسی که پیام را رویش می‌بریم <strong>حامل</strong> می‌گویند. خودش یک سینوسیِ ساده است:",
    "s2.p2": "به‌تنهایی هیچ اطلاعاتی در آن نیست. ارتفاعش عوض نمی‌شود، فرکانسش عوض نمی‌شود، زمان‌بندی‌اش هم عوض نمی‌شود. روی تحلیلگر طیف یک خط می‌بینید و بس. گوش دادن به حاملِ مدوله‌نشده دقیقاً یک چیز به شما می‌گوید: فرستنده روشن است.",
    "s2.p3": "و نکته دقیقاً همین است. موج سینوسی سه ویژگی دارد که می‌شود عوضشان کرد، و گیرنده می‌تواند تغییرِ هرکدام را تشخیص بدهد:",
    "s2.p4": "<strong>مدولاسیون</strong> یعنی کاری کنیم یکی از این سه ویژگی از پیام پیروی کند، و <strong>دمدولاسیون</strong> یعنی همان را در آن سرِ خط دوباره بخوانیم. این نوشته سطر اولِ جدول را دنبال می‌کند.",
    "s2.pull1": "حامل هیچ اطلاعاتی حمل نمی‌کند. دقیقاً به همین دلیل می‌شود روی آن اطلاعات نوشت.",
    "s2.td1": "دامنه",
    "s2.td2": "AM",
    "s2.td3": "اینکه موج چقدر بلند است",
    "s2.td4": "فرکانس",
    "s2.td5": "FM",
    "s2.td6": "اینکه چقدر تند می‌لرزد",
    "s2.td7": "فاز",
    "s2.td8": "PM",
    "s2.td9": "اینکه زود می‌رسد یا دیر",
    "s2.th1": "این را عوض کنید",
    "s2.th2": "این به دست می‌آید",
    "s2.th3": "گیرنده این را می‌بیند",

    "s3.chk1": "نمایش پوش",
    "s3.figcaption1": "سه نما از یک لحظه. <b>بالا</b> پیام است به‌تنهایی. <b>وسط</b> حاملِ خالی است — همیشه با یک ارتفاع. <b>پایین</b> سیگنال فرستاده‌شده است، و خط‌چینی که از قله‌هایش رد می‌شود همان بالای پیام است که دوباره کشیده شده. فرکانس حامل را ببرید بالا: لرزش‌ها متراکم‌تر می‌شوند ولی شکل دقیقاً همان‌جا می‌ماند که بود — پوش کاری ندارد که حامل چقدر تند می‌دود. پیام را روی <b>دو تُن</b> یا <b>پالس</b> بگذارید تا ببینید پوش آن‌ها را هم کپی می‌کند.",
    "s3.h21": "<span class=\"secnum\">۰۳</span> مدولاسیون دامنه دقیقاً چه می‌کند",
    "s3.lbl1": "AM استاندارد",
    "s3.monolabel1": "فرکانس پیام",
    "s3.monolabel2": "فرکانس حامل",
    "s3.note1": "<b>یک توضیح درباره‌ی شکل‌ها.</b> در پخش واقعی، حامل هزاران بار تندتر از پیام است — یک ایستگاه AM روی ۱ مگاهرتز که تُن ۱ کیلوهرتزی می‌فرستد، نسبت ۱۰۰۰ به ۱ دارد. اگر صادقانه بکشیمش، یک لکه‌ی توپرِ جوهر می‌شود. اینجا هر شکلی نسبتی در حد چند ده استفاده می‌کند تا شکل موج دیده شود — و در تنها شکلی که می‌شود به آن گوش داد، تا ریپلِ آشکارساز روی فرکانسی بیفتد که بلندگو واقعاً پخشش کند. ریاضیاتش هیچ فرقی نمی‌کند.<br><br><b>سه تا از شکل‌های پایین‌تر صدا دارند</b> — شاخص مدولاسیون، آشکارساز، و دیالِ تنظیم ایستگاه. تا نخواهید چیزی پخش نمی‌شود، و هر بار فقط یکی.",
    "s3.p1": "پیام را x(t) بنامید و طوری مقیاسش کنید که هیچ‌وقت از بازه‌ی −۱ تا +۱ بیرون نزند. مدولاسیون دامنه ارتفاعِ ثابتِ A<sub>c</sub> را با ارتفاعی جایگزین می‌کند که تکان می‌خورد:",
    "s3.p2": "این را دو تکه بخوانید. عاملِ سمت راست همان حامل است، دست‌نخورده: هنوز با f<sub>c</sub> نوسان می‌کند و همیشه هم خواهد کرد. کروشه‌ی سمت چپ دامنه‌ی جدید است، و با پیام بالا و پایین می‌رود.",
    "s3.p3": "حالا خطی نرم از روی قله‌های نتیجه رد کنید تا <strong>پوش</strong> به دست بیاید. پوش برابر است با A<sub>c</sub>[1 + m·x(t)] — یعنی خودِ پیام، مقیاس‌شده و آن‌قدر بالا برده‌شده که هرگز منفی نشود. <b>پیام داخل آن لرزش‌های تند نیست؛ پیام همان شکلی است که لرزش‌ها می‌کشند.</b>",
    "s3.play": "❙❙ مکث",
    "s3.small1": "m شاخص مدولاسیون است — اینکه پیام چقدر عمیق ارتفاع را هل می‌دهد",

    "s4.audiohint1": "همان چیزی که گیرنده پخش می‌کند",
    "s4.figcaption1": "نمودار بالا سیگنال فرستاده‌شده است با V<sub>max</sub> و V<sub>min</sub> علامت‌خورده؛ نمودار پایین چیزی است که یک گیرنده‌ی ساده با دنبال کردن پوش بیرون می‌کشد. زیر m = 1 دو شکل بر هم منطبق‌اند. از m = 1 که رد شوید، ببینید <b>شکاف‌های تیزی</b> در نمودار پایین سبز می‌شود که هرگز در پیام نبودند — این همان فرامدولاسیون است، و رایج‌ترین شکلِ بد تنظیم شدنِ یک فرستنده‌ی AM. به m = 0 هم سر بزنید: یک حاملِ بی‌نقص و بی‌فایده. <b>دکمه‌ی گوش دادن را بزنید</b> و اسلایدر را بکشید: نمودار پایین به صدا تبدیل می‌شود، پس m = 0 سکوت است، وسط یک تُنِ تمیز، و هرچه از m = 1 بگذرید بیشتر به وزوز می‌زند.",
    "s4.h21": "<span class=\"secnum\">۰۴</span> شاخص مدولاسیون، و راه خراب کردنش",
    "s4.lbl1": "شاخص مدولاسیون، اندازه‌گیری‌شده",
    "s4.li1": "<b>m &lt; 1</b> — پوش بالای صفر می‌ماند و همه‌چیز کار می‌کند. m = 0.5 یعنی ارتفاع بین نصف و یک‌ونیم برابرِ حامل نوسان می‌کند.",
    "s4.li2": "<b>m = 1</b> — مدولاسیون کامل. پوش در پایین‌ترین نقطه دقیقاً صفر را لمس می‌کند. این بلندترین حدی است که AM استاندارد اجازه دارد برود، و همان‌جاست که بیشترین سهمِ توان به پیام می‌رسد.",
    "s4.li3": "<b>m &gt; 1</b> — <b>فرامدولاسیون.</b> کروشه‌ی [1 + m·x(t)] منفی می‌شود. پوش نمی‌تواند دنبالش برود، پس تا می‌خورد و برمی‌گردد بالا و دیگر کپیِ پیام نیست. گیرنده اعوجاجِ زننده‌ای می‌شنود، و سیگنال تا بیرونِ کانال خودش پخش می‌شود و مزاحم همسایه‌ها می‌شود.",
    "s4.monolabel1": "شاخص مدولاسیون m",
    "s4.p1": "شاخص m تعیین می‌کند نوسان چقدر عمیق باشد. با یک تُن تنها، پوش در پایین‌ترین نقطه به A<sub>c</sub>(1 − m) و در بالاترین نقطه به A<sub>c</sub>(1 + m) می‌رسد؛ پس می‌شود m را از روی صفحه‌ی نمایش اندازه گرفت، بدون اینکه چیز دیگری از فرستنده بدانید:",
    "s4.p2": "سه حالت مهم‌اند، و فقط همین سه تا:",
    "s4.p3": "وقتی [1 + m·x(t)] منفی می‌شود، موج هنوز سر جایش است — حامل ضربدر یک عدد منفی، که همان حاملِ وارونه است، یا حاملی که نیم دوره جابه‌جا شده. از نظر ریاضی چیزی از دست نرفته: گیرنده‌ای که فاز حامل را هم بداند می‌تواند علامت را برگرداند و پیام را بی‌کم‌وکاست بازسازی کند.",
    "s4.p4": "اما آشکارساز پوش از فاز خبر ندارد. فقط اندازه می‌گیرد که موج چقدر بلند است، و بلندی علامت ندارد. پس |1 + m·x(t)| را گزارش می‌کند و بخش منفی تا می‌خورد و برمی‌گردد بالا. یعنی فرامدولاسیون مشکلِ سیگنال نیست؛ مشکلِ آن گیرنده‌ی ارزان است — همان گیرنده‌ای که دستِ همه است.",
    "s4.summary1": "چرا پوشِ منفی به شکلِ وارونگی فاز برمی‌گردد؟",

    "s5.figcaption1": "پایین، پیام است همان‌جا که شروع می‌شود، نزدیک صفر. بالا، سیگنال فرستاده‌شده است که دور حاملِ ۱ مگاهرتزی نشسته. فرکانس پیام را بکشید تا دو باند کناری با هم از حامل دور شوند، همیشه به یک اندازه از هر طرف، و پهنای باند دقیقاً دو برابرِ آن را دنبال کند. m را تا صفر پایین بیاورید: باندهای کناری محو می‌شوند و حامل دست‌نخورده سر جایش می‌ماند — <b>تمام اطلاعات در باندهای کناری است و هیچ‌کدامش در حامل نیست</b>. روی <b>باند گفتار</b> بروید تا ببینید پیام واقعی چه شکلی است: دو مثلث قرینه.",
    "s5.h21": "<span class=\"secnum\">۰۵</span> همان سیگنال، این‌بار در فرکانس",
    "s5.lbl1": "AM استاندارد، جمله به جمله",
    "s5.lbl2": "پهنای باند ارسال",
    "s5.monolabel1": "فرکانس پیام",
    "s5.monolabel2": "شاخص مدولاسیون m",
    "s5.p1": "تا اینجا هرچه دیدیم تصویرِ ولتاژ بر حسب زمان بود. نمای دیگر — ولتاژ بر حسب فرکانس — جایی است که AM نشان می‌دهد واقعاً چه کرده. حالت تک‌تُن را بردارید، x(t) = cos(2π f<sub>m</sub> t)، و کروشه‌ها را باز کنید:",
    "s5.p2": "سه تُن خالص، و هیچ‌کدامشان روی f<sub>m</sub> نیست. خودِ فرکانس پیام از سیگنال فرستاده‌شده غیب شده. آنچه مانده حامل است، به‌اضافه‌ی یک کپی از پیام کمی <em>پایین‌تر</em> از آن و یک کپی کمی <em>بالاتر</em>. این دو کپی همان <strong>باندهای کناری</strong> هستند: باند کناری پایینی (LSB) و باند کناری بالایی (USB).",
    "s5.p3": "پیام واقعی یک تُن نیست، یک باند کامل است، از نزدیک صفر تا بالاترین فرکانسش که B می‌نامیمش. هر تُنی داخل آن جفتِ خودش را می‌سازد، پس نتیجه دو کپیِ قرینه از طیف پیام است، هر طرفِ حامل یکی. حالا سیگنال این‌قدر جا می‌گیرد:",
    "s5.p4": "به همین دلیل است که یک کانال پخش AM ده کیلوهرتز پهنا دارد در حالی که صدای داخلش حدود پنج کیلوهرتز بیشتر بالا نمی‌رود. پولِ کپی دوم را می‌دهید، چه بخواهید چه نخواهید.",
    "s5.p5": "باند کناری پایینی روی f<sub>c</sub> − f<sub>m</sub> می‌نشیند. تُنِ <em>بالاترِ</em> پیام آنجا فرکانسِ <em>پایین‌تری</em> می‌دهد، پس هرچه طیف پیام بالا می‌رود، باند کناری پایینی رو به پایین راه می‌رود. همان اطلاعات است، فقط روی محور فرکانس برعکس خوانده می‌شود.",
    "s5.p6": "هر دو باند کناری پیام کامل را دارند. ارسال تک‌باند کناری (SSB) دقیقاً همین افزونگی را دور می‌ریزد: یکی‌شان را فیلتر کنید و همان اطلاعات را با نصف پهنای باند بفرستید — به قیمتِ گیرنده‌ای به‌مراتب سختگیرتر.",
    "s5.pull1": "مدولاسیون پیام را عوض نمی‌کند. جایی را که پیام در طیف زندگی می‌کند عوض می‌کند.",
    "s5.small1": "با استفاده از cos A · cos B = ½ cos(A − B) + ½ cos(A + B)",
    "s5.small2": "دو برابر بالاترین فرکانس پیام",
    "s5.summary1": "چرا باند کناری پایینی قرینه است؟",

    "s6.figcaption1": "نوار، توان کل فرستاده‌شده است، تقسیم‌شده به بخشی که پیام را حمل می‌کند و بخشی که نمی‌کند. منحنیِ زیرش بازده بر حسب m است، با تنظیم فعلی شما علامت‌خورده. m را تا انتها ببرید روی ۱ تا منحنی روی <b>۳۳٫۳٪</b> سقف بزند — این محدودیتِ تجهیزات نیست، حساب‌وکتابِ خودِ AM استاندارد است. هر جای دیگری سمت چپِ آن نقطه، بدتر است.",
    "s6.h21": "<span class=\"secnum\">۰۶</span> توان کجا می‌رود",
    "s6.lbl1": "توان کل فرستاده‌شده",
    "s6.lbl2": "بازده",
    "s6.monolabel1": "شاخص مدولاسیون m",
    "s6.monolabel2": "توان حامل",
    "s6.p1": "حالا نوبت قیمتش است. با پیام تک‌تُن، توان متوسطِ سیگنال AM به یک جمله‌ی حامل و دو جمله‌ی باند کناری تقسیم می‌شود:",
    "s6.p2": "جمله‌ی حامل اصلاً به m وابسته نیست. وقتی ایستگاه موسیقی پخش می‌کند آنجاست، و وقتی هیچ‌کس حرف نمی‌زند هم آنجاست. و یک بخش قبل‌تر دیدیم که حامل هیچ اطلاعاتی ندارد. پس سهمِ مفید این است:",
    "s6.p3": "حتی در مدولاسیون کامل هم، یک فرستنده‌ی AM استاندارد <b>دوسوم توانش را خرج موجی می‌کند که هیچ نمی‌گوید</b>. ایستگاهی که حاملش ۵۰ کیلووات است، همان ۵۰ کیلووات را تابش می‌کند — چه کسی حرف بزند چه نزند — و حداکثر ۲۵ کیلووات باند کناری رویش می‌گذارد. در عمل هم گفتار و موسیقی به‌طور متوسط خیلی پایین‌تر از m = 1 کار می‌کنند، پس عدد واقعی بدتر است — اغلب فقط چند درصد.",
    "s6.p4": "چون حامل همان چیزی است که پوش را به کپیِ وفادارِ پیام تبدیل می‌کند. برش دارید تا به <b>DSB-SC</b> برسید — دوباند کناری با حاملِ سرکوب‌شده — که صد در صدِ توانش خرج اطلاعات می‌شود، ولی پوشش دیگر هیچ شباهتی به پیام ندارد. بازیابی‌اش گیرنده‌ای می‌خواهد که حاملی هم‌فاز با فرستنده بسازد.",
    "s6.p5": "معامله‌ی اصلی AM همین است: فرستنده توان هدر می‌دهد تا هر گیرنده‌ای بتواند ساده و بی‌اهمیت باشد. یک ایستگاهِ گران، میلیون‌ها رادیوی ارزان. برای پخش همگانی، همین طرفِ درستِ معامله است.",
    "s6.small1": "هر باند کناری P<sub>c</sub>m²/4 می‌برد · حامل هرچه باشد P<sub>c</sub> را می‌برد",
    "s6.small2": "در بهترین حالت، با m = 1: η = 1/3",
    "s6.summary1": "پس اصلاً چرا حامل را می‌فرستیم؟",

    "s7.audiohint1": "بعد، همین‌طور که پخش می‌شود، RC را بکشید",
    "s7.chk1": "مقایسه با پیام اصلی",
    "s7.figcaption1": "موج کم‌رنگ چیزی است که به آنتن می‌رسد؛ خط پررنگ ولتاژ روی خازن است که قله به قله شبیه‌سازی شده. RC را تا انتهای چپ بکشید تا <b>ریپل</b> را ببینید — آشکارساز دارد به‌جای پوش، حامل را دنبال می‌کند. تا انتهای راست بکشید تا <b>بریدگی مورب</b> را ببینید — برش‌های شیب‌دار و صاف، جایی که خروجی به‌قدر کافی تند نتوانسته پایین بیاید. پنجره‌ی بین این دو پهن است، و دقیقاً به همین دلیل این مدار هیچ‌وقت لازم نشده باهوش باشد. <b>دکمه‌ی گوش دادن</b> همین آشکارساز را با همه‌چیزِ مقیاس‌شده به محدوده‌ی شنوایی پخش می‌کند و RC × f<sub>c</sub> و RC × f<sub>m</sub> را دقیقاً همان‌طور که روی صفحه هستند نگه می‌دارد — پس ریپلی که می‌بینید همان ریپلی است که می‌شنوید. <b>همین‌طور که پخش می‌شود RC را بکشید:</b> انتهای تند وزوز می‌کند، چون خروجی دارد حامل را دنبال می‌کند؛ وسط یک تُنِ تمیز است و بلندترین حالت از هر سه؛ انتهای کند آرام و خشن می‌شود.",
    "s7.h21": "<span class=\"secnum\">۰۷</span> پس گرفتن پیام",
    "s7.lbl1": "شرط آشکارساز پوش",
    "s7.monolabel1": "ثابت زمانی RC",
    "s7.p1": "و این پاداشِ تمام آن توانِ هدررفته است. پیام داخل پوش نشسته، و اندازه گرفتنِ یک پوش سه قطعه لازم دارد: یک <strong>دیود</strong>، یک <strong>مقاومت</strong> و یک <strong>خازن</strong>.",
    "s7.p2": "دیود فقط نیمه‌ی مثبتِ موج ورودی را رد می‌کند. هر قله‌ی مثبت خازن را تا ارتفاع همان قله شارژ می‌کند، و بین دو قله خازن آرام‌آرام از مقاومت تخلیه می‌شود. پس ولتاژ خازن با هر قله‌ی تازه بالا می‌پرد و در فاصله‌ی بینشان کمی می‌افتد — یعنی کپی‌ای از پوش، با کمی موج‌دار بودن رویش.",
    "s7.p3": "همه‌چیز به ثابت زمانی τ = RC بند است، و این ثابت از دو طرف تحت فشار است:",
    "s7.p4": "اگر RC خیلی کوچک باشد، خازن بین هر دو قله‌ی حامل خالی می‌شود و خروجی نسخه‌ای زبر و موج‌دار از موج درمی‌آید. اگر RC خیلی بزرگ باشد، خازن نمی‌تواند به تندیِ پوش پایین بیاید و خروجی گوشه را با یک خط راست می‌برد — خرابی‌ای که اسم خوبی هم دارد: <strong>بریدگی مورب</strong>. بین این دو، کار می‌کند.",
    "s7.p5": "به چیزی که در آن مدار <em>نیست</em> دقت کنید: نه منبع تغذیه، نه نوسان‌ساز، نه هیچ چیزی که لازم باشد فاز فرستنده را بداند. یک دیود و دو قطعه‌ی غیرفعال، گفتار را از هوا بیرون می‌کشند. این تمام چیزی است که آن دوسومِ توانِ دورریخته‌شده‌ی بخش ۶ برایتان می‌خرد.",
    "s7.small1": "آن‌قدر کند که حامل را نبیند، آن‌قدر تند که پیام را از دست ندهد",

    "s8.audiohint1": "بعد، همین‌طور که پخش می‌شود، دیال را بچرخانید",
    "s8.figcaption1": "چهار ایستگاه در یک باند شریک‌اند؛ هرکدام یک خطِ حامل با دو باند کناریِ خودش. پنجره‌ی سایه‌دار فیلترِ گیرنده‌ی شماست، و نمودار زیرش صدایی است که از آشکارساز بیرون می‌آید. روی یک ایستگاه بنشینید تا پیام تمیز باشد. بین دو تا بایستید تا تقریباً هیچ نگیرید. حالا فیلتر را از <b>۲۰ کیلوهرتز</b> پهن‌تر کنید و در باند بالا بروید: پنجره دو ایستگاه را با هم می‌بلعد و صدای بازیابی‌شده مخلوطِ هر دو می‌شود — همان تداخلی که فاصله‌گذاریِ کانال‌ها برای جلوگیری از آن وجود دارد. همین‌طور که این کار را می‌کنید حواستان به <b>خش‌خش</b> هم باشد. وقتی فیلتر به اندازه‌ی یک کانال بریده شده باشد ساکت است، و هرچه از آن پهن‌تر شود برایتان خرج دارد: نویزِ خودِ گیرنده از همه‌ی فرکانس‌ها با هم می‌آید، پس با پهنای پنجره بزرگ می‌شود؛ و از 2B که بگذرید پنجره دیگر خالی نیست — دامنه‌ی ایستگاه‌های همسایه و هر ایستگاه دوردستی که ضعیف‌تر از آن است که تفکیک شود وارد می‌شود، که سیگنال نیست، شلوغی است. سطرِ خوانش هر دو را با هم حساب می‌کند و بر حسب دسی‌بل، نسبت به فیلتری به پهنای یک کانال، نشان می‌دهد. این همان نیمه‌ی ساکت‌ترِ دلیلی است که فیلتر گیرنده از آنچه لازم است پهن‌تر نمی‌شود: ایستگاه خیلی پیش از آنکه یک همسایه‌ی کامل وارد شود، زیر خش‌خش دفن می‌شود. هر ایستگاه نُتی متفاوت با شکل موجی متفاوت می‌فرستد، پس <b>دکمه‌ی گوش دادن را بزنید و دیال را بچرخانید</b>: روی یک ایستگاه با فیلترِ ۱۰ کیلوهرتزی صدا تمیز است، و هرچه پنجره را بازتر کنید کدرتر می‌شود.",
    "s8.h21": "<span class=\"secnum\">۰۸</span> ایستگاه‌های زیاد، یک آسمان",
    "s8.monolabel1": "تنظیم روی",
    "s8.monolabel2": "پهنای فیلتر",
    "s8.p1": "برگردیم به مشکل دومِ بخش ۱. به هر ایستگاه فرکانس حاملِ خودش را می‌دهند، پس جفتِ باندهای کناریِ هر ایستگاه در شکافِ مخصوص خودش روی محور فرکانس می‌نشیند. شکاف‌ها کنار هم چیده می‌شوند و هیچ‌کدام روی دیگری نمی‌افتد. این چیدمان اسم دارد: <strong>مالتی‌پلکس تقسیم فرکانسی</strong>.",
    "s8.p2": "آنتن شما همه‌شان را با هم می‌گیرد و جمعشان می‌کند، که ظاهراً همان آشفتگیِ قبلی است — با یک تفاوت: حالا واقعاً در <em>جاهای متفاوتی</em> از فرکانس‌اند، پس فیلتر می‌تواند جدایشان کند. یک فیلتر میان‌گذر را روی یک شکاف تنظیم کنید، بقیه را دور بریزید، و آنچه باقی می‌ماند را به آشکارساز پوش بدهید. کاری که پیچ تنظیمِ رادیو می‌کند دقیقاً همین است.",
    "s8.p3": "پهنای هر شکاف باید دست‌کم 2B باشد، چون یک ایستگاه همین‌قدر جا می‌گیرد. اگر ایستگاه‌ها نزدیک‌تر از این چیده شوند، باندهای کناری‌شان روی هم می‌افتد و هر دو را با هم می‌شنوید — همان تداخل کانال مجاور. برای همین است که کانال‌های پخش AM در قاره‌ی آمریکا ده کیلوهرتز از هم فاصله دارند (و در بیشتر جاهای دیگر دنیا نه کیلوهرتز) و صدا پیش از رسیدن به مدولاتور تا حدود پنج کیلوهرتز فیلتر می‌شود.",

    "s9.btn1": "مقاله‌ی نمودار اسمیت را بخوانید",
    "s9.btn2": "بازگشت به آزمایشگاه",
    "s9.h21": "<span class=\"secnum\">۰۹</span> چه چیزی یادتان بماند",
    "s9.h31": "بیشتر از این جنس",
    "s9.h32": "منابع و خواندن بیشتر",
    "s9.li1": "پیامی که در فرکانس‌های صوتی است تابش نمی‌شود: آنتنش کیلومترها طول می‌خواهد و همه‌ی ایستگاه‌ها هم یک باند را اشغال می‌کنند.",
    "s9.li10": "C. A. Balanis, <em>Antenna Theory: Analysis and Design</em>, 4th ed., Wiley — فصل ۲، درباره‌ی اینکه چرا آنتن کوچک این‌قدر بد تابش می‌کند.",
    "s9.li2": "مدولاسیون هر دو را با یک کار حل می‌کند — پیام را می‌برد بالا روی فرکانس حامل، و برای هر فرستنده حاملِ متفاوتی انتخاب می‌کند.",
    "s9.li3": "در AM پیام <em>ارتفاعِ</em> حامل را کنترل می‌کند و شکل پیام به‌صورت پوش ظاهر می‌شود: s(t) = A<sub>c</sub>[1 + m·x(t)]cos(2πf<sub>c</sub>t).",
    "s9.li4": "شاخص m باید یک یا کمتر بماند. بالاتر از آن پوش تا می‌خورد و گیرنده‌ی ساده اعوجاج می‌شنود.",
    "s9.li5": "در فرکانس، نتیجه یک حامل است و دو باند کناری، پس AM دو برابرِ پهنای باند پیام جا می‌گیرد و حداکثر یک‌سومِ توان کار مفید می‌کند.",
    "s9.li6": "بهای این هدررفت، گیرنده‌ای است ساخته‌شده از سه قطعه‌ی غیرفعال.",
    "s9.li7": "S. Haykin and M. Moher, <em>Communication Systems</em>, 5th ed., Wiley — فصل ۳، مدولاسیون دامنه و گونه‌هایش.",
    "s9.li8": "B. P. Lathi and Z. Ding, <em>Modern Digital and Analog Communication Systems</em>, 4th ed., Oxford — فصل ۴، برای شرط‌های آشکارساز پوش.",
    "s9.li9": "L. W. Couch, <em>Digital and Analog Communication Systems</em>, 8th ed., Pearson — توان و بازده AM استاندارد.",
    "s9.p1": "شش جمله، و همین‌ها کل مقاله است:",
    "s9.p2": "وقتی این‌ها جا افتاد، بقیه‌ی مدولاسیون آنالوگ سریع پشت سرش می‌آید. حامل را سرکوب کنید تا به DSB-SC برسید که بهینه است ولی گیرنده‌ی همزمان می‌خواهد. یک باند کناری را هم بردارید تا به SSB برسید که پهنای باند را نصف می‌کند. دامنه را رها کنید و به‌جایش فرکانس را تکان بدهید تا به <a href='../fm-modulation/'>FM</a> برسید که در برابر نویز به‌مراتب مقاوم‌تر است — چون نویز خودش را به دامنه اضافه می‌کند، و FM به دامنه گوش نمی‌دهد.",
    "s9.p3": "همه‌شان یک جمله‌اند با لباس‌های متفاوت: <em>یک موج یکنواخت بردارید، و بگذارید پیام یک چیزش را عوض کند</em>.",
    "s9.p4": "اگر یک تکه‌ی دیگر از RF می‌خواهید که از صفر و با شکل‌هایی که می‌شود خرابشان کرد توضیح داده شده باشد، مقاله‌ی نمودار اسمیت همین کار را برای امپدانس، بازتاب و تطبیق می‌کند — و خود نمودار هم زنده در آزمایشگاه اجرا می‌شود.",

    "start.copylink": "کپی لینک",
    "start.figcaption1": "یک پیام، سوار بر موج",
    "start.h1": "مدولاسیون AM",
    "start.li10": "<a href=\"#s4\">شاخص مدولاسیون، و راه خراب کردنش</a>",
    "start.li11": "<a href=\"#s5\">همان سیگنال، این‌بار در فرکانس</a>",
    "start.li12": "<a href=\"#s6\">توان کجا می‌رود</a>",
    "start.li13": "<a href=\"#s7\">پس گرفتن پیام</a>",
    "start.li14": "<a href=\"#s8\">ایستگاه‌های زیاد، یک آسمان</a>",
    "start.li15": "<a href=\"#s9\">چه چیزی یادتان بماند</a>",
    "start.li7": "<a href=\"#s1\">چرا صدا را نمی‌شود به شکل صدا فرستاد</a>",
    "start.li8": "<a href=\"#s2\">حامل، که هیچ‌چیز حمل نمی‌کند</a>",
    "start.li9": "<a href=\"#s3\">مدولاسیون دامنه دقیقاً چه می‌کند</a>",
    "start.monolabel1": "مقاله · سیگنال و مخابرات · حدود ۱۴ دقیقه · ۷ شکل زنده",
    "start.monolabel2": "هم‌رسانی",
    "start.monolabel4": "فهرست",
    "start.p1": "مدولاسیون یعنی سوار کردنِ یک پیامِ کم‌فرکانس روی یک موجِ پرفرکانس. سیگنال میکروفون چند هزار بار در ثانیه نوسان می‌کند؛ موجی که می‌تواند از یک شهر عبور کند، چند میلیون بار.<br><br>این نوشته ساده‌ترین روشِ آن را توضیح می‌دهد: <b>مدولاسیون دامنه</b>، که در آن پیام ارتفاعِ حامل را تعیین می‌کند. فقط کافی است بدانید موج سینوسی چیست. <b>هر شکلی که پایین‌تر می‌بینید زنده است</b> — بکشیدش، خرابش کنید، ببینید چه می‌شود.",
    "start.p2": "<span>حسن کشتکار</span><span class=\"dot\">·</span><span>تهران</span> <span class=\"dot\">·</span><span>۲۰۲۶</span> <span class=\"dot\">·</span><a class=\"backlink\" href=\"../../\">→ بازگشت به hkk.fyi</a>",
    "start.sharenative": "هم‌رسانی…",

    "js.f1.am": "AM ۱ MHz",
    "js.f1.at": "روی ",
    "js.f1.axis": "← طول آنتن ربع‌موج",
    "js.f1.card": "کارت بانکی",
    "js.f1.eiffel": "برج ایفل",
    "js.f1.everest": "قله‌ی اورست",
    "js.f1.fm": "FM ۱۰۰ MHz",
    "js.f1.house": "خانه‌ی دوطبقه",
    "js.f1.music": "موسیقی ۱۵ kHz",
    "js.f1.off": "← بیرون از مقیاس",
    "js.f1.person": "یک آدم",
    "js.f1.ro1": "فرکانس",
    "js.f1.ro2": "طول موج λ",
    "js.f1.ro3": "آنتن λ/4",
    "js.f1.ro4": "برابرِ یک آدم ۱٫۷ متری",
    "js.f1.smaller": " برابر کوچک‌تر",
    "js.f1.v0": " آنتن، برای یک تُن صدا. مسئله همین است، در یک عدد.",
    "js.f1.v1": " — بلندتر از هر سازه‌ای که تا حالا ساخته شده. این مسئله‌ی سخت نیست، ناممکن است.",
    "js.f1.v2": "یک دکل پخش واقعی. گران، ولی وجود دارند: این همان باند AM است.",
    "js.f1.v3": "آنتنی بزرگ ولی معمولی — یک دکل روی پشت‌بام.",
    "js.f1.v4": "یک آنتن میله‌ای معمولی، از همان‌ها که روی ماشین یا مودم است.",
    "js.f1.v5": "آن‌قدر کوچک که یک خط مسی روی برد مدار باشد.",
    "js.f1.voice": "صدا ۳ kHz",
    "js.f1.wifi": "وای‌فای ۲٫۴ GHz",
    "js.f2.car": "حامل  ⁦cos(2π fc·t)⁩",
    "js.f2.carlong": "حامل  ⁦cos(2π fc·t)⁩  — همیشه با یک ارتفاع",
    "js.f2.env": "پوش",
    "js.f2.msg": "پیام  ⁦x(t)⁩",
    "js.f2.one": "یک تُن",
    "js.f2.pulse": "پالس",
    "js.f2.ro1": "پیام f<sub>m</sub>",
    "js.f2.ro2": "حامل f<sub>c</sub>",
    "js.f2.ro3": "نسبت f<sub>c</sub> / f<sub>m</sub>",
    "js.f2.ro4": "شاخص m",
    "js.f2.ro5": "بیشینه‌ی پوش",
    "js.f2.ro6": "کمینه‌ی پوش",
    "js.f2.two": "دو تُن",
    "js.f2.tx": "فرستاده‌شده  ⁦s(t)⁩",
    "js.f2.txlong": "فرستاده‌شده  ⁦s(t) = Ac[1 + m·x(t)]·cos(2π fc·t)⁩",
    "js.f3.bot": "آنچه گیرنده بیرون می‌کشد  ⁦|1 + m·x(t)|⁩",
    "js.f3.folded": "تا خورد",
    "js.f3.foldlong": "خط‌چین منفی شد — خط پررنگ تایش کرد و برگرداند بالا",
    "js.f3.m0": "m = 0",
    "js.f3.m05": "m = 0.5",
    "js.f3.m1": "m = 1  کامل",
    "js.f3.m14": "m = 1.4  خراب",
    "js.f3.ro4": "m از روی صفحه",
    "js.f3.ro5": "توان در باندهای کناری",
    "js.f3.top": "آنچه فرستاده می‌شود",
    "js.f3.v0": "اصلاً مدولاسیونی در کار نیست. حاملِ خالص: فرستنده روشن است و هیچ نمی‌گوید.",
    "js.f3.v1": "کم‌مدوله. کار می‌کند، ولی بیشتر توان در حامل است و پیام کم‌جان.",
    "js.f3.v2": "سالم. پوش بالای صفر می‌ماند، پس شکل بازیابی‌شده دقیقاً همان پیام است.",
    "js.f3.v3": "فرامدوله. پوش از صفر رد شده و تا خورده، شکل بازیابی‌شده شکستگی‌هایی دارد که هرگز فرستاده نشدند، و هارمونیک‌های اضافه به کانال‌های همسایه سرریز می‌کنند.",
    "js.f4.band": "باند گفتار",
    "js.f4.bot": "پیام، روی فرکانس خودش",
    "js.f4.botlong": "پیام — همان‌جا که شروع می‌شود، نزدیک صفر",
    "js.f4.carrier": "حامل",
    "js.f4.copied": "↑ همان شکل، کپی‌شده در دو طرف حامل",
    "js.f4.none": "باند کناری‌ای نیست — چیزی گفته نمی‌شود",
    "js.f4.ro2": "باند پیام B",
    "js.f4.ro3": "باند کناری پایینی",
    "js.f4.ro4": "باند کناری بالایی",
    "js.f4.ro5": "پهنای باند",
    "js.f4.ro6": "هر باند کناری",
    "js.f4.slider1": "فرکانس پیام",
    "js.f4.slider2": "بالاترین فرکانس B",
    "js.f4.top": "فرستاده‌شده — حوالی ۱۰۰۰ kHz",
    "js.f4.toplong": "فرستاده‌شده — حوالی حاملِ ۱۰۰۰ kHz",
    "js.f5.bar": "توان کل فرستاده‌شده",
    "js.f5.car": "حامل",
    "js.f5.carlong": "حامل — بدون اطلاعات",
    "js.f5.ceil": "۳۳٫۳٪ — سقف",
    "js.f5.ceillong": "۳۳٫۳٪ — سقف، در m = 1",
    "js.f5.eff": "بازده η",
    "js.f5.efflong": "بازده η — سهمی از توان که پیام را حمل می‌کند",
    "js.f5.full": "کل مقیاس: بیشترین توانی که AM می‌تواند بدهد، در m = 1",
    "js.f5.ro1": "حامل P<sub>c</sub>",
    "js.f5.ro3": "کل P<sub>t</sub>",
    "js.f5.ro4": "بخش مفید",
    "js.f5.ro5": "هدررفته در حامل",
    "js.f5.ro6": "بازده η",
    "js.f5.sb": "باندهای کناری ",
    "js.f5.sbmsg": " kW — پیام",
    "js.f5.v0": "چیزی جز حامل نیست. توان کامل از آنتن بیرون می‌رود، بدون ذره‌ای اطلاعات.",
    "js.f5.v1a": "مدولاسیون کم‌جان: بیش از <b>",
    "js.f5.v1b": "٪</b> توان هیچ کاری نمی‌کند.",
    "js.f5.v2a": "قلمرو پخش معمولی — هنوز <b>",
    "js.f5.v2b": "٪</b> توان در حامل است.",
    "js.f5.v3": "مدولاسیون کامل — بهترین کاری که AM استاندارد می‌تواند بکند. یک‌سوم مفید، دوسوم حامل.",
    "js.f6.diode": "دیود",
    "js.f6.fast": "خیلی تند",
    "js.f6.in": "ورودی AM",
    "js.f6.legend": "خط کم‌رنگ: سیگنال AM که می‌رسد   ·   خط‌چین: پیام اصلی",
    "js.f6.ok": "درست",
    "js.f6.out": "پیام، خروجی",
    "js.f6.panel": "روی خازن",
    "js.f6.panellong": "ولتاژ روی خازن",
    "js.f6.ro6": "حد بالا",
    "js.f6.ro7": "ریپل",
    "js.f6.ro8": "جا می‌ماند",
    "js.f6.slow": "خیلی کند",
    "js.f6.v0": "خیلی تند. خازن بین دو قله‌ی حامل خالی می‌شود، پس خروجی به‌جای پوش دارد حامل را دنبال می‌کند — همان ریپل.",
    "js.f6.v1": "داخل پنجره: آن‌قدر کند که حامل را نبیند، آن‌قدر تند که پیام را دنبال کند.",
    "js.f6.v2": "خیلی کند. خازن نمی‌تواند به تندی پوش پایین بیاید، پس خروجی گوشه‌ها را با خط راست می‌برد: بریدگی مورب.",
    "js.f6.want_gt": "(باید ≫ ۱ باشد)",
    "js.f6.want_lt": "(باید ≪ ۱ باشد)",
    "js.f7.filter": "فیلتر",
    "js.f7.hear": "آنچه می‌شنوید",
    "js.f7.ro1": "تنظیم روی",
    "js.f7.ro2": "پهنای فیلتر",
    "js.f7.ro3": "نیاز هر ایستگاه",
    "js.f7.ro4": "نویز نسبت به ۱۰ kHz",
    "js.f7.ro5": "می‌شنوید",
    "js.f7.ro6": "ایستگاه داخل پنجره",
    "js.f7.v0": "بین دو ایستگاه. فیلتر روی طیف خالی نشسته، پس چیزی جز نویز به آشکارساز نمی‌رسد — و هرچه بازترش کنید، همان نویز بیشتر می‌شود.",
    "js.f7.v1a": "تنظیم روی ",
    "js.f7.v1b": ". یک ایستگاه داخل پنجره، بقیه دور ریخته شده — پیچ تنظیم برای همین است.",
    "js.f7.v2a": "بیش از یک ایستگاه داخل پنجره: ",
    "js.f7.v2b": ". باندهای کناری همه‌شان به آشکارساز می‌رسند و مخلوطشان را می‌شنوید. ",
    "js.f7.v2c": "برای همین است که کانال‌ها دست‌کم 2B از هم فاصله دارند، و فیلتر نباید از یک کانال پهن‌تر باشد.",
    "js.f7.wide_a": " پنجره <b>⁦",
    "js.f7.wide_b": "⁩</b> برابرِ چیزی است که ایستگاه لازم دارد، پس نسبت به فیلتری به پهنای یک کانال <b>⁦",
    "js.f7.wide_c": " dB⁩</b> نویز بیشتری هم به داخل می‌آورد.",
    "js.listen": "گوش دادن",
    "js.pause": "❙❙ مکث",
    "js.play": "▶ پخش",
    "js.share.copied": "کپی شد",
    "js.share.copylink": "کپی لینک",
    "js.share.press": "⌘/Ctrl + C را بزنید",
    "js.stop": "■ توقف",
  }
  };


  var LANGS = { en: 1, fa: 1 };

  function current() {
    var q = /[?&]lang=(fa|en)/.exec(location.search);   /* a link can pin one */
    if (q) return q[1];
    try {
      var s = localStorage.getItem(LANG_KEY);
      if (LANGS[s]) return s;
    } catch (e) {}
    return 'en';
  }

  function t(key) {
    var pack = DICT[global.__HKK_LANG || current()] || DICT.en;
    if (pack[key] != null) return pack[key];
    if (DICT.en[key] != null) return DICT.en[key];
    return key;
  }

  /* <title>, <meta content> and aria-labels can only take plain text */
  function plain(v) {
    return String(v).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  }

  function applyLang(lang) {
    if (!LANGS[lang]) lang = 'en';
    global.__HKK_LANG = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}

    var root = document.documentElement;
    root.lang = lang;
    root.classList.toggle('lang-fa', lang === 'fa');
    root.classList.toggle('lang-en', lang === 'en');

    /* Only the article turns around. The site header and footer keep their
       left-to-right layout in both languages, so every control stays exactly
       where the reader last saw it. */
    var main = document.querySelector('main');
    if (main) main.setAttribute('dir', lang === 'fa' ? 'rtl' : 'ltr');

    var pack = DICT[lang] || DICT.en;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var val = pack[el.getAttribute('data-i18n')];
      if (val == null) val = DICT.en[el.getAttribute('data-i18n')];
      if (val == null) return;
      if (el.tagName === 'TITLE') { document.title = plain(val); return; }
      /* Two labels wrap their own checkbox. Rewriting innerHTML would throw
         the live <input> away — and with it the listener the figure hung on
         it — so only the text beside the box is swapped. */
      if (el.tagName === 'LABEL') {
        var box = el.querySelector('input');
        if (box) {
          while (el.lastChild && el.lastChild !== box) el.removeChild(el.lastChild);
          el.appendChild(document.createTextNode(' ' + plain(val)));
          return;
        }
      }
      el.innerHTML = val;
    });

    function meta(sel, key) {
      var m = document.querySelector(sel);
      if (m && pack[key]) m.setAttribute('content', plain(pack[key]));
    }
    meta('meta[name="description"]', 'meta.description');
    meta('meta[property="og:title"]', 'meta.og:title');
    meta('meta[property="og:description"]', 'meta.og:description');
    meta('meta[property="og:image:alt"]', 'meta.og:image:alt');
    if (pack['meta.title']) document.title = plain(pack['meta.title']);

    document.querySelectorAll('[data-lang-set]').forEach(function (b) {
      var on = b.getAttribute('data-lang-set') === lang;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    try {
      if (global.FIGS) global.FIGS.forEach(function (f) { if (f.redraw) f.redraw(); });
    } catch (e) {}
  }

  /* Several figures build their pills and readout labels once, at start-up, so
     switching language reloads the page. Remember where the reader was and put
     them back, which makes the reload almost invisible. */
  function switchTo(lang) {
    if (!LANGS[lang] || lang === current()) return;
    try {
      localStorage.setItem(LANG_KEY, lang);
      var h = document.documentElement.scrollHeight;
      sessionStorage.setItem(SCROLL_KEY, String(h ? global.scrollY / h : 0));
    } catch (e) {}
    location.href = location.pathname;
  }

  function restoreScroll() {
    var f;
    try {
      f = parseFloat(sessionStorage.getItem(SCROLL_KEY));
      sessionStorage.removeItem(SCROLL_KEY);
    } catch (e) { return; }
    if (!f) return;
    var go = function () { global.scrollTo(0, f * document.documentElement.scrollHeight); };
    go();
    requestAnimationFrame(go);
    global.addEventListener('load', function () { requestAnimationFrame(go); });
  }

  global.HKK_I18N = { t: t, applyLang: applyLang, current: current };
  global.t = t;

  /* This file sits just before post.js at the end of <body>, so every element
     it needs already exists. Running now rather than on DOMContentLoaded means
     the figures are built in the right language the first time. */
  applyLang(current());
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-lang-set]').forEach(function (b) {
      b.addEventListener('click', function () { switchTo(b.getAttribute('data-lang-set')); });
    });
    restoreScroll();
  });
})(window);
