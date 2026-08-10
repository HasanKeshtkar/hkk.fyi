/* ============================================================
   Every word the page can say.

   Keys say where they sit: s3.p2 is the second paragraph of section 3,
   s6.cap1 the caption under section 6's figure, js.* is anything the figures
   draw or announce themselves. meta.* rewrites the <head> so a shared link
   carries the right language too.

   Both languages are complete. The article is written in English in the
   markup — so it still reads with JavaScript switched off — and the Persian
   lives in the `fa` pack below. Regenerate the English half rather than
   retyping it: the extractor that produced it walks index.html and lifts
   every data-i18n element's inner HTML verbatim.

   Two rules the Persian side keeps to:
     · numbers in running prose are Persian  — ۱۹۰۶، سه هزار کیلومتر
     · numbers glued to a Latin unit, or inside a formula, stay Latin
       — 9 kHz, m = 1, −6 dB — wrapped in <span class="q"> so that RTL
       punctuation can never drift into the middle of them

   The site header and the footer are deliberately absent from the direction
   switch: they stay left-to-right in both languages, so the logo, the nav and
   the two toggles never move between EN and FA.
   ============================================================ */
(function (global) {
  'use strict';
  var DICT = {
    en: {
      "hero.title1": "Hiding a voice inside a wave — FM, and the price of quiet · hkk.fyi",
      "hero.a1": "Skip to content",
      "hero.a2": "Lab",
      "hero.a3": "Writing",
      "hero.a4": "CV",
      "hero.a5": "Contact",
      "start.span1": "ESSAY · RADIO · PART TWO OF TWO · ~17 MIN · 6 LIVE FIGURES, 3 OF THEM AUDIBLE",
      "start.h11": "FM, and the price of quiet",
      "start.p1": "<a href=\"../hiding-a-voice-am/\">Part one</a> ended badly. Amplitude modulation puts the message in how tall the wave is, lightning and engines and the sun also write in how tall the wave is, and no receiver can tell the two apart — because there is nothing there to tell apart with. <br><br> The way out is the second knob. Leave the height alone entirely, and push the wave's <em>timing</em> around instead. Then a receiver can throw the height away, on purpose, before it looks at anything — and it throws the storm away with it. <br><br> In 1922 a very good mathematician proved this could not help. He was right, and the profession believed him for eleven years. <b>What Armstrong found was not a mistake in the proof.</b> It was a price nobody had thought was worth paying.",
      "start.cap1": "THE LENGTH NEVER CHANGES",
      "start.span2": "HASSAN KESHTKAR",
      "start.span3": "TEHRAN",
      "start.span4": "2026",
      "start.a1": "← back to hkk.fyi",
      "start.span5": "SHARE",
      "start.span6": "Copy link",
      "start.share": "Share…",
      "start.span7": "THE WHOLE ARTICLE IN 30 SECONDS",
      "start.li1": "Move the message into the wave's <em>timing</em> and the wave's height becomes surplus. A receiver can clip it flat before doing anything else, and everything written in height — which is all of the noise — goes with it.",
      "start.li2": "Carson proved in 1922 that frequency modulation does not save bandwidth. <b>He was right.</b> A narrow FM signal is no narrower than AM and no quieter.",
      "start.li3": "Armstrong's answer in 1933 was to stop trying. Swing the frequency <em>absurdly</em> wide — twelve times wider than the message needs — and the signal's own phase swing towers over the noise's. <b>Quiet, bought with bandwidth.</b>",
      "start.li4": "The exchange rate is steep and it is real: double the swing, gain about six decibels. It is Shannon's bandwidth-for-signal-to-noise trade, found fifteen years early by a man who had been shown the proof that it was pointless.",
      "start.li5": "And there is a floor. Below about ten decibels of carrier over noise the receiver loses track of which way round the phasor went, and the sound fills with clicks. <b>FM is better than AM, right up until it is very suddenly worse.</b>",
      "start.p2": "Six things to drag, three to listen to, and one man's very bad twenty years.",
      "start.span8": "CONTENTS",
      "start.li6": "<a href=\"#s1\">The theorem that said it was hopeless</a>",
      "start.li7": "<a href=\"#s2\">So go the other way</a>",
      "start.li8": "<a href=\"#s3\">Sidebands without end</a>",
      "start.li9": "<a href=\"#s4\">Why wide is quiet</a>",
      "start.li10": "<a href=\"#s5\">Quiet, bought</a>",
      "start.li11": "<a href=\"#s6\">The cliff</a>",
      "start.li12": "<a href=\"#s7\">The man who jumped</a>",
      "start.li13": "<a href=\"#s8\">The knobs never went away</a>",
      "start.h21": "<span class=\"secnum\">01</span> The theorem that said it was hopeless",
      "s1.p1": "The idea of wiggling a transmitter's frequency instead of its amplitude is not clever and nobody had to invent it. It occurs to everybody. It occurred to people in 1902. And the reason it kept occurring to them was a piece of intuition that felt unanswerable: an AM station needs sidebands either side of its carrier, and the sidebands take up room — but if you just <em>move</em> the carrier a tiny bit instead of adding anything beside it, surely you need almost no room at all? A station that occupied a few hundred hertz. Ten times as many stations in the same band.",
      "s1.p2": "John Renshaw Carson, at AT&amp;T, took the idea seriously enough to do the arithmetic, and published the result in the <em>Proceedings of the IRE</em> in February 1922. It is a short paper and it is completely correct. Wiggling the frequency does not produce one line that moves about. It produces a carrier and an endless family of sidebands, exactly as amplitude modulation does, and if you keep the wiggle small the result is <em>no narrower</em> than AM. His verdict on narrowband FM was that it \"inherently distorts without any compensating advantages whatsoever.\"",
      "s1.cite1": "— the line everyone remembers Carson by, and the settled opinion of the profession for the next decade",
      "s1.box1": "“Static, like the poor, will always be with us.” <cite data-i18n=\"s1.cite1\">— the line everyone remembers Carson by, and the settled opinion of the profession for the next decade</cite>",
      "s1.p3": "Read that as the sneer of a man who turned out to be wrong and you will miss what is interesting about it. Carson was not being unimaginative. He had proved a real theorem, and the theorem is still true: <b>you cannot squeeze a signal into less room by modulating its frequency.</b> Every attempt to get FM to be narrow ends in a signal that is as wide as AM and worse in every other way.",
      "s1.p4": "What the theorem does not say — what nobody thought to ask, because why would you — is what happens if you go the <em>other</em> way.",
      "s1.h21": "<span class=\"secnum\">02</span> So go the other way",
      "s2.p1": "Edwin Armstrong had already invented three of the things inside your radio. Regeneration in 1912, when he was twenty-two. The superheterodyne in 1918, which is still, over a century later, how essentially every receiver on earth works. Super-regeneration in 1922. He was rich, he was famous, and he had spent a decade in patent litigation with Lee de Forest over the first of them, which he eventually lost on a technicality that most engineers regard to this day as a miscarriage.",
      "s2.p2": "He spent most of the early 1930s in a basement laboratory at Columbia doing something that looked, from outside, like a man refusing to accept a proof. In December 1933 he was issued four patents. In November 1935 he stood up at a meeting of the Institute of Radio Engineers in New York, switched on a receiver, and played the room a signal coming live from an amateur station in Yonkers. He poured a glass of water. He crumpled a sheet of paper. He played a piano record. Everyone in the room knew what those sounds were supposed to be like over the air — a hiss with something happening behind it — and instead the water sounded like water.",
      "s2.p3": "The number that mattered was how far he was swinging the frequency. Not a few hundred hertz. Seventy-five thousand. To send an audio signal fifteen kilohertz wide, Armstrong was occupying two hundred kilohertz of spectrum — more than twenty AM stations' worth — and he was doing it deliberately.",
      "s2.p4": "The ratio between the two is the only number in this article you need to keep hold of:",
      "s2.eqlbl1": "the modulation index",
      "s2.p5": "Broadcast FM runs <span class=\"q\">Δf = 75 kHz</span> against <span class=\"q\">W = 15 kHz</span>, so <b>β = 5</b>. Carson's narrowband FM, the kind his theorem was about, has β well under 1. Same equations, same physics, same paper — a factor of twenty apart on one dial, and on one side of that dial it is a waste of time and on the other it is high fidelity.",
      "s2.h21": "<span class=\"secnum\">03</span> Sidebands without end",
      "s3.p1": "Here is what Carson found, and it is genuinely strange. Amplitude modulation puts a single tone into a carrier and gets back exactly three lines: the carrier and one sideband on each side. Frequency modulation puts the same single tone in and gets back the carrier and <em>an infinite number</em> of sideband pairs, spaced by the tone's frequency, marching off in both directions forever.",
      "s3.p2": "They do die away, which is the only reason any of this is usable. How fast they die away is set by β, and the heights are given by a family of functions Friedrich Bessel worked out in the 1820s while calculating the orbits of planets and had no reason whatsoever to associate with radio.",
      "s3.eqlbl1": "the height of the nth sideband pair",
      "s3.p3": "And Bessel functions do something that no amount of intuition about radio prepares you for. <b>They cross zero.</b> J<sub>0</sub>(β) — which is the height of the carrier itself, the thing the entire transmitter is built around, the thing AM spends two thirds of its power on — is zero when β is 2.405. Push the deviation to exactly that ratio and the carrier is not weak. It is <em>absent</em>. All the power has gone into the sidebands.",
      "s3.span1": "FIG 1",
      "s3.span2": "DRAG β UNTIL THE CARRIER VANISHES",
      "s3.span3": "MODULATION INDEX",
      "s3.note1": "Sound. Start with the volume low.",
      "s3.cap1": "A 1.2 kHz carrier wiggled by a 100 Hz tone. The dark line in the middle is the carrier and the blue ones are the sidebands; the faint dashed stem is where a full-strength carrier would reach. Drag β up from zero and watch the pairs appear one after another and the shaded band — Carson's own rule of thumb for how much room the thing needs — grow with them. Then press <b>NULL 1</b>. The carrier does not fade; <b>it goes.</b> Engineers used this for decades as a deviation meter: wind the modulation up until the middle of the display disappears, and you know the swing is exactly 2.405 times the tone. Press listen and drag β, and the bottom of the readout is worth watching too — the sum of all the sideband powers stays at 1, always. Nothing is being created. It is being spread.",
      "s3.p4": "Infinite sidebands are awkward to buy spectrum for, so Carson — who had by then spent fifteen years being right about this — also gave the industry the approximation it still uses. Count the sidebands that matter, ignore the rest:",
      "s3.eqlbl2": "Carson's rule",
      "s3.p5": "Put broadcast FM's numbers in and you get <span class=\"q\">2 × (75 + 15) = 180 kHz</span>, which is why FM channels are spaced 200 kHz apart, which is why the dial goes 88.1, 88.3, 88.5. The man whose theorem said this was pointless is also the man whose name is on the formula the whole industry uses to lay out the band.",
      "s3.h21": "<span class=\"secnum\">04</span> Why wide is quiet",
      "s4.p1": "Now the part Carson's paper did not cover, because it was a paper about bandwidth and this is an argument about geometry.",
      "s4.p2": "Draw the received signal as an arrow — a phasor — of some length, at some angle. FM keeps the length fixed and moves the angle: the tip runs around a circle and never leaves it. Noise is a second, much shorter arrow, stuck on the end of the first one and spinning round at random. The receiver only ever sees the two added together, and the question is how much of the <em>angle</em> the little arrow manages to steal.",
      "s4.sum2": "Hold on — what is a phasor?",
      "s4.p8": "A bookkeeping trick, and the most useful one in radio. A steady sine wave has only two properties worth tracking — how tall it is and where in its cycle it currently is — so draw it as <b>an arrow</b>: the length is the height of the wave, the angle is where in the cycle it has got to. The whole arrow spins round at the carrier frequency, and you agree to stop watching the spin and look only at what is left.",
      "s4.p9": "The payoff is that adding two waves becomes adding two arrows, tip to tail, which is something you can see. That is the entire content of the figure below: a big arrow for the signal, a small one for the noise stuck on its end, and the question of how much the small one can twist the sum.",
      "s4.p3": "Not much, and here is the crucial bit: <b>how much it steals does not depend on how far the signal's own angle is swinging.</b> The noise arrow is the length it is. It tilts the sum by roughly its own length divided by the signal's, and that is that.",
      "s4.p4": "So swing the signal further. The noise's contribution stays exactly where it was, and the thing you are comparing it against gets bigger. Double the swing and you have halved the noise, in the only sense that matters.",
      "s4.span1": "FIG 2",
      "s4.span2": "THE WHOLE BARGAIN, AS A TRIANGLE",
      "s4.span3": "HOW FAR THE SIGNAL SWINGS",
      "s4.span4": "CARRIER OVER NOISE",
      "s4.cap1": "Blue is the signal, sweeping through the arc the message is driving it around. The dashed circle on its tip is everywhere the noise could put it; the grey arrow is where the noise has put it this instant, and the dashed line to the origin is the only thing the receiver ever actually gets. Now drag the top slider. <b>The little circle does not change size.</b> Only the arc does. That is the entire invention: the two bars on the right are the same two quantities, and widening the swing widens exactly one of them. Then pull the bottom slider down below about 6 dB and watch the noise circle grow until it can reach past the origin — at which point the receiver can no longer tell which way round the phasor went, and the trade collapses.",
      "s4.p5": "Being careful about it costs one more factor. The discriminator that turns angle back into audio works by differentiating, and differentiating multiplies high frequencies up. So the noise coming out of an FM receiver is not flat — it rises with frequency, in a wedge shape engineers call <em>triangular noise</em>. Work it through and the payoff scales as β squared: <b>every doubling of the deviation buys about six decibels.</b>",
      "s4.sum1": "The cheapest fix in broadcasting",
      "s4.p6": "If the noise gets worse towards the top of the audio band, and the treble in music is quiet up there anyway, then the obvious move is to turn the treble up before transmitting and back down again on the way out. The boost on the way in is <b>pre-emphasis</b>; the matching cut on the way out is <b>de-emphasis</b>, and because the noise is only added in between, the cut takes the hiss down with it and leaves the music where it started.",
      "s4.p7": "It buys something like a further 13 dB and it costs one resistor and one capacitor at each end. The time constant is <span class=\"q\">75 µs</span> in the Americas and <span class=\"q\">50 µs</span> in most of the rest of the world, which is the kind of detail that sounds trivial until you try to sell a radio in both places.",
      "s4.h21": "<span class=\"secnum\">05</span> Quiet, bought",
      "s5.p1": "Enough geometry. Same message, same transmitter power, same storm, two receivers.",
      "s5.sum1": "What the “arriving” slider actually measures",
      "s5.p4": "Comparing two schemes fairly is harder than it sounds, because they do not occupy the same amount of room. Quote the signal against the noise <em>in each one's own bandwidth</em> and the wide one looks worse before it has done anything, purely for being wide. Quote it against the noise in a fixed slice and you have quietly assumed the answer.",
      "s5.p5": "So the slider is set in the one unit that does not take sides: <b>received power against the noise in a single message bandwidth</b> — how much signal arrives, per unit of the thing being sent. Both schemes get the same transmitter power and the same sky. What each does with its bandwidth is then theirs to answer for.",
      "s5.p2": "The figure below is a real simulation of both — noise added to the signal, then put through an actual envelope detector on one side and an actual discriminator on the other, with the output measured against the same receiver running in silence. Nothing in it is a curve drawn from a textbook.",
      "s5.span1": "FIG 3",
      "s5.span2": "THE SAME STORM, TWICE",
      "s5.span3": "SIGNAL OVER NOISE, ARRIVING",
      "s5.amlbl": "· AM",
      "s5.fmlbl": "· FM",
      "s5.note1": "Sound. Start with the volume low, then click one and then the other.",
      "s5.cap1": "Top lane, amplitude modulation. Bottom lane, frequency modulation at the β you pick — both transmitting the same power, both hit with the same noise, each drawn against a dashed copy of itself in perfect conditions. Set the slider around <b>26 dB</b> and click the two listen buttons one after the other; it is the same comparison a 1935 audience made in a room in New York. Switch the source to <b>MUSIC</b> and it stops being an argument. Then step β from 1 to 8 and watch the bottom lane clean up while the top lane does not move at all — because AM has no β. It has no knob to turn. There is nothing it can spend.",
      "s5.h21": "<span class=\"secnum\">06</span> The cliff",
      "s6.p1": "Every bargain in engineering has a clause at the bottom, and this one is spectacular.",
      "s6.p2": "Go back to the two arrows. Everything above rested on the noise arrow being much shorter than the signal arrow, so that it could only nudge the angle. Let the noise grow until it is comparable, and something categorically different starts happening: every so often, the sum of the two passes on the <em>wrong side of the origin</em>. The phasor goes all the way round instead of wobbling. And a discriminator, which measures how much the angle changed, reports that as an entire extra turn — an impulse, a spike, a <b>click</b>.",
      "s6.p3": "Clicks are not proportional to anything. One noise peak in the wrong place produces one full-sized bang regardless of how quiet everything else is. As the signal weakens they do not get louder; they get <em>more frequent</em>, and they arrive faster than the smooth improvement of the bargain can absorb.",
      "s6.span1": "FIG 4",
      "s6.span2": "DRAG THE OPERATING POINT OVER THE EDGE",
      "s6.span3": "SIGNAL OVER NOISE, ARRIVING",
      "s6.note1": "Sound. Start with the volume low — the clicks are loud.",
      "s6.cap1": "Each curve is twenty-six runs of the receiver at twenty-six noise levels, measured rather than plotted from a formula — which is why the FM line is slightly ragged, and why the knee is where it lands on its own rather than where anybody put it. Dashed grey is AM: dull, straight, no surprises, worse everywhere it is allowed to be. Blue is FM, running far above it — until it falls off the world. <b>Drag along the picture and listen at each end</b>, with <b>MUSIC</b> selected: above the knee it is a recording, below it the recording is still there underneath a hail of clicks that were not in it. At 25 dB, FM is nearly twenty decibels ahead. At 15 dB it is losing. The higher you set β the further ahead it gets, and — look carefully — <b>the earlier the cliff arrives.</b> You do not get to buy quiet without also buying the edge.",
      "s6.p4": "That cliff explains something every listener already knows without being able to name it. A weak AM station is a voice inside a hiss: you strain, and you get most of it. A weak FM station is perfect, perfect, perfect, then gone. There is no straining. There is nothing to strain at.",
      "s6.p5": "The same steepness produces one more effect, and this one has a name people use in ordinary conversation. If two FM stations land on the same frequency and one is even slightly stronger, the discriminator follows the stronger phasor and the weaker one simply ceases to exist. Not a jumble — <em>silence</em> from the loser. It is called the <b>capture effect</b>, and it is why you can drive between two cities on one FM frequency and hear a clean handover rather than a mess.",
      "s6.box1": "<b>Which is exactly why aircraft still use AM.</b> Air traffic control, at 118–137 MHz, is amplitude modulated in 2026, and it is not an oversight. On AM, two pilots transmitting at once produce a horrible heterodyne squeal and everybody instantly knows it happened. On FM, the stronger one would capture the channel and the weaker one would vanish without trace — including, say, an aircraft declaring an emergency while somebody else was reading back a clearance. The <em>flaw</em> from part one is the safety feature here. Nobody is going to change it.",
      "s6.h21": "<span class=\"secnum\">07</span> The man who jumped",
      "s7.p1": "Armstrong had been testing FM from an antenna on the Empire State Building, on space arranged through his old friend David Sarnoff, who ran RCA. In 1935 RCA asked him to remove his equipment. They needed the mast for television.",
      "s7.p2": "That is the moment the story turns, and it is worth being precise about why. RCA's business was AM: transmitters, receivers, patents, network affiliations, the whole apparatus of American broadcasting. A better modulation scheme was not an opportunity for them. It was an obsolescence event that they would have to pay Armstrong for.",
      "s7.p3": "So he built his own station. He put up a tower at Alpine, New Jersey, with his own money, and by 1940 there were FM stations and FM receivers and a small, fervent audience who had heard what radio was supposed to sound like. And in June 1945 the FCC — after hearings in which RCA argued strenuously, on technical grounds since discredited, that the existing band was unsuitable — moved FM from 42–50 MHz up to 88–108 MHz.",
      "s7.p4": "Every FM receiver in the United States, around half a million of them, stopped working on the same day. Every station had to re-equip. The audience Armstrong had spent ten years and most of his fortune building was deleted by an administrative decision.",
      "s7.p5": "He spent the next nine years in court. RCA had by then built FM into its television sets — television sound is FM, and always has been — and argued that its engineers had invented it independently. The litigation consumed what was left of his money and, by every account, the man himself. On 31 January 1954 he wrote his wife Marion a note apologising for the hurt he had caused her, and stepped out of the window of their thirteenth-floor apartment in New York.",
      "s7.p6": "Marion Armstrong picked up the lawsuits and won every single one. RCA settled that year. The last of the others was concluded in 1967. The verdicts were unanimous and they were all too late, which is the only ending this story was ever going to have.",
      "s7.box1": "He was right about the physics, right about the sound, right about the patents, and right in court. It made no difference at all to what happened to him.",
      "s7.h21": "<span class=\"secnum\">08</span> The knobs never went away",
      "s8.p1": "FM won in the end, thoroughly and quietly. And the way it absorbed stereo in 1961 is worth a figure of its own, because it is one of the best pieces of backwards-compatible engineering anyone has ever done.",
      "s8.p2": "There were already millions of mono FM sets in living rooms and none of them could be recalled. So the stereo system was designed so that they would not notice. Send <b>L + R</b> in the ordinary audio band, where a mono set finds it and plays it as a perfectly good mono programme. Then hide <b>L − R</b> above the audio band, on a suppressed-carrier subcarrier at 38 kHz — DSB-SC, exactly the thing part one said broadcast radio would never use, used here precisely <em>because</em> a simple receiver cannot detect it. A stereo set adds and subtracts the two to get L and R back. A mono set hears nothing up there at all.",
      "s8.span1": "FIG 5",
      "s8.span2": "STEREO, SMUGGLED PAST A MILLION OLD RADIOS",
      "s8.span3": "LEFT CHANNEL",
      "s8.span4": "RIGHT CHANNEL",
      "s8.lbl1": "<input type=\"checkbox\" id=\"mpxMono\"> listen on a 1959 mono set",
      "s8.cap1": "What actually modulates the carrier is not audio — it is this whole stack, called the composite or multiplex signal. The dashed line at 15 kHz is where an old receiver stopped listening, and everything to the right of it was chosen to live beyond that line. The little spike at 19 kHz is the <b>pilot</b>: too high to hear, its only job is to tell a stereo set that stereo is present and where 38 kHz is. Set the two channels differently and the difference band grows; set them equal and it disappears entirely, which is why a mono programme on a stereo station costs nothing extra. <b>Tick the box</b> to hear it as 1959 would have. The programme is still there. It is just no longer in two places.",
      "s8.p3": "The same trick was played again in the 1980s: RDS, the thing that puts the station's name on your car display, rides on another subcarrier at 57 kHz — three times the pilot — and is equally invisible to everything that came before it.",
      "s8.p4": "And then there is the strangest afterlife of all. In 1967 a composer at Stanford called John Chowning was messing about with vibrato on a computer, wound the modulation rate up past where a wobble becomes a tone, and heard the sidebands. He had rediscovered Armstrong's mathematics as a way of making sounds nobody had heard before. Stanford licensed it to Yamaha; the DX7 shipped in 1983 and became the best-selling synthesiser in history. Every glassy electric piano on every record of that decade is J<sub>n</sub>(β).",
      "s8.p5": "Which leaves one picture. Draw the transmitted signal not as a wave but as a single point in a plane — how much of it is in step with a reference oscillator, and how much is a quarter cycle behind. Every scheme in these two articles is a different way of moving that one point around.",
      "s8.span5": "FIG 6",
      "s8.span6": "EVERYTHING, IN ONE PLANE",
      "s8.p6": "<b>AM</b> slides the point in and out along a line — all the information is in the distance from the origin. <b>PM</b> and <b>FM</b> keep the distance fixed and move it around the arc. <b>SSB</b> sends it round a circle at a steady rate, which is why it has no envelope to detect. And <b>QAM</b> — every modem, every Wi-Fi link, every digital television signal — stops pretending the two are different and simply jumps the point wherever it likes.",
      "s8.cap2": "One point, one plane, and the wave it comes out as on the right. The knobs from part one's section two are still exactly the two knobs — how far out, and which way round — and the only thing a hundred years has changed is that a radio now moves the point directly, with a pair of digital-to-analogue converters, instead of building a circuit per idea. Armstrong's contribution, in this picture, is the observation that the arc is a much safer place to write than the radius.",
      "s8.box1": "Nature writes in amplitude. So don't.",
      "s8.span7": "PREVIOUS",
      "s8.span8": "<a href=\"../hiding-a-voice-am/\">Part one — AM, and the trouble with amplitude</a>. Why a voice needs a carrier at all, what a diode and a capacitor can do on their own, and where the other two thirds of the transmitter goes.",
      "s8.h32": "Sources &amp; further reading",
      "s8.li1": "J. R. Carson, “Notes on the Theory of Modulation,” <em>Proceedings of the IRE</em>, vol. 10, no. 1, Feb. 1922 — the proof, and the source of the bandwidth rule that carries his name.",
      "s8.li2": "E. H. Armstrong, “A Method of Reducing Disturbances in Radio Signaling by a System of Frequency Modulation,” <em>Proceedings of the IRE</em>, vol. 24, no. 5, May 1936 — the answer, written up the year after the demonstration.",
      "s8.li3": "L. Lessing, <em>Man of High Fidelity: Edwin Howard Armstrong</em>, Lippincott, 1956 — the standard biography, written two years after his death and sympathetic to him.",
      "s8.li4": "T. Lewis, <em>Empire of the Air: The Men Who Made Radio</em>, HarperCollins, 1991 — de Forest, Sarnoff and Armstrong together, which is the only way the story makes sense.",
      "s8.li5": "J. M. Chowning, “The Synthesis of Complex Audio Spectra by Means of Frequency Modulation,” <em>Journal of the Audio Engineering Society</em>, vol. 21, no. 7, 1973.",
      "s8.li6": "A. B. Carlson, <em>Communication Systems</em>, 5th ed., McGraw-Hill — chapters 5 and 10, for the Bessel spectra, the threshold and the click model behind FIG 4.",
      "s8.span9": "© 2026 Hassan Keshtkar · <span class=\"mono-label\">hkk.fyi</span>",
      "s8.span10": "built with love <span class=\"heart\" aria-hidden=\"true\">♥</span> &amp; AI :)))",

      /* ---- <head> ---- */
      "meta.title": "Hiding a voice inside a wave — FM, and the price of quiet · hkk.fyi",
      "meta.description": "In 1922 a proof said frequency modulation was pointless, and the proof was correct. In 1933 Armstrong made it work anyway by doing the one thing nobody had tried: spending bandwidth instead of saving it. Six live figures, three of them audible. Part two of two.",
      "meta.og:title": "Hiding a voice inside a wave — FM, and the price of quiet",
      "meta.og:description": "Bessel functions, a carrier that vanishes, why wide is quiet, the cliff at the bottom of the bargain, and the man who jumped out of a window over it.",
      "meta.og:image:alt": "A phasor on a circle with its trail bunching and spreading, beside the article title.",

      /* ---- shared ---- */
      "js.src.voice": "SYNTHETIC VOICE",
      "js.src.music": "MUSIC",
      "js.yes": "yes",
      "js.no": "no",
      "js.audio.listen": "Listen",
      "js.audio.stop": "Stop",
      "js.audio.wait": "Building…",
      "js.audio.failed": "This browser would not open an audio device.",
      "js.share.copy_link": "Copy link",
      "js.share.copied": "Copied",
      "js.share.press": "Press ⌘C",

      /* ---- FIG 1 · Bessel ---- */
      "js.beta.xaxis": "frequency, hertz",
      "js.beta.yaxis": "amplitude",
      "js.beta.carson": "Carson's rule:",
      "js.beta.gone": "THE CARRIER IS GONE",
      "js.beta.null": "NULL",
      "js.beta.narrow": "NARROWBAND",
      "js.beta.wide": "BROADCAST FM",
      "js.beta.ro_b": "modulation index",
      "js.beta.ro_dev": "frequency swing",
      "js.beta.ro_j0": "carrier height J₀(β)",
      "js.beta.ro_pairs": "sideband pairs that matter",
      "js.beta.ro_carson": "bandwidth needed",
      "js.beta.ro_sum": "all the powers added up",

      /* ---- FIG 2 · phasor ---- */
      "js.ph.bar1": "the signal's own swing",
      "js.ph.bar2": "what the noise steals",
      "js.ph.click": "the noise can now reach past the origin — that is a click",
      "js.ph.ro_swing": "signal swings by",
      "js.ph.ro_noise": "noise tilts it by",
      "js.ph.ro_ratio": "ratio",
      "js.ph.ro_enc": "chance it overshoots the carrier",
      "js.ph.never": "effectively never",

      /* ---- FIG 3 · quiet, bought ---- */
      "js.quiet.l_am": "AM · dashed = the same receiver in silence",
      "js.quiet.l_fm": "FM · dashed = the same receiver in silence",
      "js.quiet.ro_g": "arriving",
      "js.quiet.ro_bw": "FM bandwidth, vs AM",
      "js.quiet.ro_am": "AM comes out at",
      "js.quiet.ro_fm": "FM comes out at",
      "js.quiet.ro_win": "FM ahead by",

      /* ---- FIG 4 · the cliff ---- */
      "js.cliff.xaxis": "signal over noise arriving, dB",
      "js.cliff.yaxis": "signal over noise out, dB",
      "js.cliff.am": "AM",
      "js.cliff.above": "above the knee",
      "js.cliff.below": "over the edge",
      "js.cliff.ro_g": "arriving",
      "js.cliff.ro_am": "AM comes out at",
      "js.cliff.ro_fm": "FM comes out at",
      "js.cliff.ro_win": "FM ahead by",
      "js.cliff.ro_bw": "bandwidth spent, vs AM",
      "js.cliff.ro_knee": "the knee sits at",
      "js.cliff.ro_st": "where you are",

      /* ---- FIG 5 · the multiplex ---- */
      "js.mpx.xaxis": "frequency in the composite signal, kilohertz",
      "js.mpx.sum": "L + R · the mono programme",
      "js.mpx.pilot": "pilot",
      "js.mpx.dif": "L − R, on a suppressed carrier at 38 kHz",
      "js.mpx.rds": "RDS",
      "js.mpx.oldset": "everything a 1959 receiver could hear",
      "js.mpx.deaf": "none of this exists, as far as the old set is concerned",
      "js.mpx.l_comp": "the composite signal, in time",
      "js.mpx.l_mono": "what the mono set plays · faint = the whole composite",
      "js.mpx.ro_l": "left",
      "js.mpx.ro_r": "right",
      "js.mpx.ro_sum": "L + R",
      "js.mpx.ro_dif": "L − R",
      "js.mpx.ro_hear": "the listener gets",
      "js.mpx.h_mono": "one channel, all of it",
      "js.mpx.h_st": "two channels",

      /* ---- FIG 6 · the IQ plane ---- */
      "js.iq.am": "AM",
      "js.iq.pm": "PM",
      "js.iq.fm": "FM",
      "js.iq.ssb": "SSB",
      "js.iq.qam": "16-QAM",
      "js.iq.n_am": "along a line",
      "js.iq.n_pm": "along an arc",
      "js.iq.n_fm": "along an arc, at a changing rate",
      "js.iq.n_ssb": "round a circle, steadily",
      "js.iq.n_qam": "anywhere it likes",
      "js.iq.wave": "the wave that comes out",
      "js.iq.ro_path": "the point moves",
      "js.iq.ro_amp": "message is in the length",
      "js.iq.ro_ang": "message is in the angle"
    },

    fa: {
      "hero.title1": "پنهان کردن یک صدا در یک موج — FM و بهای سکوت · hkk.fyi",
      "hero.a1": "برو سر اصل مطلب",
      "hero.a2": "Lab",
      "hero.a3": "Writing",
      "hero.a4": "CV",
      "hero.a5": "Contact",
      "start.span1": "مقاله · رادیو · قسمت دوم از دو · حدود ۱۷ دقیقه · ۶ شکل تعاملی، ۳ تاش صدا دارد",
      "start.h11": "FM و بهای سکوت",
      "start.p1": "<a href=\"../hiding-a-voice-am/\">قسمت اول</a> بد تمام شد. amplitude modulation پیام را می‌گذارد در اینکه موج چقدر بلند است. رعدوبرق و موتور و خورشید هم در همان می‌نویسند. هیچ گیرنده‌ای این دو را از هم تشخیص نمی‌دهد، چون اصلاً چیزی نیست که با آن تشخیص بدهد.<br><br>راه فرار پیچ دوم است. کاری به ارتفاع نداشته باش، و به‌جایش <em>زمان‌بندیِ</em> موج را هل بده. آن‌وقت گیرنده می‌تواند ارتفاع را، عمداً، پیش از هر نگاهی دور بریزد — و طوفان را هم با خودش دور می‌ریزد.<br><br>سال ۱۹۲۲ یک ریاضی‌دان بسیار خوب ثابت کرد که این کار به جایی نمی‌رسد. حق با او بود، و حرفه یازده سال حرفش را باور کرد. <b>آنچه آرمسترانگ پیدا کرد اشتباهی در اثبات نبود.</b> بهایی بود که به فکر کسی نرسیده بود ارزش پرداختن دارد.",
      "start.cap1": "طول هیچ‌وقت عوض نمی‌شود",
      "start.span2": "حسن کشت‌کار",
      "start.span3": "تهران",
      "start.span4": "۲۰۲۶",
      "start.a1": "برگرد به hkk.fyi ←",
      "start.span5": "هم‌رسانی",
      "start.span6": "کپی لینک",
      "start.share": "هم‌رسانی…",
      "start.span7": "کل مقاله در ۳۰ ثانیه",
      "start.li1": "پیام را ببر در <em>زمان‌بندیِ</em> موج. آن‌وقت ارتفاع موج اضافی می‌شود، و گیرنده می‌تواند پیش از هر کار دیگری صافش کند. هر چه در ارتفاع نوشته شده — که همه‌اش نویز است — با همان می‌رود.",
      "start.li2": "کارسون سال ۱۹۲۲ ثابت کرد که frequency modulation در bandwidth صرفه‌جویی نمی‌کند. <b>حق با او بود.</b> یک سیگنال FM باریک نه باریک‌تر از AM است و نه ساکت‌تر.",
      "start.li3": "جواب آرمسترانگ در ۱۹۳۳ این بود که دست از تلاش بردارد. فرکانس را <em>مسخره‌وار</em> پهن بچرخان، دوازده برابر آنچه پیام لازم دارد. آن‌وقت نوسان فازِ خود سیگنال از نوسان نویز بالاتر قد می‌کشد. <b>سکوت، خریداری‌شده با bandwidth.</b>",
      "start.li4": "نرخ این معامله تند است و واقعی: نوسان را دو برابر کن، حدود شش دسی‌بل ببر. همان معاملهٔ bandwidth در برابر SNR شنون است، پانزده سال زودتر، پیداشده به دست کسی که اثباتِ بی‌فایده بودنش را نشانش داده بودند.",
      "start.li5": "و یک کف هم دارد. زیر حدود ده دسی‌بلِ carrier روی نویز، گیرنده گم می‌کند که phasor از کدام طرف چرخیده، و صدا پر می‌شود از click. <b>FM از AM بهتر است، تا همان لحظه‌ای که ناگهان خیلی بدتر می‌شود.</b>",
      "start.p2": "شش چیز برای کشیدن، سه چیز برای شنیدن، و بیست سالِ بسیار بدِ یک مرد.",
      "start.span8": "فهرست",
      "start.li6": "<a href=\"#s1\">قضیه‌ای که گفت فایده ندارد</a>",
      "start.li7": "<a href=\"#s2\">پس از آن سو برو</a>",
      "start.li8": "<a href=\"#s3\">sideband های بی‌پایان</a>",
      "start.li9": "<a href=\"#s4\">چرا پهن یعنی ساکت</a>",
      "start.li10": "<a href=\"#s5\">سکوت، خریداری‌شده</a>",
      "start.li11": "<a href=\"#s6\">پرتگاه</a>",
      "start.li12": "<a href=\"#s7\">مردی که پرید</a>",
      "start.li13": "<a href=\"#s8\">پیچ‌ها هیچ‌وقت نرفتند</a>",
      "start.h21": "<span class=\"secnum\">01</span> قضیه‌ای که گفت فایده ندارد",
      "s1.p1": "فکر اینکه به‌جای دامنهٔ فرستنده فرکانسش را تکان بدهی نه باهوشانه است و نه کسی لازم بوده اختراعش کند. به ذهن همه می‌رسد، و سال ۱۹۰۲ هم رسیده بود. دلیلش هم شهودی بود که انگار جواب نداشت. یک ایستگاه AM دو طرف carrier اش sideband لازم دارد و sideband ها جا می‌گیرند. اما اگر به‌جای اضافه کردن چیزی در کنارش، فقط خود carrier را کمی <em>جابه‌جا</em> کنی، مسلماً تقریباً هیچ جایی لازم نداری. نه؟ ایستگاهی که چند صد هرتز اشغال کند، و ده برابر ایستگاه در همان باند.",
      "s1.p2": "جان رنشاو کارسون، در AT&amp;T، این ایده را آن‌قدر جدی گرفت که حسابش را بکند، و نتیجه را فوریهٔ ۱۹۲۲ در <em>Proceedings of the IRE</em> چاپ کرد. مقالهٔ کوتاهی است و کاملاً درست. تکان دادن فرکانس یک خط واحد که جابه‌جا شود تولید نمی‌کند. یک carrier تولید می‌کند به‌اضافهٔ خانواده‌ای بی‌پایان از sideband ها، دقیقاً مثل amplitude modulation. و اگر تکان را کوچک نگه داری، نتیجه <em>هیچ باریک‌تر</em> از AM نیست. حکمش دربارهٔ narrowband FM این بود که «ذاتاً اعوجاج ایجاد می‌کند، بدون هیچ مزیت جبران‌کننده‌ای».",
      "s1.cite1": "— جمله‌ای که همه کارسون را با آن به یاد می‌آورند، و حرف جاافتادهٔ حرفه برای یک دههٔ بعد",
      "s1.box1": "«استاتیک، مثل فقرا، همیشه با ما خواهد بود.» <cite data-i18n=\"s1.cite1\">— جمله‌ای که همه کارسون را با آن به یاد می‌آورند، و حرف جاافتادهٔ حرفه برای یک دههٔ بعد</cite>",
      "s1.p3": "اگر این را پوزخند مردی بخوانی که آخرش اشتباه از آب درآمد، چیز جالبش را از دست داده‌ای. کارسون کم‌تخیل نبود. قضیه‌ای واقعی ثابت کرده بود، و آن قضیه هنوز هم درست است: <b>با مدوله کردن فرکانس یک سیگنال نمی‌توانی در جای کمتری بچپانی‌اش.</b> هر تلاشی برای باریک کردن FM به سیگنالی ختم می‌شود که به پهنای AM است و از هر جهت دیگر بدتر.",
      "s1.p4": "آنچه قضیه <em>نمی‌گوید</em> — و به فکر هیچ‌کس نرسید بپرسد، چون آخر چرا باید می‌رسید — این است که اگر از <em>آن سو</em> بروی چه می‌شود.",
      "s1.h21": "<span class=\"secnum\">02</span> پس از آن سو برو",
      "s2.p1": "ادوین آرمسترانگ همان موقع هم سه تا از چیزهای داخل رادیوی تو را اختراع کرده بود. regeneration در ۱۹۱۲، وقتی بیست‌ودو ساله بود. superheterodyne در ۱۹۱۸، که بیش از یک قرن بعد هنوز هم روش کار عملاً هر گیرنده‌ای روی زمین است. super-regeneration در ۱۹۲۲. پولدار بود، مشهور بود، و یک دهه سر اولی با لی دو فارست دعوای patent داشت. دعوایی که آخرش سر یک نکتهٔ فنی باخت، و بیشتر مهندس‌ها تا امروز حکمش را ناعادلانه می‌دانند.",
      "s2.p2": "بیشترِ اوایل دههٔ ۱۹۳۰ را در یک آزمایشگاه زیرزمینی در کلمبیا گذراند، و کاری می‌کرد که از بیرون شبیه مردی بود که حاضر نیست اثباتی را قبول کند. دسامبر ۱۹۳۳ چهار patent برایش صادر شد. نوامبر ۱۹۳۵ در جلسهٔ انجمن مهندسان رادیو در نیویورک بلند شد، یک گیرنده را روشن کرد، و سیگنالی را برای اتاق پخش کرد که زنده از یک ایستگاه آماتوری در یانکرز می‌آمد. یک لیوان آب ریخت. یک ورق کاغذ مچاله کرد. یک صفحهٔ پیانو گذاشت. همهٔ آدم‌های آن اتاق می‌دانستند این صداها از روی هوا قرار است چه شکلی باشند — یک هیس که چیزی پشتش اتفاق می‌افتد — و به‌جایش صدای آب، صدای آب بود.",
      "s2.p3": "عددی که اهمیت داشت این بود که چقدر داشت فرکانس را می‌چرخاند. نه چند صد هرتز؛ هفتادوپنج هزار. برای فرستادن یک سیگنال صوتیِ پانزده کیلوهرتزی، آرمسترانگ دویست کیلوهرتز از طیف را اشغال می‌کرد. بیشتر از سهم بیست ایستگاه AM، و عمداً.",
      "s2.p4": "نسبت این دو تنها عدد این مقاله است که باید نگهش داری:",
      "s2.eqlbl1": "modulation index",
      "s2.p5": "پخش FM با <span class=\"q\">Δf = 75 kHz</span> در برابر <span class=\"q\">W = 15 kHz</span> کار می‌کند، یعنی <b>β = 5</b>. narrowband FM کارسون، همان که قضیه‌اش درباره‌اش بود، β‌اش خیلی زیر ۱ است. همان معادلات، همان فیزیک، همان مقاله. بیست برابر فاصله روی یک دیال، که یک سرش اتلاف وقت است و سر دیگرش کیفیت بالا.",
      "s2.h21": "<span class=\"secnum\">03</span> sideband های بی‌پایان",
      "s3.p1": "آنچه کارسون پیدا کرد این است، و راستش عجیب است. amplitude modulation یک تُن تک را در carrier می‌گذارد و دقیقاً سه خط تحویل می‌دهد: carrier، و یک sideband در هر طرف. اما frequency modulation همان یک تُن را می‌گیرد و carrier را تحویل می‌دهد به‌اضافهٔ <em>بی‌نهایت</em> جفت sideband، به فاصلهٔ فرکانس همان تُن، که تا ابد به هر دو طرف رژه می‌روند.",
      "s3.p2": "البته ته می‌کشند، و تنها دلیل قابل استفاده بودن این ماجرا هم همین است. اینکه چقدر تند ته بکشند را β تعیین می‌کند. ارتفاعشان هم از خانواده‌ای از توابع درمی‌آید که فریدریش Bessel دههٔ ۱۸۲۰ سر حساب مدار سیاره‌ها درشان آورد و کوچک‌ترین دلیلی نداشت به رادیو ربطشان بدهد.",
      "s3.eqlbl1": "ارتفاع nاُمین جفت sideband",
      "s3.p3": "و توابع Bessel کاری می‌کنند که هیچ شهودی دربارهٔ رادیو آدم را برایش آماده نکرده: <b>از صفر رد می‌شوند.</b> J<sub>0</sub>(β) ارتفاع خود carrier است. همان چیزی که کل فرستنده دورش ساخته شده و AM دوسوم توانش را خرجش می‌کند. و وقتی β برابر ۲٫۴۰۵ باشد، صفر است. نوسان را دقیقاً روی همین نسبت ببر: carrier ضعیف نمی‌شود، <em>نیست</em>. کل توان رفته در sideband ها.",
      "s3.span1": "شکل ۱",
      "s3.span2": "β را بکش تا carrier غیب شود",
      "s3.span3": "modulation index",
      "s3.note1": "صدا دارد. اول صدا را کم کن.",
      "s3.cap1": "یک carrier <span class=\"q\">1.2 kHz</span> که یک تُن <span class=\"q\">100 Hz</span> تکانش می‌دهد. خط تیرهٔ وسط carrier است و آبی‌ها sideband ها. آن ساقهٔ کم‌رنگ خط‌چین هم جایی است که یک carrier تمام‌قوت می‌رسید. β را از صفر ببر بالا. جفت‌ها یکی‌یکی سبز می‌شوند و نوار سایه‌دار — همان قاعدهٔ سرانگشتی خود کارسون برای اینکه این چیز چقدر جا می‌خواهد — با آن‌ها بزرگ می‌شود. بعد <b>«صفر ۱»</b> را بزن. carrier کم‌رنگ نمی‌شود؛ <b>می‌رود.</b> مهندس‌ها دهه‌ها از این به‌عنوان deviation meter استفاده می‌کردند: modulation را بپیچان تا وسط صفحه غیب شود، آن‌وقت می‌دانی نوسان دقیقاً ۲٫۴۰۵ برابر تُن است. دکمهٔ شنیدن را بزن و β را بکش. پایین نمایشگر هم ارزش نگاه کردن دارد: مجموع توان همهٔ sideband ها همیشه ۱ می‌ماند. چیزی ساخته نمی‌شود، فقط پخش می‌شود.",
      "s3.p4": "خریدن طیف برای بی‌نهایت sideband کار ناجوری است. پس کارسون — که تا آن موقع پانزده سال بود حق با او بود — یک تقریب هم به صنعت داد که هنوز از آن استفاده می‌کند. sideband هایی را که مهم‌اند بشمار و بقیه را ول کن:",
      "s3.eqlbl2": "Carson's rule",
      "s3.p5": "عددهای پخش FM را در آن بگذار، درمی‌آید <span class=\"q\">2 × (75 + 15) = 180 kHz</span>. به همین دلیل کانال‌های FM دویست کیلوهرتز از هم فاصله دارند، و به همین دلیل دیال می‌رود ۸۸٫۱ و ۸۸٫۳ و ۸۸٫۵. مردی که قضیه‌اش گفت این کار بی‌فایده است، همان مردی است که نامش روی فرمولی است که کل صنعت با آن باند را می‌چیند.",
      "s3.h21": "<span class=\"secnum\">04</span> چرا پهن یعنی ساکت",
      "s4.p1": "حالا آن بخشی که مقالهٔ کارسون پوششش نداد. آن مقاله‌ای دربارهٔ bandwidth بود، و این حرفی است دربارهٔ هندسه.",
      "s4.p2": "سیگنال دریافتی را مثل یک فلش بکش — یک phasor — با یک طول و یک زاویه. FM طول را ثابت نگه می‌دارد و زاویه را تکان می‌دهد: نوکش روی یک دایره می‌دود و هیچ‌وقت از آن بیرون نمی‌رود. نویز فلش دومی است، خیلی کوتاه‌تر، که به نوک اولی چسبیده و تصادفی دور خودش می‌چرخد. گیرنده هیچ‌وقت چیزی جز جمع این دو را نمی‌بیند. سؤال این است که فلش کوچک چقدر از <em>زاویه</em> را می‌تواند بدزدد.",
      "s4.sum2": "یک لحظه — phasor یعنی چه؟",
      "s4.p8": "یک حقهٔ دفترداری، و مفیدترین حقهٔ کل رادیو. یک موج سینوسی یکنواخت فقط دو خاصیت دارد که ارزش ردگیری داشته باشد: چقدر بلند است، و الان کجای چرخه‌اش است. پس بکشش به شکل <b>یک فلش</b>. طول یعنی ارتفاع موج، زاویه یعنی کجای چرخه است. کل فلش با فرکانس carrier دور می‌زند، و تو قرار می‌گذاری دیگر به چرخش نگاه نکنی و فقط آنچه از آن می‌ماند را ببینی.",
      "s4.p9": "سودش این است که جمع کردن دو موج می‌شود جمع کردن دو فلش، نوک به ته. و این چیزی است که می‌شود دیدش. حرف شکل پایین هم همین است: یک فلش بزرگ برای سیگنال، یک کوچک برای نویز که به نوکش چسبیده، و این سؤال که کوچک چقدر می‌تواند جمع را بپیچاند.",
      "s4.p3": "خیلی کم. و نکتهٔ اصلی اینجاست: <b>اینکه چقدر می‌دزدد، هیچ ربطی ندارد به اینکه زاویهٔ خود سیگنال چقدر نوسان می‌کند.</b> فلش نویز همان‌قدر بلند است که هست. جمع را تقریباً به اندازهٔ طول خودش تقسیم بر طول سیگنال کج می‌کند، و تمام.",
      "s4.p4": "پس سیگنال را بیشتر بچرخان. سهم نویز دقیقاً همان‌جا می‌ماند که بود، و آنچه با آن مقایسه‌اش می‌کنی بزرگ‌تر می‌شود. نوسان را دو برابر کن، نویز را نصف کرده‌ای. در تنها معنایی که اهمیت دارد.",
      "s4.span1": "شکل ۲",
      "s4.span2": "کل معامله، به شکل یک مثلث",
      "s4.span3": "سیگنال چقدر می‌چرخد",
      "s4.span4": "carrier روی نویز",
      "s4.cap1": "آبی سیگنال است، که دارد کمانی را جارو می‌کند که پیام دورش می‌چرخاندش. دایرهٔ خط‌چین روی نوکش همهٔ جاهایی است که نویز می‌تواند بگذاردش. فلش خاکستری جایی است که نویز همین لحظه گذاشته است، و آن خط‌چین تا مبدأ تنها چیزی است که گیرنده واقعاً گیرش می‌آید. حالا لغزندهٔ بالا را بکش. <b>دایرهٔ کوچک اندازه‌اش عوض نمی‌شود</b>، فقط کمان عوض می‌شود. کل اختراع همین است: آن دو میلهٔ سمت راست همان دو کمیت‌اند، و پهن کردن نوسان دقیقاً یکی از آن‌ها را پهن می‌کند. بعد لغزندهٔ پایینی را بیاور زیر حدود <span class=\"q\">6 dB</span>. دایرهٔ نویز آن‌قدر بزرگ می‌شود که از آن سوی مبدأ رد می‌شود، و از همان‌جا گیرنده دیگر نمی‌فهمد phasor از کدام طرف چرخیده. معامله فرومی‌ریزد.",
      "s4.p5": "دقیق بودن سر این ماجرا یک ضریب دیگر هم خرج برمی‌دارد. discriminator ای که زاویه را دوباره به صدا تبدیل می‌کند با مشتق گرفتن کار می‌کند، و مشتق فرکانس‌های بالا را بزرگ می‌کند. پس نویزی که از یک گیرندهٔ FM بیرون می‌آید صاف نیست؛ با فرکانس بالا می‌رود و شکلی مثلثی می‌گیرد که مهندس‌ها به آن <em>triangular noise</em> می‌گویند. حسابش را که بکنی، سود با مجذور β مقیاس می‌خورد: <b>هر دو برابر کردن نوسان حدود شش دسی‌بل می‌خرد.</b>",
      "s4.sum1": "ارزان‌ترین چارهٔ کل رادیوی پخشی",
      "s4.p6": "نویز طرف بالای باند صوتی بدتر می‌شود، و زیرِ موسیقی هم آن بالا آرام‌تر است. پس حرکت بدیهی این است که پیش از فرستادن زیر را بیاوری بالا، و سر خروجی دوباره ببری‌اش پایین. آن تقویت سر ورودی می‌شود <b>pre-emphasis</b> و آن برش متناظر سر خروجی می‌شود <b>de-emphasis</b>. و چون نویز فقط وسط این دو اضافه می‌شود، آن برش هیس را هم با خودش پایین می‌برد و موسیقی را همان‌جا که بود می‌گذارد.",
      "s4.p7": "چیزی حدود ۱۳ دسی‌بل دیگر می‌خرد، و خرجش سر هر طرف یک مقاومت است و یک خازن. ثابت زمانی‌اش در قارهٔ آمریکا <span class=\"q\">75 µs</span> است و در بیشتر بقیهٔ دنیا <span class=\"q\">50 µs</span>. از همان جزئیاتی که تا وقتی نخواهی در هر دو جا رادیو بفروشی، بی‌اهمیت به نظر می‌آید.",
      "s4.h21": "<span class=\"secnum\">05</span> سکوت، خریداری‌شده",
      "s5.p1": "هندسه بس است. همان پیام، همان توان فرستنده، همان طوفان، دو گیرنده.",
      "s5.sum1": "لغزندهٔ «رسیده» دقیقاً چه چیزی را می‌سنجد",
      "s5.p4": "منصفانه مقایسه کردن دو روش سخت‌تر از چیزی است که به نظر می‌آید، چون جای یکسانی اشغال نمی‌کنند. سیگنال را در برابر نویز <em>در bandwidth خود هر کدام</em> اعلام کن: پهن، پیش از آنکه کاری کرده باشد بدتر به نظر می‌آید، صرفاً به جرم پهن بودن. در برابر نویزِ یک برش ثابت اعلامش کن: بی‌سروصدا جواب را از پیش فرض کرده‌ای.",
      "s5.p5": "پس لغزنده با تنها واحدی تنظیم شده که طرف کسی را نمی‌گیرد. <b>توان دریافتی در برابر نویزِ داخل یک bandwidth پیام</b>: یعنی چقدر سیگنال می‌رسد، به ازای هر واحد از آنچه فرستاده می‌شود. هر دو روش همان توان فرستنده و همان آسمان را می‌گیرند. اینکه هر کدام با bandwidth اش چه می‌کند، دیگر جواب پس دادنش با خودش است.",
      "s5.p2": "شکل پایین شبیه‌سازی واقعی هر دوست. نویز به سیگنال اضافه می‌شود، بعد یک طرف از یک envelope detector واقعی رد می‌شود و طرف دیگر از یک discriminator واقعی، و خروجی در برابر همان گیرنده که در سکوت کار می‌کند سنجیده می‌شود. هیچ چیزی در آن منحنیِ کشیده‌شده از روی کتاب درسی نیست.",
      "s5.span1": "شکل ۳",
      "s5.span2": "همان طوفان، دو بار",
      "s5.span3": "سیگنال روی نویز، رسیده",
      "s5.amlbl": "· AM",
      "s5.fmlbl": "· FM",
      "s5.note1": "صدا دارد. اول صدا را کم کن، بعد یکی و بعد آن یکی را بزن.",
      "s5.cap1": "ردیف بالا amplitude modulation است و ردیف پایین frequency modulation، با همان βی که خودت انتخاب می‌کنی. هر دو با همان توان می‌فرستند، هر دو با همان نویز خورده‌اند، و هر کدام در برابر نسخهٔ خط‌چین خودشان در شرایط عالی کشیده شده‌اند. لغزنده را بگذار حدود <b><span class=\"q\">26 dB</span></b> و دو دکمهٔ شنیدن را پشت هم بزن. همان مقایسه‌ای است که جمعیتی سال ۱۹۳۵ در اتاقی در نیویورک کردند. منبع را بگذار روی <b>«موسیقی»</b>، دیگر اصلاً بحثی نمی‌ماند. بعد β را از ۱ تا ۸ قدم بده و ببین ردیف پایین تمیز می‌شود و ردیف بالا اصلاً تکان نمی‌خورد. چون AM اصلاً β ندارد. پیچی ندارد که بچرخاند. چیزی ندارد که خرج کند.",
      "s5.h21": "<span class=\"secnum\">06</span> پرتگاه",
      "s6.p1": "هر معامله‌ای در مهندسی یک بند ریزنوشته ته‌اش دارد، و بند این یکی حسابی تماشایی است.",
      "s6.p2": "برگرد به دو فلش. هر چه تا اینجا گفتیم تکیه داشت به اینکه فلش نویز خیلی کوتاه‌تر از فلش سیگنال است، طوری که فقط بتواند زاویه را تکانی بدهد. حالا بگذار نویز آن‌قدر بزرگ شود که هم‌قد شود. اتفاقی کاملاً متفاوت شروع می‌شود: هرازگاهی جمع این دو از <em>طرف اشتباه مبدأ</em> رد می‌شود، و phasor به‌جای اینکه بلرزد یک دور کامل می‌زند. و discriminator که اندازه می‌گیرد زاویه چقدر عوض شده، همین را یک دور کامل اضافه گزارش می‌دهد. یک ضربه، یک سوزن، یک <b>click</b>.",
      "s6.p3": "click ها متناسبِ هیچ چیز نیستند. یک قلهٔ نویز که جای اشتباه بیفتد، یک بنگ تمام‌اندازه تولید می‌کند، فارغ از اینکه بقیهٔ چیزها چقدر ساکت‌اند. هر چه سیگنال ضعیف‌تر می‌شود بلندتر نمی‌شوند، <em>پرتکرارتر</em> می‌شوند. و تندتر از آن می‌رسند که بهتر شدنِ نرمِ معامله بتواند جذبشان کند.",
      "s6.span1": "شکل ۴",
      "s6.span2": "نقطهٔ کار را بکش تا از لبه رد شود",
      "s6.span3": "سیگنال روی نویز، رسیده",
      "s6.note1": "صدا دارد. اول صدا را کم کن — click ها بلندند.",
      "s6.cap1": "هر منحنی بیست‌وشش بار اجرای گیرنده است در بیست‌وشش سطح نویز، اندازه‌گرفته‌شده و نه کشیده‌شده از روی فرمول. به همین دلیل خط FM کمی ناصاف است، و به همین دلیل knee هر جا خودش می‌افتد می‌افتد، نه جایی که کسی گذاشته باشدش. خاکستریِ خط‌چین AM است: کسل‌کننده، صاف، بی‌غافلگیری، و هر جا که اجازه داشته باشد بدتر. آبی FM است که خیلی بالاتر از آن می‌رود، تا وقتی که از لبهٔ دنیا می‌افتد. <b>روی شکل بکش و دو سرش گوش بده</b>، با <b>«موسیقی»</b> انتخاب‌شده. بالای knee یک ضبط است. زیرش همان ضبط هنوز هست، فقط زیر رگباری از click که در آن نبود. سر <span class=\"q\">25 dB</span>، FM نزدیک بیست دسی‌بل جلوست. سر <span class=\"q\">15 dB</span> دارد می‌بازد. β را هر چه بالاتر بگذاری جلوتر می‌افتد، و — دقت کن — <b>پرتگاه زودتر می‌رسد.</b> نمی‌شود سکوت خرید و لبه را نخرید.",
      "s6.p4": "آن پرتگاه چیزی را توضیح می‌دهد که هر شنونده‌ای بی‌آنکه نامش را بلد باشد می‌داندش. یک ایستگاه AM ضعیف صدایی است در هیس: زور می‌زنی و بیشترش را می‌گیری. یک ایستگاه FM ضعیف عالی است، عالی است، عالی است، بعد نیست. زوری در کار نیست؛ چیزی نیست که بشود برایش زور زد.",
      "s6.p5": "همان تندی شیب اثر دیگری هم می‌سازد، و نام این یکی را مردم در حرف روزمره هم به کار می‌برند. اگر دو ایستگاه FM روی یک فرکانس بیفتند و یکی حتی اندکی قوی‌تر باشد، discriminator همان قوی‌تر را دنبال می‌کند و ضعیف‌تر صرفاً وجود ندارد. نه قاطی‌پاتی — <em>سکوت</em> از طرف بازنده. به آن می‌گویند <b>capture effect</b>، و به همین دلیل است که می‌توانی بین دو شهر روی یک فرکانس FM رانندگی کنی و به‌جای یک آشغال، تحویلی تمیز بشنوی.",
      "s6.box1": "<b>و دقیقاً به همین دلیل هواپیماها هنوز AM به کار می‌برند.</b> کنترل ترافیک هوایی، روی <span class=\"q\">118–137 MHz</span>، سال ۲۰۲۶ هم amplitude modulation است، و این از سر غفلت نیست. در AM، دو خلبان که هم‌زمان بفرستند جیغ heterodyne گوش‌خراشی تولید می‌کنند و همه فوراً می‌فهمند اتفاقی افتاده. در FM، قوی‌تر کانال را capture می‌کرد و ضعیف‌تر بی‌هیچ ردی محو می‌شد. از جمله، مثلاً، هواپیمایی که دارد وضعیت اضطراری اعلام می‌کند درست وقتی یکی دیگر دارد مجوزی را تکرار می‌کند. <em>عیبِ</em> قسمت اول اینجا ویژگی ایمنی است. کسی قرار نیست عوضش کند.",
      "s6.h21": "<span class=\"secnum\">07</span> مردی که پرید",
      "s7.p1": "آرمسترانگ FM را از آنتنی روی ساختمان امپایر استیت آزمایش می‌کرد، روی جایی که دوست قدیمی‌اش دیوید سارنوف — رئیس RCA — برایش جور کرده بود. سال ۱۹۳۵ RCA از او خواست دستگاه‌هایش را جمع کند. دکل را برای تلویزیون لازم داشتند.",
      "s7.p2": "همان‌جاست که قصه می‌چرخد، و می‌ارزد دقیق بگوییم چرا. کسب‌وکار RCA همان AM بود: فرستنده، گیرنده، patent، شبکه‌های وابسته، کل بساط پخش رادیویی آمریکا. یک روش modulation بهتر برای آن‌ها فرصت نبود. حکم منسوخ شدن بود، که تازه باید پولش را هم به آرمسترانگ می‌دادند.",
      "s7.p3": "پس ایستگاه خودش را ساخت. با پول خودش در آلپاین نیوجرسی دکلی زد، و تا ۱۹۴۰ ایستگاه FM بود و گیرندهٔ FM بود و مخاطبی کوچک و پرشور که شنیده بود رادیو قرار بوده چه صدایی بدهد. و ژوئن ۱۹۴۵ کمیسیون FCC، بعد از جلساتی که RCA در آن‌ها سرسختانه و با استدلال‌های فنی‌ای که بعداً بی‌اعتبار شدند گفت باند موجود مناسب نیست، FM را از <span class=\"q\">42–50 MHz</span> برد بالا روی <span class=\"q\">88–108 MHz</span>.",
      "s7.p4": "همهٔ گیرنده‌های FM آمریکا، حدود نیم میلیون دستگاه، یک روز با هم از کار افتادند. هر ایستگاهی باید کل تجهیزاتش را عوض می‌کرد. مخاطبی که آرمسترانگ ده سال و بیشتر ثروتش را پای ساختنش گذاشته بود، با یک تصمیم اداری پاک شد.",
      "s7.p5": "نُه سال بعدی را در دادگاه گذراند. RCA تا آن موقع FM را در تلویزیون‌هایش هم به کار برده بود — صدای تلویزیون FM است و همیشه بوده — و مدعی بود مهندس‌هایش خودشان مستقلاً اختراعش کرده‌اند. دعوای حقوقی هر چه از پولش مانده بود را خورد، و به روایت همه، خود آن مرد را هم. سی‌ویکم ژانویهٔ ۱۹۵۴ برای همسرش ماریون یادداشتی نوشت و بابت دردی که به او داده بود عذرخواهی کرد، و از پنجرهٔ آپارتمان طبقهٔ سیزدهمشان در نیویورک بیرون رفت.",
      "s7.p6": "ماریون آرمسترانگ پرونده‌ها را برداشت و تک‌تکشان را برد. RCA همان سال مصالحه کرد، و آخرینشان ۱۹۶۷ بسته شد. رأی‌ها یک‌صدا بودند و همه‌شان دیر. که تنها پایانی بود که این قصه می‌توانست داشته باشد.",
      "s7.box1": "دربارهٔ فیزیک حق با او بود، دربارهٔ صدا حق با او بود، دربارهٔ patent ها حق با او بود، در دادگاه هم حق با او بود. هیچ‌کدام کوچک‌ترین فرقی در آنچه بر سرش آمد نکرد.",
      "s7.h21": "<span class=\"secnum\">08</span> پیچ‌ها هیچ‌وقت نرفتند",
      "s8.p1": "آخرش FM برد، کامل و بی‌سروصدا. و روشی که سال ۱۹۶۱ استریو را در خودش جا داد یک شکل جدا می‌ارزد، چون یکی از بهترین کارهای مهندسیِ backwards-compatible است که تا حالا کسی کرده.",
      "s8.p2": "آن موقع میلیون‌ها رادیوی FM مونو در خانه‌ها بود و هیچ‌کدام را نمی‌شد جمع کرد. پس سیستم استریو طوری طراحی شد که آن‌ها اصلاً متوجه نشوند. <b>L + R</b> را در باند صوتی معمولی بفرست، جایی که یک دستگاه مونو پیدایش می‌کند و به‌عنوان یک برنامهٔ مونوی کاملاً سالم پخشش می‌کند. بعد <b>L − R</b> را بالای باند صوتی پنهان کن، روی یک subcarrier سرکوب‌شده در <span class=\"q\">38 kHz</span>. همان DSB-SC، دقیقاً همان چیزی که قسمت اول گفت رادیوی پخشی هیچ‌وقت به کارش نمی‌برد، که اینجا دقیقاً <em>به همین دلیل</em> به کار رفته که یک گیرندهٔ ساده نمی‌تواند آشکارش کند. یک دستگاه استریو این دو را با هم جمع و از هم کم می‌کند و L و R را پس می‌گیرد. و یک دستگاه مونو آن بالا اصلاً هیچ نمی‌شنود.",
      "s8.span1": "شکل ۵",
      "s8.span2": "استریو، قاچاق‌شده از جلوی چشم یک میلیون رادیوی قدیمی",
      "s8.span3": "کانال چپ",
      "s8.span4": "کانال راست",
      "s8.lbl1": "<input type=\"checkbox\" id=\"mpxMono\"> با یک دستگاه مونوی ۱۹۵۹ گوش بده",
      "s8.cap1": "آنچه واقعاً carrier را مدوله می‌کند صدا نیست؛ کل این پشته است، که به آن composite یا MPX می‌گویند. خط خط‌چین روی <span class=\"q\">15 kHz</span> جایی است که یک گیرندهٔ قدیمی از شنیدن دست می‌کشید، و هر چه سمت راستش هست طوری انتخاب شده که آن سوی همان خط زندگی کند. آن سوزن کوچک روی <span class=\"q\">19 kHz</span> همان <b>pilot</b> است: بالاتر از آن است که شنیده شود، و تنها کارش این است که به یک دستگاه استریو بگوید استریو هست و ۳۸ کیلوهرتز کجاست. دو کانال را متفاوت بگذار، نوار تفاضل بزرگ می‌شود. برابرشان کن، کاملاً محو می‌شود — و به همین دلیل یک برنامهٔ مونو روی یک ایستگاه استریو هیچ خرج اضافه‌ای ندارد. <b>تیک جعبه را بزن</b> تا همان‌طور بشنوی‌اش که ۱۹۵۹ می‌شنید. برنامه هنوز سر جایش است؛ فقط دیگر در دو جا نیست.",
      "s8.p3": "همین حقه دههٔ ۱۹۸۰ دوباره زده شد. RDS، همان چیزی که نام ایستگاه را روی نمایشگر ماشینت می‌آورد، سوار subcarrier دیگری روی <span class=\"q\">57 kHz</span> است — سه برابر pilot — و برای هر چه پیش از آن آمده به همان اندازه نامرئی است.",
      "s8.p4": "و بعد عجیب‌ترین زندگیِ پس از مرگِ کل ماجرا. سال ۱۹۶۷ آهنگ‌سازی در استنفورد به نام جان چاونینگ داشت با vibrato روی کامپیوتر ور می‌رفت. نرخ modulation را برد بالاتر از جایی که یک لرزش تبدیل به یک تُن می‌شود، و sideband ها را شنید. ریاضیات آرمسترانگ را دوباره کشف کرده بود، این بار به‌عنوان راهی برای ساختن صداهایی که کسی نشنیده بود. استنفورد لیسانسش را به یاماها داد؛ DX7 سال ۱۹۸۳ عرضه شد و پرفروش‌ترین سینتی‌سایزر تاریخ شد. هر پیانوی الکتریک شیشه‌ایِ هر آلبوم آن دهه J<sub>n</sub>(β) است.",
      "s8.p5": "و یک تصویر می‌ماند. سیگنال فرستاده‌شده را نه به شکل یک موج، بلکه به شکل یک نقطهٔ واحد روی یک صفحه بکش: چقدرش هم‌گام با یک نوسان‌ساز مرجع است، و چقدرش یک‌چهارم چرخه عقب‌تر. هر روشی که در این دو مقاله آمده، راه متفاوتی است برای حرکت دادن همان یک نقطه.",
      "s8.span5": "شکل ۶",
      "s8.span6": "همه‌چیز، روی یک صفحه",
      "s8.p6": "<b>AM</b> نقطه را روی یک خط جلو و عقب می‌برد، و کل اطلاعات در فاصله از مبدأ است. <b>PM</b> و <b>FM</b> فاصله را ثابت نگه می‌دارند و روی کمان می‌چرخانندش. <b>SSB</b> با نرخ ثابت دور یک دایره می‌بردش، و به همین دلیل envelope ای ندارد که آشکار شود. و <b>QAM</b> — هر مودم، هر لینک وای‌فای، هر سیگنال تلویزیون دیجیتال — دست از تظاهر به فرق داشتن این دو برمی‌دارد و نقطه را هر جا دلش خواست می‌پراند.",
      "s8.cap2": "یک نقطه، یک صفحه، و موجی که سمت راست از آن درمی‌آید. پیچ‌های بخش دوم قسمت اول هنوز دقیقاً همان دو پیچ‌اند — چقدر دور، و از کدام طرف. تنها چیزی که صد سال عوض کرده این است که یک رادیو حالا نقطه را مستقیم حرکت می‌دهد، با یک جفت DAC، به‌جای اینکه برای هر ایده یک مدار بسازد. سهم آرمسترانگ در این تصویر همین مشاهده است که کمان جای بسیار امن‌تری برای نوشتن است تا شعاع.",
      "s8.box1": "طبیعت با دامنه می‌نویسد. پس تو ننویس.",
      "s8.span7": "قبلی",
      "s8.span8": "<a href=\"../hiding-a-voice-am/\">قسمت اول — AM و دردسر دامنه</a>. اینکه چرا یک صدا اصلاً carrier لازم دارد، یک دیود و یک خازن به‌تنهایی چه می‌کنند، و آن دوسوم دیگر فرستنده کجا می‌رود.",
      "s8.h32": "منابع و خواندن بیشتر",
      "s8.li1": "J. R. Carson, “Notes on the Theory of Modulation,” <em>Proceedings of the IRE</em>, vol. 10, no. 1, Feb. 1922 — خود اثبات، و سرچشمهٔ قاعدهٔ bandwidth ای که نام او را دارد.",
      "s8.li2": "E. H. Armstrong, “A Method of Reducing Disturbances in Radio Signaling by a System of Frequency Modulation,” <em>Proceedings of the IRE</em>, vol. 24, no. 5, May 1936 — جواب، نوشته‌شده یک سال بعد از آن نمایش.",
      "s8.li3": "L. Lessing, <em>Man of High Fidelity: Edwin Howard Armstrong</em>, Lippincott, 1956 — زندگی‌نامهٔ استاندارد، دو سال بعد از مرگش نوشته شده و هوادار خودش است.",
      "s8.li4": "T. Lewis, <em>Empire of the Air: The Men Who Made Radio</em>, HarperCollins, 1991 — دو فارست و سارنوف و آرمسترانگ کنار هم، که تنها شکلی است که این قصه معنی می‌دهد.",
      "s8.li5": "J. M. Chowning, “The Synthesis of Complex Audio Spectra by Means of Frequency Modulation,” <em>Journal of the Audio Engineering Society</em>, vol. 21, no. 7, 1973.",
      "s8.li6": "A. B. Carlson, <em>Communication Systems</em>, 5th ed., McGraw-Hill — فصل‌های ۵ و ۱۰، برای طیف Bessel، آستانه، و مدل click هایی که پشت شکل ۴ نشسته.",
      "s8.span9": "© ۲۰۲۶ حسن کشت‌کار · <span class=\"mono-label\">hkk.fyi</span>",
      "s8.span10": "ساخته‌شده با عشق <span class=\"heart\" aria-hidden=\"true\">♥</span> و هوش مصنوعی :)))",
      "meta.title": "پنهان کردن یک صدا در یک موج — FM و بهای سکوت · hkk.fyi",
      "meta.description": "سال ۱۹۲۲ یک اثبات گفت frequency modulation بی‌فایده است، و اثبات درست بود. سال ۱۹۳۳ آرمسترانگ با تنها کاری که به فکر کسی نرسیده بود به کارش انداخت: خرج کردن bandwidth، به‌جای صرفه‌جویی در آن. شش شکل تعاملی، سه تاش صدادار. قسمت دوم از دو.",
      "meta.og:title": "پنهان کردن یک صدا در یک موج — FM و بهای سکوت",
      "meta.og:description": "توابع Bessel، carrier ای که غیب می‌شود، چرا پهن یعنی ساکت، پرتگاهی که ته معامله است، و مردی که به خاطرش از پنجره پرید.",
      "meta.og:image:alt": "یک phasor روی یک دایره که ردش جمع و باز می‌شود، کنار عنوان مقاله.",
      "js.src.voice": "مصنوعی",
      "js.src.music": "موسیقی",
      "js.yes": "بله",
      "js.no": "نه",
      "js.audio.listen": "گوش بده",
      "js.audio.stop": "توقف",
      "js.audio.wait": "در حال ساخت…",
      "js.audio.failed": "این مرورگر دستگاه صدا را باز نکرد.",
      "js.share.copy_link": "کپی لینک",
      "js.share.copied": "کپی شد",
      "js.share.press": "⌘C را بزن",
      "js.beta.xaxis": "فرکانس، هرتز",
      "js.beta.yaxis": "دامنه",
      "js.beta.carson": "Carson's rule:",
      "js.beta.gone": "carrier رفت",
      "js.beta.null": "صفر",
      "js.beta.narrow": "narrowband",
      "js.beta.wide": "FM پخشی",
      "js.beta.ro_b": "modulation index",
      "js.beta.ro_dev": "نوسان فرکانس",
      "js.beta.ro_j0": "ارتفاع carrier ، J₀(β)",
      "js.beta.ro_pairs": "جفت‌های sideband مهم",
      "js.beta.ro_carson": "bandwidth لازم",
      "js.beta.ro_sum": "جمع همهٔ توان‌ها",
      "js.ph.bar1": "نوسان خود سیگنال",
      "js.ph.bar2": "آنچه نویز می‌دزدد",
      "js.ph.click": "نویز حالا می‌تواند از آن سوی مبدأ رد شود — این یعنی click",
      "js.ph.ro_swing": "سیگنال می‌چرخد به اندازهٔ",
      "js.ph.ro_noise": "نویز کجش می‌کند",
      "js.ph.ro_ratio": "نسبت",
      "js.ph.ro_enc": "احتمال رد شدن از carrier",
      "js.ph.never": "عملاً هیچ‌وقت",
      "js.quiet.l_am": "AM · خط‌چین = همان گیرنده در سکوت",
      "js.quiet.l_fm": "FM · خط‌چین = همان گیرنده در سکوت",
      "js.quiet.ro_g": "رسیده",
      "js.quiet.ro_bw": "bandwidth FM، نسبت به AM",
      "js.quiet.ro_am": "AM درمی‌آید",
      "js.quiet.ro_fm": "FM درمی‌آید",
      "js.quiet.ro_win": "FM جلوتر است به اندازهٔ",
      "js.cliff.xaxis": "سیگنال روی نویزِ رسیده، dB",
      "js.cliff.yaxis": "سیگنال روی نویزِ خروجی، dB",
      "js.cliff.am": "AM",
      "js.cliff.above": "بالای knee",
      "js.cliff.below": "آن سوی لبه",
      "js.cliff.ro_g": "رسیده",
      "js.cliff.ro_am": "AM درمی‌آید",
      "js.cliff.ro_fm": "FM درمی‌آید",
      "js.cliff.ro_win": "FM جلوتر است به اندازهٔ",
      "js.cliff.ro_bw": "bandwidth خرج‌شده، نسبت به AM",
      "js.cliff.ro_knee": "knee می‌افتد روی",
      "js.cliff.ro_st": "تو کجایی",
      "js.mpx.xaxis": "فرکانس در سیگنال composite، کیلوهرتز",
      "js.mpx.sum": "L + R · برنامهٔ مونو",
      "js.mpx.pilot": "pilot",
      "js.mpx.dif": "L − R، روی subcarrier سرکوب‌شدهٔ ۳۸ کیلوهرتز",
      "js.mpx.rds": "RDS",
      "js.mpx.oldset": "هر چه یک گیرندهٔ ۱۹۵۹ می‌توانست بشنود",
      "js.mpx.deaf": "تا جایی که به دستگاه قدیمی مربوط است، هیچ‌کدام از این‌ها وجود ندارد",
      "js.mpx.l_comp": "سیگنال composite، در زمان",
      "js.mpx.l_mono": "آنچه دستگاه مونو پخش می‌کند · کم‌رنگ = کل composite",
      "js.mpx.ro_l": "چپ",
      "js.mpx.ro_r": "راست",
      "js.mpx.ro_sum": "L + R",
      "js.mpx.ro_dif": "L − R",
      "js.mpx.ro_hear": "شنونده می‌گیرد",
      "js.mpx.h_mono": "یک کانال، همه‌اش",
      "js.mpx.h_st": "دو کانال",
      "js.iq.am": "AM",
      "js.iq.pm": "PM",
      "js.iq.fm": "FM",
      "js.iq.ssb": "SSB",
      "js.iq.qam": "16-QAM",
      "js.iq.n_am": "روی یک خط",
      "js.iq.n_pm": "روی یک کمان",
      "js.iq.n_fm": "روی یک کمان، با نرخ متغیر",
      "js.iq.n_ssb": "دور یک دایره، یکنواخت",
      "js.iq.n_qam": "هر جا دلش بخواهد",
      "js.iq.wave": "موجی که بیرون می‌آید",
      "js.iq.ro_path": "نقطه حرکت می‌کند",
      "js.iq.ro_amp": "پیام در طول است",
      "js.iq.ro_ang": "پیام در زاویه است"
    }
  };

  var LANG_KEY = 'hkk-lang';
  var SCROLL_KEY = 'hkk-scroll';
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
      if (el.tagName === 'LABEL') {
        /* keep the live <input>, swap only the words around it */
        var keep = [].slice.call(el.querySelectorAll('input, textarea, select'));
        el.innerHTML = val;
        if (keep.length && !el.querySelector('input, textarea, select')) {
          el.insertBefore(document.createTextNode(' '), el.firstChild);
          for (var i = keep.length - 1; i >= 0; i--) el.insertBefore(keep[i], el.firstChild);
        }
        return;
      }
      el.innerHTML = val;
    });

    function meta(sel, key) {
      var m = document.querySelector(sel);
      if (m && pack[key]) m.setAttribute('content', plain(pack[key]));
    }
    meta('title', 'meta.title');
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

  /* Several figures build their buttons and readout labels once, at start-up,
     so switching language reloads. Remember where the reader was and put them
     back, which makes the reload almost invisible. */
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
     the figures are built with the right language the first time. */
  applyLang(current());
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-lang-set]').forEach(function (b) {
      b.addEventListener('click', function () { switchTo(b.getAttribute('data-lang-set')); });
    });
    restoreScroll();
  });
})(window);
