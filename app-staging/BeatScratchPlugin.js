function supportsPlayback() {
  return typeof(Worker) !== "undefined";
}

function sendMIDI() {
//  console.log("sendMIDI " + [...arguments] + " at time=" + (Date.now()/1000));
  if((arguments[0] & 0xF0) == 0x90) {
//    console.info("noteOn");
    var note = arguments[1];
    var channel = arguments[0] & 0xF;
    MIDI.noteOn(channel, note, arguments[2], 0);
  } else if((arguments[0] & 0xF0) == 0x80) {
//    console.info("noteOff");
    var note = arguments[1];
    var channel = arguments[0] & 0xF;
    MIDI.noteOff(channel, note, 0);
  } else {
    console.info("unmatched args:");
    console.info(arguments);
  }
}

function createPart(part) {
  var part = JSON.parse(arguments[0]);
  var midiChannel = part[3][4]; // Derived from protos
  var midiInstrument = part[3][5];
  isSynthesizerReady = false;
  if(midiChannel != 9) {
      MIDI.loadPlugin({
          soundfontUrl: "FluidR3_GM/",
          instrument: midiInstrument,
          onprogress: function(state, progress) {
              console.log(state, progress);
          },
          onsuccess: function() {
            isSynthesizerReady = true;
            MIDI.channels[midiChannel].instrument = midiInstrument;
          }
      });
  }
}

function updatePartConfiguration(part) {
  var part = JSON.parse(arguments[0]);
  var midiChannel = part[3][4]; // Derived from protos
  var midiInstrument = part[3][5];
  isSynthesizerReady = false;
  if(midiChannel != 9) {
      MIDI.loadPlugin({
          soundfontUrl: "FluidR3_GM/",
          instrument: midiInstrument,
          onprogress: function(state, progress) {
              console.log(state, progress);
          },
          onsuccess: function() {
            isSynthesizerReady = true;
            MIDI.channels[midiChannel].instrument = midiInstrument;
          }
      });
  }
}

var isSynthesizerReady = false;
function checkSynthesizerStatus() {
    return isSynthesizerReady;
}

var currentScore;
var beatScratchWorker = new Worker('BeatScratchWorker.js');
beatScratchWorker.onmessage = function(event) {
  switch (event.data.shift()) {
    case 'sendMIDI':
      sendMIDI(...event.data);
      break;
    case 'notifyPlayingBeat':
      notifyPlayingBeat(event.data[0]);
      break;
    case 'notifyPaused':
      notifyPaused();
      break;
    case 'notifyCurrentSection':
      notifyCurrentSection(event.data[0]);
      break;
  }
}

function play() {
  beatScratchWorker.postMessage(['play']);
}

function pause() {
  beatScratchWorker.postMessage(['pause']);
}

function stop() {
  beatScratchWorker.postMessage(['stop']);
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