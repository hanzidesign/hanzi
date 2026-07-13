import {
  Color,
  ShaderMaterial,
  Vector2,
  type Texture,
} from 'three'

export type BlockifyControlValue = string | number | boolean
export type BlockifyControls = Readonly<Record<string, BlockifyControlValue>>

export const BLOCKIFY_STYLE_IDS = {
  full: 0,
  shaded: 1,
  outline: 2,
} as const

export const BLOCKIFY_COLOR_MODE_IDS = {
  color: 0,
  grayscale: 1,
} as const

type CreateBlockifyShaderMaterialOptions = Readonly<{
  controls: BlockifyControls
  sourceTexture: Texture
  sourceSize?: Vector2
  resolution?: Vector2
}>

export const BLOCKIFY_VERTEX_SHADER = /* glsl */ `
varying vec2 v_uv;

void main() {
  v_uv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const BLOCKIFY_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D u_sourceTexture;
uniform vec2 u_sourceSize;
uniform vec2 u_resolution;
uniform float u_blockSize;
uniform float u_style;
uniform float u_borderWidth;
uniform float u_brightness;
uniform float u_contrast;
uniform vec3 u_borderColor;
uniform float u_colorMode;
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

float blockifyPostNoise(vec2 pixel) {
  return fract(sin(dot(pixel, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 applyBlockifyPostProcessing(vec3 color, float sourceLuminance, vec2 uv) {
  vec2 centered = uv * 2.0 - 1.0;
  float noiseScale = max(u_grainSize, 1.0);
  float movingTime = floor(u_time * (1.0 + u_grainSpeed * 0.1));
  color += (blockifyPostNoise(floor(gl_FragCoord.xy / noiseScale) + movingTime) - 0.5)
    * (u_grainIntensity / 100.0);
  color += smoothstep(0.65, 1.0, sourceLuminance) * u_bloom * 0.24;
  color.r += (blockifyPostNoise(gl_FragCoord.xy + 13.0) - 0.5) * u_postChromatic * 0.08;
  color.b -= (blockifyPostNoise(gl_FragCoord.xy + 29.0) - 0.5) * u_postChromatic * 0.08;
  color *= 1.0 - sin(gl_FragCoord.y * 3.14159265) * u_scanlines * 0.12;
  color *= mix(1.0, smoothstep(1.25, 0.25, length(centered)), u_vignette);
  color *= mix(1.0, 1.0 - dot(centered, centered) * 0.1, u_crtCurve);
  color = mix(color, color * vec3(0.9, 1.06, 0.92), u_phosphor);
  return clamp(color, 0.0, 1.0);
}

void main() {
  vec2 pixelPos = v_uv * u_resolution;
  vec2 blockPos = floor(pixelPos / u_blockSize);
  vec2 blockCenter = (blockPos + 0.5) * u_blockSize;
  vec2 blockUv = blockCenter / u_resolution;
  vec3 color = texture2D(u_sourceTexture, blockUv).rgb;

  color = color + u_brightness;
  float factor = (1.0 + u_contrast) / (1.0 - 0.99 * u_contrast);
  color = clamp((color - 0.5) * factor + 0.5, 0.0, 1.0);

  float gray = dot(color, vec3(0.299, 0.587, 0.114));
  if (u_colorMode > 0.5) {
    color = vec3(gray);
  }

  vec3 effectColor = color;
  if (u_style > 0.5 && u_style < 1.5) {
    vec2 local = (pixelPos - blockPos * u_blockSize) / u_blockSize;
    float shade = 0.9 + 0.1 * (1.0 - length(local - 0.5) * 1.4);
    effectColor = color * shade;
  } else if (u_style > 1.5) {
    vec2 localPix = pixelPos - blockPos * u_blockSize;
    bool isEdge = localPix.x < u_borderWidth ||
      localPix.x > u_blockSize - u_borderWidth ||
      localPix.y < u_borderWidth ||
      localPix.y > u_blockSize - u_borderWidth;
    if (isEdge) {
      effectColor = u_borderColor;
    }
  }

  effectColor = applyBlockifyPostProcessing(effectColor, gray, v_uv);
  gl_FragColor = vec4(effectColor, 1.0);
}
`

export function createBlockifyShaderMaterial({
  controls,
  sourceTexture,
  sourceSize = new Vector2(1, 1),
  resolution = sourceSize,
}: CreateBlockifyShaderMaterialOptions) {
  const material = new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    fragmentShader: BLOCKIFY_FRAGMENT_SHADER,
    uniforms: {
      u_sourceTexture: { value: sourceTexture },
      u_sourceSize: { value: sourceSize.clone() },
      u_resolution: { value: resolution.clone() },
      u_blockSize: { value: 8 },
      u_style: { value: BLOCKIFY_STYLE_IDS.full },
      u_borderWidth: { value: 1 },
      u_brightness: { value: 0 },
      u_contrast: { value: 0 },
      u_borderColor: { value: new Color('#000000') },
      u_colorMode: { value: BLOCKIFY_COLOR_MODE_IDS.color },
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
    vertexShader: BLOCKIFY_VERTEX_SHADER,
  })

  applyBlockifyUniforms(material, controls)
  return material
}

export function applyBlockifyUniforms(
  material: ShaderMaterial,
  controls: BlockifyControls,
) {
  material.uniforms.u_blockSize.value = readNumber(controls['block-size'], 8)
  material.uniforms.u_style.value = readEnum(
    controls.style,
    BLOCKIFY_STYLE_IDS,
    'full',
  )
  material.uniforms.u_borderWidth.value = readNumber(controls['border-width'], 1)
  material.uniforms.u_brightness.value = readNumber(controls.brightness, 0) / 100
  material.uniforms.u_contrast.value = readNumber(controls.contrast, 0) / 100
  material.uniforms.u_borderColor.value.set(
    readString(controls['border-color'], '#000000'),
  )
  material.uniforms.u_colorMode.value = readEnum(
    controls['color-mode'],
    BLOCKIFY_COLOR_MODE_IDS,
    'color',
  )
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

export function disposeBlockifyShaderMaterial(material: ShaderMaterial) {
  material.dispose()
}

function readNumber(value: BlockifyControlValue | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function readString(value: BlockifyControlValue | undefined, fallback: string) {
  return typeof value === 'string' ? value : fallback
}

function readBoolean(value: BlockifyControlValue | undefined) {
  return value === true ? 1 : 0
}

function readEnum<T extends Record<string, number>>(
  value: BlockifyControlValue | undefined,
  values: T,
  fallback: keyof T,
) {
  return typeof value === 'string' && value in values
    ? values[value as keyof T]
    : values[fallback]
}
