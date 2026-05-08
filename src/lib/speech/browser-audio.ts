type PlayAudioOptions = {
  onEnd: () => void;
  onError: () => void;
};

type AudioSourceBuffer = Pick<SourceBuffer, "appendBuffer" | "addEventListener" | "updating">;

function canUseMediaSource(response: Response) {
  const contentType = response.headers.get("content-type") ?? "audio/mpeg";

  return Boolean(
    response.body &&
      typeof MediaSource !== "undefined" &&
      (typeof MediaSource.isTypeSupported !== "function" || MediaSource.isTypeSupported(contentType))
  );
}

function toArrayBuffer(chunk: Uint8Array) {
  const buffer = new ArrayBuffer(chunk.byteLength);
  new Uint8Array(buffer).set(chunk);
  return buffer;
}

function appendWhenReady(sourceBuffer: AudioSourceBuffer, chunk: Uint8Array) {
  const buffer = toArrayBuffer(chunk);

  if (!sourceBuffer.updating) {
    sourceBuffer.appendBuffer(buffer);
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    sourceBuffer.addEventListener(
      "updateend",
      () => {
        sourceBuffer.appendBuffer(buffer);
        resolve();
      },
      { once: true }
    );
  });
}

async function pumpAudioStream(response: Response, mediaSource: MediaSource, contentType: string) {
  if (!response.body) {
    return;
  }

  const reader = response.body.getReader();
  const sourceBuffer = mediaSource.addSourceBuffer(contentType);

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    if (value) {
      await appendWhenReady(sourceBuffer, value);
    }
  }

  if (mediaSource.readyState === "open") {
    mediaSource.endOfStream();
  }
}

export async function playAudioResponse(response: Response, options: PlayAudioOptions) {
  const contentType = response.headers.get("content-type") ?? "audio/mpeg";
  const audio = new Audio();
  let objectUrl = "";

  audio.onended = () => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }

    options.onEnd();
  };
  audio.onerror = () => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }

    options.onError();
  };

  if (canUseMediaSource(response)) {
    const mediaSource = new MediaSource();
    objectUrl = URL.createObjectURL(mediaSource);
    audio.src = objectUrl;
    mediaSource.addEventListener(
      "sourceopen",
      () => {
        void pumpAudioStream(response, mediaSource, contentType).catch(options.onError);
      },
      { once: true }
    );
    await audio.play();
    return audio;
  }

  objectUrl = URL.createObjectURL(await response.blob());
  audio.src = objectUrl;
  await audio.play();
  return audio;
}
