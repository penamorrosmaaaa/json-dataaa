// src/theme.js
import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  styles: {
    global: {
      body: {
        bgGradient: "linear(to-b, purple.800, purple.900)",  // Dark gradient background
        color: "white",
      },
    },
  },
});

export default theme;
