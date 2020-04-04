function sendMIDI() {
  if(arguments[0] == 0x90) {
    console.info("noteOn");
    MIDI.noteOn(0, arguments[1], arguments[2], 0);
  } else if(arguments[0] == 0x80) {
    console.info("noteOff");
    MIDI.noteOff(0, arguments[1], 0.75);
  } else {
    console.info("unmatched args:");
    console.info(arguments);
  }
}
