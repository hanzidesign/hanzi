import { ShaderMaterial, Vector2, type Texture } from 'three'

export type VhsControlValue = string | number | boolean
export type VhsControls = Readonly<Record<string, VhsControlValue>>

export type CreateVhsShaderMaterialOptions = Readonly<{
  controls: VhsControls
  sourceTexture: Texture
  sourceSize?: Vector2
  resolution?: Vector2
}>

export const VHS_VERTEX_SHADER = /* glsl */ `
varying vec2 v_uv;

void main() {
  v_uv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const VHS_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D u_sourceTexture;
uniform vec2 u_sourceSize;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_distortion;
uniform float u_noise;
uniform float u_colorBleed;
uniform float u_chromaBlur;
uniform float u_saturation;
uniform float u_redGain;
uniform float u_greenGain;
uniform float u_blueGain;
uniform float u_vhsScanlines;
uniform float u_trackingError;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_processingInvert;
uniform float u_brightnessMap;
uniform float u_edgeEnhance;
uniform float u_blur;
uniform float u_quantizeColors;
uniform float u_shapeMatching;
uniform float u_bloom;
uniform float u_postChromatic;
uniform float u_scanlines;
uniform float u_vignette;
uniform float u_crtCurve;
uniform float u_phosphor;
varying vec2 v_uv;

float vhsHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float vhsValueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(vhsHash(i), vhsHash(i + vec2(1.0, 0.0)), u.x),
    mix(vhsHash(i + vec2(0.0, 1.0)), vhsHash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

vec3 applyVhsBrightnessContrast(vec3 color) {
  vec3 result = color + vec3(u_brightness);
  float contrastFactor = (1.0 + u_contrast) / (1.0 - 0.99 * u_contrast);
  result = (result - 0.5) * contrastFactor + 0.5;
  return clamp(result, vec3(0.0), vec3(1.0));
}

float vhsLuminance(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

vec3 sampleVhsSource(vec2 uv) {
  vec2 sourceUv = clamp(uv, vec2(0.0), vec2(1.0));
  vec3 center = texture2D(u_sourceTexture, sourceUv).rgb;
  if (u_blur <= 0.0) {
    return center;
  }

  vec2 blurTexel = min(u_blur, 12.0) / max(u_sourceSize, vec2(1.0));
  return (
    center * 4.0 +
    texture2D(u_sourceTexture, clamp(sourceUv + vec2(blurTexel.x, 0.0), vec2(0.0), vec2(1.0))).rgb +
    texture2D(u_sourceTexture, clamp(sourceUv - vec2(blurTexel.x, 0.0), vec2(0.0), vec2(1.0))).rgb +
    texture2D(u_sourceTexture, clamp(sourceUv + vec2(0.0, blurTexel.y), vec2(0.0), vec2(1.0))).rgb +
    texture2D(u_sourceTexture, clamp(sourceUv - vec2(0.0, blurTexel.y), vec2(0.0), vec2(1.0))).rgb
  ) / 8.0;
}

vec3 applyVhsProcessing(vec3 color, float luminance) {
  color = mix(color, 1.0 - color, u_processingInvert);
  color *= u_brightnessMap;
  color += length(fwidth(vec2(luminance))) * u_edgeEnhance * 8.0;
  if (u_quantizeColors >= 1.0) {
    float levels = max(u_quantizeColors, 2.0);
    color = floor(color * (levels - 1.0) + 0.5) / (levels - 1.0);
  }
  color = mix(color, vec3(step(0.5, luminance)), u_shapeMatching);
  return clamp(color, 0.0, 1.0);
}

float vhsPostNoise(vec2 pixel) {
  return fract(sin(dot(pixel, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 applyVhsPostProcessing(vec3 color, float sourceLuminance, vec2 uv) {
  vec2 centered = uv * 2.0 - 1.0;
  color += smoothstep(0.65, 1.0, sourceLuminance) * u_bloom * 0.24;
  color.r += (vhsPostNoise(gl_FragCoord.xy + 13.0) - 0.5) * u_postChromatic * 0.08;
  color.b -= (vhsPostNoise(gl_FragCoord.xy + 29.0) - 0.5) * u_postChromatic * 0.08;
  color *= 1.0 - sin(gl_FragCoord.y * 3.14159265) * u_scanlines * 0.12;
  color *= mix(1.0, smoothstep(1.25, 0.25, length(centered)), u_vignette);
  color *= mix(1.0, 1.0 - dot(centered, centered) * 0.1, u_crtCurve);
  color = mix(color, color * vec3(0.9, 1.06, 0.92), u_phosphor);
  return clamp(color, 0.0, 1.0);
}

void main() {
  vec2 warpedUv = v_uv;
  float time = u_time;

  if (u_trackingError > 0.01) {
    float trackingNoise = vhsValueNoise(vec2(
      floor(warpedUv.y * 20.0),
      floor(time * 2.0)
    ));
    float trackingOffset = (trackingNoise - 0.5) * 0.1 * u_trackingError;
    float jumpNoise = vhsValueNoise(vec2(time * 0.5, 0.0));
    float bigJump = step(0.92, jumpNoise)
      * (vhsValueNoise(vec2(warpedUv.y * 5.0, time)) - 0.5) * 0.3;
    warpedUv.x += trackingOffset + bigJump * u_trackingError;
  }

  if (u_distortion > 0.01) {
    float warpFrequency = 3.0 + vhsValueNoise(vec2(time * 0.1, 0.0)) * 5.0;
    float warpAmplitude = u_distortion * 0.02;
    warpedUv.x += sin(warpedUv.y * warpFrequency * 6.28 + time * 2.0)
      * warpAmplitude;
    float shake = vhsValueNoise(vec2(time * 10.0, 0.0)) - 0.5;
    warpedUv.x += shake * u_distortion * 0.01;
    float edgeDistance = abs(warpedUv.y - 0.5) * 2.0;
    float edgeWarp = pow(edgeDistance, 3.0) * u_distortion * 0.1;
    warpedUv.x += sin(time * 3.0 + warpedUv.y * 10.0) * edgeWarp;
  }

  warpedUv = clamp(warpedUv, vec2(0.0), vec2(1.0));
  vec3 effectColor;

  if (u_colorBleed > 0.01) {
    float bleedAmount = u_colorBleed * 0.01;
    float red = sampleVhsSource(warpedUv + vec2(bleedAmount * 2.0, 0.0)).r;
    float green = sampleVhsSource(warpedUv).g;
    float blue = sampleVhsSource(warpedUv - vec2(bleedAmount * 2.0, 0.0)).b;

    vec3 chromaBlur = vec3(0.0);
    for (int i = -2; i <= 2; i++) {
      float sampleOffset = float(i) * bleedAmount;
      chromaBlur += sampleVhsSource(warpedUv + vec2(sampleOffset, 0.0));
    }
    chromaBlur /= 5.0;
    effectColor = mix(vec3(red, green, blue), chromaBlur, u_chromaBlur);
  } else {
    effectColor = sampleVhsSource(warpedUv);
  }

  if (u_vhsScanlines > 0.01) {
    float scanlinePattern = sin(warpedUv.y * u_resolution.y * 3.14159) * 0.5 + 0.5;
    float scanlineIntensity = mix(1.0, scanlinePattern, u_vhsScanlines * 0.5);
    effectColor *= scanlineIntensity;
    float scanlinePhase = floor(warpedUv.y * u_resolution.y);
    effectColor.r *= 1.0 - u_vhsScanlines * 0.1
      * step(0.5, fract(scanlinePhase * 0.5));
  }

  if (u_noise > 0.01) {
    float grain = vhsHash(
      warpedUv * u_resolution + vec2(time * 1000.0)
    ) - 0.5;
    effectColor += vec3(grain * u_noise * 0.3);

    float bandNoise = vhsValueNoise(vec2(warpedUv.y * 100.0, time * 5.0));
    float band = step(0.97, bandNoise)
      * (vhsHash(vec2(warpedUv.x * 100.0, time)) - 0.5);
    effectColor += vec3(band * u_noise);

    float barY = fract(time * 0.3);
    float barDistance = abs(warpedUv.y - barY);
    float insideBar = step(barDistance, 0.02);
    float barNoise = vhsHash(vec2(warpedUv.x * 500.0, floor(time * 60.0))) - 0.5;
    effectColor += vec3(barNoise * insideBar * u_noise * 0.5);
  }

  effectColor = mix(
    effectColor,
    vec3(vhsLuminance(effectColor)),
    1.0 - u_saturation
  );
  effectColor.r *= u_redGain;
  effectColor.g *= u_greenGain;
  effectColor.b *= u_blueGain;
  float fixedVignette = 1.0
    - length((warpedUv - 0.5) * vec2(0.5, 0.7)) * 0.5;
  effectColor *= fixedVignette;
  effectColor = applyVhsBrightnessContrast(effectColor);
  effectColor = applyVhsProcessing(effectColor, vhsLuminance(effectColor));
  effectColor = applyVhsPostProcessing(
    effectColor,
    vhsLuminance(effectColor),
    v_uv
  );
  gl_FragColor = vec4(effectColor, 1.0);
}
`

export function createVhsShaderMaterial({
  controls,
  sourceTexture,
  sourceSize = new Vector2(1, 1),
  resolution = sourceSize,
}: CreateVhsShaderMaterialOptions) {
  const material = new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    fragmentShader: VHS_FRAGMENT_SHADER,
    uniforms: {
      u_sourceTexture: { value: sourceTexture },
      u_sourceSize: { value: sourceSize.clone() },
      u_resolution: { value: resolution.clone() },
      u_time: { value: 0 },
      u_distortion: { value: 0.5 },
      u_noise: { value: 0.3 },
      u_colorBleed: { value: 0.5 },
      u_chromaBlur: { value: 0.3 },
      u_saturation: { value: 0.9 },
      u_redGain: { value: 1.1 },
      u_greenGain: { value: 1 },
      u_blueGain: { value: 0.9 },
      u_vhsScanlines: { value: 0.3 },
      u_trackingError: { value: 0.2 },
      u_brightness: { value: 0 },
      u_contrast: { value: 0 },
      u_processingInvert: { value: 0 },
      u_brightnessMap: { value: 1 },
      u_edgeEnhance: { value: 0 },
      u_blur: { value: 0 },
      u_quantizeColors: { value: 0 },
      u_shapeMatching: { value: 0 },
      u_bloom: { value: 0 },
      u_postChromatic: { value: 0 },
      u_scanlines: { value: 0 },
      u_vignette: { value: 0 },
      u_crtCurve: { value: 0 },
      u_phosphor: { value: 0 },
    },
    vertexShader: VHS_VERTEX_SHADER,
  })

  applyVhsUniforms(material, controls)
  return material
}

export function applyVhsUniforms(material: ShaderMaterial, controls: VhsControls) {
  material.uniforms.u_distortion.value = readNumber(controls.distortion, 0.5)
  material.uniforms.u_noise.value = readNumber(controls.noise, 0.3)
  material.uniforms.u_colorBleed.value = readNumber(controls['color-bleed'], 0.5)
  material.uniforms.u_chromaBlur.value = readNumber(controls['chroma-blur'], 0.3)
  material.uniforms.u_saturation.value = readNumber(controls.saturation, 0.9)
  material.uniforms.u_redGain.value = readNumber(controls['red-gain'], 1.1)
  material.uniforms.u_greenGain.value = readNumber(controls['green-gain'], 1)
  material.uniforms.u_blueGain.value = readNumber(controls['blue-gain'], 0.9)
  material.uniforms.u_vhsScanlines.value = readNumber(controls['vhs-scanlines'], 0.3)
  material.uniforms.u_trackingError.value = readNumber(controls['tracking-error'], 0.2)
  material.uniforms.u_brightness.value = readNumber(controls.brightness, 0) / 100
  material.uniforms.u_contrast.value = readNumber(controls.contrast, 0) / 100
  material.uniforms.u_processingInvert.value = readBoolean(controls['processing-invert'])
  material.uniforms.u_brightnessMap.value = readNumber(controls['brightness-map'], 1)
  material.uniforms.u_edgeEnhance.value = readNumber(controls['edge-enhance'], 0)
  material.uniforms.u_blur.value = readNumber(controls.blur, 0)
  material.uniforms.u_quantizeColors.value = readNumber(controls['quantize-colors'], 0)
  material.uniforms.u_shapeMatching.value = readNumber(controls['shape-matching'], 0)
  material.uniforms.u_bloom.value = readBoolean(controls.bloom)
  material.uniforms.u_postChromatic.value = readBoolean(controls.chromatic)
  material.uniforms.u_scanlines.value = readBoolean(controls.scanlines)
  material.uniforms.u_vignette.value = readBoolean(controls.vignette)
  material.uniforms.u_crtCurve.value = readBoolean(controls['crt-curve'])
  material.uniforms.u_phosphor.value = readBoolean(controls.phosphor)
}

export function disposeVhsShaderMaterial(material: ShaderMaterial) {
  material.dispose()
}

function readNumber(value: VhsControlValue | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function readBoolean(value: VhsControlValue | undefined) {
  return value === true ? 1 : 0
}
