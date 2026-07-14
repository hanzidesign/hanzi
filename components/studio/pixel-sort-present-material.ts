import { ShaderMaterial, type Texture } from 'three'

export const PIXEL_SORT_PRESENT_VERTEX_SHADER = /* glsl */ `
varying vec2 v_uv;

void main() {
  v_uv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const PIXEL_SORT_PRESENT_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D u_sortedFrame;
varying vec2 v_uv;

void main() {
  gl_FragColor = texture2D(u_sortedFrame, v_uv);
}
`

export function createPixelSortPresentMaterial(sortedFrame: Texture) {
  return new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    fragmentShader: PIXEL_SORT_PRESENT_FRAGMENT_SHADER,
    uniforms: {
      u_sortedFrame: { value: sortedFrame },
    },
    vertexShader: PIXEL_SORT_PRESENT_VERTEX_SHADER,
  })
}

export function setPixelSortPresentFrame(material: ShaderMaterial, frame: Texture) {
  material.uniforms.u_sortedFrame.value = frame
}

