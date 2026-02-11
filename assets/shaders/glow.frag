in vec2 vTextureCoord;
in vec2 vFilterCoord;

uniform sampler2D uTexture;

void main(void) {
  vec4 texColor = texture2D(uTexture, vTextureCoord);

  // Light yellow/white glow color
  vec3 glowColor = vec3(1.0, 1.0, 0.7);

  float intensity = texColor.r;
  // Softer, more transparent glow
  float alpha = texColor.a * intensity * 0.6;

  gl_FragColor = vec4(glowColor * intensity, alpha);
}
