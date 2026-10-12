import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { pregnancyModelSources } from "../data/pregnancy/modelSources";

export function PregnancyHero({
  source,
  week,
}: {
  source: ImageSourcePropType;
  week: number;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient
            id="pregnancy-glow"
            cx="50%"
            cy="48%"
            rx="50%"
            ry="50%"
          >
            <Stop offset="0" stopColor="#FFF9EC" stopOpacity="0.8" />
            <Stop offset="0.55" stopColor="#FFF1DD" stopOpacity="0.4" />
            <Stop offset="1" stopColor="#FFF1DD" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#pregnancy-glow)" />
      </Svg>
      <Image
        source={pregnancyModelSources[week] || source}
        resizeMode="contain"
        style={{ width: "100%", height: "100%" }}
      />
    </View>
  );
}
