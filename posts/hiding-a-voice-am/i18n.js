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

    fa: {
      "hero.title1": "مدولاسیون دامنه — چرا لازم است و چه هزینه‌ای دارد · hkk.fyi",
      "hero.a1": "برو سر اصل مطلب",
      "hero.a2": "Lab",
      "hero.a3": "Writing",
      "hero.a4": "CV",
      "hero.a5": "Contact",
      "start.span1": "مقاله · رادیو · حدود ۱۵ دقیقه · ۶ شکل تعاملی، ۳ تاش صدا دارد",
      "start.h11": "مدولاسیون دامنه",
      "start.p1": "صدای ما وقتی به سیگنال الکتریکی تبدیل می‌شود، فرکانس‌هایش در محدودهٔ نسبتاً پایینی می‌افتند؛ برای گفتار چیزی حدود سیصد تا سه هزار و چند صد هرتز. حالا اگر بخواهیم همین سیگنال را همان‌طور که هست به آنتن بدهیم و بفرستیم، به دو مشکل برمی‌خوریم که هیچ‌کدام با بهتر کردن دستگاه حل نمی‌شود، چون هر دو ریشه در فیزیک ماجرا دارند.<br><br>راه‌حل هر دو یکی است و اسمش مدولاسیون است. یک موج سینوسی با فرکانس بالا می‌سازیم که به آن <span class=\"q\">carrier</span> می‌گویند، و پیام را روی یکی از مشخصه‌های همین موج سوار می‌کنیم. چیزی که در نهایت فرستاده می‌شود دیگر خود صدا نیست، بلکه یک carrier است که یکی از مشخصه‌هایش دارد به‌تناسب صدا بالا و پایین می‌رود.<br><br>یک موج سینوسی سه مشخصه دارد که می‌شود دستکاری‌شان کرد، و به همین دلیل دقیقاً سه نوع مدولاسیون داریم. این مقاله دربارهٔ اولی است، یعنی <b>مدولاسیون دامنه</b>: اینکه چطور کار می‌کند، با چه مداری می‌شود در گیرنده بازش کرد، چقدر توان و چقدر پهنای باند خرج می‌کند، و چرا یک ضعف دارد که از داخل خودش قابل رفع نیست. هر شکلی که در ادامه می‌بینی یک شبیه‌سازی زنده است، پس با تنظیم‌هایش بازی کن و نتیجه را ببین.",
      "start.cap1": "پیام، سوار بر دامنهٔ carrier",
      "start.span2": "حسن کشت‌کار",
      "start.span3": "تهران",
      "start.span4": "۲۰۲۶",
      "start.a1": "برگرد به hkk.fyi ←",
      "start.span5": "هم‌رسانی",
      "start.span6": "کپی لینک",
      "start.share": "هم‌رسانی…",
      "start.span7": "خلاصه",
      "start.li1": "مدولاسیون دو مشکل را هم‌زمان حل می‌کند: <b>اندازهٔ آنتن</b>، که باید متناسب با طول موج باشد و برای صدا از حد عملی خارج می‌شود، و <b>اشتراک طیف</b>، یعنی اینکه چطور چند فرستنده بتوانند هم‌زمان کار کنند بدون آنکه روی هم بیفتند.",
      "start.li2": "هر موج سینوسی سه مشخصهٔ قابل تغییر دارد: بلندی موج، فرکانسش، و اینکه در هر لحظه کجای چرخهٔ خودش است. هر کدام را که با پیام تغییر بدهی، به یک نوع مدولاسیون می‌رسی: AM، FM و PM.",
      "start.li3": "در AM بلندی موج به‌تناسب پیام تغییر می‌کند، و آن‌وقت اگر نوک قله‌های موج را به هم وصل کنیم منحنی‌ای به دست می‌آید که دقیقاً خود پیام است. به این منحنی <b>envelope</b> می‌گویند.",
      "start.li4": "همین باعث می‌شود گیرنده بتواند فوق‌العاده ساده باشد: یک دیود و یک خازن کافی است. گیرنده نه لازم است فاز carrier را بداند و نه فرکانس دقیقش را، و همین ارزانی بود که AM را اولین روش عملی پخش رادیویی کرد.",
      "start.li5": "اما دو هزینه دارد. اول اینکه در بهترین حالت <b>دوسوم توان فرستنده صرف خود carrier می‌شود</b> که هیچ اطلاعاتی در آن نیست. دوم و مهم‌تر اینکه نویز هم خودش را در بلندی موج نشان می‌دهد، یعنی دقیقاً همان‌جایی که پیام نشسته، و گیرنده هیچ راهی برای جدا کردنشان ندارد.",
      "start.p2": "در ادامه شش شکل تعاملی می‌آید که سه‌تایشان خروجی صوتی هم دارند.",
      "start.span8": "فهرست",
      "start.li6": "<a href=\"#s1\">چرا اصلاً به مدولاسیون نیاز داریم</a>",
      "start.li7": "<a href=\"#s2\">سه مشخصهٔ یک موج سینوسی</a>",
      "start.li8": "<a href=\"#s3\">سیگنال AM و شاخص مدولاسیون</a>",
      "start.li9": "<a href=\"#s4\">گیرنده چطور پیام را بیرون می‌کشد</a>",
      "start.li10": "<a href=\"#s5\">توان کجا خرج می‌شود</a>",
      "start.li11": "<a href=\"#s6\">طیف AM و sideband ها</a>",
      "start.li12": "<a href=\"#s7\">نویز</a>",
      "start.li13": "<a href=\"#s8\">ضعف اصلی AM</a>",
      "start.h21": "<span class=\"secnum\">01</span> چرا اصلاً به مدولاسیون نیاز داریم",
      "s1.p1": "بیایید از همان سؤال ساده شروع کنیم: چرا نمی‌شود میکروفون را مستقیم به آنتن وصل کرد؟ میکروفون که همین حالا هم صدا را به یک سیگنال الکتریکی تبدیل کرده، پس چه چیزی جلوی این کار را می‌گیرد؟ جوابش دو چیز است که هیچ ربطی به کیفیت ساخت دستگاه ندارند.",
      "s1.p2": "<b>مشکل اول به اندازهٔ آنتن برمی‌گردد.</b> یک آنتن وقتی می‌تواند انرژی را به‌خوبی به فضا بفرستد که طولش با طول موج سیگنال قابل مقایسه باشد. اگر آنتن خیلی کوتاه‌تر از طول موج باشد، تقریباً هیچ چیزی تابش نمی‌کند و توانی که به آن می‌دهیم به‌جای رفتن به هوا، صرف گرم شدن خود سیم می‌شود. قاعدهٔ رایج این است که طول آنتن دست‌کم یک‌چهارم طول موج باشد.",
      "s1.p3": "حالا عدد بگذاریم تا معلوم شود ماجرا چقدر جدی است. طول موج از رابطهٔ <span class=\"q\">λ = c/f</span> به دست می‌آید، یعنی سرعت نور تقسیم بر فرکانس. برای یک صدای <span class=\"q\">1 kHz</span> این عدد <span class=\"q\">300 km</span> می‌شود و یک‌چهارمش <span class=\"q\">75 km</span> — و برای بم‌ترین بخش‌های صدا حتی از این هم بزرگ‌تر. یعنی برای فرستادن مستقیم صدا باید آنتنی به طول یک بزرگراه بسازیم، که عملاً یعنی نمی‌شود.",
      "s1.p4": "<b>مشکل دوم از اولی هم اساسی‌تر است</b> و به اشتراک طیف مربوط می‌شود. فرض کنیم به هر شکلی مشکل آنتن حل شده باشد. آن‌وقت هر فرستنده‌ای که صدا را مستقیم بفرستد، دقیقاً همان محدودهٔ فرکانسی را اشغال می‌کند که بقیه اشغال کرده‌اند، چون همهٔ صداهای دنیا کم‌وبیش در یک بازه قرار دارند. نتیجه این می‌شود که سیگنال همه روی هم می‌افتد.",
      "s1.p5": "و اینجا نکتهٔ اصلی است: تنها ابزاری که برای جدا کردن سیگنال‌ها داریم فیلتر است، و فیلتر فقط بر اساس فرکانس تصمیم می‌گیرد. وقتی دو سیگنال در یک محدودهٔ فرکانسی نشسته‌اند، هیچ فیلتری — هرچقدر هم دقیق و پیچیده — نمی‌تواند یکی را نگه دارد و دیگری را حذف کند، چون اصلاً تفاوتی وجود ندارد که فیلتر بتواند رویش حساب کند.",
      "s1.p6": "کاری که مدولاسیون می‌کند دقیقاً همین تفاوت را می‌سازد. هر پیام را روی یک carrier با فرکانس متفاوت سوار می‌کنیم تا هر کدام در قسمت جداگانه‌ای از طیف بنشیند و دیگر روی هم نیفتند. اسم این روش <span class=\"q\">FDM</span> است و کل ساختار باندهای رادیویی بر همین پایه بنا شده. یک فایدهٔ سوم هم دارد که کمتر به آن اشاره می‌شود: با انتخاب فرکانس carrier در واقع داری انتخاب می‌کنی که موج چطور در فضا منتشر شود، چون باندهای مختلف رفتار کاملاً متفاوتی دارند.",
      "s1.span1": "شکل ۱",
      "s1.span2": "سه ایستگاه، یک باند — دیال را بکش",
      "s1.span3": "پهنای باند گیرنده",
      "s1.note1": "خروجی صوتی دارد. اول بلندی صدا را کم کن.",
      "s1.cap1": "سه پیام مستقل که می‌خواهند هم‌زمان فرستاده شوند. حالت <b>«بدون carrier»</b> همان چیزی است که در متن گفتیم: هر سه در یک محدودهٔ فرکانسی نشسته‌اند و کاملاً روی هم افتاده‌اند، و ردیف پایین نشان می‌دهد خروجی چه می‌شود — با هیچ تنظیمی نمی‌شود یکی را از بقیه جدا کرد. حالا <b>«روی سه carrier»</b> را بزن تا همان سه پیام روی سه فرکانس متفاوت بروند. بعد <b>تصویر را با انگشت یا ماوس بکش</b> تا گیرنده روی فرکانس‌های مختلف تنظیم شود؛ ناحیهٔ سایه‌دار همان محدوده‌ای است که فیلتر گیرنده اجازهٔ عبور می‌دهد. سه چیز را امتحان کن: بین دو ایستگاه بایست و ببین که خروجی ساکت می‌شود، پهنای باند فیلتر را از حدود <span class=\"q\">10 kHz</span> بیشتر کن تا صدای ایستگاه بغلی هم بیاید تو، و منبع را روی <b>«موسیقی»</b> بگذار تا ببینی طیف یک سیگنال واقعی به‌جای چند خط، پیوسته است.",
      "s1.sum1": "یادآوری — پهنای باند یعنی چه",
      "s1.p8": "هیچ سیگنالی فقط روی یک فرکانس نیست. حتی یک صدای ساده هم از مجموعه‌ای از فرکانس‌ها تشکیل شده که با هم می‌آیند، و پهنای باند یعنی این مجموعه چقدر پهن است — یعنی فاصلهٔ پایین‌ترین فرکانس تا بالاترین فرکانسی که در سیگنال وجود دارد.",
      "s1.p9": "اهمیتش از اینجاست که طیف یک منبع محدود است و بین کاربردها تقسیم می‌شود. یک ایستگاه رادیویی صاحب یک فرکانس نیست، بلکه یک بازه در اختیارش می‌گذارند، و اگر آن بازه از پهنای باند سیگنالش باریک‌تر باشد بخشی از صدا حذف می‌شود. تقریباً همهٔ تصمیم‌هایی که در ادامه می‌بینی در نهایت یک مصالحه بین سه چیزند: توانی که خرج می‌شود، پهنای باندی که اشغال می‌شود، و اینکه گیرنده چقدر پیچیده باشد.",
      "s1.sum2": "چرا فرکانس‌های این شکل‌ها این‌قدر پایین‌اند؟",
      "s1.p10": "یک ایستگاه AM واقعی روی فرکانسی در حد مگاهرتز کار می‌کند، اما carrier های این شکل‌ها روی <span class=\"q\">16</span>، <span class=\"q\">32</span> و <span class=\"q\">48 kHz</span> نشسته‌اند. دلیلش این است که این شکل‌ها قرار است صدا هم پخش کنند، و برای اینکه چیزی به گوش برسد کل سیگنال باید داخل محدوده‌ای جا شود که کارت صدا از پس تولیدش برمی‌آید.",
      "s1.p11": "این کوچک کردن مقیاس هیچ‌کدام از نتیجه‌ها را عوض نمی‌کند، چون هر چیزی که در این مقاله اهمیت دارد یک <em>نسبت</em> است: نسبت توان carrier به پیام، نسبت فاصلهٔ ایستگاه‌ها به پهنای باند، و نسبت سیگنال به نویز. نسبت‌ها با تغییر مقیاس فرکانس دست‌نخورده می‌مانند، پس هر چه اینجا می‌بینی در فرکانس واقعی هم همان‌طور است.",
      "s1.p7": "پس نقش carrier این نیست که اطلاعات را حمل کند. carrier فقط تعیین می‌کند که پیام ما در کدام قسمت از طیف قرار بگیرد.",
      "s1.h21": "<span class=\"secnum\">02</span> سه مشخصهٔ یک موج سینوسی",
      "s2.p1": "برای اینکه ببینیم چند راه برای سوار کردن پیام روی یک موج وجود دارد، اول خود موج سینوسی را کامل بنویسیم:",
      "s2.eqlbl1": "the carrier",
      "s2.p2": "در این عبارت دقیقاً سه چیز هست که می‌شود تغییرشان داد. <b>A</b> بلندی موج است، <b>f<sub>c</sub></b> فرکانس آن، و <b>φ</b> فاز، یعنی اینکه موج در لحظهٔ شروع کجای چرخهٔ خودش است. چیز چهارمی وجود ندارد و هر موج سینوسی با همین سه عدد کاملاً مشخص می‌شود. پس تعداد راه‌های ممکن برای حمل اطلاعات روی یک موج سینوسی هم دقیقاً سه تاست، نه بیشتر.",
      "s2.li1": "اگر <b>A</b> را با پیام تغییر بدهیم، به <b>amplitude modulation</b> یا همان AM می‌رسیم.",
      "s2.li2": "اگر <b>f<sub>c</sub></b> را تغییر بدهیم، <b>frequency modulation</b> یا FM به دست می‌آید.",
      "s2.li3": "و اگر <b>φ</b> را تغییر بدهیم، <b>phase modulation</b> یا PM خواهیم داشت.",
      "s2.p3": "دو تای آخر در واقع دو روایت از یک چیزند. فرکانس چیزی نیست جز سرعت تغییر فاز، پس هر وقت فاز را جابه‌جا کنی فرکانس هم به‌ناچار تغییر می‌کند و برعکس. به همین دلیل FM و PM را با هم <em>angle modulation</em> می‌نامند و معمولاً کنار هم بررسی می‌شوند. آنکه واقعاً جدا می‌ایستد AM است، چون بلندی موج و زاویهٔ آن دو چیز مستقل از هم هستند و همین استقلال است که در بخش نویز خودش را نشان می‌دهد.",
      "s2.span1": "شکل ۲",
      "s2.span2": "یک پیام، سه مشخصه",
      "s2.span3": "شدت تغییر",
      "s2.p4": "ردیف بالا خود پیام است و سه ردیف بعدی یک carrier مشترک‌اند که با همان پیام مدوله شده‌اند، هر بار از راه یکی از آن سه مشخصه. خط خاکستری کم‌رنگی که پشت هر ردیف می‌بینی، پیام را دوباره تکرار می‌کند تا بتوانی مقایسه کنی.",
      "s2.p5": "پیام <b>«مربعی»</b> را انتخاب کن تا تفاوت‌ها واضح‌تر شود. در AM بلندی موج بین دو مقدار بالا و پایین می‌رود، در FM فرکانس بین دو مقدار سوئیچ می‌کند که به آن <em>FSK</em> می‌گویند و پایهٔ خیلی از سامانه‌های سادهٔ انتقال داده است، و در PM فاز ناگهان می‌پرد و این پرش را به‌صورت یک ناپیوستگی در شکل موج می‌بینی.",
      "s2.cap1": "مهم‌ترین چیزی که باید از این شکل برداری، تفاوت دو ردیف پایین با ردیف AM است. در AM فاصلهٔ زمانی بین گذرهای موج از صفر کاملاً منظم می‌ماند و فقط ارتفاع بالا و پایین می‌رود؛ اما در FM و PM ارتفاع مو به مو ثابت است و در عوض زمان‌بندی است که تغییر می‌کند. یعنی در AM اطلاعات در بلندی موج ذخیره شده و در دو تای دیگر در زاویهٔ آن، و همین یک تفاوت است که تعیین می‌کند هر کدام در برابر نویز چطور رفتار کنند.",
      "s2.h21": "<span class=\"secnum\">03</span> سیگنال AM و شاخص مدولاسیون",
      "s3.p1": "ساده‌ترین کاری که به ذهن می‌رسد این است که پیام را مستقیم در carrier ضرب کنیم. این کار جواب می‌دهد و حتی اسم هم دارد — به آن <span class=\"q\">DSB-SC</span> می‌گویند — ولی چیزی نیست که یک ایستگاه رادیویی می‌فرستد. دلیلش را در بخش بعد می‌بینیم، و همان دلیل است که کل شکل AM را تعیین کرده.",
      "s3.p2": "چیزی که واقعاً فرستاده می‌شود این است:",
      "s3.eqlbl1": "amplitude modulation",
      "s3.p3": "در این رابطه <span class=\"q\">x(t)</span> همان پیام است که طوری مقیاس شده که هیچ‌وقت از ۱ بیشتر و از ۱− کمتر نشود. عدد <span class=\"q\">m</span> را شاخص مدولاسیون می‌نامند و نشان می‌دهد چقدر محکم داریم carrier را تکان می‌دهیم: در <span class=\"q\">m = 0</span> اصلاً پیامی در کار نیست و فقط یک carrier خالی داریم، و در <span class=\"q\">m = 1</span> بلندی موج بین دو برابر مقدار عادی و صفر نوسان می‌کند. تنها تفاوت این رابطه با ضرب ساده، همان عدد <span class=\"q\">1</span> است که کنار پیام نشسته، و در ادامه می‌بینیم که همین یک عدد چقدر تعیین‌کننده است.",
      "s3.sum1": "یادآوری — envelope یعنی چه",
      "s3.p4": "اگر یک موج تند را رسم کنی و بعد بدون برداشتن قلم یک منحنی نرم از روی نوک قله‌هایش رد کنی، آن منحنی همان envelope است. چیزی نیست که بشود در یک لحظه با ولت‌متر اندازه‌اش گرفت، چون در هر لحظه فقط خود موج را داری؛ اما وقتی موج خیلی تندتر از تغییرات آن منحنی باشد، envelope هم برای چشم کاملاً واضح است و هم — همان‌طور که خواهیم دید — برای یک مدار سادهٔ الکترونیکی.",
      "s3.p5": "یک نکتهٔ ظریف اما مهم اینجا هست: چیزی که یک مدار سادهٔ آشکارساز می‌تواند دنبال کند، قدرمطلق آن ضریب است، نه خودش. یعنی اگر ضریب منفی شود، مدار علامتش را نمی‌بیند و همان مقدار مثبت را گزارش می‌کند.",
      "s3.p6": "و دقیقاً همین‌جاست که آن عدد <span class=\"q\">1</span> کار خودش را می‌کند. تا وقتی <span class=\"q\">m</span> از ۱ بیشتر نشود، عبارت <span class=\"q\">1 + m·x(t)</span> هیچ‌وقت منفی نمی‌شود، پس قدرمطلق گرفتن هیچ اثری ندارد و envelope دقیقاً برابر خود همان عبارت است — یعنی یک نسخهٔ جابه‌جاشده و بزرگ‌شده از پیام اصلی. به بیان ساده‌تر، پیام بدون هیچ ابهامی روی نوک موج نوشته شده و هر چیزی که بتواند نوک موج را دنبال کند، پیام را پیدا کرده است.",
      "s3.box1": "carrier خودش هیچ اطلاعاتی حمل نمی‌کند. تنها کارش این است که envelope را از منفی شدن نگه دارد، تا گیرنده بتواند بدون دانستن فاز، پیام را بیرون بکشد.",
      "s3.h21": "<span class=\"secnum\">04</span> گیرنده چطور پیام را بیرون می‌کشد",
      "s4.p1": "مداری که این کار را می‌کند از دو قطعه تشکیل شده و واقعاً به همین سادگی است. یک دیود که جریان را فقط از یک جهت عبور می‌دهد، و یک خازن که موازی با یک مقاومت بسته شده. وقتی سیگنال بالا می‌رود دیود هدایت می‌کند و خازن خیلی سریع تا نوک قله شارژ می‌شود؛ وقتی سیگنال پایین می‌آید دیود می‌بندد و خازن آرام‌آرام از راه مقاومت خالی می‌شود تا قلهٔ بعدی برسد و دوباره پرش کند. نتیجه این است که ولتاژ دو سر خازن، قله به قله، همان منحنی envelope را دنبال می‌کند.",
      "s4.p2": "برای اینکه این مدار درست کار کند، سرعت خالی شدن خازن باید در یک بازهٔ مشخص باشد و این را با <span class=\"q\">RC</span> تنظیم می‌کنند. از یک طرف خازن نباید آن‌قدر تند خالی شود که بین دو قلهٔ متوالی carrier افت کند، وگرنه خروجی پر از لرزش با فرکانس carrier می‌شود. از طرف دیگر نباید آن‌قدر کند باشد که وقتی پیام سریع پایین می‌آید، خازن نتواند دنبالش برود. یعنی <span class=\"q\">RC</span> باید از یک دورهٔ carrier خیلی بزرگ‌تر و از سریع‌ترین تغییر پیام خیلی کوچک‌تر باشد.",
      "s4.p3": "اگر هر کدام از این دو شرط نقض شود، یک نوع خرابی مشخص می‌بینی: در حالت اول لرزش carrier در خروجی می‌ماند و باید با یک فیلتر حذفش کرد، و در حالت دوم خروجی در قسمت‌های نزولی به‌جای دنبال کردن منحنی، تبدیل به یک خط مورب می‌شود. نکتهٔ مهم اما این است که هیچ‌کدام از این‌ها ربطی به فاز یا فرکانس دقیق carrier ندارد. گیرنده لازم نیست بداند فرستنده دقیقاً روی چه فرکانسی است یا موجش در چه فازی می‌رسد، و همین است که آن را این‌قدر ارزان می‌کند.",
      "s4.p4": "یک حالت خرابی دیگر هم هست که تقصیر گیرنده نیست و از فرستنده می‌آید. اگر <span class=\"q\">m</span> را از ۱ بیشتر کنیم، عبارت <span class=\"q\">1 + m·x(t)</span> در بخشی از زمان منفی می‌شود. گیرنده که علامت را نمی‌بیند، آن قسمت را حول محور صفر تا می‌زند و به‌جای پیام، قدرمطلق پیام را تحویل می‌دهد. این خرابی برگشت‌ناپذیر است، چون اطلاعات علامت اصلاً به گیرنده نرسیده که بشود بازسازی‌اش کرد.",
      "s4.span1": "شکل ۳",
      "s4.span2": "شاخص مدولاسیون را از ۱ رد کن",
      "s4.span3": "شاخص مدولاسیون",
      "s4.note1": "خروجی صوتی دارد. اول بلندی صدا را کم کن.",
      "s4.cap1": "ردیف بالا سیگنالی است که فرستنده بیرون می‌دهد و منحنی envelope روی آن کشیده شده. ردیف پایین چیزی است که همان مدار دیود و خازن تحویل می‌دهد، و خط‌چین کنارش نشان می‌دهد یک گیرندهٔ پیشرفته‌تر که علامت را هم می‌بیند چه چیزی می‌گرفت. تا وقتی <b><span class=\"q\">m</span></b> زیر ۱ است این دو کاملاً روی هم می‌افتند و اختلافشان به یک درصد هم نمی‌رسد؛ همان مقدار ناچیز هم لرزشی است که از خالی شدن خازن بین قله‌ها می‌ماند. حالا <b><span class=\"q\">m</span> را از ۱ رد کن</b> و ببین چه اتفاقی می‌افتد: دو نیمهٔ envelope از هم رد می‌شوند و خروجی به قدرمطلق پیام تبدیل می‌شود. <b>دکمهٔ پخش را هم بزن</b> و همین کار را تکرار کن تا بشنوی چه بلایی سر صدا می‌آید. حالت <b>«موسیقی»</b> یک ضبط واقعی است که به اندازهٔ پهنای باند یک کانال AM محدود شده.",
      "s4.p5": "به همین دلیل انتخاب <span class=\"q\">m</span> در عمل یک مصالحه است. اگر کوچک بگیریمش، سهم کمتری از توان به اطلاعات می‌رسد و صدا در گیرنده ضعیف‌تر و پر نویزتر می‌شود. اگر تا نزدیک ۱ ببریمش بیشترین بازده را می‌گیریم، اما دیگر هیچ حاشیهٔ امنی نداریم و کافی است یک قلهٔ بلند در صدا پیش بیاید تا خروجی خراب شود. برای همین در فرستنده‌های رادیویی سطح مدولاسیون را دائم اندازه می‌گیرند و محدود نگه می‌دارند.",
      "s4.h21": "<span class=\"secnum\">05</span> توان کجا خرج می‌شود",
      "s5.p1": "حالا ببینیم آن عدد <span class=\"q\">1</span> که envelope را نجات داد، چه هزینه‌ای روی دست ما می‌گذارد. اگر پرانتز رابطهٔ AM را باز کنیم، سیگنال ارسالی به مجموع دو قسمت تبدیل می‌شود: یکی <span class=\"q\">A<sub>c</sub>cos(2πf<sub>c</sub>t)</span> که هیچ ربطی به پیام ندارد و همیشه با همان قدرت فرستاده می‌شود، و دیگری <span class=\"q\">A<sub>c</sub>·m·x(t)·cos(2πf<sub>c</sub>t)</span> که تنها بخش حامل اطلاعات است.",
      "s5.p2": "توان این دو قسمت را می‌شود جدا حساب کرد و سهم هر کدام را به دست آورد. نتیجه این می‌شود که سهم توان مفید از کل برابر <span class=\"q\">η = m²⟨x²⟩ / (1 + m²⟨x²⟩)</span> است، که در آن <span class=\"q\">⟨x²⟩</span> یعنی توان متوسط پیام. برای یک صدای تک‌فرکانسی این مقدار <span class=\"q\">1/2</span> است، پس حتی وقتی <span class=\"q\">m</span> را تا ۱ بالا ببریم، بازده دقیقاً <span class=\"q\">1/3</span> می‌شود: <b>دوسوم توان صرف carrier ای می‌شود که هیچ حرفی برای گفتن ندارد و فقط یک‌سوم به پیام می‌رسد.</b>",
      "s5.span1": "شکل ۴",
      "s5.span2": "تقسیم توان بین carrier و sideband ها",
      "s5.span3": "شاخص مدولاسیون",
      "s5.p3": "منبع را از تُن به صدای واقعی عوض کن و ببین بازده چطور سقوط می‌کند، آن هم بدون اینکه <span class=\"q\">m</span> را دست زده باشیم. دلیلش در همان رابطه پیداست: بازده به توان متوسط پیام بستگی دارد، و یک صدای تک‌فرکانسی همیشه با دامنهٔ کامل نوسان می‌کند در حالی که صدای واقعی بیشتر وقت‌ها آرام است و فقط گاهی به قله می‌زند. اما همان قله‌های نادر هستند که <span class=\"q\">m</span> را تعیین می‌کنند، پس عملاً بیشتر توان هدر می‌رود.",
      "s5.cap1": "میلهٔ بالا کل توان فرستنده را نشان می‌دهد که بین carrier (خاکستری) و sideband ها (آبی) تقسیم شده. منحنی زیر آن همان بازده است بر حسب شاخص مدولاسیون. برای یک تُن، منحنی در <span class=\"q\">m = 1</span> دقیقاً به خط‌چین یک‌سوم می‌رسد و همان‌جا متوقف می‌شود. ناحیهٔ سایه‌دار بعد از آن جایی است که بازده همچنان بالا می‌رود اما گیرنده دیگر نمی‌تواند پیام را سالم بیرون بکشد، پس عملاً قابل استفاده نیست. برای گفتار معمولی بازده متوسط به چند درصد هم نمی‌رسد.",
      "s5.p4": "اما این هزینه بی‌دلیل پرداخت نمی‌شود؛ در ازایش چیزی خریده‌ایم. همان carrier ای که به‌ظاهر بیهوده فرستاده می‌شود، مرجعی است که به گیرنده اجازه می‌دهد بدون دانستن فاز کار کند. اگر حذفش کنیم توان کمتری هدر می‌رود، ولی گیرنده باید خودش یک نوسان‌ساز داشته باشد که فرکانس و فاز فرستنده را بازسازی کند. یعنی مدار پیچیده و گران به‌جای یک دیود و یک خازن. کل معماری رادیوی AM نتیجهٔ همین یک انتخاب است: هزینه را در فرستنده می‌دهیم تا میلیون‌ها گیرنده بتوانند ساده و ارزان بمانند.",
      "s5.h21": "<span class=\"secnum\">06</span> طیف AM و sideband ها",
      "s6.p1": "تا اینجا سیگنال را در گذر زمان دیدیم. برای اینکه بفهمیم AM چقدر از طیف را اشغال می‌کند باید از زاویهٔ دیگری نگاه کنیم، یعنی ببینیم سیگنال ارسالی از چه فرکانس‌هایی تشکیل شده.",
      "s6.p2": "پایهٔ کار یک رابطهٔ سادهٔ مثلثاتی است: وقتی دو موج سینوسی را در هم ضرب می‌کنی، نتیجه هیچ‌کدام از آن دو نیست، بلکه دو موج تازه است که فرکانسشان جمع و تفاضل فرکانس‌های اولیه است. یعنی اگر یک صدای <span class=\"q\">1 kHz</span> را روی یک carrier یک مگاهرتزی سوار کنیم، نه چیزی روی ۱ کیلوهرتز می‌ماند و نه چیز تازه‌ای روی ۱ مگاهرتز اضافه می‌شود؛ در عوض دو مؤلفهٔ جدید در دو طرف carrier ظاهر می‌شوند، یکی کمی پایین‌تر و یکی کمی بالاتر.",
      "s6.eqlbl1": "پایهٔ همهٔ محاسبات طیفی",
      "s6.p3": "به این دو مؤلفهٔ تازه <b>sideband</b> می‌گویند. هر فرکانسی که در پیام هست جفت خودش را می‌سازد، پس پیامی که تا فرکانس <span class=\"q\">W</span> بالا می‌رود، در هر طرف carrier نواری به همان عرض تولید می‌کند و در مجموع <b>پهنای باند ارسالی دو برابر پهنای باند پیام</b> می‌شود. همین عدد است که تعیین می‌کند کانال‌های AM چقدر از هم فاصله داشته باشند: در بیشتر دنیا <span class=\"q\">9 kHz</span> و در قارهٔ آمریکا <span class=\"q\">10 kHz</span>. و چون بیشتر از این جا نداریم، صدای رادیوی AM هم عملاً به حدود <span class=\"q\">4.5</span> تا <span class=\"q\">5 kHz</span> محدود می‌شود، که دلیل آن حالت خفهٔ آشنایش است.",
      "s6.p4": "نکتهٔ بعدی این است که آن دو sideband تصویر آینه‌ای همدیگرند و دقیقاً یک اطلاعات را حمل می‌کنند. یعنی داریم پول یک نسخهٔ تکراری را هم می‌دهیم. اگر جمع بزنیم: نصف پهنای باند صرف تکرار می‌شود و در بهترین حالت دوسوم توان هم صرف carrier، پس در مجموع چیزی حدود یک‌ششم از آنچه فرستنده خرج می‌کند واقعاً کار مفید انجام می‌دهد.",
      "s6.span1": "شکل ۵",
      "s6.span2": "حذف carrier و حذف یک sideband",
      "s6.span3": "فرکانس پیام",
      "s6.cap1": "ردیف بالا طیف سیگنال است و ردیف پایین همان سیگنال در گذر زمان با envelope کشیده‌شده روی آن. از حالت <b>AM</b> شروع کن و فرکانس پیام را تغییر بده تا ببینی sideband ها چطور از carrier دور و نزدیک می‌شوند. بعد به <b>DSB-SC</b> برو: خط carrier حذف می‌شود و envelope دیگر شبیه پیام نیست بلکه قدرمطلق آن است — یعنی همان خرابی که در شکل ۳ فقط بالای <span class=\"q\">m = 1</span> اتفاق می‌افتاد، اینجا همیشگی است. حالا با یک تُن ساده به <b>SSB</b> برو و ردیف پایین را نگاه کن: <b>envelope کاملاً صاف است.</b> اطلاعات هنوز آنجاست، ولی از بلندی موج به زاویهٔ آن منتقل شده، و مدار سادهٔ ما اصلاً زاویه را نمی‌بیند.",
      "s6.p5": "همین دو حذف، دو روش استاندارد دیگر را می‌سازند. اگر carrier را حذف کنیم به <b>DSB-SC</b> می‌رسیم که تمام توانش صرف اطلاعات می‌شود، هرچند پهنای باندش هنوز دو برابر پیام است. و اگر یکی از دو sideband را هم حذف کنیم به <b>SSB</b> می‌رسیم که هم تمام توانش مفید است و هم فقط به اندازهٔ خود پیام جا می‌گیرد. از نظر مصرف منابع، SSB به‌وضوح بهترین گزینه است.",
      "s6.p6": "با این حال رادیوی پخش هیچ‌کدام را به کار نبرد، و باز هم دلیلش سمت گیرنده است. وقتی carrier فرستاده نمی‌شود، گیرنده هیچ مرجعی ندارد که سیگنال را با آن بسنجد و مجبور است خودش یکی بسازد که هم فرکانس و هم فاز فرستنده را دقیق بازسازی کند. یک خطای کوچک در این بازسازی کل طیف صدا را جابه‌جا می‌کند و گفتار را نامفهوم. برای پخش عمومی این هزینه باید در میلیون‌ها گیرنده تکرار شود، و همین کافی بود که کنار گذاشته شود.",
      "s6.box1": "<b>SSB کنار گذاشته نشد، فقط جای دیگری رفت.</b> هر جا که گیرنده حرفه‌ای باشد — ارتباطات راه دور، رادیوآماتوری، و ارتباطات دریایی و هوایی در باندهای HF — صرفه‌جویی در توان و پهنای باند به پیچیدگی گیرنده می‌ارزد و SSB انتخاب استاندارد است.",
      "s6.h21": "<span class=\"secnum\">07</span> نویز",
      "s7.p1": "هر ایرادی که تا اینجا گرفتیم دربارهٔ مصرف منابع بود: توان، پهنای باند، و پیچیدگی مدار. این‌ها را می‌شود با طراحی بهتر یا هزینهٔ بیشتر بهبود داد. اما ایرادی که در این بخش می‌بینیم از جنس دیگری است و راه فراری از آن نیست.",
      "s7.p2": "به آنتن گیرنده فقط سیگنال نمی‌رسد؛ نویز هم می‌رسد. بخشی از آن نویز حرارتی است که در هر مدار الکترونیکی به‌طور طبیعی وجود دارد، و بخشی از محیط می‌آید: از رعد و برق گرفته تا جرقهٔ موتور خودرو و لامپ و موتور برقی. چیزی که این‌ها را برای ما مسئله‌ساز می‌کند این است که همه‌شان خودشان را به شکل تغییرات تصادفی در بلندی موج نشان می‌دهند.",
      "s7.sum1": "یادآوری — دسی‌بل",
      "s7.p6": "دسی‌بل یک واحد نیست، بلکه راهی است برای نوشتن نسبت‌ها. وقتی نسبت‌هایی که با آن‌ها سر و کار داری از چند برابر تا چند میلیون برابر تغییر می‌کنند، مقایسه‌شان در مقیاس معمولی سخت می‌شود، پس لگاریتم می‌گیرند و کار راحت می‌شود. هر <span class=\"q\">10 dB</span> یعنی ده برابر شدن توان.",
      "s7.p7": "پس <span class=\"q\">0 dB</span> یعنی دو چیز برابرند، <span class=\"q\">20 dB</span> یعنی یکی صد برابر دیگری است و <span class=\"q\">40 dB</span> یعنی ده هزار برابر. وقتی در شکل بعدی می‌بینی سیگنال <span class=\"q\">26 dB</span> بالای نویز است، یعنی توانش حدود چهارصد برابر نویز است — عددی که در نگاه اول خیلی زیاد به نظر می‌رسد، ولی همان‌جاست که تازه صدای هیس پشت موسیقی شنیده می‌شود.",
      "s7.p3": "حالا مسئله روشن می‌شود. گیرندهٔ ما کارش این است که بلندی موج دریافتی را اندازه بگیرد و همان را به بلندگو بدهد. اما پیام هم دقیقاً در بلندی موج نوشته شده. یعنی نویز و پیام هر دو در یک چیز ظاهر شده‌اند و گیرنده هیچ نشانه‌ای در اختیار ندارد که بفهمد کدام تغییرِ بلندی مال پیام بوده و کدام مال نویز. گیرنده اشتباه نمی‌کند و درست کار می‌کند؛ فقط چیزی برای تشخیص وجود ندارد.",
      "s7.span1": "شکل ۶",
      "s7.span2": "سطح نویز را تغییر بده",
      "s7.span3": "carrier روی نویز",
      "s7.note1": "خروجی صوتی دارد. اول بلندی صدا را کم کن.",
      "s7.cap1": "ردیف بالا سیگنالی است که به گیرنده می‌رسد، بعد از اینکه فیلتر ورودی هر کاری از دستش برمی‌آمد انجام داده. ردیف پایین خروجی آشکارساز است و خط‌چین کنارش خروجی <em>همان گیرنده در حالتی که نویز اصلاً وجود نداشته باشد</em>؛ پس فاصلهٔ این دو دقیقاً سهم نویز است و نه چیز دیگر. لغزنده را پایین بیاور و ببین چطور از هم فاصله می‌گیرند، و <b>با دکمهٔ پخش هم امتحان کن</b>، اول با تُن و بعد با موسیقی. بعد عدد <em>افزایش</em> را دنبال کن: این عدد می‌گوید گیرنده چقدر نسبت سیگنال به نویز را بهتر یا بدتر کرده، و می‌بینی که حدود <span class=\"q\">−6 dB</span> می‌ماند و با تغییر سطح نویز تقریباً ثابت است. منفی بودنش به همان بازده یک‌سوم برمی‌گردد، ولی نکتهٔ اصلی ثابت ماندنش است: <b>گیرنده هر چه بگیرد، تقریباً همان را تحویل می‌دهد و چیزی به آن اضافه نمی‌کند.</b>",
      "s7.p4": "و این نتیجه ربطی به طراحی گیرنده ندارد. مشکل در مدار نیست، در همان انتخاب اولیه است که پیام را روی بلندی موج سوار کردیم. وقتی اطلاعات و نویز هر دو در یک کمیت بنشینند، هیچ پردازشی در گیرنده نمی‌تواند آن‌ها را از هم جدا کند، چون در سیگنالی که رسیده اصلاً اطلاعات اضافه‌ای برای این تفکیک وجود ندارد. در نویزهای شدید وضعیت از این هم بدتر می‌شود: از یک حدی به بعد، خروجی خیلی سریع‌تر از ورودی خراب می‌شود.",
      "s7.h21": "<span class=\"secnum\">08</span> ضعف اصلی AM",
      "s8.p1": "جمع‌بندی کنیم. مهم‌ترین ویژگی AM این است که گیرنده‌اش می‌تواند فوق‌العاده ساده باشد. چون carrier همراه سیگنال فرستاده می‌شود، envelope هیچ‌وقت منفی نمی‌شود و یک دیود و یک خازن برای بیرون کشیدن پیام کافی است. گیرنده نه به فاز نیاز دارد، نه به تنظیم دقیق فرکانس، و در ساده‌ترین شکلش حتی به منبع تغذیه هم نیاز ندارد. همین سادگی بود که AM را به اولین روش عملی پخش رادیویی تبدیل کرد و هنوز هم در جاهایی مثل ارتباطات هوانوردی نگهش داشته.",
      "s8.p2": "و در کنارش یک ضعف دارد که با هیچ ترفندی در خود AM جبران نمی‌شود: پیام دقیقاً در همان چیزی نوشته شده که نویز هم در آن ظاهر می‌شود.",
      "s8.box1": "مشکل از گیرنده نیست. از همان اول، پیام را روی مشخصه‌ای سوار کردیم که نویز هم دقیقاً روی همان می‌نشیند.",
      "s8.p3": "پس راه‌حل هم باید از همان‌جا بیاید که مشکل شروع شد. اگر به‌جای بلندی موج، پیام را روی زاویهٔ آن سوار کنیم، آن‌وقت بلندی موج دیگر هیچ اطلاعاتی ندارد و گیرنده می‌تواند قبل از هر کاری آن را با یک مدار ساده کاملاً یکنواخت کند. هر چیزی که در بلندی موج نوشته شده باشد — که بخش عمدهٔ نویز همان است — در همین مرحله دور ریخته می‌شود.",
      "s8.p4": "این همان ایده‌ای است که پشت مدولاسیون زاویه، یعنی FM و PM، نشسته. رفتارش در برابر نویز اساساً با AM فرق دارد: در ازای اشغال پهنای باند بیشتر، صدای به‌مراتب تمیزتری تحویل می‌دهد، هرچند آن هم حد و مرز خودش را دارد و زیر یک آستانهٔ مشخص خیلی سریع فرو می‌ریزد. اما این بحث خودش یک نوشتهٔ جداگانه می‌خواهد.",
      "s8.span1": "بعدی",
      "s8.span2": "<a href=\"../hiding-a-voice-fm/\">مدولاسیون فرکانس</a> — اینکه چرا پهن‌تر شدن سیگنال به تمیزتر شدن صدا منجر می‌شود، چقدر پهنای باند لازم دارد، و آن آستانه‌ای که زیرش همه‌چیز خراب می‌شود کجاست.",
      "s8.h32": "منابع و خواندن بیشتر",
      "s8.li1": "A. B. Carlson, <em>Communication Systems</em>, 5th ed., McGraw-Hill — فصل ۴ برای مدولاسیون خطی و فصل ۱۰ برای بحث نویز؛ مرجع اصلی روابطی که در این نوشته آمده.",
      "s8.li2": "B. P. Lathi and Z. Ding, <em>Modern Digital and Analog Communication Systems</em>, 4th ed., Oxford — برای آشکارساز envelope و شرط ثابت زمانی، با جزئیات مداری بیشتر.",
      "s8.li3": "J. R. Carson, “Notes on the Theory of Modulation,” <em>Proceedings of the IRE</em>, vol. 10, no. 1, Feb. 1922 — مرجع اصلی بحث sideband ها.",
      "s8.li4": "J. R. Carson, US Patent 1,449,382, “Method and Means for Signaling with High Frequency Waves,” filed 1915, granted 1923 — ثبت اختراع SSB.",
      "s8.li5": "T. H. Lee, <em>The Design of CMOS Radio-Frequency Integrated Circuits</em>, 2nd ed., Cambridge — برای اینکه ببینی این مدارها در عمل چطور ساخته می‌شوند.",
      "s8.span3": "© ۲۰۲۶ حسن کشت‌کار · <span class=\"mono-label\">hkk.fyi</span>",
      "s8.span4": "ساخته‌شده با عشق <span class=\"heart\" aria-hidden=\"true\">♥</span> و هوش مصنوعی :)))",
      "meta.title": "مدولاسیون دامنه — چرا لازم است و چه هزینه‌ای دارد · hkk.fyi",
      "meta.description": "چرا نمی‌شود صدا را مستقیم فرستاد، مدولاسیون دامنه دقیقاً چه می‌کند، گیرنده با یک دیود و یک خازن چطور پیام را بیرون می‌کشد، توان کجا خرج می‌شود، و چرا AM در برابر نویز ضعف دارد. با شش شکل تعاملی و شبیه‌سازی زنده.",
      "meta.og:title": "مدولاسیون دامنه — چرا لازم است و چه هزینه‌ای دارد",
      "meta.og:description": "اندازهٔ آنتن، اشتراک طیف، شاخص مدولاسیون، مدار آشکارساز، تقسیم توان بین carrier و sideband ها، و ضعف در برابر نویز.",
      "meta.og:image:alt": "یک carrier مدوله‌شده در دامنه، با envelope رسم‌شده، کنار عنوان مقاله.",
      "js.src.voice": "تُن",
      "js.src.music": "موسیقی",
      "js.yes": "بله",
      "js.no": "خیر",
      "js.audio.listen": "پخش",
      "js.audio.stop": "توقف",
      "js.audio.wait": "در حال محاسبه…",
      "js.audio.failed": "مرورگر خروجی صوتی را باز نکرد.",
      "js.share.copy_link": "کپی لینک",
      "js.share.copied": "کپی شد",
      "js.share.press": "⌘C را بزن",
      "js.band.s1": "ایستگاه ۱",
      "js.band.s2": "ایستگاه ۲",
      "js.band.s3": "ایستگاه ۳",
      "js.band.axis": "دامنه",
      "js.band.mode_b": "بدون carrier",
      "js.band.mode_c": "روی سه carrier",
      "js.band.lane1b": "هر سه در یک محدوده، روی هم افتاده",
      "js.band.lane1c": "سه carrier، سه محدودهٔ جدا",
      "js.band.lane2b": "خروجی: مجموع هر سه",
      "js.band.lane2c": "خروجی گیرنده · خط‌چین = سیگنال ارسالی",
      "js.band.ro_dial": "فرکانس تنظیم",
      "js.band.ro_bw": "پهنای باند فیلتر",
      "js.band.ro_state": "تنظیم روی",
      "js.band.ro_between": "بین دو ایستگاه",
      "js.band.ro_rej": "ایستگاه بغلی ضعیف‌تر است به اندازهٔ",
      "js.band.ro_mush": "هر سه با هم",
      "js.band.ro_span": "همه در",
      "js.band.ro_pick": "می‌شود یکی را جدا کرد؟",
      "js.band.ro_no": "با هیچ فیلتری",
      "js.knobs.m_tone": "تُن",
      "js.knobs.m_sq": "مربعی",
      "js.knobs.m_tri": "مثلثی",
      "js.knobs.m_voice": "صدا",
      "js.knobs.l_msg": "پیام",
      "js.knobs.l_am": "AM · بلندی موج تغییر می‌کند",
      "js.knobs.l_fm": "FM · فرکانس تغییر می‌کند",
      "js.knobs.l_pm": "PM · فاز تغییر می‌کند",
      "js.knobs.d_am": "m",
      "js.knobs.d_ang": "زاویه",
      "js.depth.m_tone": "تُن",
      "js.depth.m_voice": "صدا",
      "js.depth.l_tx": "سیگنال ارسالی · آبی = envelope",
      "js.depth.l_rx": "خروجی گیرنده · خط‌چین = گیرنده‌ای که علامت را می‌بیند",
      "js.depth.ro_m": "شاخص مدولاسیون",
      "js.depth.ro_zero": "envelope به صفر می‌رسد",
      "js.depth.ro_dist": "اعوجاج",
      "js.depth.ro_state": "وضعیت",
      "js.depth.ro_ok": "سالم",
      "js.depth.ro_edge": "درست روی مرز",
      "js.depth.ro_broken": "تا خورده — خروجی دیگر پیام نیست",
      "js.pw.m_tone": "تُن",
      "js.pw.m_voice": "صدا",
      "js.pw.m_sq": "مربعی",
      "js.pw.carrier": "carrier · بدون اطلاعات",
      "js.pw.sidebands": "sideband ها · پیام",
      "js.pw.xaxis": "شاخص مدولاسیون m",
      "js.pw.overmod": "m > 1",
      "js.pw.ro_m": "شاخص مدولاسیون",
      "js.pw.ro_mean": "توان متوسط پیام",
      "js.pw.ro_car": "سهم carrier",
      "js.pw.ro_side": "سهم پیام",
      "js.pw.ro_ssb": "همین مقدار در SSB",
      "js.side.am": "AM",
      "js.side.dsb": "DSB-SC",
      "js.side.usb": "SSB · بالایی",
      "js.side.lsb": "SSB · پایینی",
      "js.side.k_one": "یک تُن",
      "js.side.k_two": "دو تُن",
      "js.side.k_voice": "صدا",
      "js.side.fc": "carrier",
      "js.side.l_spec": "طیف",
      "js.side.l_time": "در گذر زمان · آبی = envelope",
      "js.side.nocarrier": "اینجا دیگر چیزی نیست",
      "js.side.ro_lines": "مؤلفه‌های ارسالی",
      "js.side.ro_bw": "پهنای باند اشغال‌شده",
      "js.side.ro_car": "carrier فرستاده می‌شود",
      "js.side.ro_env": "envelope همان پیام است",
      "js.side.env_yes": "بله",
      "js.side.env_rect": "قدرمطلق پیام",
      "js.side.env_no": "صاف است",
      "js.side.ro_rx": "گیرنده لازم دارد",
      "js.side.rx_diode": "یک دیود و یک خازن",
      "js.side.rx_lo": "نوسان‌ساز خودش",
      "js.static.l_air": "آنچه به گیرنده می‌رسد",
      "js.static.l_rx": "خروجی گیرنده · خط‌چین = بدون نویز",
      "js.static.ro_cn": "carrier روی نویز، ورودی",
      "js.static.ro_snr": "سیگنال روی نویز، خروجی",
      "js.static.ro_gain": "افزایش",
      "js.static.ro_v": "وضعیت",
      "js.static.v_clean": "تمیز",
      "js.static.v_hiss": "هیس شنیده می‌شود",
      "js.static.v_rough": "خیلی خراب",
      "js.static.v_gone": "از دست رفت"
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
