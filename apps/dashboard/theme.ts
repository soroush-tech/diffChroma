import type { Theme } from "@soroush.tech/design-system";
import { baseTheme, createTheme } from "@soroush.tech/design-system/theme";
import { alpha, generateBoxShadow } from "@soroush.tech/design-system/utils";

// Brand color ramps, mirrored from the soroush.tech web app (core repo,
// apps/web/src/theme/colors) so both apps share one color set.
const blackAlpha = {
  0: "#00000000",
  100: "#0000001A",
  300: "#0000004D",
  500: "#00000080",
  700: "#000000B3",
} as const;

const carbonBlack = {
  100: "#F2F3F4",
  200: "#D7D8DA",
  400: "#8F9094",
  500: "#5E6065",
  800: "#111214",
  900: "#000000",
} as const;

const cyberCyan = {
  400: "#33D9FF",
  600: "#00B8D9",
  700: "#0099CC",
  800: "#0071A4",
  900: "#004D70",
} as const;

const deepCrimson = {
  100: "#ffdad6",
  600: "#ba1a1a",
  700: "#93000a",
} as const;

const forestGreen = {
  400: "#1cac31",
  500: "#007318",
  600: "#006e17",
  700: "#00530f",
  800: "#003d0b",
} as const;

const kineticGreen = {
  100: "#E8FFE5",
  300: "#9CFF93",
  500: "#00FC40",
  700: "#009928",
  800: "#006413",
} as const;

const kineticSurface = {
  100: "#FFFFFF",
  300: "#9C9C9C",
  500: "#363636",
  600: "#262626",
  700: "#1A1A1A",
  800: "#131313",
  900: "#0E0E0E",
} as const;

const lightSurface = {
  100: "#ffffff",
  200: "#f9f9f9",
  300: "#f3f3f3",
  400: "#eeeeee",
  600: "#e2e2e2",
  800: "#c4c7c7",
  900: "#444748",
  950: "#1a1c1c",
} as const;

const neonRed = {
  300: "#FF9590",
  500: "#FF3B30",
  600: "#E0251A",
  700: "#D70015",
} as const;

const softGreen = {
  200: "#d4f9d2",
  400: "#b3eeb1",
  600: "#5acc57",
  700: "#3aaa37",
} as const;

const solarAmber = {
  200: "#FFF0A0",
  400: "#FFD930",
  500: "#FFD60A",
  600: "#CCA800",
  800: "#8C6D00",
} as const;

const lightShadows = Array.from({ length: 25 }, (_, elevation) =>
  generateBoxShadow(elevation, blackAlpha[100]),
);
const darkShadows = Array.from({ length: 25 }, (_, elevation) =>
  generateBoxShadow(elevation, "#00000066"),
);

// Chromatic-style pill buttons app-wide; label loses the uppercase treatment.
const components: Theme["components"] = {
  Button: {
    styleOverrides: {
      root: { borderRadius: "3em" },
    },
  },
};

const typographyOverrides = {
  button: {
    element: "span",
    fontSize: 1,
    fontWeight: "extraBold",
    letterSpacing: "normal",
    textTransform: "none",
  },
} as const;

/** Default theme: white surfaces, brand green accents. */
export const light: Theme = createTheme(baseTheme, {
  name: "light",
  colorScheme: "light",
  logoFilter: "brightness(0)",
  portraitBlend: "multiply",
  portraitOpacity: 1,
  shadow: { color: carbonBlack[900], opacity: 0.1 },
  components,
  typography: typographyOverrides,
  palette: {
    default: {
      main: carbonBlack[500],
      light: carbonBlack[400],
      dark: carbonBlack[800],
      contrastText: lightSurface[100],
    },
    primary: {
      main: forestGreen[600],
      light: softGreen[200],
      dark: forestGreen[700],
      contrastText: lightSurface[100],
    },
    secondary: {
      main: softGreen[600],
      light: softGreen[200],
      dark: softGreen[700],
      contrastText: lightSurface[100],
    },
    success: {
      main: kineticGreen[700],
      light: kineticGreen[100],
      dark: kineticGreen[800],
      contrastText: lightSurface[100],
    },
    error: {
      main: deepCrimson[600],
      light: deepCrimson[100],
      dark: deepCrimson[700],
      contrastText: lightSurface[100],
    },
    info: {
      main: cyberCyan[800],
      light: "#E0FAFF",
      dark: cyberCyan[900],
      contrastText: lightSurface[100],
    },
    warning: {
      main: solarAmber[600],
      light: solarAmber[200],
      dark: solarAmber[800],
      contrastText: lightSurface[100],
    },
  },
  background: {
    backdrop: blackAlpha[500],
    appBar: alpha(lightSurface[100], 0.85),
    glass: alpha(lightSurface[100], 0.3),
    modal: lightSurface[100],
    default: lightSurface[400],
    primary: lightSurface[200],
    secondary: lightSurface[300],
    paper: lightSurface[100],
    terminal: lightSurface[400],
    grid: alpha(softGreen[600], 0.2),
    transparent: blackAlpha[0],
  },
  text: {
    inherit: "inherit",
    initial: lightSurface[950],
    primary: forestGreen[600],
    secondary: lightSurface[900],
    disabled: alpha(lightSurface[950], 0.45),
    error: deepCrimson[600],
    success: kineticGreen[700],
    info: cyberCyan[800],
    warning: solarAmber[800],
  },
  border: {
    default: alpha(lightSurface[950], 0.14),
    light: alpha(forestGreen[500], 0.1),
    primary: forestGreen[600],
    dark: forestGreen[800],
  },
  skeleton: {
    highlight: alpha(lightSurface[100], 0.65),
  },
  shadows: lightShadows,
});

export const dark: Theme = createTheme(baseTheme, {
  name: "dark",
  colorScheme: "dark",
  logoFilter: "brightness(0) invert(1)",
  portraitBlend: "screen",
  portraitOpacity: 0.8,
  shadow: { color: carbonBlack[900], opacity: 0.4 },
  components,
  typography: typographyOverrides,
  palette: {
    default: {
      main: kineticSurface[600],
      light: kineticSurface[500],
      dark: kineticSurface[900],
      contrastText: carbonBlack[100],
    },
    primary: {
      main: kineticGreen[500],
      light: kineticGreen[300],
      dark: kineticGreen[800],
      contrastText: carbonBlack[900],
    },
    secondary: {
      main: softGreen[400],
      light: softGreen[200],
      dark: softGreen[600],
      contrastText: carbonBlack[900],
    },
    success: {
      main: kineticGreen[700],
      light: kineticGreen[500],
      dark: kineticGreen[800],
      contrastText: kineticSurface[100],
    },
    error: {
      main: neonRed[500],
      light: neonRed[300],
      dark: neonRed[600],
      contrastText: kineticSurface[100],
    },
    info: {
      main: cyberCyan[600],
      light: cyberCyan[400],
      dark: cyberCyan[700],
      contrastText: carbonBlack[900],
    },
    warning: {
      main: solarAmber[400],
      light: solarAmber[200],
      dark: solarAmber[600],
      contrastText: carbonBlack[900],
    },
  },
  background: {
    backdrop: blackAlpha[700],
    appBar: blackAlpha[700],
    glass: blackAlpha[300],
    modal: kineticSurface[800],
    default: kineticSurface[600],
    primary: kineticSurface[900],
    secondary: kineticSurface[700],
    paper: kineticSurface[800],
    terminal: carbonBlack[900],
    grid: alpha(kineticGreen[500], 0.06),
    transparent: blackAlpha[0],
  },
  text: {
    inherit: "inherit",
    initial: kineticSurface[100],
    primary: kineticGreen[500],
    secondary: kineticSurface[300],
    disabled: kineticSurface[500],
    error: neonRed[700],
    success: kineticGreen[700],
    info: cyberCyan[600],
    warning: solarAmber[800],
  },
  border: {
    default: kineticSurface[600],
    light: alpha(kineticGreen[100], 0.1),
    primary: kineticGreen[500],
    dark: kineticGreen[800],
  },
  skeleton: {
    highlight: alpha(kineticSurface[500], 0.65),
  },
  shadows: darkShadows,
});
