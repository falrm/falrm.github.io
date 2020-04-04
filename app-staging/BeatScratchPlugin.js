function sendMIDI() {
  if((arguments[0] & 0xF0) == 0x90) {
    console.info("noteOn");
    MIDI.noteOn(arguments[0] & 0xF, arguments[1], arguments[2], 0);
  } else if((arguments[0] & 0xF0) == 0x80) {
    console.info("noteOff");
    MIDI.noteOff(arguments[0] & 0xF, arguments[1], 0);
  } else {
    console.info("unmatched args:");
    console.info(arguments);
  }
}
