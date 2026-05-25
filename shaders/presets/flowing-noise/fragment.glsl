precision highp float;

uniform float u_time;
uniform float u_flowSpeed;
uniform float u_noiseScale;
uniform float u_contrast;
uniform vec3 u_colorA;
uniform vec3 u_colorB;

varying vec2 v_uv;

float hash(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  vec2 curve = local * local * (3.0 - 2.0 * local);

  float bottomLeft = hash(cell);
  float bottomRight = hash(cell + vec2(1.0, 0.0));
  float topLeft = hash(cell + vec2(0.0, 1.0));
  float topRight = hash(cell + vec2(1.0, 1.0));

  float bottom = mix(bottomLeft, bottomRight, curve.x);
  float top = mix(topLeft, topRight, curve.x);

  return mix(bottom, top, curve.y);
}

float fbm(vec2 point) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int octave = 0; octave < 4; octave++) {
    value += noise(point) * amplitude;
    point *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

void main() {
  vec2 flow = v_uv * u_noiseScale;
  flow.x += u_time * u_flowSpeed;
  flow.y += sin(v_uv.x * 6.28318530718 + u_time * u_flowSpeed) * 0.35;

  float pattern = fbm(flow);
  pattern = smoothstep(0.15, 0.95, pattern * u_contrast);

  vec3 color = mix(u_colorA, u_colorB, pattern);

  gl_FragColor = vec4(color, 1.0);
}
