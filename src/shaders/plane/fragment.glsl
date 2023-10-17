#define PI 3.1415926535897932384626433832795

uniform sampler2D uPlanetTexture;
uniform sampler2D uShopTexture;
uniform vec2 uResolution;
uniform float uProgress;

varying vec2 vUv;

vec2 distort(vec2 uv, float progress, float expo) {
  vec2 p0 = uv * 2. - 1.;
  vec2 p1 = p0 / (1. + progress * length(p0) * expo);
  return (p1 + 1.) * 0.5;
}

void main() {
  float strength = 20.;
  float progress1 = smoothstep(0.75, 1., uProgress);

  vec2 uvShop = distort(vUv, strength * uProgress, 4. * (1. - uProgress));
  vec4 shopColor = texture2D(uShopTexture, uvShop);

  vec2 uvPlanet = distort(vUv, strength * (1. - uProgress), 4. * uProgress);
  vec4 planetColor = texture2D(uPlanetTexture, uvPlanet);

  gl_FragColor = mix(planetColor, shopColor, progress1);
}