

var isSynthesizerReady = false;
var currentScore;
var beatScratchWorker = new Worker('BeatScratchWorker.js');

function supportsPlayback() {
  return typeof(Worker) !== "undefined";
}

function checkBeatScratchAudioStatus() {
    return isSynthesizerReady;
}

function sendMIDI() {
  if((arguments[0] & 0xF0) == 0x90) {
    var note = arguments[1];
    var channel = arguments[0] & 0xF;
    var velocity = arguments[2];
    MIDI.noteOn(channel, note, velocity, 0);
  } else if((arguments[0] & 0xF0) == 0x80) {
    var note = arguments[1];
    var channel = arguments[0] & 0xF;
    MIDI.noteOff(channel, note, 0);
  } else {
    console.info("unmatched args:");
    console.info(arguments);
  }
}

function sendMIDIAtTime() {
  var args = [...arguments];
  var time = args.shift();
  var timeSent = args.shift();
  // time += Date.now() - timeSent;
  var delay = Math.max(0, (time - Date.now())/1000);
  if((args[0] & 0xF0) == 0x90) {
    var note = args[1];
    var channel = args[0] & 0xF;
    var velocity = args[2];
    MIDI.noteOn(channel, note, velocity, delay);
  } else if((args[0] & 0xF0) == 0x80) {
    var note = args[1];
    var channel = args[0] & 0xF;
    MIDI.noteOff(channel, note, delay);
  } else {
    console.info("unmatched args:");
    console.info(args);
  }
}

function createPart(part) {
  if(typeof part == 'string') part = JSON.parse(part);
  beatScratchWorker.postMessage(['createPart', part]);
  updatePartConfiguration(part);
}

function updatePartConfiguration(part, updateSynthesizerReady = true) {
  if(typeof part == 'string') part = JSON.parse(part);
  var midiChannel = part.instrument.midiChannel;
  var midiInstrument = part.instrument.midiInstrument;
  if (updateSynthesizerReady) {
    isSynthesizerReady = false;
    notifyBeatScratchAudioAvailable(isSynthesizerReady);
  }
  if(midiChannel != 9) {
      MIDI.loadPlugin({
          soundfontUrl: "FluidR3_GM/",
          instrument: midiInstrument,
          onprogress: function(state, progress) {
              console.log(state, progress);
          },
          onsuccess: function() {
            if (updateSynthesizerReady) {
              isSynthesizerReady = true;
              notifyBeatScratchAudioAvailable(isSynthesizerReady);
            }
            MIDI.channels[midiChannel].instrument = midiInstrument;
          }
      });
  }
}

function play() {
  beatScratchWorker.postMessage(['play']);
}

function pause() {
  beatScratchWorker.postMessage(['pause']);
  notifyPaused();
}

function stop() {
  beatScratchWorker.postMessage(['stop']);
  notifyPaused();
}

function setKeyboardPart(partId) {
  // Only really needed when we support MIDI keyboard input (i.e. over USB or Bluetooth)
}

function setPlaybackMode(mode) {
  beatScratchWorker.postMessage(['setPlaybackMode', mode]);
}

function setRecordingMelody(melodyId) {
  // Not supported on web
}

function createScore(score) {
  currentScore = score;
  beatScratchWorker.postMessage(['createScore', score]);

  isSynthesizerReady = false;
  notifyBeatScratchAudioAvailable(isSynthesizerReady);
  score.parts.forEach((p) => updatePartConfiguration(p, false));
  isSynthesizerReady = true;
  notifyBeatScratchAudioAvailable(isSynthesizerReady);
}

function updateSections(score) {
  currentScore.sections = score.sections;
  beatScratchWorker.postMessage(['updateSections', score]);
}

function setCurrentSection(sectionId) {
  beatScratchWorker.postMessage(['setCurrentSection', sectionId]);
}

function setBeat(beat) {
  beatScratchWorker.postMessage(['setBeat', beat]);
}

function createMelody(partId, melody) {
  beatScratchWorker.postMessage(['createMelody', partId, melody]);
}

function updateMelody(melody) {
  beatScratchWorker.postMessage(['updateMelody', melody]);
}

function deletePart(partId) {
  beatScratchWorker.postMessage(['deletePart', partId]);
}

function setRecordingMelody(melodyId) {
  // Not supported in web app yet
}

function setMetronomeEnabled(enabled) {
  beatScratchWorker.postMessage(['setMetronomeEnabled', enabled]);
}

function countIn(countInBeat) {
  beatScratchWorker.postMessage(['countIn', countInBeat]);
}

function setBpmMultiplier(bpmMultiplier) {
  beatScratchWorker.postMessage(['setBpmMultiplier', bpmMultiplier]);
}

function setUsePreRendering(value) {
  beatScratchWorker.postMessage(['setUsePreRendering', value]);
}

beatScratchWorker.onmessage = function(event) {
  switch (event.data.shift()) {
    case 'sendMIDI':
      sendMIDI(...event.data);
      break;
    case 'sendMIDIAtTime':
      sendMIDIAtTime(...event.data);
      break;
    case 'notifyPlayingBeat':
      if(event.data[1]) {
        setTimeout(() => notifyPlayingBeat(event.data[0]), Math.max(0, event.data[1] - Date.now() + 10));
      } else {
        notifyPlayingBeat(event.data[0]);
      }
      break;
    case 'notifyPaused':
      if(event.data[0]) {
        setTimeout(notifyPaused, Math.max(0, event.data[0] - Date.now() + 10));
      } else {
        notifyPaused();
      }
      break;
    case 'notifyCurrentSection':
      if(event.data[1]) {
        setTimeout(() => notifyCurrentSection(event.data[0]), Math.max(0, event.data[1] - Date.now() + 10));
      } else {
        notifyCurrentSection(event.data[0]);
      }
      break;
    case 'notifyStartedSection':
      if(event.data[1]) {
        setTimeout(() => notifyStartedSection(event.data[0]), Math.max(0, event.data[1] - Date.now() + 10));
      } else {
        notifyStartedSection(event.data[0]);
      }
      break;
    case 'notifyBpmMultiplier':
      notifyBpmMultiplier(event.data[0]);
      break;
    case 'notifyUnmultipliedBpm':
      notifyUnmultipliedBpm(event.data[0]);
      break;
  }
}