import Nav from "./Nav";
import StoryScene from "./StoryScene";
import { CHAPTERS } from "@/lib/story";

export default function Story() {
  // the scroll ruler: one viewport-ish step per scene, read against the real document height in JS
  return (
    <div className="relative" style={{ height: `${CHAPTERS.length * 80}vh` }}>
      <Nav />
      <StoryScene />
    </div>
  );
}
