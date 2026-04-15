if(window.__musicEngineLoaded) {
console.log("Music engine already running");
} else {
window.__musicEngineLoaded = true;

/* =========================
   GLOBAL AUDIO ENGINE
========================= */

const audio = new Audio();
audio.loop = true;

window.globalAudio = audio;

/* =========================
   LOAD STATE
========================= */

function loadMusicState(){

let playlist = JSON.parse(localStorage.getItem("playlist") || "[]");
if(!playlist.length) return;

let track = parseInt(localStorage.getItem("track")) || 0;
let volume = parseFloat(localStorage.getItem("volume"));
if(isNaN(volume)) volume = 0.5;

let time = parseFloat(localStorage.getItem("time"));
if(isNaN(time)) time = 0;

let song = playlist[track];

if(!song) return;

audio.src = song.data || song;
audio.volume = volume;
audio.currentTime = time;

if(localStorage.getItem("musicPlaying") === "true"){
audio.play().catch(()=>{});
}

}

/* initial load */
loadMusicState();

/* =========================
   COMMAND LISTENER
========================= */

setInterval(()=>{

if(localStorage.getItem("musicCommand")){

localStorage.removeItem("musicCommand");
loadMusicState();

}

},300);

/* =========================
   SAVE PROGRESS
========================= */

setInterval(()=>{

if(audio.src){
localStorage.setItem("time", audio.currentTime);
localStorage.setItem("volume", audio.volume);
}

},1000);

/* =========================
   AUTO NEXT
========================= */

audio.addEventListener("ended", ()=>{

let playlist = JSON.parse(localStorage.getItem("playlist") || "[]");
if(!playlist.length) return;

let next = (parseInt(localStorage.getItem("track")) || 0) + 1;

if(next >= playlist.length){
next = 0;
}

localStorage.setItem("track", next);
localStorage.setItem("musicCommand", "next");

loadMusicState();

});

/* =========================
   FIRST CLICK UNLOCK
========================= */

document.addEventListener("click", ()=>{

audio.play().catch(()=>{});

}, {once:true});

}