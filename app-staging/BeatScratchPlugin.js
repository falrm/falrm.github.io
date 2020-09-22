function supportsPlayback() {
  return typeof(Worker) !== "undefined";
}

function sendMIDI() {
  if((arguments[0] & 0xF0) == 0x90) {
    console.info("noteOn");
    var note = arguments[1];
    var channel = arguments[0] & 0xF
    if(channel == 9) {
      note -= 12;
    }
    MIDI.noteOn(channel, note, arguments[2], 0);
  } else if((arguments[0] & 0xF0) == 0x80) {
    console.info("noteOff");
    var note = arguments[1];
    var channel = arguments[0] & 0xF
    if(channel == 9) {
      note -= 12;
    }
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

function setKeyboardPart() {

}

function setPlaybackMode() {

}

function setRecordingMelody() {

}

function createScore() {

}

function updateSections() {
  
}