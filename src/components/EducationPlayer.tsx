import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEducationAudio } from "../providers/EducationAudioProvider";
export function musicTime(seconds: number) {
  const value = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}
export function EducationPlayer() {
  const {
    track,
    stop: onClose,
    toggle,
    isPlaying,
    status,
    error,
    currentTime,
    duration,
    seek,
    repeat,
    setRepeat,
    timer,
    toggleTimer,
    message,
    setMessage,
  } = useEducationAudio();
  const [credits, setCredits] = useState(false);
  const [width, setWidth] = useState(1);
  if (!track) return null;
  return (
    <View style={s.card} testID="education-player">
      <View style={s.row}>
        <Ionicons name="musical-notes" color="#477E70" size={28} />
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{track.title}</Text>
          <Text style={s.meta}>{track.composer}</Text>
        </View>
        <Pressable
          onPress={onClose}
          accessibilityLabel="Đóng trình phát"
          style={s.touch}
        >
          <Ionicons name="close" size={23} color="#617E74" />
        </Pressable>
      </View>
      <Text style={s.meta}>{track.work}</Text>
      <Pressable
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onPress={(e) => seek((e.nativeEvent.locationX / width) * duration)}
        accessibilityRole="adjustable"
        accessibilityLabel="Tiến độ bản nhạc"
        accessibilityValue={{
          min: 0,
          max: Math.round(duration),
          now: Math.round(currentTime),
        }}
        accessibilityActions={[
          { name: "increment", label: "Tiến 15 giây" },
          { name: "decrement", label: "Lùi 15 giây" },
        ]}
        onAccessibilityAction={(e) =>
          seek(
            currentTime + (e.nativeEvent.actionName === "increment" ? 15 : -15),
          )
        }
        style={s.seekTouch}
      >
        <View style={s.track}>
          <View
            style={[
              s.fill,
              { width: `${Math.min(100, (currentTime / duration) * 100)}%` },
            ]}
          />
        </View>
      </Pressable>
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <Text style={s.meta}>{musicTime(currentTime)}</Text>
        <Text style={s.meta}>{musicTime(duration)}</Text>
      </View>
      <View style={[s.row, { justifyContent: "center", gap: 24 }]}>
        <Pressable
          accessibilityLabel="Lùi 15 giây"
          onPress={() => seek(currentTime - 15)}
          style={s.touch}
        >
          <Ionicons name="play-back" size={22} color="#477E70" />
          <Text style={s.meta}>15s</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={isPlaying ? "Tạm dừng" : "Phát nhạc"}
          onPress={toggle}
          disabled={status === "loading"}
          style={s.play}
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={30}
            color="#fff"
          />
        </Pressable>
        <Pressable
          accessibilityLabel="Tiến 15 giây"
          onPress={() => seek(currentTime + 15)}
          style={s.touch}
        >
          <Ionicons name="play-forward" size={22} color="#477E70" />
          <Text style={s.meta}>15s</Text>
        </Pressable>
      </View>
      {status === "loading" && (
        <Text style={s.meta}>Đang mở bản nhạc trên máy…</Text>
      )}
      {(error || status === "error") && (
        <Text style={s.meta}>
          Chưa phát được tệp âm thanh. Đóng trình phát và thử lại.
        </Text>
      )}
      {!!message && <Text style={s.meta}>{message}</Text>}
      <View style={[s.row, { flexWrap: "wrap" }]}>
        <Pressable
          accessibilityState={{ selected: repeat }}
          onPress={() => setRepeat(!repeat)}
          style={[s.pill, repeat && s.chosen]}
        >
          <Text style={s.meta}>↻ Lặp lại {repeat ? "· Bật" : ""}</Text>
        </Pressable>
        <Pressable
          accessibilityState={{ selected: timer }}
          onPress={toggleTimer}
          style={[s.pill, timer && s.chosen]}
        >
          <Text style={s.meta}>
            {timer ? "✓ Sẽ dừng sau 15 phút" : "Hẹn dừng 15 phút"}
          </Text>
        </Pressable>
      </View>
      <Pressable onPress={() => setCredits(!credits)} style={s.touch}>
        <Text style={s.meta}>Nguồn & bản quyền {credits ? "⌃" : "⌄"}</Text>
      </Pressable>
      {credits && (
        <View style={{ gap: 8 }}>
          <Text style={s.meta}>
            {track.performer}
            {"\n"}
            {track.license}
            {"\n"}
            {track.changes}
            {"\n"}Tên tiếng Việt là nhãn gợi ý tâm trạng do An Nam đặt.
          </Text>
          {[
            ["Bản thu gốc", track.source],
            ["Nghệ sĩ / đơn vị thu", track.creditUrl],
            ["Giấy phép", track.licenseUrl],
          ].map(([label, url]) => (
            <Pressable
              key={label}
              onPress={() =>
                void Linking.openURL(url!).catch(() =>
                  setMessage(
                    "Không mở được liên kết. Hãy kiểm tra kết nối mạng.",
                  ),
                )
              }
            >
              <Text style={s.link}>{label} ↗</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Text style={s.meta}>
        Nhạc tiếp tục khi chuyển màn hình hoặc khóa máy. Nhấn đóng để dừng hẳn.
      </Text>
    </View>
  );
}
const s = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 24,
    backgroundColor: "#EAF4EB",
    gap: 10,
  },
  row: { flexDirection: "row", gap: 12, alignItems: "center" },
  title: { fontFamily: "QuicksandSemiBold", fontSize: 19, color: "#315C50" },
  meta: { fontSize: 12, lineHeight: 19, color: "#617E74" },
  touch: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  play: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#548B78",
    alignItems: "center",
    justifyContent: "center",
  },
  track: {
    height: 5,
    borderRadius: 4,
    backgroundColor: "#D3E3D5",
    overflow: "hidden",
  },
  seekTouch: { paddingTop: 16, paddingBottom: 8 },
  fill: { height: 5, backgroundColor: "#548B78" },
  pill: { padding: 12, borderRadius: 20, backgroundColor: "#F9FCF8" },
  chosen: { backgroundColor: "#CCDCCA" },
  link: { color: "#3E7967", fontSize: 13, paddingVertical: 5 },
});
