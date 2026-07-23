import { ShaderMaterial } from 'three'

export const CHARACTER_MODEL_TONE_VERTEX_SHADER = /* glsl */ `
varying float v_cameraDistance;
varying vec3 v_viewNormal;

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  v_cameraDistance = -viewPosition.z;
  v_viewNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * viewPosition;
}
`

export const CHARACTER_MODEL_TONE_FRAGMENT_SHADER = /* glsl */ `
varying float v_cameraDistance;
varying vec3 v_viewNormal;
uniform bool u_encodeDepthAlpha;

void main() {
  float depthTone = 1.0 - smoothstep(3.2, 5.8, v_cameraDistance);
  float facingTone = clamp(
    dot(normalize(v_viewNormal), normalize(vec3(0.35, 0.45, 1.0))) * 0.5 + 0.5,
    0.0,
    1.0
  );
  float modelTone = clamp(mix(depthTone, facingTone, 0.35), 0.0, 1.0);
  gl_FragColor = vec4(vec3(0.12 + modelTone * 0.88), u_encodeDepthAlpha ? depthTone : 1.0);
}
`

export function createCharacterModelToneMaterial(options: { encodeDepthAlpha?: boolean } = {}) {
  return new ShaderMaterial({
    uniforms: {
      u_encodeDepthAlpha: { value: options.encodeDepthAlpha === true },
    },
    vertexShader: CHARACTER_MODEL_TONE_VERTEX_SHADER,
    fragmentShader: CHARACTER_MODEL_TONE_FRAGMENT_SHADER,
  })
}
