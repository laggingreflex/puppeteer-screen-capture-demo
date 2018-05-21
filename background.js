/* global chrome, MediaRecorder, FileReader */

const DURATION = 10000;
let recorder = null

chrome.runtime.onConnect.addListener(port => port.onMessage.addListener(msg => onmsg(msg, { port })));

function onmsg(msg, { port }) {
  const console = new Proxy({}, { get: (t, level) => (...msg) => port.postMessage({ console: { level, msg } }) });
  switch (msg.type) {
    case 'REC_STOP':
      REC_STOP(msg, { port, console });
      break
    case 'REC_CLIENT_PLAY':
      REC_CLIENT_PLAY(msg, { port, console });
      break
    default:
      console.log('Unrecognized message', msg)
  }
}

function REC_STOP(msg, { port }) {
  console.log('Stopping recording')
  if (!port.recorderPlaying || !recorder) {
    console.log('Nothing to stop')
    return
  }
  port.recorderPlaying = false
  recorder.stop()
}

function REC_CLIENT_PLAY(msg, { port }) {
  if (port.recorderPlaying) {
    console.log('Ignoring second play, already playing')
    return;
  }
  port.recorderPlaying = true
  const tab = port.sender.tab
  tab.url = msg.data.url
  chrome.desktopCapture.chooseDesktopMedia(['tab', 'audio'], streamId => chooseDesktopMedia(streamId, { port, msg }));
}

function chooseDesktopMedia(streamId, { port, msg }) {
  // Get the stream
  navigator.webkitGetUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: streamId,
          minWidth: 1280,
          maxWidth: 1280,
          minHeight: 720,
          maxHeight: 720,
          minFrameRate: 60,
        }
      }
    }, stream => webkitGetUserMedia(stream, { port, msg, streamId }),
    error => console.log('Unable to get user media', error))
}

function webkitGetUserMedia(stream, { port, msg, streamId }) {
  var chunks = [];

  recorder = new MediaRecorder(stream, {
    videoBitsPerSecond: 2500000,
    ignoreMutedMedia: true,
    mimeType: 'video/webm'
  });

  recorder.ondataavailable = event => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  recorder.onstop = () => {
    const blob = new Blob(chunks, { 'type': 'video/webm' });
    // chrome.downloads.download({ url: URL.createObjectURL(blob) });
    const fileReader = new FileReader();
    fileReader.onload = e => port.postMessage({ data: e.target.result, type: 'download' });
    fileReader.readAsDataURL(blob);
  }

  recorder.start();
  setTimeout(() => recorder.stop(), DURATION);
}
