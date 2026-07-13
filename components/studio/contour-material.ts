import {
  Color,
  ShaderMaterial,
  Vector2,
  type Texture,
} from 'three'

export type ContourControlValue = string | number | boolean
export type ContourControls = Readonly<Record<string, ContourControlValue>>

export const CONTOUR_FILL_MODE_IDS = {
  filled: 0,
  lines: 1,
} as const

export const CONTOUR_COLOR_MODE_IDS = {
  original: 1,
  custom: 2,
} as const

type CreateContourShaderMaterialOptions = Readonly<{
  controls: ContourControls
  sourceTexture: Texture
  sourceSize?: Vector2
  resolution?: Vector2
}>

export const CONTOUR_VERTEX_SHADER = /* glsl */ `
varying vec2 v_uv;

void main() {
  v_uv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const CONTOUR_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D u_sourceTexture;
uniform vec2 u_sourceSize;
uniform vec2 u_resolution;
uniform float u_levels;
uniform float u_lineThickness;
uniform float u_fillMode;
uniform float u_brightness;
uniform float u_contrast;
uniform vec3 u_lineColor;
uniform vec3 u_background;
uniform float u_colorMode;
uniform float u_invert;
uniform float u_time;
uniform float u_bloom;
uniform float u_grainIntensity;
uniform float u_grainSize;
uniform float u_grainSpeed;
uniform float u_postChromatic;
uniform float u_scanlines;
uniform float u_vignette;
uniform float u_crtCurve;
uniform float u_phosphor;
varying vec2 v_uv;

float contourLuminance(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

vec3 applyContourBrightnessContrast(vec3 color) {
  float contrastFactor = (1.0 + u_contrast) / (1.0 - u_contrast * 0.99);
  return clamp((color + u_brightness - 0.5) * contrastFactor + 0.5, 0.0, 1.0);
}

float sampleContourBrightness(vec2 sourceUv) {
  vec3 sourceColor = texture2D(u_sourceTexture, sourceUv).rgb;
  return contourLuminance(applyContourBrightnessContrast(sourceColor));
}

float contourPostNoise(vec2 pixel) {
  return fract(sin(dot(pixel, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 applyContourPostProcessing(vec3 color, float sourceLuminance, vec2 uv) {
  vec2 centered = uv * 2.0 - 1.0;
  float noiseScale = max(u_grainSize, 1.0);
  float movingTime = floor(u_time * (1.0 + u_grainSpeed * 0.1));
  color += (contourPostNoise(floor(gl_FragCoord.xy / noiseScale) + movingTime) - 0.5)
    * (u_grainIntensity / 100.0);
  color += smoothstep(0.65, 1.0, sourceLuminance) * u_bloom * 0.24;
  color.r += (contourPostNoise(gl_FragCoord.xy + 13.0) - 0.5) * u_postChromatic * 0.08;
  color.b -= (contourPostNoise(gl_FragCoord.xy + 29.0) - 0.5) * u_postChromatic * 0.08;
  color *= 1.0 - sin(gl_FragCoord.y * 3.14159265) * u_scanlines * 0.12;
  color *= mix(1.0, smoothstep(1.25, 0.25, length(centered)), u_vignette);
  color *= mix(1.0, 1.0 - dot(centered, centered) * 0.1, u_crtCurve);
  color = mix(color, color * vec3(0.9, 1.06, 0.92), u_phosphor);
  return clamp(color, 0.0, 1.0);
}

void main() {
  vec3 adjustedColor = applyContourBrightnessContrast(
    texture2D(u_sourceTexture, v_uv).rgb
  );
  float sourceLuminance = contourLuminance(adjustedColor);
  float brightness = sourceLuminance;
  if (u_invert > 0.5) {
    brightness = 1.0 - brightness;
  }

  float quantized = floor(brightness * u_levels) / u_levels;
  float quantizedBrightness = quantized + 0.5 / u_levels;
  vec2 pixelSize = vec2(u_lineThickness) / u_resolution;
  float left = sampleContourBrightness(v_uv + vec2(-pixelSize.x, 0.0));
  float right = sampleContourBrightness(v_uv + vec2(pixelSize.x, 0.0));
  float top = sampleContourBrightness(v_uv + vec2(0.0, -pixelSize.y));
  float bottom = sampleContourBrightness(v_uv + vec2(0.0, pixelSize.y));

  // Grainrad production leaves this neighbor-invert block empty. Only the
  // center brightness above is inverted before comparing quantized bands.
  if (u_invert > 0.5) {
  }

  float leftQ = floor(left * u_levels);
  float rightQ = floor(right * u_levels);
  float topQ = floor(top * u_levels);
  float bottomQ = floor(bottom * u_levels);
  float centerQ = floor(brightness * u_levels);
  bool isContour = leftQ != centerQ || rightQ != centerQ || topQ != centerQ || bottomQ != centerQ;

  vec3 effectColor;
  if (isContour) {
    effectColor = u_lineColor;
  } else if (u_fillMode > 0.5) {
    effectColor = u_background;
  } else if (u_colorMode > 1.5) {
    effectColor = mix(u_background, u_lineColor, quantizedBrightness);
  } else if (u_colorMode > 0.5) {
    effectColor = floor(adjustedColor * u_levels) / u_levels + 0.5 / u_levels;
  } else {
    effectColor = vec3(quantizedBrightness);
  }

  effectColor = applyContourPostProcessing(effectColor, sourceLuminance, v_uv);
  gl_FragColor = vec4(effectColor, 1.0);
}
`

export function createContourShaderMaterial({
  controls,
  sourceTexture,
  sourceSize = new Vector2(1, 1),
  resolution = sourceSize,
}: CreateContourShaderMaterialOptions) {
  const material = new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    fragmentShader: CONTOUR_FRAGMENT_SHADER,
    uniforms: {
      u_sourceTexture: { value: sourceTexture },
      u_sourceSize: { value: sourceSize.clone() },
      u_resolution: { value: resolution.clone() },
      u_levels: { value: 8 },
      u_lineThickness: { value: 1 },
      u_fillMode: { value: CONTOUR_FILL_MODE_IDS.filled },
      u_brightness: { value: 0 },
      u_contrast: { value: 0 },
      u_lineColor: { value: new Color('#000000') },
      u_background: { value: new Color('#ffffff') },
      u_colorMode: { value: CONTOUR_COLOR_MODE_IDS.original },
      u_invert: { value: 0 },
      u_time: { value: 0 },
      u_bloom: { value: 0 },
      u_grainIntensity: { value: 35 },
      u_grainSize: { value: 2 },
      u_grainSpeed: { value: 50 },
      u_postChromatic: { value: 0 },
      u_scanlines: { value: 0 },
      u_vignette: { value: 0 },
      u_crtCurve: { value: 0 },
      u_phosphor: { value: 0 },
    },
    vertexShader: CONTOUR_VERTEX_SHADER,
  })

  applyContourUniforms(material, controls)
  return material
}

export function applyContourUniforms(
  material: ShaderMaterial,
  controls: ContourControls,
) {
  material.uniforms.u_levels.value = readNumber(controls.levels, 8)
  material.uniforms.u_lineThickness.value = readNumber(controls['line-thickness'], 1)
  material.uniforms.u_fillMode.value = readEnum(
    controls['fill-mode'],
    CONTOUR_FILL_MODE_IDS,
    'filled',
  )
  material.uniforms.u_brightness.value = readNumber(controls.brightness, 0) / 100
  material.uniforms.u_contrast.value = readNumber(controls.contrast, 0) / 100
  material.uniforms.u_lineColor.value.set(readString(controls['line-color'], '#000000'))
  material.uniforms.u_background.value.set(readString(controls.background, '#ffffff'))
  material.uniforms.u_colorMode.value = readEnum(
    controls['color-mode'],
    CONTOUR_COLOR_MODE_IDS,
    'original',
  )
  material.uniforms.u_invert.value = readBoolean(controls.invert)
  material.uniforms.u_bloom.value = readBoolean(controls.bloom)
  material.uniforms.u_grainIntensity.value = readNumber(controls['grain-intensity'], 35)
  material.uniforms.u_grainSize.value = readNumber(controls['grain-size'], 2)
  material.uniforms.u_grainSpeed.value = readNumber(controls['grain-speed'], 50)
  material.uniforms.u_postChromatic.value = readBoolean(controls.chromatic)
  material.uniforms.u_scanlines.value = readBoolean(controls.scanlines)
  material.uniforms.u_vignette.value = readBoolean(controls.vignette)
  material.uniforms.u_crtCurve.value = readBoolean(controls['crt-curve'])
  material.uniforms.u_phosphor.value = readBoolean(controls.phosphor)
}

export function disposeContourShaderMaterial(material: ShaderMaterial) {
  material.dispose()
}

function readNumber(value: ContourControlValue | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function readBoolean(value: ContourControlValue | undefined) {
  return value === true ? 1 : 0
}

function readString(value: ContourControlValue | undefined, fallback: string) {
  return typeof value === 'string' ? value : fallback
}

function readEnum<T extends Record<string, number>>(
  value: ContourControlValue | undefined,
  values: T,
  fallback: keyof T,
) {
  return typeof value === 'string' && value in values
    ? values[value as keyof T]
    : values[fallback]
}
