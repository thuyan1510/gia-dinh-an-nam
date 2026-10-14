import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, Stack } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../src/components/ui";
import { FormInput } from "../../src/components/FormInput";
import {
  EducationPlayer,
  musicTime,
} from "../../src/components/EducationPlayer";
import { poems, poemCategories } from "../../src/data/education/poems";
import tracks from "../../src/data/education/music.json";
import icons from "../../src/data/handbookImageSources.json";
import { useEducationAudio } from "../../src/providers/EducationAudioProvider";
const FAVORITES = "education-poems-v1";
export default function EducationScreen() {
  const [tab, setTab] = useState<"poems" | "music">("poems");
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("Tất cả"),
    [onlySaved, setOnlySaved] = useState(false);
  const [saved, setSaved] = useState<string[]>([]),
    [ready, setReady] = useState(false);
  const { track, start } = useEducationAudio();
  const trackId = track?.id;
  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(FAVORITES)
      .then((v) => {
        const list = JSON.parse(v ?? "[]");
        if (alive)
          setSaved(
            Array.isArray(list)
              ? list.filter((id) => typeof id === "string")
              : [],
          );
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  const favorite = async (id: string) => {
    const next = saved.includes(id)
      ? saved.filter((v) => v !== id)
      : [...saved, id];
    setSaved(next);
    try {
      await AsyncStorage.setItem(FAVORITES, JSON.stringify(next));
    } catch {
      Alert.alert(
        "Chưa lưu được",
        "Máy chưa ghi được danh sách yêu thích. Hãy thử lại.",
      );
    }
  };
  const normalize = (v: string) =>
    v
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");
  const filtered = poems.filter(
    (p) =>
      (category === "Tất cả" || p.category === category) &&
      (!onlySaved || saved.includes(p.id)) &&
      normalize(p.title + " " + p.text).includes(normalize(query.trim())),
  );
  return (
    <Screen contentStyle={s.screen}>
      <Stack.Screen
        options={{ title: "Thai giáo", headerBackTitle: "Em bé" }}
      />
      <View style={s.hero}>
        <View style={s.spark}>
          <Ionicons name="sparkles-outline" color="#C79952" size={20} />
        </View>
        <Image source={icons["18"]} style={s.heroIcon} />
        <Text style={s.eyebrow}>KHOẢNH KHẮC CỦA MẸ & BÉ</Text>
        <Text style={s.heroTitle}>Yêu con từ những{"\n"}điều thật nhỏ</Text>
        <Text style={s.subtitle}>
          Một bài thơ, một giai điệu.{"\n"}Bố mẹ cùng dành thời gian bên con.
        </Text>
      </View>
      <View style={s.tabs}>
        {(
          [
            {
              id: "poems",
              title: `Thơ · ${poems.length}`,
              icon: "book-outline",
            },
            {
              id: "music",
              title: `Nhạc · ${tracks.length}`,
              icon: "musical-notes-outline",
            },
          ] as const
        ).map((t) => (
          <Pressable
            key={t.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.id }}
            onPress={() => {
              setTab(t.id);
            }}
            style={[s.tab, tab === t.id && s.activeTab]}
          >
            <Ionicons
              name={t.icon}
              size={20}
              color={tab === t.id ? "#7856A6" : "#A296AD"}
            />
            <Text style={[s.tabLabel, tab === t.id && { color: "#7856A6" }]}>
              {t.title}
            </Text>
          </Pressable>
        ))}
      </View>
      {track && <EducationPlayer key={track.id} />}
      {tab === "poems" ? (
        <>
          <View style={s.search}>
            <Ionicons name="search-outline" size={20} color="#A296AD" />
            <FormInput
              placeholder="Tìm bài thơ cho bé…"
              accessibilityLabel="Tìm bài thơ"
              value={query}
              onChangeText={setQuery}
              style={s.input}
            />
            <Pressable
              accessibilityLabel="Thơ yêu thích"
              accessibilityState={{ selected: onlySaved }}
              onPress={() => setOnlySaved(!onlySaved)}
              style={s.touch}
            >
              <Ionicons
                name={onlySaved ? "heart" : "heart-outline"}
                size={23}
                color="#CA829B"
              />
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filters}
          >
            {poemCategories.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={[s.chip, category === c && s.activeChip]}
              >
                <Text
                  style={{
                    color: category === c ? "#79599B" : "#8E8499",
                    fontSize: 13,
                  }}
                >
                  {c}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={s.section}>
            <Text style={s.sectionTitle}>Đọc chậm, thương thật lâu</Text>
            <Text style={s.small}>{filtered.length} bài · đọc ngoại tuyến</Text>
          </View>
          {filtered.map((p, i) => (
            <View key={p.id} style={s.poem}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/pregnancy/poem/[id]",
                    params: { id: p.id },
                  })
                }
                style={s.poemMain}
                accessibilityLabel={`Đọc ${p.title}`}
              >
                <View
                  style={[
                    s.badge,
                    {
                      backgroundColor: ["#F9EBD9", "#EAF1E6", "#F1E6F6"][i % 3],
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      p.category === "Thiên nhiên"
                        ? "leaf-outline"
                        : p.category === "Vui chơi"
                          ? "sunny-outline"
                          : "flower-outline"
                    }
                    size={25}
                    color={["#C29A65", "#86A17B", "#AE8FBF"][i % 3]}
                  />
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={s.poemTitle}>{p.title}</Text>
                  <Text numberOfLines={1} style={s.small}>
                    {p.text.split("\n")[0]}
                  </Text>
                  <Text style={s.category}>
                    {p.category} · {p.author}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                disabled={!ready}
                onPress={() => void favorite(p.id)}
                accessibilityLabel={`${saved.includes(p.id) ? "Bỏ lưu" : "Lưu"} ${p.title}`}
                style={s.touch}
              >
                <Ionicons
                  name={saved.includes(p.id) ? "heart" : "heart-outline"}
                  size={22}
                  color="#CA829B"
                />
              </Pressable>
            </View>
          ))}
          {!filtered.length && (
            <Text style={s.empty}>
              Chưa có bài phù hợp. Thử đổi chủ đề hoặc bỏ bộ lọc yêu thích nhé.
            </Text>
          )}
          <Text style={s.note}>
            40 bài thơ từ tuyển tập của gia đình. Nội dung, tác giả và nguồn
            được giữ theo tệp gốc, có thể đọc khi không có mạng.
          </Text>
        </>
      ) : (
        <>
          <View style={s.section}>
            <Text style={s.sectionTitle}>Giai điệu cho phút bình yên</Text>
            <Text style={s.small}>10 bản nhạc · đã tải sẵn trong app</Text>
          </View>
          {tracks.map((t, i) => (
            <Pressable
              key={t.id}
              accessibilityLabel={`Nghe ${t.title}`}
              onPress={() => start(t.id)}
              style={[
                s.music,
                trackId === t.id && { backgroundColor: "#EFF6EE" },
              ]}
            >
              <View style={s.musicNumber}>
                <Text style={s.musicDigit}>
                  {String(i + 1).padStart(2, "0")}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.poemTitle}>{t.title}</Text>
                <Text style={s.small}>
                  {t.composer} · {musicTime(t.duration)}
                </Text>
                <Text style={s.category}>{t.work}</Text>
              </View>
              <Ionicons
                name={
                  trackId === t.id ? "musical-notes" : "play-circle-outline"
                }
                size={29}
                color="#7E9C87"
              />
            </Pressable>
          ))}
          <Text style={s.note}>
            Nghe bằng loa ở mức âm lượng dễ chịu cho mẹ; không đặt tai nghe hoặc
            loa sát bụng. Có thể dừng bất cứ lúc nào. Âm nhạc là hoạt động thư
            giãn, không được quảng cáo là làm tăng trí thông minh của thai nhi.
          </Text>
        </>
      )}
      <Text style={s.footer}>
        Đọc bằng giọng của bố mẹ đã là một điều đáng yêu ♡
      </Text>
    </Screen>
  );
}
const s = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 30,
    gap: 0,
    backgroundColor: "#FFFCF8",
  },
  hero: {
    padding: 26,
    paddingTop: 24,
    alignItems: "center",
    backgroundColor: "#F8F0E4",
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  spark: { position: "absolute", right: 40, top: 35 },
  heroIcon: { width: 72, height: 72, marginBottom: 12 },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    color: "#AC8F6E",
    fontFamily: "QuicksandSemiBold",
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 39,
    fontFamily: "QuicksandSemiBold",
    textAlign: "center",
    color: "#685247",
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 23,
    color: "#9E8B7A",
    textAlign: "center",
    marginTop: 12,
  },
  tabs: {
    flexDirection: "row",
    margin: 20,
    padding: 5,
    borderRadius: 19,
    backgroundColor: "#F1ECF4",
  },
  tab: {
    flex: 1,
    minHeight: 49,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 15,
  },
  activeTab: { backgroundColor: "#fff" },
  tabLabel: { fontFamily: "QuicksandSemiBold", fontSize: 17, color: "#A296AD" },
  search: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    paddingLeft: 15,
    borderWidth: 1,
    borderColor: "#EBE4ED",
    borderRadius: 15,
    backgroundColor: "#fff",
  },
  input: { flex: 1, minWidth: 0, padding: 12, fontSize: 14 },
  touch: {
    width: 46,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  filters: { gap: 8, padding: 20, paddingBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 20,
    backgroundColor: "#F7F2ED",
  },
  activeChip: { backgroundColor: "#EEE5F3" },
  section: { padding: 20, gap: 5 },
  sectionTitle: {
    fontSize: 19,
    fontFamily: "QuicksandSemiBold",
    color: "#65576D",
  },
  small: { fontSize: 12, lineHeight: 19, color: "#9C91A2" },
  poem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#F1EBE6",
  },
  poemMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  badge: {
    width: 48,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  poemTitle: {
    fontFamily: "QuicksandSemiBold",
    fontSize: 16,
    lineHeight: 23,
    color: "#65576D",
  },
  category: { fontSize: 10, lineHeight: 16, color: "#BAA9B6" },
  empty: { padding: 24, color: "#9C91A2", lineHeight: 23 },
  note: {
    margin: 20,
    padding: 17,
    borderRadius: 18,
    backgroundColor: "#F4F1EC",
    fontSize: 12,
    lineHeight: 21,
    color: "#9B8C7D",
  },
  footer: {
    fontSize: 12,
    textAlign: "center",
    color: "#B8A797",
    marginHorizontal: 25,
    lineHeight: 21,
  },
  music: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    marginHorizontal: 20,
    paddingVertical: 18,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: "#F0EBE4",
    borderRadius: 14,
  },
  musicNumber: {
    width: 39,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#EFF3E8",
  },
  musicDigit: {
    fontFamily: "QuicksandSemiBold",
    color: "#9BA98D",
    fontSize: 16,
  },
});
