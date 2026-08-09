/* ============================================================
   Every word the page can say.

   Keys say where they sit: s3.p2 is the second paragraph of section 3,
   s6.cap1 the caption under section 6's figure, js.* is anything the figures
   draw or announce themselves. meta.* rewrites the <head> so a shared link
   carries the right language too.

   The English here is the same English that is written into index.html, so
   the article still reads with JavaScript switched off. Regenerate this half
   rather than retyping it — the extractor that produced it walks index.html
   and lifts every data-i18n element's inner HTML verbatim.

   THE PERSIAN SIDE IS DELIBERATELY EMPTY. t() falls back to the English
   entry, so nothing breaks in the meantime, and the EN/FA switch is left out
   of the topbar until there is a second language to switch to — an article
   that offers Persian and then serves English is worse than one that does
   not offer it. To add it: fill in `fa` below with the same keys, then paste
   the .lang-switch block back into the header of index.html, next to
   #themeBtn, exactly as posts/smith-chart/index.html has it.

   Two rules the Persian side will need to keep to, when it arrives:
     · numbers in running prose are Persian  — ۱۹۰۶، سه هزار کیلومتر
     · numbers glued to a Latin unit, or inside a formula, stay Latin
       — 50 Ω, 9 kHz, m = 1 — wrapped in <span class="q"> so that RTL
       punctuation can never drift into the middle of them
   ============================================================ */
(function (global) {
  'use strict';
  var DICT = {
    en: {
      "hero.title1": "Hiding a voice inside a wave — AM, and the trouble with amplitude · hkk.fyi",
      "hero.a1": "Skip to content",
      "hero.a2": "Lab",
      "hero.a3": "Writing",
      "hero.a4": "CV",
      "hero.a5": "Contact",
      "start.span1": "ESSAY · RADIO · PART ONE OF TWO · ~15 MIN · 6 LIVE FIGURES, 3 OF THEM AUDIBLE",
      "start.h11": "Hiding a voice inside a wave",
      "start.p1": "Say something out loud. Whatever just came out of you was air moving at a few hundred wobbles a second. To send that straight into an antenna you would need an antenna about seventy-five kilometres long, and even then there would be only one channel in the world and everybody would be on it. <br><br> So we do something stranger. We take a wave far too fast to hear, and we let the voice push it around. The voice never travels. What travels is a much faster wave that has been <em>bothered</em> in the shape of a voice. <br><br> There are exactly three ways to bother it, and the first one is the one that got there first, that you can receive with a rusty razor blade, and that loses to a thunderstorm every single time. <b>You do not need a radio background.</b> Every figure below is alive — drag it, break it, and where you see a speaker, listen to it.",
      "start.cap1": "A VOICE, RIDING",
      "start.span2": "HASSAN KESHTKAR",
      "start.span3": "TEHRAN",
      "start.span4": "2026",
      "start.a1": "← back to hkk.fyi",
      "start.span5": "SHARE",
      "start.span6": "Copy link",
      "start.share": "Share…",
      "start.span7": "THE WHOLE ARTICLE IN 30 SECONDS",
      "start.li1": "A voice is too slow to radiate and too crowded to share. So it gets carried: a fast, boring wave does the travelling, and the voice only decides <em>what the fast wave looks like</em>.",
      "start.li2": "A sine wave offers exactly three things you are allowed to change — how tall, how fast, and where in its cycle it is. Pick one, wiggle it with the message, and you have invented a kind of radio.",
      "start.li3": "Wiggle the height, and the message is drawn along the top of the carrier as an <b>envelope</b>. A diode and a capacitor can read it back. That is genuinely all the receiver has to be, and it is why AM won first.",
      "start.li4": "The bill comes twice. At full modulation <b>two thirds of the transmitter's power is in a carrier that carries nothing</b> — and it stays there so the receiver can stay stupid.",
      "start.li5": "The second bill is fatal. Lightning, engines, and the sun all write in amplitude, and AM's message <em>is</em> amplitude. The detector cannot tell them apart, so it passes both on. <b>That is static, and there is no fixing it from inside AM.</b>",
      "start.p2": "Still here? Good — the rest is the story, six things you can drag, and three you can hear.",
      "start.span8": "CONTENTS",
      "start.li6": "<a href=\"#s1\">A voice with nowhere to go</a>",
      "start.li7": "<a href=\"#s2\">A sine wave has exactly three knobs</a>",
      "start.li8": "<a href=\"#s3\">The message rides the envelope</a>",
      "start.li9": "<a href=\"#s4\">A diode, a capacitor, and a razor blade</a>",
      "start.li10": "<a href=\"#s5\">The bill for a cheap receiver</a>",
      "start.li11": "<a href=\"#s6\">Two sidebands, and one costume change too many</a>",
      "start.li12": "<a href=\"#s7\">Static</a>",
      "start.li13": "<a href=\"#s8\">The trouble with amplitude</a>",
      "start.h21": "<span class=\"secnum\">01</span> A voice with nowhere to go",
      "s1.p1": "On Christmas Eve 1906, so the story goes, radio operators on ships off the coast of Massachusetts put on their headphones expecting the usual — the clicking of Morse code, which was the only thing radio had ever said to anybody — and instead heard a man read from the Gospel of Luke, play <em>O Holy Night</em> on a violin, and wish them a merry Christmas.",
      "s1.p2": "The man was Reginald Fessenden, broadcasting from Brant Rock. It is one of the best stories in engineering, and it is worth saying plainly that the evidence for that particular evening is thin: the account comes from a letter Fessenden wrote twenty-six years later, and nobody has ever found a ship's log that mentions it. What is not in doubt is the underlying achievement. Fessenden really did send speech by radio, he did it years before anyone else managed it convincingly, and the machine he did it with was a monster: an alternator, essentially a power-station generator built by Ernst Alexanderson at General Electric, spun fast enough to make a steady radio wave instead of mains electricity.",
      "s1.p3": "Which raises the question nobody usually asks. Why did he need the alternator at all? A microphone already turns a voice into a wiggling voltage. Why not simply connect the microphone to the antenna?",
      "s1.p4": "Two reasons, and the first is the one everyone quotes. An antenna has to be a respectable fraction of the wave it is radiating, and the usual number is a quarter. A 1 kHz tone has a wavelength of 300 kilometres. A quarter of that is <span class=\"q\">75 km</span> of copper standing in a field, for the lowest note in your voice alone. Nobody is building that.",
      "s1.p5": "The second reason is worse, and it is the one that actually decides the design. Suppose you built the antenna. Suppose everybody built one. Every voice on earth would arrive at every receiver on earth, all in the same few hundred hertz, all on top of one another — and there would be no filter, no tuning knob, no anything, that could separate them, because they would not be in different <em>places</em>. They would all be in exactly the same place. There is only one baseband, and it is not big enough for two people.",
      "s1.p6": "So we lift each voice onto a wave of its own. Not because it makes the voice louder — it does not — but because it puts the voices in different neighbourhoods, and a neighbourhood is something a filter can find.",
      "s1.span1": "FIG 1",
      "s1.span2": "THREE STATIONS, ONE BAND — DRAG THE DIAL",
      "s1.span3": "RECEIVER BANDWIDTH",
      "s1.note1": "Sound. Start with the volume low.",
      "s1.cap1": "Three stations. Press <b>NO CARRIERS</b> and they are all piled into the same few kilohertz — the lower lane is what a microphone would hear, and there is nothing you can do to it that separates the three. Press <b>ON THREE CARRIERS</b> and the same three are suddenly in three different places. Now <b>drag anywhere on the picture</b> to move the dial. The shaded hump is your receiver's filter, and the bottom lane is what comes out of the speaker, against the dashed line of what was sent. Park between two stations and it goes quiet. Then open the bandwidth up past about 10 kHz and listen to the neighbour walk in. <b>Switch the source to MUSIC</b> and the three stations become the same recording at three speeds; that is also the moment the picture stops being lines and becomes bands, because a recording does not have a line spectrum to draw.",
      "s1.sum1": "Hold on — what does “bandwidth” mean?",
      "s1.p8": "A signal is never at one frequency. A voice is a bundle of them at once — the low rumble of the vocal cords, the hiss of the consonants, everything between. <b>Bandwidth is how wide that bundle is</b>: the distance from the lowest frequency in it to the highest, measured in hertz like everything else.",
      "s1.p9": "It matters because it is the thing you buy. A station does not own a frequency, it owns a <em>strip</em> of them, and the strip has to be at least as wide as the bundle it is carrying or the top of the message gets cut off. Everything in both halves of this article is an argument about how wide a strip a given idea needs, and what you get in return for it.",
      "s1.sum2": "Why are the numbers in these figures so small?",
      "s1.p10": "A real AM station sits somewhere around a megahertz. The carriers in the figures below are at sixteen, thirty-two and forty-eight <em>kilo</em>hertz — about fifty times lower. That is deliberate, and it is so the figures can play themselves: a signal has to fit inside the range a sound card can produce before you can hear what has happened to it.",
      "s1.p11": "Nothing else is changed. Every <em>ratio</em> — carrier to message, station to neighbour, signal to noise — is the ratio a real band has, and the arithmetic cannot tell the difference. Think of it as the same radio, played slowly enough to listen to.",
      "s1.p7": "That is the whole justification for radio being complicated. The fast wave is not the message and never was. It is a <em>place to stand</em>.",
      "s1.h21": "<span class=\"secnum\">02</span> A sine wave has exactly three knobs",
      "s2.p1": "Here is the carrier, written out in full. It is the most boring object in this article and everything else is a consequence of it:",
      "s2.eqlbl1": "the carrier",
      "s2.p2": "Three letters you are allowed to touch. <b>A</b>, how tall it is. <b>f<sub>c</sub></b>, how fast it goes. <b>φ</b>, where in its cycle it happens to be at the moment you start looking. That is the entire menu. There is nothing else about a sine wave to change, which means there are exactly three kinds of modulation, and every scheme that has ever existed is one of them or a mixture.",
      "s2.li1": "Wiggle <b>A</b> and you have <b>amplitude modulation</b> — AM, and the subject of the rest of this article.",
      "s2.li2": "Wiggle <b>f<sub>c</sub></b> and you have <b>frequency modulation</b> — FM, which is part two.",
      "s2.li3": "Wiggle <b>φ</b> and you have <b>phase modulation</b> — PM, which almost nobody broadcasts and almost every digital radio uses.",
      "s2.p3": "The last two are closer relatives than they look. Frequency is just how fast phase is changing; if you shove the phase around, the frequency wobbles as a side effect, and if you shove the frequency around, the phase drifts as a side effect. FM and PM are the same animal photographed from two angles, and engineers lump them together as <em>angle modulation</em>. AM is the one that stands apart, and that difference is the reason this is a two-part article rather than one.",
      "s2.span1": "FIG 2",
      "s2.span2": "ONE MESSAGE, THREE KNOBS",
      "s2.span3": "HOW HARD TO PUSH",
      "s2.p4": "The top lane is the message. The three below it are the same carrier being pushed around by that same message, through each of the three knobs in turn. The faint grey line behind each one is the message again, so you can see who is doing what.",
      "s2.p5": "Try the <b>SQUARE</b> message. AM turns into a box. FM turns into two whistles alternating — which has a name, <em>frequency shift keying</em>, and it is how every modem and every pager and every garage-door remote has ever worked. PM just jumps.",
      "s2.cap1": "Nothing here is a different transmitter. It is one oscillator with three different screws to turn. Notice that AM keeps the wave's timing perfectly regular and only changes its height, while FM and PM keep the height perfectly constant and only mess with the timing. <b>Hold on to that.</b> It is the entire plot of part two.",
      "s2.h21": "<span class=\"secnum\">03</span> The message rides the envelope",
      "s3.p1": "Take the first knob. You want the carrier's height to follow the message, so the obvious thing is to multiply them together — carrier times message. And that does work, sort of, and it has a name we will come back to. But it is not what a broadcast station sends, and the reason why is the most consequential engineering decision in this whole article.",
      "s3.p2": "What a station actually sends is this:",
      "s3.eqlbl1": "amplitude modulation",
      "s3.p3": "<b>x(t)</b> is the message, scaled so it swings between −1 and +1. <b>m</b> is the <em>modulation index</em> — how hard you push, from 0 (no message at all, just a bare carrier) to 1 (the message is swinging the carrier's height all the way from double to nothing). And the whole trick is that <b>1</b> sitting in front of the message.",
      "s3.sum1": "Hold on — what is an “envelope”?",
      "s3.p4": "Draw a fast wiggly wave. Now, without lifting the pen, trace a smooth line along the tips of its peaks. That line is the envelope. It is not a real thing you could measure with a voltmeter at any instant — at any instant all you have is the wave itself — but if the wave is much faster than the line, the line is unmistakable to the eye, and as it turns out it is unmistakable to a diode too.",
      "s3.p5": "The <span class=\"q\">1 + m·x(t)</span> in the equation above is exactly that line. AM is the business of drawing your message along the top of a carrier and trusting the far end to trace it back.",
      "s3.p6": "Because of that 1, the envelope <span class=\"q\">1 + m·x(t)</span> never goes near zero as long as m stays under 1 — it just breathes, up and down, around a comfortable middle. The message is legible along the top of the carrier as a shape. Anything that can find the top of the carrier has found the message.",
      "s3.box1": "That carrier is not there to carry information. It is there so that the information can be read by something too stupid to know what a phase is.",
      "s3.h21": "<span class=\"secnum\">04</span> A diode, a capacitor, and a razor blade",
      "s4.p1": "Here is the entire receiver. A diode, which passes current one way and blocks it the other. A capacitor, which charges up quickly through the diode and then leaks slowly away through a resistor. Point them at an AM signal and the capacitor climbs to each peak, then sags a little, then gets pushed up by the next peak. What it traces out, sag by sag, is the envelope. What the envelope is, is the message.",
      "s4.p2": "That is not a simplification for the article. That is the circuit. It has no power supply — it runs on the energy in the radio wave itself — and in the 1920s children built them on breakfast tables out of a coil of wire, a tuning capacitor, and a lump of galena crystal poked with a springy wire called a cat's whisker, which was a diode before anybody was manufacturing diodes.",
      "s4.p3": "In the Second World War, soldiers built them out of whatever was lying around. The famous version used a blued razor blade and a pencil lead: the oxide layer on the steel makes a passable rectifying junction if you find the right spot on it with the graphite. They were called foxhole radios. No batteries, no valves, nothing to requisition, nothing to confiscate. That is the thing AM bought with its wasted carrier, and it is a genuinely enormous thing to have bought.",
      "s4.p4": "The circuit has one failure mode, and it is spectacular. The diode does not know about signs. It cannot tell the difference between an envelope of <span class=\"q\">−0.3</span> and an envelope of <span class=\"q\">+0.3</span> — both look, to a rectifier, like the same amount of wave. So the moment you push m past 1 and the envelope tries to dip below zero, the detector does not follow it down. It <em>folds it back up</em>, and reports the fold as though it were the message.",
      "s4.span1": "FIG 3",
      "s4.span2": "PUSH IT TOO HARD AND IT TEARS",
      "s4.span3": "MODULATION INDEX",
      "s4.note1": "Sound. Start with the volume low.",
      "s4.cap1": "Top: what leaves the transmitter, with its envelope drawn on. Bottom: what an actual diode-and-capacitor detector gets back, against the dashed line of what a detector that could see signs would have got. Below <b>m = 1</b> the two lie on top of each other and under one percent separates them — that residue is the capacitor sagging between carrier peaks, and it is as good as this circuit gets. Take m past 1 and the envelope's two halves cross over, and the recovered trace stops being the message and starts being its absolute value. <b>Press listen and drag through m = 1</b>; the point at which it stops sounding like music and starts sounding like a fault is not subtle. The <b>MUSIC</b> setting is a real recording, band-limited to what one AM channel can hold — which is why it already sounds like a radio before anything has gone wrong with it.",
      "s4.p5": "This is why every broadcast studio on earth has a modulation meter with a red mark on it, and why the job of riding that meter — keeping the loud bits just under the line and the quiet bits from disappearing into the noise — was a career. Push too little and you are throwing away range. Push too much and you are transmitting a fold.",
      "s4.h21": "<span class=\"secnum\">05</span> The bill for a cheap receiver",
      "s5.p1": "Now, the invoice. That constant 1 in the equation is a carrier that is present at full strength all the time, whether anybody is talking or not. It does not vary. It carries no information whatsoever — you could predict it perfectly for the next thousand years. And it is the biggest single thing the transmitter is paying for.",
      "s5.p2": "For a single tone modulated all the way to m = 1, the arithmetic comes out at exactly <b>two thirds of the transmitted power in the carrier</b> and one third split between the two sidebands that actually contain the message. Half a megawatt of transmitter, and somewhere over three hundred kilowatts of it is spent radiating a note that never changes.",
      "s5.span1": "FIG 4",
      "s5.span2": "WHERE THE POWER ACTUALLY GOES",
      "s5.span3": "MODULATION INDEX",
      "s5.p3": "Switch the message from a tone to a voice and watch the useful fraction fall through the floor, at exactly the same modulation index. A tone spends all its time at full swing. A voice spends most of its time near zero and only occasionally bangs against the limit — and it is the limit that sets m.",
      "s5.cap1": "The bar is the transmitter's power, split between the carrier (grey, useless) and the sidebands (blue, the message). The curve underneath is the blue fraction plotted against how hard you are pushing. At <b>m = 1</b> with a tone it touches the dashed one-third line and stops — the shaded region past m = 1 is where efficiency keeps improving and the signal stops being recoverable, which is not a trade anybody gets to make. Real broadcast speech runs an average efficiency in the low single digits of a percent.",
      "s5.p4": "Which sounds like an outrage until you remember what the money bought: a receiver with no power supply, made of a rock and a bent wire, that a child could build and a soldier could improvise. AM did not waste that power by accident. It <em>bought</em> something with it, and in 1925 that was the right thing to buy.",
      "s5.h21": "<span class=\"secnum\">06</span> Two sidebands, and one costume change too many",
      "s6.p1": "So far this has all been in time — waves going up and down. Now look at the same signal the other way, by frequency, which is where the argument actually gets settled.",
      "s6.p2": "Multiply two sine waves together and you do not get either of them. You get two new ones: one at the sum of the frequencies, one at the difference. That single fact is the engine of all radio. Feed a 1 kHz tone into a 1 MHz carrier and nothing lands at 1 kHz and nothing extra lands at 1 MHz — instead you get a pair of new tones at 999 kHz and 1001 kHz, sitting either side of the carrier like a reflection.",
      "s6.eqlbl1": "the only trigonometry in this article",
      "s6.p3": "Those two new tones are the <b>sidebands</b>. Every note in the message makes its own pair, so a voice reaching up to 4.5 kHz produces a smear of sidebands <span class=\"q\">4.5 kHz</span> wide on each side, and the station occupies <span class=\"q\">9 kHz</span> in total. That is not a coincidence: it is why AM broadcast channels are spaced 9 kHz apart in most of the world and 10 kHz apart in the Americas, and it is why AM radio sounds muffled. The band plan cut your treble off in 1928.",
      "s6.p4": "And here is the awkward part. The two sidebands are mirror images. The upper one and the lower one contain <em>the same information</em>, twice. You are paying for a duplicate, plus a carrier that says nothing. Of everything a transmitter puts into the air, only about a sixth of the power and half of the bandwidth is doing anything you could not get without it.",
      "s6.span1": "FIG 5",
      "s6.span2": "TAKE THINGS AWAY AND SEE WHAT BREAKS",
      "s6.span3": "MESSAGE PITCH",
      "s6.cap1": "Top lane, the spectrum; bottom lane, the same signal in time with the shape a diode would follow drawn over it. Start on <b>AM</b> and drag the pitch — the sidebands walk out from the carrier and back. Switch to <b>DSB-SC</b> and the carrier line vanishes; the envelope survives but it is now the message <em>folded</em>, which is the overmodulation failure from FIG 3, permanently. Then switch to <b>SSB</b> with a single tone, and look at the bottom lane: <b>the envelope is a flat line.</b> Everything is still there — but it is in the timing now, and a diode has no opinion about timing.",
      "s6.p5": "So take them away. Kill the carrier and you get <b>DSB-SC</b>, double sideband suppressed carrier: all the power now goes into the message. Kill one of the sidebands as well and you get <b>SSB</b> — half the bandwidth, all the power useful. John Carson, an engineer at AT&amp;T who is about to become the villain of part two, patented single sideband in 1915, and by 1927 AT&amp;T were running transatlantic telephone calls on it between New York and London.",
      "s6.p6": "And broadcast radio ignored both of them completely, for a hundred years, on purpose. Because look what you have to do to receive them. With the carrier gone there is no reference left to compare anything against, so the receiver has to <em>manufacture</em> one: an oscillator of its own, running at the transmitter's frequency, matched closely enough that the reconstructed voice does not come out sounding like a duck. That is not a rock and a bent wire. That is a stable oscillator per household, in 1930.",
      "s6.box1": "<b>SSB never went away</b> — it went where the receivers are professional. Long-distance telephony ran on it for decades, amateur radio operators live on it because it puts every watt into the voice, and marine and aviation long-range HF still use it. It just never came into the living room.",
      "s6.h21": "<span class=\"secnum\">07</span> Static",
      "s7.p1": "Everything so far has been an accounting problem: power wasted, bandwidth wasted, receivers kept cheap. Accounting problems can be argued about. This next one cannot.",
      "s7.p2": "A lightning strike is a very large current that appears and disappears in microseconds, and it radiates a burst of radio energy across an enormous span of frequencies. There are roughly forty of them going off around the world every second. A car's ignition does a smaller version of the same thing a few thousand times a minute. So do fluorescent lights, electric motors, thermostats, the sun, and the centre of the galaxy. All of it arrives at your antenna as a voltage that jumps about at random.",
      "s7.sum1": "Hold on — what is a decibel?",
      "s7.p6": "A way of writing a ratio when the ratios you care about run to a factor of a million. It is not a quantity — <b>a decibel is always one thing compared to another</b> — and the scale is squashed so that every <span class=\"q\">10 dB</span> is another factor of ten in power.",
      "s7.p7": "So <span class=\"q\">0 dB</span> means the two are equal. <span class=\"q\">20 dB</span> means one has a hundred times the power of the other. <span class=\"q\">40 dB</span> is ten thousand times. When the figure below says the signal is <span class=\"q\">26 dB</span> above the noise, the signal carries about four hundred times the power — which sounds like an enormous margin, and is roughly the point at which you start to hear a hiss behind the music.",
      "s7.p3": "Now ask what your receiver does with it. Your receiver is a diode that reports how tall the wave is. Noise makes the wave taller and shorter at random. <em>The message also makes the wave taller and shorter.</em> The detector is not being fooled, exactly — it is doing its job perfectly. It reports the height of what arrived, and what arrived is the message plus the lightning, added together, in the same units, in the same place, with nothing to tell them apart by.",
      "s7.span1": "FIG 6",
      "s7.span2": "TURN THE STORM UP",
      "s7.span3": "CARRIER OVER NOISE",
      "s7.note1": "Sound. Start with the volume low.",
      "s7.cap1": "Top lane: what actually arrives at the antenna, after the receiver's own filter has done what it can. Bottom lane: what the detector makes of it, against the dashed line of <em>the same receiver with the storm switched off</em> — so the gap between the two is the noise and nothing else. Drag the slider down and watch them come apart. <b>Press listen and do it again</b>, with <b>MUSIC</b> selected — a hiss behind a synthesised voice is easy to talk yourself out of; a hiss behind a piece of music you know is not. Then watch the readout marked <em>gain</em>: it is what the receiver added, and it sits at about <span class=\"q\">−6 dB</span> and stays there, all the way from a clean signal to a hopeless one. Six decibels <em>down</em>, because a third of the transmitter's effort reaches the detector as message and the rest was carrier. <b>Whatever ratio arrives, roughly that ratio comes out. The receiver cannot improve it, and no receiver ever will.</b>",
      "s7.p4": "That last point is the one to sit with. There is no clever detector waiting to be invented here. The problem is not in the receiver; it is in the <em>choice of knob</em>. We put the message in the amplitude, and the sky writes in amplitude, and once two things are written in the same handwriting on the same page, no amount of reading skill will separate them.",
      "s7.h21": "<span class=\"secnum\">08</span> The trouble with amplitude",
      "s8.p1": "Add it all up and AM is a strange kind of triumph. It is the reason radio became a household object rather than a laboratory one. It is simple enough to receive by accident — badly grounded metalwork near a strong transmitter has been known to produce audible radio in plumbing and dental fillings. It ran the news through two world wars. It is still, today, how every aircraft in the sky talks to every control tower, for a reason that will only make sense at the end of part two.",
      "s8.p2": "And it has one flaw that nothing inside it can fix. Its message lives in the same quantity that noise lives in.",
      "s8.box1": "The way out is not a better receiver. It is a different knob.",
      "s8.p3": "Which brings us to the second knob, and to the two men who fought over it for twenty years. In 1922 an AT&amp;T mathematician named John Carson worked out what happens if you modulate the frequency instead — and published a proof that it was pointless. He was right. His conclusion, that “static, like the poor, will always be with us,” was the consensus of the entire profession for a decade.",
      "s8.p4": "In 1933 Edwin Armstrong demonstrated a system that was thirty decibels quieter than anything Carson's proof allowed for. He had not found a hole in the mathematics. He had done something nobody had thought to try: he had stopped trying to be efficient.",
      "s8.span1": "NEXT",
      "s8.span2": "<a href=\"../hiding-a-voice-fm/\">Part two — FM, and the price of quiet</a>. Bessel functions, a carrier that disappears, the cliff you fall off at the bottom, and the man who jumped out of a window over it.",
      "s8.h32": "Sources &amp; further reading",
      "s8.li1": "R. A. Fessenden, letter to S. M. Kintner, 1932 — the only first-hand account of the Brant Rock Christmas Eve broadcast, and the reason historians treat it carefully.",
      "s8.li2": "J. R. Carson, “Notes on the Theory of Modulation,” <em>Proceedings of the IRE</em>, vol. 10, no. 1, Feb. 1922 — the sidebands, and the argument that gets answered in part two.",
      "s8.li3": "J. R. Carson, US Patent 1,449,382, “Method and Means for Signaling with High Frequency Waves,” filed 1915, granted 1923 — single sideband.",
      "s8.li4": "A. B. Carlson, <em>Communication Systems</em>, 5th ed., McGraw-Hill — chapters 4 and 10, for the modulation and noise theory behind every figure here.",
      "s8.li5": "T. H. Lee, <em>The Design of CMOS Radio-Frequency Integrated Circuits</em>, 2nd ed., Cambridge — chapter 1 is the best short history of early radio hardware in print.",
      "s8.span3": "© 2026 Hassan Keshtkar · <span class=\"mono-label\">hkk.fyi</span>",
      "s8.span4": "built with love <span class=\"heart\" aria-hidden=\"true\">♥</span> &amp; AI :)))",

      /* ---- <head> ---- */
      "meta.title": "Hiding a voice inside a wave — AM, and the trouble with amplitude · hkk.fyi",
      "meta.description": "A voice is a few hundred hertz and an antenna for it would be seventy-five kilometres long. So we hide it inside something faster. A plain-English, drag-everything, listen-to-everything guide to amplitude modulation — no radio background needed. Part one of two.",
      "meta.og:title": "Hiding a voice inside a wave — AM, and the trouble with amplitude",
      "meta.og:description": "Six live figures, three of them audible. Why radio needs a carrier, what a diode and a capacitor can do on their own, and why static wins.",
      "meta.og:image:alt": "An amplitude-modulated carrier with its envelope traced, beside the article title.",

      /* ---- shared ---- */
      "js.src.voice": "SYNTHETIC",
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

      /* ---- FIG 1 · the crowded band ---- */
      "js.band.s1": "NEWS",
      "js.band.s2": "CONCERT",
      "js.band.s3": "SHIPPING",
      "js.band.axis": "strength",
      "js.band.mode_b": "NO CARRIERS",
      "js.band.mode_c": "ON THREE CARRIERS",
      "js.band.lane1b": "all three, in the same few hundred hertz",
      "js.band.lane1c": "three stations, three neighbourhoods",
      "js.band.lane2b": "what a microphone would hear",
      "js.band.lane2c": "out of the speaker · dashed = what was sent",
      "js.band.ro_dial": "dial",
      "js.band.ro_bw": "filter width",
      "js.band.ro_state": "tuned to",
      "js.band.ro_between": "between stations",
      "js.band.ro_rej": "neighbour down by",
      "js.band.ro_mush": "all three at once",
      "js.band.ro_span": "all of them inside",
      "js.band.ro_pick": "can you pick one?",
      "js.band.ro_no": "no filter can",

      /* ---- FIG 2 · three knobs ---- */
      "js.knobs.m_tone": "TONE",
      "js.knobs.m_sq": "SQUARE",
      "js.knobs.m_tri": "TRIANGLE",
      "js.knobs.m_voice": "VOICE",
      "js.knobs.l_msg": "the message",
      "js.knobs.l_am": "AM · height changes",
      "js.knobs.l_fm": "FM · speed changes",
      "js.knobs.l_pm": "PM · timing changes",
      "js.knobs.d_am": "m",
      "js.knobs.d_ang": "angle",

      /* ---- FIG 3 · depth ---- */
      "js.depth.m_tone": "TONE",
      "js.depth.m_voice": "VOICE",
      "js.depth.l_tx": "transmitted · blue = what a diode follows",
      "js.depth.l_rx": "recovered · dashed = a detector that could see signs",
      "js.depth.ro_m": "modulation index",
      "js.depth.ro_zero": "envelope hits zero",
      "js.depth.ro_dist": "distortion",
      "js.depth.ro_state": "verdict",
      "js.depth.ro_ok": "clean",
      "js.depth.ro_edge": "on the line",
      "js.depth.ro_broken": "folded — this is not the message",

      /* ---- FIG 4 · power ---- */
      "js.pw.m_tone": "TONE",
      "js.pw.m_voice": "VOICE",
      "js.pw.m_sq": "SQUARE",
      "js.pw.carrier": "CARRIER · says nothing",
      "js.pw.sidebands": "the message",
      "js.pw.xaxis": "modulation index m",
      "js.pw.overmod": "overmodulated",
      "js.pw.ro_m": "modulation index",
      "js.pw.ro_mean": "mean square of message",
      "js.pw.ro_car": "power in the carrier",
      "js.pw.ro_side": "power doing work",
      "js.pw.ro_ssb": "the same, in SSB",

      /* ---- FIG 5 · sidebands ---- */
      "js.side.am": "AM",
      "js.side.dsb": "DSB-SC",
      "js.side.usb": "SSB · UPPER",
      "js.side.lsb": "SSB · LOWER",
      "js.side.k_one": "ONE TONE",
      "js.side.k_two": "TWO TONES",
      "js.side.k_voice": "VOICE",
      "js.side.fc": "carrier",
      "js.side.l_spec": "by frequency",
      "js.side.l_time": "in time · blue = what a diode follows",
      "js.side.nocarrier": "nothing here",
      "js.side.ro_lines": "lines on the air",
      "js.side.ro_bw": "bandwidth used",
      "js.side.ro_car": "carrier sent",
      "js.side.ro_env": "envelope is the message",
      "js.side.env_yes": "yes",
      "js.side.env_rect": "folded, not the message",
      "js.side.env_no": "there is no envelope",
      "js.side.ro_rx": "receiver needs",
      "js.side.rx_diode": "a diode",
      "js.side.rx_lo": "an oscillator of its own",

      /* ---- FIG 6 · static ---- */
      "js.static.l_air": "what arrives at the antenna",
      "js.static.l_rx": "what the detector makes of it · dashed = no storm",
      "js.static.ro_cn": "carrier over noise, in",
      "js.static.ro_snr": "signal over noise, out",
      "js.static.ro_gain": "gain",
      "js.static.ro_v": "verdict",
      "js.static.v_clean": "clean",
      "js.static.v_hiss": "audible hiss",
      "js.static.v_rough": "rough",
      "js.static.v_gone": "gone"
    },

    /* Persian goes here. See the note at the top of this file. */
    fa: {}
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
