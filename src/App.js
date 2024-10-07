import React from "react";
import { ChakraProvider, Box } from "@chakra-ui/react";
import RequestCountGraph from "./RequestCountGraph/RequestCountGraph";
import DataTable from "./DataTable/DataTable";
import General from "./General/General";

const App = () => {
  return (
    <ChakraProvider>
      <Box
    p={5}
    bg="linear-gradient(90deg, #000000, #7800ff)" // Changed to linear gradient
    minH="100vh" // Set height to fill the viewport as needed
    color="white"
    display="flex"
    flexDirection="column"
    alignItems="center"
    overflow="auto"
    width="100%"
      >
        {/* General Overview Section */}
        <Box
          width="100%"
          maxW="1200px"
          borderRadius="md"
          p={6}
          mb={0}
        >
          <General />
        </Box>

        {/* Request Count Graph Section */}
        <Box
          width="100%"
          maxW="1600px"
          borderRadius="md"
          p={1}
          mb={-150}
        >
          <RequestCountGraph />
        </Box>

        {/* Data Table Section */}
        <Box
          width="100%"
          maxW="1500px"
          borderRadius="md"
          p={6}
          mb={0}
        >
          <DataTable />
        </Box>
      </Box>
    </ChakraProvider>
  );
};

export default App;
