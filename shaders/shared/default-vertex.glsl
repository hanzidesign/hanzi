precision highp float;

uniform sampler2D u_displacementMap;
uniform vec4 u_displacementMapTransform;
uniform float u_displacementStrength;
uniform float u_displacementBias;
uniform vec3 u_boundsMin;
uniform vec3 u_boundsMax;

varying vec2 v_uv;

void main() {
  v_uv = clamp(uv, 0.0, 1.0);

  vec2 displacementUv = clamp(
    v_uv * u_displacementMapTransform.xy + u_displacementMapTransform.zw,
    0.0,
    1.0
  );
  vec4 displacementSample = texture2D(u_displacementMap, displacementUv);
  float displacementLuminance = dot(displacementSample.rgb, vec3(0.299, 0.587, 0.114));
  float displacementHeight = mix(0.5, displacementLuminance, displacementSample.a);
  float displacement = (displacementHeight - 0.5 + u_displacementBias) * u_displacementStrength;
  vec3 displacedPosition = position + normal * displacement;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
}
