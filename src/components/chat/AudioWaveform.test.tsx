/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import { AudioWaveform } from "./AudioWaveform";

type MockCanvasContext = Pick<
  CanvasRenderingContext2D,
  "beginPath" | "clearRect" | "lineTo" | "moveTo" | "stroke"
> & {
  lineWidth: number;
  strokeStyle: string | CanvasGradient | CanvasPattern;
};

function createMockContext(): MockCanvasContext {
  return {
    beginPath: jest.fn(),
    clearRect: jest.fn(),
    lineTo: jest.fn(),
    moveTo: jest.fn(),
    stroke: jest.fn(),
    lineWidth: 0,
    strokeStyle: ""
  };
}

describe("AudioWaveform", () => {
  let getContextSpy: jest.SpyInstance;
  let requestAnimationFrameSpy: jest.SpyInstance;
  let cancelAnimationFrameSpy: jest.SpyInstance;

  beforeEach(() => {
    getContextSpy = jest.spyOn(HTMLCanvasElement.prototype, "getContext");
    requestAnimationFrameSpy = jest
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation(() => 1);
    cancelAnimationFrameSpy = jest
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    getContextSpy.mockRestore();
    requestAnimationFrameSpy.mockRestore();
    cancelAnimationFrameSpy.mockRestore();
  });

  it("draws one static line without starting an animation loop when idle", () => {
    const context = createMockContext();
    getContextSpy.mockReturnValue(context as unknown as CanvasRenderingContext2D);

    render(<AudioWaveform isPlaying={false} />);

    expect(context.clearRect).toHaveBeenCalledTimes(1);
    expect(context.moveTo).toHaveBeenCalledWith(0, 18);
    expect(context.lineTo).toHaveBeenCalledWith(132, 18);
    expect(context.stroke).toHaveBeenCalledTimes(1);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("starts the animation loop while audio is playing", () => {
    const context = createMockContext();
    getContextSpy.mockReturnValue(context as unknown as CanvasRenderingContext2D);

    render(<AudioWaveform isPlaying />);

    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(context.lineTo).toHaveBeenCalledTimes(32);
  });
});
