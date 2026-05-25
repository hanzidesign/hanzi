precision highp float;

uniform float u_time;
uniform float u_density;
uniform float u_pulseSpeed;
uniform float u_dotSize;
uniform float u_invertGrid;
uniform vec3 u_foreground;
uniform vec3 u_background;

varying vec2 v_uv;

void main() {
  vec2 scaledUv = v_uv * u_density;
  vec2 cell = floor(scaledUv);
  vec2 local = fract(scaledUv) - 0.5;

  float phase = dot(cell, vec2(0.31, 0.47)) + u_time * u_pulseSpeed;
  float pulse = 0.5 + 0.5 * sin(phase);
  float radius = u_dotSize * (0.55 + pulse * 0.45);
  float dotMask = 1.0 - smoothstep(radius, radius + 0.035, length(local));
  float lineMask = 1.0 - smoothstep(0.01, 0.03, min(abs(local.x), abs(local.y)));
  float mask = clamp(dotMask + lineMask * 0.2, 0.0, 1.0);

  mask = mix(mask, 1.0 - mask, step(0.5, u_invertGrid));

  vec3 color = mix(u_background, u_foreground, mask);

  gl_FragColor = vec4(color, 1.0);
}
