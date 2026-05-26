precision highp float;

uniform sampler2D u_displacementMap;
uniform float u_displacementStrength;
uniform float u_displacementBias;
uniform vec3 u_boundsMin;
uniform vec3 u_boundsMax;

varying vec2 v_uv;

void main() {
  v_uv = clamp(uv, 0.0, 1.0);

  float displacementSample = texture2D(u_displacementMap, v_uv).r;
  float displacement = (displacementSample + u_displacementBias) * u_displacementStrength;
  vec3 displacedPosition = position + normal * displacement;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
}
