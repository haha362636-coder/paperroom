let context;let enabled=true;
export function setSound(value){enabled=value;}
export function unlock(){if(!enabled)return;try{context??=new (window.AudioContext||window.webkitAudioContext)();if(context.state==='suspended')context.resume().catch(()=>{});}catch{}}
export function playSound(kind='snap'){
 if(!enabled)return;unlock();if(!context)return;
 const now=context.currentTime;const master=context.createGain();master.gain.value=.42;master.connect(context.destination);
 const noise=(delay,duration,volume,freq)=>{const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate);const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,2);const source=context.createBufferSource();source.buffer=buffer;const filter=context.createBiquadFilter();filter.type='highpass';filter.frequency.value=freq;const gain=context.createGain();gain.gain.setValueAtTime(volume,now+delay);gain.gain.exponentialRampToValueAtTime(.001,now+delay+duration);source.connect(filter).connect(gain).connect(master);source.start(now+delay);};
 if(kind==='clink'){
 for(const [frequency,volume] of [[2400,.09],[3650,.035]]){const o=context.createOscillator(),g=context.createGain();o.type='sine';o.frequency.value=frequency;g.gain.setValueAtTime(volume,now);g.gain.exponentialRampToValueAtTime(.001,now+.09);o.connect(g).connect(master);o.start(now);o.stop(now+.1);}noise(0,.025,.08,2800);
 }else if(kind==='lift'){noise(0,.09,.12,1600);
 }else if(kind==='clack'||kind==='deck'){
 // Hollow plastic shell: a short bright click over a resonant body knock.
 const body=kind==='clack'?[[420,.3,.07],[910,.12,.045]]:[[1350,.12,.03],[2600,.07,.02]];
 for(const [frequency,volume,length] of body){const o=context.createOscillator(),g=context.createGain();o.type='triangle';o.frequency.setValueAtTime(frequency,now);o.frequency.exponentialRampToValueAtTime(frequency*.82,now+length);g.gain.setValueAtTime(volume,now);g.gain.exponentialRampToValueAtTime(.001,now+length);o.connect(g).connect(master);o.start(now);o.stop(now+length+.01);}
 noise(0,.018,kind==='clack'?.5:.35,2600);if(kind==='deck')noise(.055,.02,.22,1800);
 }else{

 // Paper crackle, low leather impact, then a tiny double metal latch.
 noise(0,.065,kind==='snap'?.7:.3,1400);noise(.026,.12,.2,3200);
 const osc=context.createOscillator(),g=context.createGain();osc.type='sine';osc.frequency.setValueAtTime(190,now);osc.frequency.exponentialRampToValueAtTime(58,now+.1);g.gain.setValueAtTime(.55,now);g.gain.exponentialRampToValueAtTime(.001,now+.13);osc.connect(g).connect(master);osc.start(now);osc.stop(now+.15);
 if(kind==='snap')for(const [delay,freq] of [[.012,1900],[.046,2800]]){const o=context.createOscillator(),v=context.createGain();o.type='triangle';o.frequency.value=freq;v.gain.setValueAtTime(.105,now+delay);v.gain.exponentialRampToValueAtTime(.001,now+delay+.045);o.connect(v).connect(master);o.start(now+delay);o.stop(now+delay+.05);}
 }setTimeout(()=>master.disconnect(),500);
}
