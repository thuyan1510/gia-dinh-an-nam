import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../../src/components/ui";
import { poems } from "../../../src/data/education/poems";
export default function PoemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const poem = poems.find((p) => p.id === id);
  const [size, setSize] = useState(21);
  return (
    <Screen contentStyle={s.screen}>
      <Stack.Screen
        options={{ title: "Đọc cho con nghe", headerBackTitle: "Thai giáo" }}
      />
      {!poem ? (
        <Text>Không tìm thấy bài thơ.</Text>
      ) : (
        <>
          <View style={s.heading}>
            <Ionicons name="flower-outline" size={40} color="#C8A77B" />
            <Text style={s.category}>{poem.category}</Text>
            <Text style={s.title}>{poem.title}</Text>
            <Text style={s.author}>{poem.author}</Text>
          </View>
          <View style={s.sizes}>
            {[18, 21, 25].map((v) => (
              <Pressable
                key={v}
                onPress={() => setSize(v)}
                accessibilityLabel={`Cỡ chữ ${v}`}
                accessibilityState={{ selected: size === v }}
                style={[s.size, size === v && { backgroundColor: "#E8DEED" }]}
              >
                <Text style={{ fontSize: v, color: "#8A7392" }}>Aa</Text>
              </Pressable>
            ))}
          </View>
          <Text
            selectable
            style={[
              s.verse,
              { fontSize: size, lineHeight: Math.round(size * 1.8) },
            ]}
          >
            {poem.text}
          </Text>
          <View style={s.source}>
            <Text style={s.author}>{poem.license}</Text>
            {poem.translation && (
              <Text style={s.author}>
                {poem.translation}
                {"\n"}Nguyên tác: {poem.original}
              </Text>
            )}
            <Pressable
              onPress={() =>
                void Linking.openURL(poem.source).catch(() =>
                  Alert.alert(
                    "Chưa mở được nguồn",
                    "Hãy kiểm tra kết nối mạng.",
                  ),
                )
              }
            >
              <Text style={s.link}>Xem nguồn sưu tầm ↗</Text>
            </Pressable>
          </View>
          <Text style={s.footer}>
            Chậm một chút, dịu một chút.{"\n"}Bé đang có cả thế giới thương yêu
            của bố mẹ.
          </Text>
        </>
      )}
    </Screen>
  );
}
const s = StyleSheet.create({
  screen: {
    backgroundColor: "#FFFCF6",
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 25,
  },
  heading: { alignItems: "center", gap: 13, paddingTop: 20 },
  category: { color: "#BBA37D", fontSize: 12, letterSpacing: 2 },
  title: {
    fontSize: 29,
    lineHeight: 38,
    textAlign: "center",
    fontFamily: "QuicksandSemiBold",
    color: "#6E584C",
  },
  author: {
    fontSize: 12,
    lineHeight: 20,
    color: "#A3958D",
    textAlign: "center",
  },
  sizes: { flexDirection: "row", justifyContent: "center", gap: 10 },
  size: {
    width: 50,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: "#F5EEE6",
  },
  verse: {
    fontFamily: "QuicksandSemiBold",
    color: "#77685C",
    textAlign: "center",
    paddingVertical: 24,
  },
  source: {
    padding: 18,
    gap: 12,
    backgroundColor: "#F7F1E9",
    borderRadius: 20,
  },
  link: { textAlign: "center", fontSize: 13, color: "#A17DB0", padding: 8 },
  footer: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 22,
    color: "#B5A796",
  },
});
