precision highp float;

uniform sampler2D u_displacementMap;
uniform float u_displacementStrength;
uniform float u_displacementBias;
uniform vec3 u_boundsMin;
uniform vec3 u_boundsMax;

varying vec2 v_uv;

void main() {
  vec3 boundsSize = max(u_boundsMax - u_boundsMin, vec3(0.0001));
  v_uv = clamp((position.xy - u_boundsMin.xy) / boundsSize.xy, 0.0, 1.0);

  float displacementSample = texture2D(u_displacementMap, v_uv).r;
  float displacement = (displacementSample + u_displacementBias) * u_displacementStrength;
  vec3 displacedPosition = position + normal * displacement;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
}
