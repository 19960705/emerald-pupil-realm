import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type Scene = {
  src: string;
  start: number;
  end: number;
  scale: [number, number];
  x: [number, number];
  y: [number, number];
  copy?: string;
  kicker?: string;
};

const scenes: Scene[] = [
  {
    src: "keyframes/01-barren-wide.png",
    start: 0,
    end: 165,
    scale: [1.03, 1.11],
    x: [0, -18],
    y: [0, 8],
    kicker: "A world without memory",
    copy: "一眼，让荒原开始呼吸。",
  },
  {
    src: "keyframes/02-gaze-beam.png",
    start: 135,
    end: 330,
    scale: [1.09, 1.18],
    x: [12, -22],
    y: [8, -4],
    kicker: "Focus is the only interface",
    copy: "凝视，不是观看，是创造。",
  },
  {
    src: "keyframes/03-first-bloom.png",
    start: 300,
    end: 510,
    scale: [1.1, 1.22],
    x: [-26, 18],
    y: [6, -10],
    kicker: "Life answers your attention",
    copy: "绿意会记住你的停留。",
  },
  {
    src: "keyframes/04-forest-orbit.png",
    start: 480,
    end: 680,
    scale: [1.07, 1.16],
    x: [18, -12],
    y: [-4, 7],
    kicker: "Every path leaves a living trace",
    copy: "唤醒封印，引导水脉回归。",
  },
  {
    src: "keyframes/05-emerald-finale.png",
    start: 650,
    end: 840,
    scale: [1.04, 1.12],
    x: [-10, 15],
    y: [0, -8],
  },
];

const frameOpacity = (frame: number, start: number, end: number) => {
  return Math.min(
    interpolate(frame, [start, start + 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    interpolate(frame, [end - 28, end], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  );
};

const SceneLayer = ({ scene }: { scene: Scene }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [scene.start, scene.end], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const opacity = frameOpacity(frame, scene.start, scene.end);
  const scale = interpolate(progress, [0, 1], scene.scale);
  const x = interpolate(progress, [0, 1], scene.x);
  const y = interpolate(progress, [0, 1], scene.y);

  return (
    <AbsoluteFill style={{ opacity }}>
      <Img
        src={staticFile(scene.src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `translate(${x}px, ${y}px) scale(${scale})`,
          filter: "contrast(1.07) saturate(1.12)",
        }}
      />
    </AbsoluteFill>
  );
};

const Copy = ({ scene }: { scene: Scene }) => {
  const frame = useCurrentFrame();
  if (!scene.copy) return null;
  const opacity = frameOpacity(frame, scene.start + 28, scene.end - 18);
  const slide = interpolate(frame, [scene.start + 30, scene.start + 62], [22, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 86,
        bottom: 88,
        width: 760,
        opacity,
        transform: `translateY(${slide}px)`,
      }}
    >
      <div
        style={{
          fontFamily: "Inter, Helvetica, Arial, sans-serif",
          color: "rgba(177,255,216,.72)",
          fontSize: 18,
          letterSpacing: 0,
          textTransform: "uppercase",
          marginBottom: 16,
        }}
      >
        {scene.kicker}
      </div>
      <div
        style={{
          fontFamily: '"STHeiti", "PingFang SC", "Hiragino Sans GB", sans-serif',
          color: "#f1fff5",
          fontSize: 54,
          lineHeight: 1.18,
          fontWeight: 700,
          textShadow: "0 8px 36px rgba(0,0,0,.58), 0 0 30px rgba(82,255,180,.2)",
        }}
      >
        {scene.copy}
      </div>
      <div
        style={{
          width: 156,
          height: 2,
          marginTop: 24,
          background: "linear-gradient(90deg, #7dffc4, #fff0a3, transparent)",
          boxShadow: "0 0 22px rgba(116,255,194,.65)",
        }}
      />
    </div>
  );
};

const TitleCard = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [8, 38, 120, 160], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [8, 48], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 86,
        top: 86,
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          fontFamily: '"STHeiti", "PingFang SC", "Hiragino Sans GB", sans-serif',
          color: "#f3fff7",
          fontSize: 88,
          fontWeight: 800,
          letterSpacing: 0,
          textShadow: "0 10px 42px rgba(0,0,0,.66), 0 0 42px rgba(93,255,188,.24)",
        }}
      >
        翠眸之境
      </div>
      <div
        style={{
          marginTop: 8,
          color: "rgba(199,255,228,.74)",
          fontSize: 24,
          fontFamily: "Inter, Helvetica, Arial, sans-serif",
          letterSpacing: 0,
        }}
      >
        EMERALD PUPIL'S REALM
      </div>
    </div>
  );
};

const Finale = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [680, 730, 825, 840], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(frame, [680, 790], [0.96, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          color: "#f2fff6",
          fontSize: 86,
          fontWeight: 800,
          letterSpacing: 0,
          fontFamily: '"STHeiti", "PingFang SC", "Hiragino Sans GB", sans-serif',
          textShadow: "0 10px 48px rgba(0,0,0,.7), 0 0 36px rgba(116,255,194,.28)",
        }}
      >
        翠眸之境
      </div>
      <div
        style={{
          marginTop: 18,
          color: "#a8ffd1",
          fontSize: 25,
          fontFamily: "Inter, Helvetica, Arial, sans-serif",
          letterSpacing: 0,
        }}
      >
        PLAYABLE PROTOTYPE · OBSERVATION CREATES LIFE
      </div>
    </AbsoluteFill>
  );
};

const Atmosphere = () => {
  const frame = useCurrentFrame();
  const pulse = interpolate(Math.sin(frame / 28), [-1, 1], [0.18, 0.38]);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 52% 58%, rgba(98,255,181,.18), transparent 32%), radial-gradient(circle at 50% 50%, transparent 48%, rgba(0,8,5,.72) 100%)",
          mixBlendMode: "screen",
          opacity: pulse,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,.18), transparent 26%, transparent 70%, rgba(0,0,0,.32)), linear-gradient(90deg, rgba(0,0,0,.24), transparent 24%, transparent 76%, rgba(0,0,0,.26))",
        }}
      />
    </AbsoluteFill>
  );
};

export const EmeraldLandscape = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fadeOut = interpolate(frame, [durationInFrames - 42, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#06100b" }}>
      <Audio src={staticFile("audio/emerald-ambient.wav")} volume={0.55} />
      {scenes.map((scene) => (
        <SceneLayer key={scene.src} scene={scene} />
      ))}
      <Atmosphere />
      {scenes.map((scene) => (
        <Copy key={`${scene.src}-copy`} scene={scene} />
      ))}
      <TitleCard />
      <Finale />
      <AbsoluteFill style={{ backgroundColor: "#020503", opacity: fadeOut }} />
    </AbsoluteFill>
  );
};
