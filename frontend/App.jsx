import { useRef, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import cicloBasicoImage from "./src/assets/images/Ciclo_Basico.png";
import informaticaImage from "./src/assets/images/Informatica.png";
import programacionImage from "./src/assets/images/Programacion.png";
import ProposalCard from "./src/components/ProposalCard.jsx";
import {
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  Megaphone,
  RefreshCw,
} from "lucide-react";

const imageBase = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/";
const logo = `${imageBase}logoTec-joLAT0Y1wGN9vfVIUw2ZyQQuMMXJ85.png`;
const facade = `${imageBase}WhatsApp%20Image%202026-08-27%20at%2009.31.16-Ec5wqdiOimAhhvgtR3QyTtI9VHyKbc.jpeg`;
const proposalImages = [cicloBasicoImage, informaticaImage, programacionImage];
const courses = [
  {
    title: "Ciclo Básico",
    eyebrow: "1° a 3° año",
    items: [
      [
        "1° 1",
        "https://drive.google.com/open?id=12DHSnKH7oGeJ9qdV6J1BUJcOvRIABKD4",
      ],
      [
        "1° 2",
        "https://drive.google.com/open?id=1JMlKnBlDDyOHyNU4A013LtEWP9IPkYQ8",
      ],
      [
        "1° 3",
        "https://drive.google.com/open?id=1Z1k7gJldMA0U1UaNGMlYkwZnQ6GeAqds",
      ],
      [
        "1° 4",
        "https://drive.google.com/open?id=1RdZlcG3O096F4_gdh-fEbklRovj-4IK9",
      ],
      [
        "1° 6",
        "https://drive.google.com/open?id=17qeYaYdqgYi1lNthrGSmUIK_Hh_w_Jng",
      ],
      [
        "2° 1",
        "https://drive.google.com/open?id=1xpvHryJ4TMxyyb0f3rmMk0AoAXrJA_Mh",
      ],
      [
        "2° 2",
        "https://drive.google.com/open?id=1qQKe4JvKI-EHNujfcQd8X6JiqfcU2VYG",
      ],
      [
        "2° 3",
        "https://drive.google.com/open?id=1WcoQQzk1BG9s1hzvg91JBG4SKXRj6NCB",
      ],
      [
        "2° 4",
        "https://drive.google.com/open?id=1cU7uKXUlwuUJNiVgFTO0uvKrPnQ9_nal",
      ],
      [
        "2° 6",
        "https://drive.google.com/open?id=11SFuRVJBo3FsKcEUqscfudkTg57AgqZ0",
      ],
      [
        "3° 1",
        "https://drive.google.com/open?id=1spzKq2BA1XStvFAVMADdxj9hSR8bDk6P",
      ],
      [
        "3° 2",
        "https://drive.google.com/open?id=1OSo-QUXhJY-vAUPjCqhprJUdkBahVAFK",
      ],
      [
        "3° 3",
        "https://drive.google.com/open?id=1RCTxeb2zlccDwoCp-5gLaH7yqmNb-ul_",
      ],
      [
        "3° 4",
        "https://drive.google.com/open?id=1jcOXhvDRh4Oa8Ak9oiMbOJGd7D0MbtlD",
      ],
      [
        "3° 6",
        "https://drive.google.com/drive/folders/1ekod6AXga5ImRl3ZIbo16AT7GAJTbwfN?usp=sharing",
      ],
    ],
  },
  {
    title: "Técnico en Informática",
    eyebrow: "4° a 7° año",
    items: [
      [
        "4° 1",
        "https://drive.google.com/open?id=1CKysjDN4lGXj5lJIeJ9cDGdVXHkMyjs9",
      ],
      [
        "4° 2",
        "https://drive.google.com/open?id=1B7Vcp0IiZb9h6nNvHd24UnRxhvj3PXTI",
      ],
      [
        "5° 1",
        "https://drive.google.com/open?id=19xM0WlPkiSBTMm0-aAtTwKArlbdz9Yyt",
      ],
      [
        "5° 2",
        "https://drive.google.com/open?id=1sgE2rix3CCsaNoMpokvwfPtFNnk_SXvU",
      ],
      [
        "6° 1",
        "https://drive.google.com/open?id=1dPe691AoCD2rTFQZjfEli3R9BNF2R2Gn",
      ],
      ["6° 2", null],
      [
        "7° 1",
        "https://drive.google.com/open?id=1fwjh5gBpanj5XYKu_XEnrUVaBNwq-mrW",
      ],
    ],
  },
  {
    title: "Técnico en Programación",
    eyebrow: "4° a 7° año",
    items: [
      [
        "4° 3",
        "https://drive.google.com/open?id=1Jl9Pi6OnvZ_VbodjMU7nVnsM0YH5GVlb",
      ],
      [
        "4° 4",
        "https://drive.google.com/open?id=17REZckk050tcF0S3qo_R38Pb9aMevrS4",
      ],
      [
        "5° 3",
        "https://drive.google.com/open?id=1q7G4lYawhuHzVK8xBpy0LKTT7aR_B17Y",
      ],
      [
        "5° 4",
        "https://drive.google.com/drive/u/0/folders/1o2H_yQysfTQ_GN6cohCtdBsVUz6PykPk",
      ],
      [
        "6° 3",
        "https://drive.google.com/open?id=1cz_ElIXBju2IUpCLYaIqUO_JAj7q3Meo",
      ],
      ["6° 4", null],
      [
        "7° 2",
        "https://drive.google.com/open?id=1sKJ_3ubg7zur3zL7BDSLJqc4E251q5pH",
      ],
    ],
  },
];
const facts = [
  ["+", "Aprendizaje práctico", "Proyectos que conectan teoría y realidad."],
  [
    "◆",
    "Comunidad educativa",
    "Una escuela abierta, inclusiva y participativa.",
  ],
  ["↗", "Mirada hacia el futuro", "Tecnología, creatividad y compromiso."],
];
const points = [
  ["Conocimiento", "Aprender para comprender."],
  ["Práctica", "Aprender haciendo."],
  ["Innovación", "Imaginar nuevas soluciones."],
  ["Comunidad", "Construir juntos."],
];
const proposals = [
  [
    "Ciclo Básico",
    "Primeros pasos para aprender haciendo, experimentar y descubrir nuevas herramientas.",
    proposalImages[0],
  ],
  [
    "Informática",
    "Ideas, dispositivos y soluciones digitales para comprender y transformar el mundo.",
    proposalImages[1],
  ],
  [
    "Programación",
    "Diseñar, programar y desarrollar soluciones para crear el futuro.",
    proposalImages[2],
  ],
];

function App() {
  const scroll = useRef(null);
  const sections = useRef({});
  const [showTop, setShowTop] = useState(false);
  const [hoveredNav, setHoveredNav] = useState(null);
  const { width } = useWindowDimensions();
  const mobile = width < 680;
  const goTo = (name) => {
    const target = sections.current[name];

    if (typeof target?.scrollIntoView === "function") {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const scrollNode = scroll.current?.getScrollableNode?.() ?? scroll.current;

    target?.measureLayout(scrollNode, (x, y) =>
      scroll.current?.scrollTo({ y, animated: true }),
    );
  };

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={[styles.nav, mobile && styles.mobileNav]}>
          <Pressable style={styles.brand} onPress={() => goTo("inicio")}>
            <Image source={{ uri: logo }} style={styles.brandLogo} />
            <View>
              <Text style={styles.brandTitle}>Técnica 1</Text>
              <Text style={styles.brandSubtitle}>Cecilia Berdichevski</Text>
            </View>
          </Pressable>
          <View style={styles.navLinks}>
            {[
              ["cursos", "Ver cursos", GraduationCap],
              ["evaluacion", "Evaluación de saberes", ClipboardCheck],
              ["previas", "Intensificación/Previas", RefreshCw],
              ["novedades", "Novedades", Megaphone],
              ["inscripcion", "Inscripción", ClipboardList],
            ].map(([name, label, Icon]) => (
              <Pressable
                key={name}
                style={[
                  styles.navLink,
                  hoveredNav === name && styles.navLinkHovered,
                ]}
                onMouseEnter={() => setHoveredNav(name)}
                onMouseLeave={() => setHoveredNav(null)}
                onPress={() => sections.current[name] && goTo(name)}
              >
                <Icon
                  size={15}
                  strokeWidth={2}
                  color={hoveredNav === name ? "#fff" : "#8B1E1E"}
                  aria-hidden="true"
                />
                <Text
                  style={[
                    styles.navLinkText,
                    hoveredNav === name && styles.navLinkTextHovered,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <ScrollView
        ref={scroll}
        contentContainerStyle={[
          styles.scrollContent,
          mobile && styles.scrollContentMobile,
        ]}
        scrollEventThrottle={16}
        onScroll={(event) =>
          setShowTop(event.nativeEvent.contentOffset.y > 420)
        }
      >
        <View
          ref={(node) => {
            sections.current.inicio = node;
          }}
          style={[styles.hero, mobile && styles.heroMobile]}
        >
          <View style={styles.heroCard}>
            <Image source={{ uri: facade }} style={styles.heroImage} />
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <Image source={{ uri: logo }} style={styles.schoolLogo} />
              <Text style={styles.eyebrowLight}>
                Educación técnica pública · Esteban Echeverria
              </Text>
              <Text style={styles.heroTitle}>
                Técnica 1{`\n`}Cecilia{`\n`}Berdichevski
              </Text>
              <Text style={styles.heroDescription}>
                Un espacio para aprender, crear y transformar ideas en
                proyectos. Formación técnica, comunidad y futuro.
              </Text>
            </View>
          </View>
        </View>
        <View
          style={styles.section}
        >
          <View style={[styles.intro, mobile && styles.column]}>
            <View style={styles.introCopy}>
              <Label text="Nuestra escuela" />
              <Text style={styles.sectionTitle}>
                Una escuela para quienes quieren hacer.
              </Text>
              <Text style={styles.bodyText}>
                Formamos estudiantes con curiosidad, pensamiento crítico y
                herramientas para construir su futuro. Nuestra comunidad combina
                conocimiento, práctica y trabajo colaborativo.
              </Text>
            </View>
            <View style={styles.facts}>
              {facts.map(([icon, title, text]) => (
                <View style={styles.fact} key={title}>
                  <View style={styles.factIcon}>
                    <Text style={styles.factIconText}>{icon}</Text>
                  </View>
                  <View>
                    <Text style={styles.factTitle}>{title}</Text>
                    <Text style={styles.factText}>{text}</Text>
                  </View>
                  </View>
              ))}
            </View>
          </View>
        </View>
        <View
          ref={(node) => {
            sections.current.cursos = node;
          }}
          style={styles.programs}
        >
          <View style={styles.container}>
            <View style={[styles.sectionHeading, mobile && styles.block]}>
              <View>
                <Label text="Formación" light />
                <Text style={styles.sectionTitleLight}>Nuestros Cursos</Text>
              </View>
              <Text style={styles.descriptionLight}>Busca tu curso.</Text>
            </View>
            <View style={[styles.cards, mobile && styles.column]}>
              {proposals.map(([title, text, image], index) => (
                <ProposalCard
                  key={title}
                  title={title}
                  text={text}
                  image={image}
                  course={courses[index]}
                  index={index}
                  styles={styles}
                />
              ))}
            </View>
          </View>
        </View>
        <View style={styles.section}>
          <View style={[styles.identity, mobile && styles.identityMobile]}>
            <View style={styles.identityCopy}>
              <Label text="Identidad institucional" />
              <View style={styles.identityHeading}>
                <Image source={{ uri: logo }} style={styles.identityLogo} />
                <Text style={styles.sectionTitle}>
                  Técnica, creatividad y comunidad.
                </Text>
              </View>
              <Text style={styles.bodyText}>
                Nuestra identidad se construye a partir de la educación técnica
                como herramienta de transformación. Aprender es experimentar,
                resolver problemas, trabajar con otros y animarse a crear.
              </Text>
              <View style={styles.points}>
                {points.map(([title, text]) => (
                  <View style={styles.point} key={title}>
                    <Text style={styles.pointTitle}>{title}</Text>
                    <Text style={styles.pointText}>{text}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.container}>
            <View style={[styles.footerGrid, mobile && styles.column]}>
              <View>
                <Text style={styles.footerTitle}>
                  Técnica 1 Cecilia Berdichevski
                </Text>
                <Text style={styles.footerSubtitle}>
                  Güemes 2051 · Esteban Echeverría · Provincia de Buenos Aires.
                </Text>
              </View>
              <View>
                <Text style={styles.footerHeading}>NAVEGACIÓN</Text>
                {["La escuela", "Propuestas", "Institucional", "Contacto"].map(
                  (item) => (
                    <Pressable key={item}>
                      <Text style={styles.footerLink}>{item}</Text>
                    </Pressable>
                  ),
                )}
              </View>
              <View>
                <Text style={styles.footerHeading}>REDES</Text>
                <View style={styles.socials}>
                  {["IG", "FB", "YT"].map((item) => (
                    <Pressable style={styles.social} key={item}>
                      <Text style={styles.socialText}>{item}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
            <Text style={styles.copyright}>
              © 2026 Técnica 1 Cecilia Berdichevski. Todos los derechos
              reservados.
            </Text>
          </View>
        </View>
      </ScrollView>
      {showTop && (
        <Pressable
          style={styles.backTop}
          onPress={() => scroll.current?.scrollTo({ y: 0, animated: true })}
        >
          <Text style={styles.backTopText}>↑</Text>
        </Pressable>
      )}
    </View>
  );
}

function Label({ text, light = false }) {
  return <Text style={light ? styles.labelLight : styles.label}>{text}</Text>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f3f0f0" },
  header: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: "#f3f0f0",
    borderBottomWidth: 1,
    borderBottomColor: "#eadede",
  },
  scrollContent: { paddingTop: 76 },
  scrollContentMobile: { paddingTop: 68 },
  nav: {
    minHeight: 76,
    width: "calc(100% - 40px)",
    maxWidth: 1180,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mobileNav: { minHeight: 68 },
  brand: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    objectFit: "contain",
  },
  brandTitle: { color: "#5C0F0F", fontWeight: "800", fontSize: 14 },
  brandSubtitle: { color: "#7A7474", fontSize: 10, letterSpacing: 1 },
  navLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    flex: 1,
    justifyContent: "flex-end",
    overflowX: "auto",
    paddingLeft: 20,
  },
  navLink: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    whiteSpace: "nowrap",
    borderRadius: 24,
    transitionProperty: "background-color, color",
    transitionDuration: "200ms",
  },
  navLinkHovered: { backgroundColor: "#8B1E1E" },
  navLinkText: { color: "#5A5555", fontSize: 13, fontWeight: "700" },
  navLinkTextHovered: { color: "#fff" },
  hero: { width: "100%" },
  heroMobile: { paddingTop: 12 },
  heroCard: {
    height: 640,
    width: "100%",
    alignSelf: "center",
    overflow: "hidden",
    backgroundColor: "#5C0F0F",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    filter: "brightness(.65) saturate(.9)",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(45,4,4,.58)",
  },
  heroContent: {
    minHeight: 620,
    maxWidth: 720,
    padding: 65,
    marginLeft: 70,
    justifyContent: "center",
    zIndex: 2,
  },
  schoolLogo: { width: 104, height: 104, borderRadius: 52, marginBottom: 26 },
  eyebrowLight: {
    color: "#E8C5C5",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 22,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 72,
    lineHeight: 76,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  heroDescription: {
    maxWidth: 510,
    marginTop: 26,
    color: "rgba(255,255,255,.88)",
    fontSize: 17,
    lineHeight: 28,
  },
  section: {
    paddingVertical: 100,
    width: "calc(100% - 40px)",
    maxWidth: 1180,
    alignSelf: "center",
  },
  intro: { flexDirection: "row", gap: 90, alignItems: "center" },
  column: { flexDirection: "column", alignItems: "stretch", gap: 35 },
  introCopy: { flex: 1 },
  label: {
    color: "#8B1E1E",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 14,
  },
  labelLight: {
    color: "#E8C5C5",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 14,
  },
  sectionTitle: {
    color: "#5C0F0F",
    fontFamily: "Georgia",
    fontSize: 52,
    lineHeight: 54,
    fontWeight: "400",
  },
  bodyText: { color: "#7A7474", fontSize: 16, lineHeight: 29, marginTop: 22 },
  facts: { flex: 1, gap: 13 },
  fact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    padding: 20,
    borderRadius: 12,
    backgroundColor: "#fff",
    shadowColor: "#5C0F0F",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  factIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#8B1E1E",
    alignItems: "center",
    justifyContent: "center",
  },
  factIconText: { color: "#fff", fontSize: 20, fontWeight: "900" },
  factTitle: { color: "#5C0F0F", fontSize: 14, fontWeight: "700" },
  factText: { color: "#7A7474", fontSize: 12, marginTop: 3 },
  programs: { backgroundColor: "#5C0F0F", paddingVertical: 110 },
  container: {
    width: "calc(100% - 40px)",
    maxWidth: 1180,
    alignSelf: "center",
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 50,
    marginBottom: 38,
  },
  block: { flexDirection: "column", alignItems: "stretch", gap: 14 },
  sectionTitleLight: {
    color: "#fff",
    fontFamily: "Georgia",
    fontSize: 52,
    lineHeight: 54,
  },
  descriptionLight: { color: "rgba(255,255,255,.68)", maxWidth: 400 },
  cards: { flexDirection: "row", gap: 18 },
  card: {
    flex: 1,
    minHeight: 380,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#8B1E1E",
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    filter: "brightness(100%)",
    transitionProperty: "filter",
    transitionDuration: "560ms",
    transitionTimingFunction: "ease-out",
  },
  cardImageHovered: {
    filter: "brightness(70%)",
  },
  cardShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(25,2,2,.54)",
  },
  cardContent: {
    position: "absolute",
    left: 22,
    right: 22,
    bottom: 22,
    transitionProperty: "transform",
    transitionDuration: "650ms",
    transitionTimingFunction: "ease-out",
  },
  cardTitle: {
    color: "#fff",
    fontSize: 35,
    fontWeight: "800",
    marginBottom: 7,
  },
  cardText: {
    color: "#E8C5C5",
    fontSize: 16,
    lineHeight: 20,
  },

  cardCourses: {
    position: "absolute",
    left: 22,
    right: 22,
    bottom: 30,
    maxHeight: 176,
    overflow: "hidden",
    opacity: 0,
    transform: [{ translateY: 180 }],
    transitionProperty: "opacity, transform",
    transitionDuration: "650ms",
    transitionDelay: "25ms",
    transitionTimingFunction: "ease-out",
  },
  cardCoursesHovered: {
    opacity: 1,
    transform: [{ translateY: 0 }],
  },
  cardCoursesTitle: {
    color: "#E8C5C5",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  cardCourseList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  cardCourse: {
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.45)",
    borderRadius: 6,
    backgroundColor: "rgba(92,15,15,.55)",
    transitionProperty: "background-color, border-color, transform",
    transitionDuration: "180ms",
  },
  cardCourseHovered: {
    backgroundColor: "rgba(139,30,30,.98)",
    borderColor: "#fff",
    transform: [{ scale: 1.04 }],
  },
  cardCourseText: { color: "#fff", fontSize: 17 },
  identity: {
    padding: 68,
    borderWidth: 1,
    borderColor: "#eadede",
    borderRadius: 28,
    backgroundColor: "#e6e6e6",
  },
  identityMobile: { padding: 40 },
  identityCopy: { flexDirection: "row", flexWrap: "wrap", gap: 20 },
  identityHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 22,
    width: "100%",
  },
  identityLogo: { width: 92, height: 92, borderRadius: 46 },
  points: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    flex: 1,
    minWidth: 320,
  },
  point: {
    minHeight: 132,
    flex: 1,
    minWidth: 130,
    padding: 20,
    borderTopWidth: 4,
    borderTopColor: "#8B1E1E",
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  pointTitle: { color: "#5C0F0F", fontSize: 14, fontWeight: "700" },
  pointText: { color: "#7A7474", fontSize: 12, marginTop: 8 },
  footer: { backgroundColor: "#5C0F0F", paddingVertical: 55 },
  footerGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 50,
    paddingBottom: 45,
  },
  footerTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  footerSubtitle: {
    color: "#E8C5C5",
    fontSize: 12,
    marginTop: 9,
    maxWidth: 320,
  },
  footerHeading: {
    color: "#E8C5C5",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 13,
  },
  footerLink: { color: "rgba(255,255,255,.75)", fontSize: 12, marginBottom: 7 },
  socials: { flexDirection: "row", gap: 8 },
  social: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  socialText: { color: "#fff", fontSize: 11 },
  copyright: { color: "rgba(255,255,255,.45)", fontSize: 10, marginTop: 25 },
  backTop: {
    position: "absolute",
    right: 24,
    bottom: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#8B1E1E",
    alignItems: "center",
    justifyContent: "center",
  },
  backTopText: { color: "#fff", fontSize: 24 },
});

export default App;
