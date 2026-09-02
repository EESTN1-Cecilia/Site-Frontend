import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

export default function ProposalCard({
  title,
  text,
  image,
  course,
  index,
  styles,
}) {
  const [hovered, setHovered] = useState(false);
  const [hoveredCourse, setHoveredCourse] = useState(null);
  const [coursesHeight, setCoursesHeight] = useState(0);

  return (
    <Pressable
      style={styles.card}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ver cursos`}
    >
      <Image
        source={image}
        style={[styles.cardImage, hovered && styles.cardImageHovered]}
        resizeMode="cover"
      />
      <View style={styles.cardShade} />
      <View
        style={[
          styles.cardContent,
          hovered && { transform: [{ translateY: -(coursesHeight + 18) }] },
        ]}
      >
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardText}>{text}</Text>
      </View>
      <View
        style={[styles.cardCourses, hovered && styles.cardCoursesHovered]}
        onLayout={(event) => setCoursesHeight(event.nativeEvent.layout.height)}
      >
        <Text style={styles.cardCoursesTitle}>{course.eyebrow}</Text>
        <View style={styles.cardCourseList}>
          {course.items.map((item) => {
            const [label, url] = Array.isArray(item) ? item : [item, null];

            return (
              <Pressable
                style={[
                  styles.cardCourse,
                  hoveredCourse === label && styles.cardCourseHovered,
                ]}
                key={label}
                accessibilityRole={url ? "link" : "text"}
                onMouseEnter={() => setHoveredCourse(label)}
                onMouseLeave={() => setHoveredCourse(null)}
                onPress={() =>
                  url && window.open(url, "_blank", "noopener,noreferrer")
                }
              >
                <Text style={styles.cardCourseText}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Pressable>
  );
}
