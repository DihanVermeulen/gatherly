import { useRef, useState } from "react";
import { Dimensions, FlatList, View } from "react-native";
import { router } from "expo-router";
import { ArrowRight, Gift } from "lucide-react-native";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "@/components/ui/pressable";
import { Icon } from "@/components/ui/icon";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    id: "1",
    title: "Welcome to Gatherly",
    subtitle: "Simplified gift exchanges for every occasion.",
    body: "Organize Secret Santas, birthdays, and group events without the stress. We handle the draws, you enjoy the party.",
  },
  {
    id: "2",
    title: "Connect with Friends",
    subtitle: "Keep everyone on the same page.",
    body: "Share wishlists, coordinate gifts, and make every celebration special.",
  },
  {
    id: "3",
    title: "Start Your First Event",
    subtitle: "It only takes a minute.",
    body: "Create an event, invite your people, and let Gatherly handle the rest.",
  },
];

export default function WelcomeScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);

  const handleScroll = (event: {
    nativeEvent: {
      contentOffset: { x: number };
      layoutMeasurement: { width: number };
    };
  }) => {
    const index = Math.round(
      event.nativeEvent.contentOffset.x /
        event.nativeEvent.layoutMeasurement.width,
    );
    setActiveIndex(index);
  };

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={{ width: SCREEN_WIDTH }} className="flex-1 px-6">
      {/* Illustration area */}
      <View className="flex-1 items-center justify-center">
        <View
          className="w-48 h-48 rounded-3xl items-center justify-center mb-8"
          style={{ backgroundColor: "#ccfbf1" }}
        >
          <Icon
            as={Gift}
            size="xl"
            style={{ color: "#0d9488", width: 72, height: 72 }}
          />
        </View>

        {/* Title */}
        <Heading
          size="2xl"
          className="text-typography-900 font-bold text-center mb-3"
        >
          {item.title}
        </Heading>

        {/* Subtitle */}
        <Text
          className="text-base font-semibold text-center mb-4"
          style={{ color: "#0d9488" }}
        >
          {item.subtitle}
        </Text>

        {/* Body */}
        <Text className="text-sm text-typography-500 text-center leading-6 px-2">
          {item.body}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background-0" edges={["bottom"]}>
      <View className="flex-1">
        {/* Carousel */}
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderSlide}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          getItemLayout={(_data, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          style={{ flex: 1 }}
        />

        {/* Dot indicators */}
        <HStack className="justify-center items-center gap-2 py-6">
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={{
                width: activeIndex === index ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: activeIndex === index ? "#0d9488" : "#cbd5e1",
              }}
            />
          ))}
        </HStack>

        {/* Bottom CTA section */}
        <VStack className="px-6 pb-8 gap-4">
          {/* Get Started button */}
          <Button
            onPress={() => router.push("/register")}
            className="rounded-2xl w-full"
            style={{ backgroundColor: "#0d9488" }}
          >
            <ButtonText className="text-white font-bold text-base mr-2">
              Get Started
            </ButtonText>
            <Icon as={ArrowRight} size="sm" style={{ color: "white" }} />
          </Button>

          {/* Log In link */}
          <HStack className="justify-center items-center gap-1">
            <Text className="text-typography-500 text-sm">
              Already have an account?
            </Text>
            <Pressable
              onPress={() => router.push("/sign-in")}
              className="active:opacity-70"
            >
              <Text
                className="text-sm font-semibold"
                style={{ color: "#0d9488" }}
              >
                Log In
              </Text>
            </Pressable>
          </HStack>
        </VStack>
      </View>
    </SafeAreaView>
  );
}
