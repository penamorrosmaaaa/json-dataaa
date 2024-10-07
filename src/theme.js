import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  styles: {
    global: {
      body: {
        bgGradient: "linear(180deg, #000000, #7800ff)", // Updated to linear gradient
        color: "white",
        minHeight: "100vh", // Ensure the body covers the full viewport height
        margin: 0,
        padding: 0,
      },
    },
  },
  components: {
    Box: {
      baseStyle: {
        borderRadius: "md", // Medium border radius
        borderWidth: "2px",
        borderStyle: "solid",
        borderColor: "gray.300", // Light grey border
        boxShadow: "lg", // Large box shadow for a subtle shiny effect
        bgGradient: "linear(180deg, #000000, #7800ff)", // Same gradient as main background
      },
    },
  },
});

export default theme;
