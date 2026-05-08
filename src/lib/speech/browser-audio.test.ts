import { playAudioResponse } from "./browser-audio";

describe("browser audio playback", () => {
  const originalAudio = global.Audio;
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;
  const originalMediaSource = global.MediaSource;

  afterEach(() => {
    global.Audio = originalAudio;
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
    global.MediaSource = originalMediaSource;
    jest.restoreAllMocks();
  });

  test("starts playback from a MediaSource stream without waiting for response.blob", async () => {
    const play = jest.fn().mockResolvedValue(undefined);
    const audio = {
      onended: null as (() => void) | null,
      onerror: null as (() => void) | null,
      play,
      src: ""
    };
    const sourceBuffer = {
      appendBuffer: jest.fn(),
      addEventListener: jest.fn(),
      updating: false
    };
    const mediaSource = {
      addEventListener: jest.fn((event: string, listener: () => void) => {
        if (event === "sourceopen") {
          queueMicrotask(listener);
        }
      }),
      addSourceBuffer: jest.fn().mockReturnValue(sourceBuffer),
      endOfStream: jest.fn(),
      readyState: "open"
    };

    global.Audio = jest.fn().mockReturnValue(audio) as unknown as typeof Audio;
    global.MediaSource = jest.fn().mockReturnValue(mediaSource) as unknown as typeof MediaSource;
    URL.createObjectURL = jest.fn().mockReturnValue("blob:stream");
    URL.revokeObjectURL = jest.fn();
    const blob = jest.fn();

    await playAudioResponse(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array([1, 2, 3]));
            controller.close();
          }
        }),
        {
          headers: {
            "content-type": "audio/mpeg"
          }
        }
      ),
      {
        onEnd: jest.fn(),
        onError: jest.fn()
      }
    );

    expect(blob).not.toHaveBeenCalled();
    expect(play).toHaveBeenCalled();
    expect(mediaSource.addSourceBuffer).toHaveBeenCalledWith("audio/mpeg");
  });

  test("falls back to blob playback when MediaSource is unavailable", async () => {
    const play = jest.fn().mockResolvedValue(undefined);
    const audio = {
      onended: null as (() => void) | null,
      onerror: null as (() => void) | null,
      play,
      src: ""
    };

    global.Audio = jest.fn().mockReturnValue(audio) as unknown as typeof Audio;
    global.MediaSource = undefined as unknown as typeof MediaSource;
    URL.createObjectURL = jest.fn().mockReturnValue("blob:audio");
    URL.revokeObjectURL = jest.fn();

    await playAudioResponse(new Response(new Blob(["audio"], { type: "audio/mpeg" })), {
      onEnd: jest.fn(),
      onError: jest.fn()
    });

    expect(audio.src).toBe("blob:audio");
    expect(play).toHaveBeenCalled();
  });
});
