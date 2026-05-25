precision highp float;

uniform float u_time;
uniform float u_segments;
uniform float u_spinSpeed;
uniform float u_detail;
uniform float u_softness;
uniform vec3 u_tint;

varying vec2 v_uv;

const float PI = 3.14159265359;

float stripePattern(vec2 point) {
  float waveA = sin(point.x * u_detail + u_time * u_spinSpeed);
  float waveB = cos(point.y * u_detail * 0.7 - u_time * u_spinSpeed);

  return (waveA + waveB) * 0.5 + 0.5;
}

void main() {
  vec2 centered = v_uv * 2.0 - 1.0;
  float radius = length(centered);
  float angle = atan(centered.y, centered.x) + u_time * u_spinSpeed * 0.25;
  float sector = (PI * 2.0) / max(u_segments, 2.0);
  float mirroredAngle = abs(mod(angle, sector) - sector * 0.5);
  vec2 kaleidoUv = vec2(cos(mirroredAngle), sin(mirroredAngle)) * radius;

  float pattern = stripePattern(kaleidoUv);
  float edge = 1.0 - smoothstep(u_softness, 1.0, radius);
  vec3 baseColor = vec3(pattern, 1.0 - pattern * 0.35, 0.65 + pattern * 0.35);
  vec3 color = mix(baseColor, u_tint, 0.55);

  gl_FragColor = vec4(color * edge, 1.0);
}
