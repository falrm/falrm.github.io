importScripts('Base24Conversions.js');

var currentScore;
var playing = false;
var playbackMode = 'score';
var currentTick = 0;
var bpm = 123;
var currentSectionId;
var metronomeEnabled = true;
var activeAttacks = [];
var ticksPerBeat = 24;

self.onmessage = function (event) {
  switch (event.data.shift()) {
    case 'play':
      playing = true;
      tick();
      break;
    case 'pause':
      playing = false;
      clearActiveAttacks();
      break;
    case 'stop':
      playing = false;
      clearActiveAttacks();
      currentTick = 0;
      break;
    case 'setPlaybackMode':
      playbackMode = event.data[0];
      break;
    case 'createScore':
      currentScore = event.data[0];
      currentSectionId = currentScore.sections[0].id;
      break;
    case 'updateSections':
      currentScore.sections = event.data[0].sections;
      if (!currentScore.sections.some(s => s.id == currentSectionId)) {
        currentSectionId = currentScore.sections[0].id;
      }
      break;
    case 'setCurrentSection':
      currentSectionId = event.data[0];
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
    case 'deletePart':
      currentScore.parts = currentScore.parts.filter(part => part.id != event.data[0]);
      break;
    case 'setMetronomeEnabled':
      metronomeEnabled = event.data[0];
      break;
    default:
      throw 'invalid call to worker';
  }
}

function sendMIDI(...bytes) {
  postMessage(['sendMIDI', ...bytes ]);
}

function findCurrentSection() {
  return currentScore.sections.filter(it => it.id == currentSectionId)[0];
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

function tick() {
  var section = findCurrentSection();
  var harmony = section.harmony;
  if (currentTick >= ticksPerBeat * harmony.length / harmony.subdivisionsPerBeat) {
    var sectionIndex = currentScore.sections.findIndex((it) => it.id == section.id);
    currentTick = 0;
    if (playbackMode == 'score') {
      if (sectionIndex + 1 < currentScore.sections.length) {
        currentSectionId = currentScore.sections[sectionIndex + 1].id;
        notifyCurrentSection();
      } else {
        currentSectionId = currentScore.sections[0].id;
        notifyPlayingBeat();
        playing = false;
        notifyCurrentSection();
        notifyPaused();
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
    // recordBeat();
  }
  doTick(section);
  currentTick++;

  var now = Date.now();
  var tickTime = Math.round(60000 / (bpm * ticksPerBeat));
//  console.log('ticktime=' + tickTime);
  setTimeout(() => {
    while (Date.now() < now + tickTime) {}
    if (playing) tick();
  }, tickTime * 0.8);
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
    // TODO playback actual data from melody
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
  postMessage(['notifyPlayingBeat', beat]);
}

function notifyCurrentSection() {
  postMessage(['notifyPlayingBeat', currentSectionId]);
}

function notifyPaused(beat) {
  postMessage(['notifyPaused']);
}