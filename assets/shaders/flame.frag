in vec2 vTextureCoord;
in vec2 vFilterCoord;

uniform sampler2D uTexture;

void main(void) {
  vec4 texColor = texture2D(uTexture, vTextureCoord);

  // Height from bottom: 0 at bottom, 1 at top
  float height = 1.0 - vFilterCoord.y;

  // Define flame colors
  vec3 yellow = vec3(1.0, 1.0, 0.0);
  vec3 orange = vec3(1.0, 0.5, 0.0);
  vec3 red = vec3(1.0, 0.0, 0.0);
  vec3 darkRed = vec3(0.3, 0.0, 0.0);

  // Create vertical gradient based on height
  vec3 flameColor;
  float alpha = 1.0;

  if (height < 0.2) {
    float t = height / 0.2;
    flameColor = mix(yellow, orange, t);
  } else if (height < 0.5) {
    float t = (height - 0.2) / 0.3;
    flameColor = mix(orange, red, t);
  } else if (height < 0.8) {
    float t = (height - 0.5) / 0.3;
    flameColor = mix(red, darkRed, t);
    alpha = 1.0 - t * 0.3;
  } else {
    float t = (height - 0.8) / 0.2;
    flameColor = mix(darkRed, vec3(0.1, 0.0, 0.0), t);
    alpha = 0.7 - t * 0.5;
  }

  float intensity = texColor.r;
  alpha = clamp(alpha, 0.0, 1.0);
  gl_FragColor = vec4(flameColor * intensity, texColor.a * intensity * alpha);
}
