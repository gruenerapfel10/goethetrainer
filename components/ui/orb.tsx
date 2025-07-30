'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

// --- WebGL Shaders and Renderer for the Orb Animation ---

const vertexShaderSource = `#version 300 es
precision highp float;

in vec2 position;
out vec2 vUv;

void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0, 1);
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uSpeed; // Uniform for animation speed based on audio volume
uniform float uOffsets[7];
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform sampler2D uPerlinTexture;

in vec2 vUv;
out vec4 outColor;

const float PI = 3.14159265358979323846;

// Helper to draw a single oval with soft edges
bool drawOval(vec2 polarUv, vec2 polarCenter, float a, float b, bool reverseGradient, float softness, out vec4 color) {
    vec2 p = polarUv - polarCenter;
    float oval = (p.x * p.x) / (a * a) + (p.y * p.y) / (b * b);
    
    float edge = smoothstep(1.0, 1.0 - softness, oval);
    
    if (edge > 0.0) {
        float gradient = reverseGradient ? (1.0 - (p.x / a + 1.0) / 2.0) : ((p.x / a + 1.0) / 2.0);
        color = vec4(vec3(gradient), 0.8 * edge);
        return true;
    }
    return false;
}

// Maps a grayscale value to a 4-color ramp
vec3 colorRamp(float grayscale, vec3 color1, vec3 color2, vec3 color3, vec3 color4) {
    if (grayscale < 0.33) {
        return mix(color1, color2, grayscale * 3.0);
    } else if (grayscale < 0.66) {
        return mix(color2, color3, (grayscale - 0.33) * 3.0);
    } else {
        return mix(color3, color4, (grayscale - 0.66) * 3.0);
    }
}

// 2D Noise functions
vec2 hash2(vec2 p) {
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    
    vec2 u = f * f * (3.0 - 2.0 * f);
    float n = mix(
        mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
            dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
        mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
            dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
        u.y
    );

    return 0.5 + 0.5 * n;
}

// Functions to create animated rings
float sharpRing(vec2 uv, float theta, float time) {
    float ringStart = 1.0;
    float ringWidth = 0.5;
    float noiseScale = 5.0;
    
    vec2 noiseCoord = vec2(theta / (2.0 * PI), time * 0.1);
    noiseCoord *= noiseScale;
    
    float noise = noise2D(noiseCoord);
    noise = (noise - 0.5) * 4.0;
    
    return ringStart + noise * ringWidth * 1.5;
}

float smoothRing(vec2 uv, float time) {
    float angle = atan(uv.y, uv.x);
    if (angle < 0.0) angle += 2.0 * PI;
    
    vec2 noiseCoord = vec2(angle / (2.0 * PI), time * 0.1);
    noiseCoord *= 6.0;
    
    float noise = noise2D(noiseCoord);
    noise = (noise - 0.5) * 8.0;
    
    float ringStart = 0.9;
    float ringWidth = 0.3;
    
    return ringStart + noise * ringWidth;
}


void main() {
    float time = uTime * uSpeed; // Use speed uniform to modulate time
    vec2 uv = vUv * 2.0 - 1.0; 

    float radius = length(uv);
    float theta = atan(uv.y, uv.x);
    if (theta < 0.0) theta += 2.0 * PI;

    vec4 color = vec4(1.0, 1.0, 1.0, 1.0);

    // Animate oval centers
    float originalCenters[7] = float[7](0.0, 0.5 * PI, 1.0 * PI, 1.5 * PI, 2.0 * PI, 2.5 * PI, 3.0 * PI);
    float centers[7];
    for (int i = 0; i < 7; i++) {
        centers[i] = originalCenters[i] + 0.5 * sin(time / 20.0 + uOffsets[i]);
    }

    // Draw ovals
    for (int i = 0; i < 7; i++) {
        float noise = texture(uPerlinTexture, vec2(mod(centers[i] + time * 0.05, 1.0), 0.5)).r;
        float a = noise * 1.5;
        float b = noise * 4.5;
        bool reverseGradient = (i % 2 == 1);

        float distTheta = abs(theta - centers[i]);
        if (distTheta > PI) distTheta = 2.0 * PI - distTheta;
        
        vec4 ovalColor;
        if (drawOval(vec2(distTheta, radius), vec2(0.0, 0.0), a, b, reverseGradient, 0.4, ovalColor)) {
            color.rgb = mix(color.rgb, ovalColor.rgb, ovalColor.a);
            color.a = max(color.a, ovalColor.a);
        }
    }
    
    // Draw rings
    float ringRadius1 = sharpRing(uv, theta, time);
    float ringRadius2 = smoothRing(uv, time);
    float totalRingAlpha = max((radius >= ringRadius1) ? 0.3 : 0.0, smoothstep(ringRadius2 - 0.05, ringRadius2 + 0.05, radius) * 0.25);
    
    vec3 ringColor = vec3(1.0);
    color.rgb = 1.0 - (1.0 - color.rgb) * (1.0 - ringColor * totalRingAlpha);

    // Apply color ramp
    vec3 rampColor1 = vec3(0.0, 0.0, 0.0);
    vec3 rampColor2 = uColor1;
    vec3 rampColor3 = uColor2;
    vec3 rampColor4 = vec3(1.0, 1.0, 1.0);

    float luminance = color.r;
    color.rgb = colorRamp(luminance, rampColor1, rampColor2, rampColor3, rampColor4);

    outColor = color;
}
`;

const perlinNoiseTextureUrl = 'https://storage.googleapis.com/eleven-public-cdn/images/perlin-noise.png';
const positionAttributeLocation = 0;
const vertexPositions = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]);

class OrbRenderer {
  private gl: WebGL2RenderingContext | null;
  private program: WebGLProgram | null;
  private startTime: number;
  private rafId: number | null = null;
  private resizeObserver: ResizeObserver;
  private colorA: number[] = [0, 0, 0];
  private colorB: number[] = [0, 0, 0];
  private offsets: Float32Array = new Float32Array(7).map(() => Math.random() * Math.PI * 2);
  
  // Properties for audio-responsive animation speed
  private targetSpeed: number = 0.2;
  private speed: number = 0.5;

  private static noiseImage: HTMLImageElement;

  constructor(canvas: HTMLCanvasElement) {
    this.gl = canvas.getContext('webgl2', { depth: false, stencil: false });
    if (!this.gl) {
      console.error('WebGL2 not supported');
      this.program = null;
      this.resizeObserver = new ResizeObserver(() => {});
      this.startTime = 0;
      return;
    }

    this.program = this.setupProgram(fragmentShaderSource, vertexShaderSource);
    
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128, 255]));

    if (!OrbRenderer.noiseImage) {
        OrbRenderer.noiseImage = new Image();
        OrbRenderer.noiseImage.crossOrigin = 'anonymous';
        OrbRenderer.noiseImage.src = perlinNoiseTextureUrl;
    }

    if (OrbRenderer.noiseImage.complete) {
        this.copyNoiseImage();
    } else {
        OrbRenderer.noiseImage.addEventListener('load', this.copyNoiseImage);
    }
    
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertexPositions, this.gl.STATIC_DRAW);
    this.gl.vertexAttribPointer(positionAttributeLocation, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(positionAttributeLocation);
    
    this.updateColors('#2792DC', '#9CE6E6');

    this.resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      const dpr = window.devicePixelRatio || 1;
      const width = entry.contentRect.width * dpr;
      const height = entry.contentRect.height * dpr;
      canvas.width = Math.min(512, width);
      canvas.height = Math.min(512, height);
      this.updateViewport();
    });

    const parent = canvas.parentElement;
    if (parent) {
      this.resizeObserver.observe(parent);
    }

    this.startTime = performance.now();
    this.rafId = requestAnimationFrame(this.render);
  }

  private copyNoiseImage = () => {
    if (this.gl) {
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.gl.createTexture());
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, OrbRenderer.noiseImage);
      this.gl.generateMipmap(this.gl.TEXTURE_2D);
    }
  };

  dispose() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    this.resizeObserver.disconnect();
    if (OrbRenderer.noiseImage) {
      OrbRenderer.noiseImage.removeEventListener('load', this.copyNoiseImage);
    }
    this.gl = null;
    this.program = null;
  }
  
  private render = () => {
    if (!this.gl || !this.program) {
      this.rafId = null;
      return;
    }
    
    this.speed += (this.targetSpeed - this.speed) * 0.1;
    
    const time = (performance.now() - this.startTime) / 1000;
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uTime'), time);
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uSpeed'), this.speed);
    
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    this.rafId = requestAnimationFrame(this.render);
  };

  private updateViewport() {
    if(this.gl) {
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    }
  }
  
  // This method is called to update the animation speed based on audio.
  updateVolume(outputVolume: number) {
    // Formula derived from the obfuscated source to map 0-1 volume to 0.2-2.0 speed.
    this.targetSpeed = 0.2 + (1 - Math.pow(1 - outputVolume, 2)) * 1.8;
  }

  updateColors(color1: string, color2: string) {
    if (this.gl && this.program) {
      this.colorA = this.updateColor('uColor1', color1) ?? this.colorA;
      this.colorB = this.updateColor('uColor2', color2) ?? this.colorB;
    }
  }

  private updateColor(uniformName: string, hexColor: string): number[] | undefined {
    if (!this.gl || !this.program) return;
    try {
      const r = parseInt(hexColor.slice(1, 3), 16) / 255;
      const g = parseInt(hexColor.slice(3, 5), 16) / 255;
      const b = parseInt(hexColor.slice(5, 7), 16) / 255;
      const colors = [Math.pow(r, 2.2), Math.pow(g, 2.2), Math.pow(b, 2.2)];
      this.gl.uniform3fv(this.gl.getUniformLocation(this.program, uniformName), colors);
      return colors;
    } catch (error) {
      console.error(`[Orb] Failed to parse ${hexColor} as color:`, error);
    }
  }

  private setupProgram(fragSource: string, vertSource: string): WebGLProgram {
    if (!this.gl) throw new Error("WebGL context not available");
    const fragmentShader = this.getShader(this.gl.FRAGMENT_SHADER, fragSource);
    const vertexShader = this.getShader(this.gl.VERTEX_SHADER, vertSource);
    
    if (!fragmentShader || !vertexShader) throw new Error('Failed to compile shaders');

    const program = this.gl.createProgram();
    if (!program) throw new Error('Failed to create program');
    
    this.gl.attachShader(program, fragmentShader);
    this.gl.attachShader(program, vertexShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      throw new Error(`Failed to link program: ${this.gl.getProgramInfoLog(program)}`);
    }

    this.gl.useProgram(program);
    this.gl.uniform1i(this.gl.getUniformLocation(program, 'uPerlinTexture'), 0);
    this.gl.uniform1fv(this.gl.getUniformLocation(program, 'uOffsets'), this.offsets);
    this.gl.uniform3fv(this.gl.getUniformLocation(program, 'uColor1'), this.colorA);
    this.gl.uniform3fv(this.gl.getUniformLocation(program, 'uColor2'), this.colorB);
    this.gl.uniform1f(this.gl.getUniformLocation(program, 'uSpeed'), this.speed);
    
    return program;
  }

  private getShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;
    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      return shader;
    }
    
    console.error(`An error occurred compiling the shaders: ${this.gl.getShaderInfoLog(shader)}`);
    this.gl.deleteShader(shader);
    return null;
  }
}

// --- React Component ---

interface OrbProps {
  color1?: string;
  color2?: string;
  onClick?: () => void;
  isActive?: boolean;
  className?: string;
  // Props to control the pulse effect, driven by an audio session manager
  isSpeaking?: boolean;
  isDisconnected?: boolean;
  inputVolume?: number;
  outputVolume?: number;
}

// A temporary Phone icon component if lucide-react is not fully set up
const Phone = ({ className }: { className?: string }) => (
    <svg className={className} height="1em" width="1em" viewBox="0 0 18 18" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M3.7489 2.25C2.93286 2.25 2.21942 2.92142 2.27338 3.7963C2.6686 10.2041 7.79483 15.3303 14.2026 15.7255C15.0775 15.7795 15.7489 15.066 15.7489 14.25V11.958C15.7489 11.2956 15.3144 10.7116 14.6799 10.5213L12.6435 9.91035C12.1149 9.75179 11.542 9.89623 11.1518 10.2864L10.5901 10.8482C9.15291 10.0389 7.95998 8.84599 7.15074 7.40881L7.71246 6.84709C8.10266 6.45689 8.24711 5.88396 8.08854 5.35541L7.47761 3.31898C7.28727 2.6845 6.70329 2.25 6.04087 2.25H3.7489Z"></path>
    </svg>
);

export function Orb({
  color1 = '#2792DC',
  color2 = '#9CE6E6',
  onClick,
  isActive = false,
  className,
  isSpeaking = false,
  isDisconnected = true,
  inputVolume = 0,
  outputVolume = 0,
}: OrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<OrbRenderer | null>(null);
  const outerRingRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const renderer = new OrbRenderer(canvasRef.current);
    rendererRef.current = renderer;

    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.updateColors(color1, color2);
  }, [color1, color2]);
  
  useEffect(() => {
    if (isDisconnected) {
      if (outerRingRef.current) outerRingRef.current.style.transform = "";
      if (canvasContainerRef.current) canvasContainerRef.current.style.transform = "";
      return;
    }

    let animationFrameId: number;
    const animatePulse = () => {
      rendererRef.current?.updateVolume(outputVolume);

      // Logic from obfuscated code for CSS scaling pulse
      const outerScale = isSpeaking ? 1 + outputVolume * 0.4 : 1;
      const innerScale = isSpeaking ? 1 : 1 - inputVolume * 0.4;
      
      if (outerRingRef.current) outerRingRef.current.style.transform = `scale(${outerScale})`;
      if (canvasContainerRef.current) canvasContainerRef.current.style.transform = `scale(${innerScale})`;
      
      animationFrameId = requestAnimationFrame(animatePulse);
    };

    animatePulse();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isSpeaking, isDisconnected, inputVolume, outputVolume]);

  return (
    <div className={cn(
      "absolute origin-top-left transition-[transform,left,top] duration-200 z-1",
      "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-100",
      className
    )}>
      <div className="relative shrink-0 w-60 h-60">
        <div ref={outerRingRef} className="absolute inset-0 rounded-full bg-base-border transition-transform duration-200" />
        <div ref={canvasContainerRef} className="absolute inset-0 rounded-full overflow-hidden bg-base bg-cover transition-transform duration-200">
          <canvas 
            ref={canvasRef}
            className="w-full h-full" 
            width="512" 
            height="512"
          />
        </div>
      </div>
      <div 
        data-shown={true}
        className={cn(
          "absolute bottom-0 p-1 rounded-[calc(var(--el-button-radius)+4px)] bg-base",
          "left-1/2 -translate-x-1/2 translate-y-1/2",
          "transition-[opacity,transform] data-hidden:opacity-0 data-hidden:scale-100 scale-150"
        )}
      >
      </div>
    </div>
  );
}
