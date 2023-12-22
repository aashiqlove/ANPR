(function(){
  let receiverIDs = []; 
  const socket = io();
  let files = [];
  let isSending = false;

  function generateID() {
    return `${Math.trunc(Math.random()*999)}-${Math.trunc(Math.random()*999)}-${Math.trunc(Math.random()*999)}`;
  }
document.getElementById("sender-start-con-btn").addEventListener("click", function(){
    let joinID = generateID();

    document.getElementById("join-id").innerHTML = `<b> Room Id </b><span>${joinID}</span>`;
    socket.emit("sender-join", {
      uid: joinID
    });
  });

  socket.on("init", function(uid) {
    receiverIDs.push(uid); // Add the received receiver ID to the array
    document.querySelector(".join-screen").classList.remove("active");
    document.querySelector(".fs-screen").classList.add("active");
    sendFilesToAllReceivers(); // Start sending files when receivers are connected
  });

  function handleFileUpload(file) {
    let reader = new FileReader();
    reader.onload = function (e) {
      let buffer = new Uint8Array(reader.result);
      console.log(buffer);
      let el = document.createElement("div");
      el.classList.add("item");
      el.innerHTML = `
        <div class="progress">0%</div>
        <div class="filename">${file.name}</div>
      `;
      document.querySelector(".files-list").appendChild(el);
      shareFileToAllReceivers({
        filename: file.name,
        total_buffer_size: buffer.length,
        buffer_size: 1024
      }, buffer, el.querySelector(".progress"));
    };
    reader.readAsArrayBuffer(file);
  }

  document.getElementById("file-input").addEventListener("change", function (e) {
    let newFiles = Array.from(e.target.files);
    files = files.concat(newFiles);
    if (!isSending) {
      sendFilesToAllReceivers();
    }
  });

  function sendFilesToAllReceivers() {
    if (files.length > 0 && receiverIDs.length > 0) {
      isSending = true;
      handleFileUpload(files.shift());
    } else {
      isSending = false;
    }
  }

  function shareFileToAllReceivers(metadata, buffer, progress_node) {
    if (receiverIDs.length === 0) {
      console.log("No receivers available.");
      isSending = false;
      return;
    }

    const remainingReceivers = [...receiverIDs];
    function shareFileWithReceiver(receiverID) {
      socket.emit("file-meta", {
        uid: receiverID,
        metadata: metadata
      });

      let offset = 0;
      const chunkSize = metadata.buffer_size;

      function sendChunks() {
        const chunk = buffer.slice(offset, offset + chunkSize);
        offset += chunkSize;

        socket.emit("file-raw", {
          uid: receiverID,
          buffer: chunk
        });

        const progress = Math.min(Math.trunc(offset / metadata.total_buffer_size * 100), 100);
        progress_node.innerHTML = progress + "%";

        if (offset < buffer.length) {
          setTimeout(sendChunks, 1); // Sending chunks with a delay
        } else {
          const index = remainingReceivers.indexOf(receiverID);
          if (index !== -1) {
            remainingReceivers.splice(index, 1);
          }

          if (remainingReceivers.length === 0) {
            sendFilesToAllReceivers(); // Send next file when done with all receivers
          }
        }
      }

      sendChunks();
    }

    receiverIDs.forEach((receiverID) => {
      shareFileWithReceiver(receiverID);
    });
  }

  
})();