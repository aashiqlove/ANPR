
(function(){
  let senderID;
  const socket = io();
  let fileShares = [];

  function generateID() {
    return `${Math.trunc(Math.random()*999)}-${Math.trunc(Math.random()*999)}-${Math.trunc(Math.random()*999)}`;
  }

  document.getElementById("receiver-start-con-btn").addEventListener("click", function(){
    senderID = document.querySelector("#join-id").value;
    if (senderID.length === 0) {
      return;
    }
    let joinID = generateID();
    socket.emit("receiver-join", {
      uid: joinID,
      sender_uid: senderID
    });
    document.querySelector(".join-screen").classList.remove("active");
    document.querySelector(".fs-screen").classList.add("active");
  });

  socket.on("fs-meta", function(metadata){
    fileShares.push({ metadata: metadata, buffer: [] });

    let el = document.createElement("div");
    el.classList.add("item");
    el.innerHTML = `
      <div class="progress">0%</div>
      <div class="filename">${metadata.filename}</div>
    `;
    document.querySelector(".files-list").appendChild(el);

    downloadNextFile();
  });

  socket.on("fs-share", function(buffer){
    const currentFile = fileShares[0];
    currentFile.buffer.push(buffer);
    const progress = Math.min(Math.trunc(currentFile.buffer.reduce((acc, curr) => acc + curr.byteLength, 0) / currentFile.metadata.total_buffer_size * 100), 100);
    const progressNodes = document.querySelectorAll(".progress");
    progressNodes[progressNodes.length - 1].innerHTML = progress + "%";

    if (currentFile.buffer.reduce((acc, curr) => acc + curr.byteLength, 0) === currentFile.metadata.total_buffer_size) {
      downloadFile(currentFile.buffer, currentFile.metadata.filename);
      fileShares.shift();
      downloadNextFile();
    }
  });

  function downloadFile(bufferArray, filename) {
    const blob = new Blob(bufferArray);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function downloadNextFile() {
    if (fileShares.length > 0) {
      socket.emit("fs-start", { uid: senderID });
    }
  }
})();