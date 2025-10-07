const socket = io("https://webrtc-project-1-30t2.onrender.com");


let peer = null;
let localStream = null;
let username = null;

// DOM elements
const loginDiv = document.getElementById("loginDiv");
const mainDiv = document.getElementById("mainDiv");
const yourName = document.getElementById("yourName");
const loginBtn = document.getElementById("loginBtn");
const loginMsg = document.getElementById("loginMsg");
const usernameSelect = document.getElementById("usernameSelect");

const callBtn = document.getElementById("callBtn");
const voiceOnlyCheck = document.getElementById("voiceOnlyCheck");

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

const chatBox = document.getElementById("chatBox");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

const incomingPanel = document.getElementById("incomingCallPanel");
const callerInfo = document.getElementById("callerInfo");
const acceptBtn = document.getElementById("acceptBtn");
const rejectBtn = document.getElementById("rejectBtn");

let incomingCall = null;

// ------------------- LOGIN -------------------
loginBtn.addEventListener("click", () => {
  const selected = usernameSelect.value;
  if (!selected) return alert("Select a user");
  socket.emit("login", selected);
});

socket.on("login_success", (name) => {
  username = name;
  loginDiv.style.display = "none";
  mainDiv.style.display = "flex";
  yourName.textContent = name;
});

socket.on("login_error", (msg) => loginMsg.textContent = msg);

// ------------------- LOCAL STREAM -------------------
async function startLocalStream(video=true) {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: video,
      audio: true
    });
    localVideo.srcObject = localStream;
  } catch (err) {
    alert("Cannot access camera/mic: " + err.message);
  }
}

// ------------------- CHAT -------------------
sendBtn.addEventListener("click", () => {
  const msg = messageInput.value;
  if (!msg) return;
  socket.emit("send_message", { message: msg });
  chatBox.innerHTML += `<p><b>You:</b> ${msg}</p>`;
  messageInput.value = "";
  chatBox.scrollTop = chatBox.scrollHeight;
});

socket.on("receive_message", ({ from, message }) => {
  chatBox.innerHTML += `<p><b>${from}:</b> ${message}</p>`;
  chatBox.scrollTop = chatBox.scrollHeight;
});

// ------------------- CALL -------------------
callBtn.addEventListener("click", async () => {
  if (!localStream) await startLocalStream(!voiceOnlyCheck.checked);

  peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
  localStream.getTracks().forEach(track => peer.addTrack(track, localStream));
  peer.ontrack = e => remoteVideo.srcObject = e.streams[0];

  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);

  socket.emit("call_user", { offer, type: voiceOnlyCheck.checked ? "voice" : "video" });
});

// ------------------- INCOMING CALL -------------------
socket.on("call_made", ({ from, offer, type }) => {
  incomingCall = { from, offer, type };
  callerInfo.textContent = `${from} is calling (${type === 'voice' ? 'Voice' : 'Video'})`;
  incomingPanel.style.display = "block";
});

// ------------------- ACCEPT / REJECT -------------------
acceptBtn.addEventListener("click", async () => {
  incomingPanel.style.display = "none";
  if (!localStream) await startLocalStream(incomingCall.type !== "voice");

  peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
  localStream.getTracks().forEach(track => peer.addTrack(track, localStream));
  peer.ontrack = e => remoteVideo.srcObject = e.streams[0];

  await peer.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);

  socket.emit("make_answer", { answer });
  incomingCall = null;
});

rejectBtn.addEventListener("click", () => {
  incomingPanel.style.display = "none";
  incomingCall = null;
});

// ------------------- RECEIVE ANSWER -------------------
socket.on("answer_made", async ({ answer }) => {
  if (!peer) return;
  await peer.setRemoteDescription(new RTCSessionDescription(answer));
});

// ------------------- USER NOT FOUND -------------------
socket.on("user_not_found", () => alert("User is offline"));
