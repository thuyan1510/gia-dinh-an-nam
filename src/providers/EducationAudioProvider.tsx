import {
  createContext,
  memo,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEvent } from "expo";
import { useVideoPlayer, VideoView, type VideoPlayer } from "expo-video";
import tracks from "../data/education/music.json";
import { musicAssets } from "../data/education/musicAssets";
import { educationMusicSource } from "../lib/educationMusic";

type Track = (typeof tracks)[number];
function usePlayback() {
  // Owned by the root, never by a route or the music/poems tab.
  const player = useVideoPlayer(null, (p) => {
    p.staysActiveInBackground = true;
    p.showNowPlayingNotification = true;
    p.keepScreenOnWhilePlaying = false;
    p.audioMixingMode = "doNotMix";
    p.timeUpdateEventInterval = 1;
  });
  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [message, setMessage] = useState("");
  const [repeat, setRepeat] = useState(false);
  const [deadline, setDeadline] = useState<number | null>(null);
  const request = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const { isPlaying } = useEvent(player, "playingChange", { isPlaying: false });
  const { status, error } = useEvent(player, "statusChange", {
    status: player.status,
  });
  const { currentTime } = useEvent(player, "timeUpdate", {
    currentTime: 0,
    bufferedPosition: 0,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
  });
  const duration = loading
    ? (track?.duration ?? 0)
    : player.duration || track?.duration || 0;
  const start = (id: string) => {
    const next = tracks.find((t) => t.id === id);
    if (!next) return;
    const version = ++request.current;
    player.pause();
    setTrack(next);
    setLoading(true);
    setLoadFailed(false);
    setMessage("");
    // Serialize native replacements so rapid taps cannot play an older request.
    queue.current = queue.current
      .catch(() => undefined)
      .then(async () => {
        if (version !== request.current) return;
        try {
          await player.replaceAsync(
            educationMusicSource(
              musicAssets[next.id],
              next.title,
              next.composer,
            ),
          );
          if (version !== request.current) return;
          player.play();
        } catch {
          if (version === request.current) {
            setLoadFailed(true);
            setMessage("Chưa mở được bản nhạc. Nhấn Phát nhạc để thử lại.");
          }
        } finally {
          if (version === request.current) setLoading(false);
        }
      });
  };
  const stop = () => {
    ++request.current;
    player.pause();
    setTrack(null);
    setDeadline(null);
    setLoading(false);
    setLoadFailed(false);
    setMessage("");
    // Clear lock-screen metadata too. Later starts are queued after this clear.
    queue.current = queue.current
      .catch(() => undefined)
      .then(() => player.replaceAsync(null))
      .catch(() => undefined);
  };
  const seek = (seconds: number) => {
    if (!loading && Number.isFinite(seconds))
      player.currentTime = Math.max(0, Math.min(duration, seconds));
  };
  const toggle = () => {
    if (!track || loading) return;
    if (isPlaying) player.pause();
    else if (loadFailed || status === "error" || status === "idle")
      start(track.id);
    else {
      if (player.currentTime >= duration - 0.5) seek(0);
      player.play();
    }
  };
  useEffect(() => {
    player.loop = repeat;
  }, [repeat, player]);
  useEffect(() => {
    if (deadline === null) return;
    const check = () => {
      if (Date.now() < deadline) return;
      player.pause();
      setDeadline(null);
      setMessage("Đã dừng theo hẹn giờ 15 phút.");
    };
    const timer = setTimeout(check, Math.max(0, deadline - Date.now()));
    // Background audio produces native progress events. Reconcile again on resume;
    // do not depend solely on a JS setTimeout while iOS suspends the app.
    const progress = player.addListener("timeUpdate", check);
    const state = AppState.addEventListener("change", (value) => {
      if (value === "active") check();
    });
    return () => {
      clearTimeout(timer);
      progress.remove();
      state.remove();
    };
  }, [deadline, player]);
  useEffect(
    () => () => {
      ++request.current;
    },
    [],
  );
  return {
    player,
    track,
    start,
    stop,
    toggle,
    seek,
    isPlaying,
    status: loading ? "loading" : loadFailed ? "error" : status,
    error,
    currentTime: loading ? 0 : currentTime,
    duration,
    repeat,
    setRepeat,
    message,
    setMessage,
    timer: deadline !== null,
    toggleTimer: () => {
      setMessage("");
      setDeadline((v) => (v === null ? Date.now() + 15 * 60 * 1000 : null));
    },
  };
}
const AudioContext = createContext<ReturnType<typeof usePlayback> | null>(null);
// The web player changes src imperatively. A progress-driven React rerender of
// VideoView would assign src again, interrupting play() with a new load request.
const AudioSurface = memo(function AudioSurface({
  player,
}: {
  player: VideoPlayer;
}) {
  return (
    <VideoView
      player={player}
      nativeControls={false}
      style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
      accessible={false}
      pointerEvents="none"
    />
  );
});
export function useEducationAudio() {
  const value = useContext(AudioContext);
  if (!value) throw new Error("EducationAudioProvider is missing");
  return value;
}
export function EducationAudioProvider({ children }: PropsWithChildren) {
  const audio = usePlayback();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  return (
    <AudioContext.Provider value={audio}>
      <View style={{ flex: 1 }}>
        {children}
        {/* Mount before the first tap: on web replaceAsync needs an attached media
            element. Stop clears its source rather than racing mount/unmount. */}
        <AudioSurface player={audio.player} />
        {audio.track && pathname !== "/pregnancy/education" && (
          <View
            testID="education-mini-player"
            style={[s.bar, { paddingBottom: Math.max(8, insets.bottom) }]}
          >
            <Pressable
              accessibilityLabel="Mở nhạc thai giáo"
              style={{ flex: 1 }}
              onPress={() => router.navigate("/pregnancy/education")}
            >
              <Text numberOfLines={1} style={s.title}>
                ♫ {audio.track.title}
              </Text>
              <Text style={s.meta}>
                {audio.status === "error"
                  ? "Chưa phát được · chạm để mở"
                  : audio.isPlaying
                    ? "Nhạc thai giáo đang phát"
                    : "Nhạc thai giáo · đã tạm dừng"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel={
                audio.isPlaying ? "Tạm dừng nhạc nền" : "Tiếp tục nhạc nền"
              }
              onPress={audio.toggle}
              style={s.touch}
              disabled={audio.status === "loading"}
            >
              <Ionicons
                name={audio.isPlaying ? "pause" : "play"}
                size={25}
                color="#477E70"
              />
            </Pressable>
            <Pressable
              accessibilityLabel="Dừng nhạc nền"
              onPress={audio.stop}
              style={s.touch}
            >
              <Ionicons name="close" size={25} color="#477E70" />
            </Pressable>
          </View>
        )}
      </View>
    </AudioContext.Provider>
  );
}
const s = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: "#D3E3D5",
    backgroundColor: "#F3F8F1",
  },
  title: { color: "#315C50", fontFamily: "QuicksandSemiBold", fontSize: 15 },
  meta: { color: "#617E74", fontSize: 11, marginTop: 3 },
  touch: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
