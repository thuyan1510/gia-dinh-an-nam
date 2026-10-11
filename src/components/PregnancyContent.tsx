import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Fragment, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { pregnancyImageSources } from "../data/pregnancy/imageSources";
import imageInfo from "../data/pregnancy/images.json";
import { pregnancyArticles, type PregnancyArticle } from "../data/pregnancy";
import { articleLinkTarget, plainArticleText } from "../lib/pregnancy";

export const pregnancyColors = {
  ink: "#342D32",
  muted: "#827378",
  pink: "#DB607F",
  soft: "#FFF0F2",
  peach: "#FFE7D7",
  border: "#EFE8E7",
  background: "#FFFBF9",
};
export function openPregnancyArticle(id: string) {
  router.push({ pathname: "/pregnancy/article/[id]", params: { id } });
}
export function PregnancyImage({
  imageKey,
  label,
  height,
  zoom = true,
}: {
  imageKey?: string;
  label: string;
  height?: number;
  zoom?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { width } = useWindowDimensions();
  const info = imageKey
    ? (imageInfo as Record<string, { width: number; height: number }>)[imageKey]
    : null;
  const source = imageKey ? pregnancyImageSources[imageKey] : undefined;
  if (!source || !info)
    return (
      <View style={[p.placeholder, { height: height ?? 180 }]}>
        <MaterialCommunityIcons name="mother-heart" color="#D8A393" size={64} />
        <Text style={[p.muted, { textAlign: "center", marginTop: 10 }]}>
          Bài này không kèm hình minh họa
        </Text>
      </View>
    );
  if (!zoom)
    return (
      <View
        style={{
          width: "100%",
          ...(height ? { height } : { aspectRatio: info.width / info.height }),
        }}
      >
        <Image
          source={source}
          accessibilityLabel={label}
          resizeMode="contain"
          style={p.framedImage}
        />
      </View>
    );
  return (
    <>
      <Pressable
        disabled={!zoom}
        accessibilityRole="button"
        accessibilityLabel={`Phóng to ảnh: ${label}`}
        onPress={() => setOpen(true)}
        style={{
          width: "100%",
          ...(height ? { height } : { aspectRatio: info.width / info.height }),
        }}
      >
        <Image
          source={source}
          accessibilityLabel={label}
          resizeMode="contain"
          style={p.framedImage}
        />
      </Pressable>
      <Modal
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#191719" }}>
          <Pressable
            accessibilityLabel="Đóng ảnh"
            onPress={() => setOpen(false)}
            style={{ padding: 18, alignSelf: "flex-end" }}
          >
            <Ionicons name="close" color="white" size={28} />
          </Pressable>
          <ScrollView
            maximumZoomScale={4}
            minimumZoomScale={1}
            centerContent
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          >
            <Image
              source={source}
              resizeMode="contain"
              style={{ width, height: (width * info.height) / info.width }}
            />
          </ScrollView>
          <Text style={{ color: "white", textAlign: "center", padding: 16 }}>
            {label}
          </Text>
        </SafeAreaView>
      </Modal>
    </>
  );
}
export function PregnancyArticleRow({
  article,
}: {
  article: PregnancyArticle;
}) {
  const source = article.images[0]
    ? pregnancyImageSources[article.images[0]]
    : null;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => openPregnancyArticle(article.id)}
      style={p.articleRow}
    >
      {source ? (
        <Image source={source} resizeMode="contain" style={p.thumbnail} />
      ) : (
        <View style={[p.thumbnail, p.placeholder]}>
          <MaterialCommunityIcons
            name="baby-face-outline"
            size={30}
            color="#C99183"
          />
        </View>
      )}
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={p.rowTitle}>{article.title}</Text>
        <Text numberOfLines={2} style={p.muted}>
          {plainArticleText(article.body)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" color="#BAAFB1" size={18} />
    </Pressable>
  );
}
function onArticleLink(url: string) {
  const target = articleLinkTarget(url);
  if (target?.kind === "article") {
    if (pregnancyArticles.some((a) => a.id === target.id))
      openPregnancyArticle(target.id);
    else
      Alert.alert(
        "Chưa có bài này trong bộ ngoại tuyến",
        "Liên kết trỏ tới một bài chưa nằm trong dữ liệu bạn cung cấp. App không kết nối tới Flo.",
      );
  } else if (target?.kind === "external") {
    Alert.alert(
      "Mở tài liệu nguồn?",
      "Liên kết này cần Internet và sẽ mở trong trình duyệt.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Mở",
          onPress: () => {
            void Linking.openURL(target.url).catch(() =>
              Alert.alert("Không mở được liên kết"),
            );
          },
        },
      ],
    );
  } else
    Alert.alert(
      "Không có nội dung ngoại tuyến",
      "App không mở các dịch vụ hoặc liên kết của Flo.",
    );
}
function inline(text: string, depth = 0): React.ReactNode {
  if (depth > 3) return text;
  const parts = text.split(
    /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|__[^_]+__|_[^_]+_|\*[^*]+\*)/g,
  );
  return parts.map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link)
      return (
        <Text
          key={index}
          accessibilityRole="link"
          style={{ color: "#BE5070", textDecorationLine: "underline" }}
          onPress={() => onArticleLink(link[2]!)}
        >
          {inline(link[1]!, depth + 1)}
        </Text>
      );
    if (/^(\*\*|__)/.test(part))
      return (
        <Text key={index} style={{ fontWeight: "700" }}>
          {part.slice(2, -2)}
        </Text>
      );
    if (/^_[^_]+_$|^\*[^*]+\*$/.test(part))
      return (
        <Text key={index} style={{ fontStyle: "italic" }}>
          {part.slice(1, -1)}
        </Text>
      );
    return <Fragment key={index}>{part}</Fragment>;
  });
}
/** Native text only: no WebView, remote image loading, HTML or script execution. */
export function PregnancyArticleText({ text }: { text: string }) {
  return (
    <View style={{ gap: 18 }}>
      {text
        .split(/\n\s*\n/)
        .filter(Boolean)
        .map((paragraph, i) => (
          <Text
            key={i}
            selectable
            style={[
              p.body,
              /^#{1,3}\s/.test(paragraph) && {
                fontWeight: "700",
                fontSize: 20,
              },
            ]}
          >
            {inline(
              paragraph.replace(/^#{1,3}\s/, "").replace(/^[-*] /gm, "• "),
            )}
          </Text>
        ))}
    </View>
  );
}
export const p = StyleSheet.create({
  framedImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  root: { backgroundColor: pregnancyColors.background, flex: 1 },
  title: {
    color: pregnancyColors.ink,
    fontSize: 23,
    fontWeight: "700",
    lineHeight: 31,
  },
  heading: {
    color: pregnancyColors.ink,
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 26,
  },
  muted: { color: pregnancyColors.muted, fontSize: 13, lineHeight: 19 },
  body: { fontSize: 17, lineHeight: 28, color: "#464047" },
  rowTitle: {
    color: pregnancyColors.ink,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: pregnancyColors.border,
    gap: 14,
  },
  articleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: pregnancyColors.border,
  },
  thumbnail: {
    width: 72,
    height: 82,
    borderRadius: 12,
    backgroundColor: "#FAF1EC",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FBECE5",
    borderRadius: 20,
  },
  pill: {
    minHeight: 42,
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 22,
    backgroundColor: "#F6EFED",
    alignItems: "center",
    justifyContent: "center",
  },
  pillSelected: { backgroundColor: pregnancyColors.pink },
  pillText: { color: "#69565E", fontWeight: "600", fontSize: 14 },
  action: {
    minHeight: 48,
    backgroundColor: pregnancyColors.pink,
    borderRadius: 24,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { color: "white", fontWeight: "700", fontSize: 16 },
});
