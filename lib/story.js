// story film data: shared by the server ruler (Story.jsx) and the client scene (StoryScene.jsx).
// plain module on purpose: client modules cannot hand values to server components.
export const CHAPTERS = [
  {
    pos: "center",
    hint: true,
    title: "Aura One",
    body: "A reference headphone. Machined from billet aluminium, tuned by ear in Berlin.",
  },
  {
    pos: "left",
    title: "Built around one question",
    body: "What if the instrument disappeared, and only the music was left? The mass, the seal, the silence — every decision in Aura One is an answer. Nothing decorative survived.",
  },
  {
    pos: "left",
    title: "The band",
    body: "One billet of 6061 aluminium, anodised graphite and brushed by hand in a single direction. The yoke rides a titanium rail: flex where it should, rigid where it must.",
    stats: [
      ["38 mm", "yoke travel"],
      ["284 g", "total mass"],
    ],
  },
  {
    pos: "left",
    title: "The cups",
    body: "CNC-milled shells on a steel hinge with ninety degrees of travel. Every mating face holds to a tenth of a millimetre, so the cups close with one sound — a soft, final click.",
    stats: [
      ["90°", "hinge travel"],
      ["0.1 mm", "tolerance"],
    ],
  },
  {
    pos: "left",
    title: "The core",
    body: "Inside each cup: a 40 mm beryllium-coated dome over a neodymium ring, driven by an amplifier that corrects the driver in real time.",
    stats: [
      ["4 Hz – 40 kHz", "response"],
      ["0.02 %", "THD"],
    ],
  },
  {
    pos: "wide",
    title: "The tuning",
    body: "Twelve microphones listen to the room — and to the music — forty-eight thousand times a second, so the noise floor collapses without touching what you came for.",
    stats: [
      ["−42 dB", "noise floor"],
      ["12", "microphones"],
      ["48 kHz", "sampling"],
    ],
  },
  {
    pos: "left",
    title: "One piece again",
    body: "Then it goes back together, the same sequence in reverse, until nineteen parts become one thing you cannot see the seams of.",
  },
  {
    pos: "center",
    title: "Take them everywhere",
    body: "Forty hours of playback, six more from a five-minute charge. After that, it is only ever listening.",
    cta: true,
  },
];
