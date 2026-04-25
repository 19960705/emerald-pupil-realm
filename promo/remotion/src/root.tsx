import { Composition } from "remotion";
import { EmeraldLandscape } from "./video";

export const RemotionRoot = () => {
  return (
    <Composition
      id="EmeraldLandscape"
      component={EmeraldLandscape}
      durationInFrames={840}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
