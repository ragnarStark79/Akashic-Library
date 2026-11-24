import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

afterEach(() => {
  try {
    ScrollTrigger.getAll().forEach((t) => t.kill());
  } catch {
    // Ignore if ScrollTrigger is not loaded
  }
});

// Mock HTMLCanvasElement.prototype.getContext for jsdom environments
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function (contextId: string) {
    if (contextId === '2d') {
      return {
        fillRect: () => {},
        clearRect: () => {},
        getImageData: () => ({ data: new Array(4) }),
        putImageData: () => {},
        createImageData: () => [],
        setTransform: () => {},
        drawImage: () => {},
        save: () => {},
        fillText: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        stroke: () => {},
        translate: () => {},
        scale: () => {},
        rotate: () => {},
        arc: () => {},
        fill: () => {},
        measureText: () => ({ width: 0 }),
        transform: () => {},
        rect: () => {},
        clip: () => {},
      } as unknown as RenderingContext;
    }
    if (contextId === 'webgl' || contextId === 'webgl2') {
      const glBase = {
        VERSION: 7938,
        SHADING_LANGUAGE_VERSION: 35724,
        VENDOR: 7936,
        RENDERER: 7937,
        MAX_COMBINED_TEXTURE_IMAGE_UNITS: 35661,
        RGBA: 6408,
        UNSIGNED_BYTE: 5121,
        TEXTURE_2D: 3553,
        TRIANGLES: 4,
        TRIANGLE_STRIP: 5,
        TRIANGLE_FAN: 6,
        LINES: 1,
        POINTS: 0,
        getExtension: () => null,
        getParameter: (param?: number) => {
          if (param === 7938 || param === undefined /* VERSION */) return 'WebGL 1.0';
          if (param === 35724 /* SHADING_LANGUAGE_VERSION */) return 'WebGL GLSL ES 1.0';
          if (param === 7936 /* VENDOR */) return 'WebKit';
          if (param === 7937 /* RENDERER */) return 'WebKit WebGL';
          if (param === 35661 /* MAX_COMBINED_TEXTURE_IMAGE_UNITS */) return 8;
          return 0;
        },
        getShaderPrecisionFormat: () => ({ rangeMin: 1, rangeMax: 1, precision: 1 }),
        getShaderParameter: () => true,
        getProgramParameter: (_program: unknown, pname: number) => {
          if (pname === 35714 /* LINK_STATUS */) return true;
          return 0;
        },
        createShader: () => ({}),
        createProgram: () => ({}),
        createBuffer: () => ({}),
        createTexture: () => ({}),
        createFramebuffer: () => ({}),
        createRenderbuffer: () => ({}),
      };
      const glProxy = new Proxy(glBase, {
        get(target, prop, receiver) {
          if (prop in target) {
            return Reflect.get(target, prop, receiver);
          }
          if (typeof prop === 'string') {
            return () => {};
          }
          return undefined;
        },
      });
      return glProxy as unknown as RenderingContext;
    }
    return null;
  } as typeof HTMLCanvasElement.prototype.getContext;
}

// Mock requestAnimationFrame & cancelAnimationFrame for jsdom & Node
const rafMock = (callback: FrameRequestCallback) => {
  return setTimeout(() => callback(Date.now()), 16) as unknown as number;
};
const cafMock = (id: number) => {
  clearTimeout(id);
};

if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = rafMock;
}
if (typeof (global as any).requestAnimationFrame === 'undefined') {
  (global as any).requestAnimationFrame = rafMock;
}
if (typeof globalThis.cancelAnimationFrame === 'undefined') {
  globalThis.cancelAnimationFrame = cafMock;
}
if (typeof (global as any).cancelAnimationFrame === 'undefined') {
  (global as any).cancelAnimationFrame = cafMock;
}
if (typeof window !== 'undefined') {
  if (typeof window.requestAnimationFrame === 'undefined') {
    window.requestAnimationFrame = globalThis.requestAnimationFrame;
  }
  if (typeof window.cancelAnimationFrame === 'undefined') {
    window.cancelAnimationFrame = globalThis.cancelAnimationFrame;
  }
  if (typeof window.scrollTo === 'undefined') {
    window.scrollTo = () => {};
  }
}

// Mock window.matchMedia for jsdom environments
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
