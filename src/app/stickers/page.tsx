import FantasyFooter from "@/components/FantasyFooter";
import Navbar from "@/components/Navbar";
import OfflineMediaCaching from "@/components/OfflineMediaCaching";

const STICKER_VIDEO_SRC = "/video/test_video.mp4?v=1";

export default function StickersPage() {
  return (
    <div className="fantasy-page">
      <Navbar />

      <main className="w-full">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="block h-auto w-full"
        >
          <source src={STICKER_VIDEO_SRC} type="video/mp4" />
        </video>
        <OfflineMediaCaching src={STICKER_VIDEO_SRC} />
      </main>

      <FantasyFooter />
    </div>
  );
}
