// Created/resumed from a user gesture. No audio files or network required.
export class GameAudio {
  unlock(){
    try{this.context??=new AudioContext();this.context.resume().catch(()=>{});}catch{}
  }
  play({frequency,duration,volume}){
    const c=this.context;if(!c||c.state!=='running'||this.muted)return;
    const now=c.currentTime;
    this.voices=(this.voices||[]).filter(v=>v.end>now);
    if(this.voices.length>=16)return;
    const oscillator=c.createOscillator(),gain=c.createGain();
    oscillator.frequency.value=frequency;gain.gain.setValueAtTime(volume,now);
    gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    oscillator.connect(gain).connect(c.destination);oscillator.start();oscillator.stop(now+duration);
    this.voices.push({oscillator,end:now+duration});
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }
  stop(){for(const v of this.voices||[])try{v.oscillator.stop();}catch{}this.voices=[];}
}
