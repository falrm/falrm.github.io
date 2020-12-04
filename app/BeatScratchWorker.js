importScripts('Base24Conversions.js');

var currentScore;
var playing = false;
var playbackMode = 'score';
var currentTick = 0;
var unmultipliedBpm = 123;
var bpmMultiplier = 1;
var currentSectionId;
var metronomeEnabled = true;
var activeAttacks = [];
var ticksPerBeat = 24;
var lastCountInBeatTime = null;

// MIDI prerendering: Rather than take the approach of rendering everything in realtime,
// we will send data to sendMIDIAtTime a beat ahead of time, with appropriate delays.
var usePreRendering = true;
var preRenderBeatsAhead = 2;
var nextPreRenderBeat = { startTime: null, beat: null, sectionId: null };
// If not set, prerender system will assign from Date.now(), possibly with a mandatory initial delay
var preRenderEffectiveTime;

self.onmessage = function (event) {
  switch (event.data.shift()) {
    case 'play':
      playing = true;
      tick();
      break;
    case 'pause':
      pause();
      notifyPaused();
      break;
    case 'stop':
      pause();
      notifyPaused();
      currentTick = 0;
      break;
    case 'setPlaybackMode':
      playbackMode = event.data[0];
      break;
    case 'createScore':
      currentScore = event.data[0];
      setCurrentSection(currentScore.sections[0], false, true);
      break;
    case 'updateSections':
      currentScore.sections = event.data[0].sections;
      if (!currentScore.sections.some(s => s.id == currentSectionId)) {
        setCurrentSection(currentScore.sections[0], false, false);
      }
      break;
    case 'setCurrentSection':
      currentSectionId = event.data[0];
      setCurrentSection(findCurrentSection(), false, false);
      break;
    case 'setBeat':
      currentTick = event.data[0] * ticksPerBeat;
      break;
    case 'createMelody':
      var partId = event.data[0];
      var melody = event.data[1];
      var part = currentScore.parts.filter(part => part.id == partId)[0];
      if (!part.melodies) part.melodies = [];
      part.melodies.push(melody);
      break;
    case 'updateMelody':
      var melody = event.data[0];
      var part = currentScore.parts.filter(part => part.melodies.some(m => m.id = melody.id))[0];
      part.melodies = part.melodies.filter(m => m.id != melody.id);
      part.melodies.push(melody);
      break;
    case 'createPart':
      currentScore.parts.push(event.data[0]);
      break;
    case 'deletePart':
      currentScore.parts = currentScore.parts.filter(part => part.id != event.data[0]);
      break;
    case 'setMetronomeEnabled':
      metronomeEnabled = event.data[0];
      break;
    case 'setBpmMultiplier':
      bpmMultiplier = event.data[0];
      break;
    case 'setUsePreRendering':
      usePreRendering = event.data[0];
      break;
    case 'countIn':
      var time = Date.now();
      playMetronome();
      if (lastCountInBeatTime == null) {
        lastCountInBeatTime = time;
      } else if (time - lastCountInBeatTime < 3000) {
        var periodMs = time - lastCountInBeatTime;
        var multipliedBpm = 60000 / periodMs;
        bpmMultiplier = multipliedBpm / unmultipliedBpm;
        notifyBpmMultiplier();
        lastCountInBeatTime = null;
        currentTick = -24;
        playing = true;
        tick();
      }
    default:
      throw 'invalid call to worker';
  }
}

function sendMIDI(...bytes) {
  if (usePreRendering) {
    sendMIDIAtTime(preRenderEffectiveTime, ...bytes);
  } else {
    sendMIDINow(...bytes)
  }
}

function sendMIDIAtTime(time, ...bytes) {
  postMessage(['sendMIDIAtTime', time, Date.now(), ...bytes ]);
}

function sendMIDINow(...bytes) {
  postMessage(['sendMIDI', ...bytes ]);
}

function effectiveBpm() {
  return Math.max(8, unmultipliedBpm * bpmMultiplier);
}

function findCurrentSection() {
  return currentScore.sections.filter(it => it.id == currentSectionId)[0];
}

function findSectionAfter(section) {
  var index = currentScore.sections.findIndex((it) => it.id == section.id);
  if (index >= 0 && index < sections.length - 1) {
    return currentScore.sections[index + 1];
  }
  return null;
}

function setCurrentSection(section, notify = false, notifyStarted = false) {
  currentSectionId = section.id;
  if (notify) {
    notifyCurrentSection();
  } else if (notifyStarted) {
    notifyStartedSection();
  }
  unmultipliedBpm = findCurrentSection().tempo.bpm;
  notifyUnmultipliedBpm();
}

function findPartAndMelody(melodyId) {
  for(part of currentScore.parts) {
    if (!part.melodies) part.melodies = [];
    for(m of part.melodies) {
      if(m.id == melodyId) {
        return [part, m];
      }
    }
  }
  return null;
}

function setupPreRenderingForBeat() {
  nextPreRenderBeat = {
    startTime: preRenderEffectiveTime || Date.now() + 100, // This 100ms latency when starting playback makes things smoother.
    beat: parseInt(currentTick / ticksPerBeat),
    sectionId: currentSectionId,
  };
  if (!preRenderEffectiveTime) {
    preRenderEffectiveTime = nextPreRenderBeat.startTime;
  }
}

function tick() {
  if (usePreRendering && (nextPreRenderBeat === null || nextPreRenderBeat.startTime === null)) {
    preRenderEffectiveTime = null;
    setupPreRenderingForBeat();
  }
  var section = findCurrentSection();
  var harmony = section.harmony;
  if (currentTick >= ticksPerBeat * harmony.length / harmony.subdivisionsPerBeat) {
    var sectionIndex = currentScore.sections.findIndex((it) => it.id == section.id);
    currentTick = 0;
    if (playbackMode == 'score') {
      if (sectionIndex + 1 < currentScore.sections.length) {
        var newCurrentSection = currentScore.sections[sectionIndex + 1];
        setCurrentSection(newCurrentSection, false, true);
      } else {
        setCurrentSection(currentScore.sections[0], false, true);
        notifyPlayingBeat();
        pause();
        return;
      }
    }
  }
  var beatMod = currentTick % ticksPerBeat;
  if (beatMod == 0) {
    playMetronome();
    if (playbackMode == 'score' && currentTick == 0) {
      clearNonSectionActiveAttacks();
    }
    notifyPlayingBeat();
  }
  doTick(section);
  currentTick++;

  var now = Date.now();
  var tickTime = Math.round(60000 / (effectiveBpm() * ticksPerBeat));
  if (usePreRendering) {
    preRenderEffectiveTime += tickTime;
    if (currentTick % ticksPerBeat == 0) {
      setupPreRenderingForBeat();
      var now = Date.now();
      var timeToRenderNextBeat = nextPreRenderBeat.startTime - (preRenderBeatsAhead * (60000 / effectiveBpm()));
      var timeToWait = Math.min(0, timeToRenderNextBeat);
      timeToWait = parseInt(timeToWait * 0.5);
      // Timeout only between beats when prerendering, maybe just a 0 timeout.
      setTimeout(() => {
        while (Date.now() < timeToRenderNextBeat) {}
        if (playing) tick();
      }, timeToWait);
    } else {
      // Prerender til the end of the beat without timeouts
      if (playing) tick();
    }
  } else {
    setTimeout(() => {
      while (Date.now() < now + tickTime) {}
      if (playing) tick();
    }, 0);
  }
}

function doTick(section) {
  (section.melodies ?? []).forEach( melodyReference => {
    if (melodyReference.playbackType == 'disabled') return;
    var part, melody;
    [part, melody] = findPartAndMelody(melodyReference.melodyId);
    if (melody == null) return;
    var ticks = base24ConversionMap[melody.subdivisionsPerBeat];
    var correspondingPosition = ticks.indexOf(currentTick % ticksPerBeat);
    if (correspondingPosition >= 0) {
      var currentBeat = Math.floor(currentTick / ticksPerBeat);
      var melodyPosition = currentBeat * melody.subdivisionsPerBeat + correspondingPosition;
      var midiChange = melody.midiData.data[melodyPosition % melody.length];
      if (midiChange) {
        // Proto3 encodes the MIDI data to a base64 string; decode it.
//        console.log("midiChange " + midiChange.data + " at tick=" + currentTick + ", time=" + (Date.now()/1000));
        var midiData = Uint8Array.from(atob(midiChange.data), c => c.charCodeAt(0));
        processAndSendMIDIData(midiData, part.instrument.midiChannel, melodyReference);
      }
    }
  });
}

function processAndSendMIDIData(data, channel, melodyReference) {
  var index = 0;
  while (index < data.length) {
    var byte = data[index];
    if ((byte & 0xF0) == 0x90 || (byte & 0xF0) == 0x80) { // noteOn/noteOff
      var updatedByte = (byte & 0xF0) + channel;
      var updatedVelocity = Math.floor(data[index + 2] * melodyReference.volume);
      sendMIDI(updatedByte, data[index + 1], updatedVelocity);
      if ((byte & 0xF0) == 0x90) {
        activeAttacks.push({
          melodyId: melodyReference.melodyId,
          channel: channel,
          midiNote: data[index + 1],
          velocity: updatedVelocity
        });
      } else {
        activeAttacks = activeAttacks
          .filter(attack => attack.melodyId != melodyReference.melodyId
            || attack.midiNote != data[index + 1]);
      }
      index += 3;
    } else {
      console.log("Failed to match MIDI byte: " + byte);
      index += 1;
    }
  }
}

function clearActiveAttacks() {
  activeAttacks.forEach(attack => {
      sendMIDI(0x80 + attack.channel, attack.midiNote, attack.velocity);
  });
  activeAttacks = [];
}

function clearNonSectionActiveAttacks() {
  var section = findCurrentSection();
  var melodies = (section.melodies ?? [])
    .filter(ref => ref.playbackType != 'disabled')
    .map(ref => ref.melodyId);
  var attacksToRemove = activeAttacks.filter(attack => !melodies.includes(attack.melodyId));
  attacksToRemove.forEach(attack => {
      sendMIDI(0x80 + attack.channel, attack.midiNote, attack.velocity);
  });
  activeAttacks = activeAttacks.filter(attack => melodies.includes(attack.melodyId));
}

function playMetronome() {
  if (metronomeEnabled) {
//    console.log("playMetronome at tick=" + currentTick + ", time=" + (Date.now()/1000));
    sendMIDI(0x99, 75, 127)
    sendMIDI(0x89, 75, 127)
  }
}

function notifyPlayingBeat() {
  var beat = currentTick / ticksPerBeat;
  postMessage(['notifyPlayingBeat', beat, preRenderEffectiveTime]);
}

function notifyCurrentSection() {
  postMessage(['notifyCurrentSection', currentSectionId, preRenderEffectiveTime]);
}

function notifyStartedSection() {
  postMessage(['notifyStartedSection', currentSectionId, preRenderEffectiveTime]);
}

function notifyBpmMultiplier() {
  postMessage(['notifyBpmMultiplier', bpmMultiplier]);
}

function notifyUnmultipliedBpm() {
  postMessage(['notifyUnmultipliedBpm', unmultipliedBpm]);
}

function play() {
  playing = true;
}

function pause() {
  playing = false;
  postMessage(['notifyPaused', preRenderEffectiveTime]);
  nextPreRenderBeat = null;
  preRenderEffectiveTime = null;
  clearActiveAttacks();
}
