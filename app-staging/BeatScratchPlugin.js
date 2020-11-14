function supportsPlayback() {
  return typeof(Worker) !== "undefined";
}

function sendMIDI() {
  if((arguments[0] & 0xF0) == 0x90) {
    var note = arguments[1];
    var channel = arguments[0] & 0xF;
    MIDI.noteOn(channel, note, arguments[2], 0);
  } else if((arguments[0] & 0xF0) == 0x80) {
    var note = arguments[1];
    var channel = arguments[0] & 0xF;
    MIDI.noteOff(channel, note, 0);
  } else {
    console.info("unmatched args:");
    console.info(arguments);
  }
}

function createPart(part) {
  if(typeof part == 'string') part = JSON.parse(part);
  beatScratchWorker.postMessage(['createPart', part]);
  updatePartConfiguration(part);
}

function updatePartConfiguration(part) {
  if(typeof part == 'string') part = JSON.parse(part);
  var midiChannel = part.instrument.midiChannel;
  var midiInstrument = part.instrument.midiInstrument;
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
function checkBeatScratchAudioStatus() {
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
    case 'notifyBpmMultiplier':
      notifyBpmMultiplier(event.data[0]);
      break;
    case 'notifyUnmultipliedBpm':
      notifyUnmultipliedBpm(event.data[0]);
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
  score.parts.forEach(updatePartConfiguration);
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